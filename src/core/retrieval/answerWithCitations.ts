import { getDefaultProvider } from "@/core/providers/openAICompatibleProvider";
import type { ConfigOverride } from "@/core/config/appConfig";
import { getMentor, parseMentorDialogue, type MentorId } from "@/data/mentors";
import { buildScopedContext, searchChunksForMentors } from "./retrieveContext";
import {
  needsCitation,
  validateCitationsByMentor,
  type Citation,
  type ScopedCitationViolation,
} from "./citationPolicy";
import { checkVoice, violationRetryText, type VoiceViolation } from "./voicePolicy";
import { hasLexicalEvidenceForCitationQuestion } from "./evidenceRelevance";
import { wrapAsMentorDialogue } from "./noEvidenceAnswer";
import type { UserProfile } from "@/data/userProfile";

export type RagPipelineNotes = {
  mode: "rag";
  /** 分库检索命中数 */
  retrieved: { hu: number; li: number; xuan: number; merged: number };
  /** 是否触发过定向重试 */
  retried: boolean;
  /** 终稿引用校验是否通过（不需引用时视为通过） */
  citationsValid: boolean;
  /** 终稿声口校验是否通过 */
  voiceValid: boolean;
};

export type RagAnswer = {
  answerMarkdown: string;
  citations: Citation[];
  usedContext: Array<{
    chunkId: string;
    sourceFileName: string;
    pageNumber: number;
    score: number;
  }>;
  /** 学习模式管线注解（轻量版执行轨迹） */
  pipeline: RagPipelineNotes;
};

function describeCitationViolation(v: ScopedCitationViolation): string {
  const who = v.mentorId ? getMentor(v.mentorId).shortName : "未署名段落";
  return v.reason === "cross-library"
    ? `- 【${who}】引用了 ${v.cite}——越库：该出处不在其专库分区内。每位只可引用自己分区（含共享池）中的 Sources。`
    : `- 【${who}】引用了 ${v.cite}——本轮任何 Sources 中都没有这个出处，不得杜撰。`;
}

/**
 * 无典籍证据时的 context：明确告诉模型"暂未入藏"，约束它不杜撰引用，
 * 但仍可基于问者背景给出个性化回应（而非固定模板）。
 */
function buildEmptyContext(
  _userProfile?: UserProfile | null,
  mentorIds?: readonly MentorId[],
): string {
  const audience = mentorIds ? "本轮在席角色" : "三位";
  return [
    "[本轮检索结果]",
    `典籍暂未入藏——${audience}均无可引用的典籍出处。`,
    "",
    "约束：不得使用 [《书名》, 章节] 引用格式（无据可引）；可基于问者的困惑与背景给出各自的回应，但需如实说明这是基于一般理解而非典籍依据。",
  ].join("\n");
}

export async function answerQuestion(
  question: string,
  userProfile?: import("@/data/userProfile").UserProfile | null,
  conversationContext?: string,
  configOverride?: ConfigOverride,
  mentorIds?: readonly MentorId[],
): Promise<RagAnswer> {
  const retryFormat = mentorIds
    ? `保持 ${mentorIds.length} 段在席角色格式、各自声口、各引各库`
    : "保持三段格式、各自声口、各引各库";
  const scoped = await searchChunksForMentors(question, 4, configOverride, mentorIds);
  const retrieved = {
    hu: scoped.byMentor.hu.length,
    li: scoped.byMentor.li.length,
    xuan: scoped.byMentor.xuan.length,
    merged: scoped.merged.length,
  };
  const noEvidence =
    !scoped.merged.length ||
    scoped.merged.every((item) => item.score <= 0) ||
    !hasLexicalEvidenceForCitationQuestion(question, scoped.merged);

  const provider = getDefaultProvider(configOverride);
  // 即使检索无命中，也调用聊天模型让三贤基于"无典籍证据"的边界给出个性化回应，
  // 而非短路返回固定模板——这样 RAG 模式（关闭循迹）也能正常对谈。
  // context 为空时提示词会明确告诉模型"暂未入藏"，约束它不杜撰引用。
  const context = noEvidence ? buildEmptyContext(userProfile, mentorIds) : buildScopedContext(scoped);
  let answer = (
    await provider.generateAnswer({ question, context, userProfile, conversationContext, mentorIds: mentorIds ? [...mentorIds] : undefined })
  ).text.trim();

  if (noEvidence) {
    // 无证据路径：不做引用校验（本就无引用），直接返回模型生成的内容。
    // 但若模型完全没按三贤格式输出，用模板包装让 UI 能拆气泡。
    const formatted = wrapAsMentorDialogue(answer, mentorIds);
    return {
      answerMarkdown: formatted,
      citations: [],
      usedContext: [],
      pipeline: { mode: "rag", retrieved, retried: false, citationsValid: true, voiceValid: formatted === answer },
    };
  }

  let outcome = validateCitationsByMentor(answer, scoped);
  let voiceViolations: VoiceViolation[] = checkVoice(parseMentorDialogue(answer), mentorIds);

  // 引用问题（越库/杜撰/全无引用）与声口违规合并为一次定向重试
  const problems: string[] = [];
  if (needsCitation(answer) && outcome.citations.length === 0) {
    if (outcome.violations.length) {
      problems.push(...outcome.violations.map(describeCitationViolation));
    } else {
      problems.push(
        "- 回应没有任何可核对的引用：凡引述思想或原文，必须使用 [《书名》, 章节] 格式，且书名与章节只能取自各自分区 Sources 的 cite_as。",
      );
    }
  }
  if (voiceViolations.length) {
    problems.push(violationRetryText(voiceViolations));
  }

  if (problems.length) {
    answer = (
      await provider.generateAnswer({
        question: `${question}\n\n上一次回应存在以下问题，请整组重写并逐条修正（${retryFormat}）：\n${problems.join("\n")}`,
        context,
        userProfile,
        conversationContext,
        mentorIds: mentorIds ? [...mentorIds] : undefined,
      })
    ).text.trim();
    outcome = validateCitationsByMentor(answer, scoped);
    voiceViolations = checkVoice(parseMentorDialogue(answer), mentorIds);
  }

  if (needsCitation(answer) && outcome.citations.length === 0) {
    const detail = outcome.violations.length
      ? `（${outcome.violations.map((v) => describeCitationViolation(v).replace(/^- /, "")).join("；")}）`
      : "";
    answer = `${answer}\n\n⚠️ 这段回应中引用的出处未能通过校验${detail}，请打开下方检索到的典籍原文自行核对。`;
  }
  // 格式兜底：如果重试后模型仍然完全没按三贤格式输出（三位全缺席），
  // 用模板包装让 UI 能拆气泡，而不是把裸文本 + ⚠️ 丢给用户。
  const allMissingRole = voiceViolations.length > 0 && voiceViolations.every((v) => v.kind === "missing-role");
  if (allMissingRole) {
    answer = wrapAsMentorDialogue(answer, mentorIds);
  } else if (voiceViolations.length) {
    answer = `${answer}\n\n⚠️ 本轮未完全通过角色声口校验：${voiceViolations.map((v) => v.detail).join("；")}。`;
  }

  return {
    answerMarkdown: answer,
    citations: outcome.citations,
    usedContext: scoped.merged.map((item) => ({
      chunkId: item.chunkId,
      sourceFileName: item.sourceFileName,
      pageNumber: item.pageNumber,
      score: item.score,
    })),
    pipeline: {
      mode: "rag",
      retrieved,
      retried: problems.length > 0,
      citationsValid: !(needsCitation(answer) && outcome.citations.length === 0),
      voiceValid: voiceViolations.length === 0,
    },
  };
}
