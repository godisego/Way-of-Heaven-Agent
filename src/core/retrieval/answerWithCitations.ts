import { getDefaultProvider } from "@/core/providers/openAICompatibleProvider";
import { getMentor, parseMentorDialogue } from "@/data/mentors";
import { buildScopedContext, searchChunksForMentors } from "./retrieveContext";
import {
  needsCitation,
  validateCitationsByMentor,
  type Citation,
  type ScopedCitationViolation,
} from "./citationPolicy";
import { checkVoice, violationRetryText, type VoiceViolation } from "./voicePolicy";

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

export async function answerQuestion(
  question: string,
  userProfile?: import("@/data/userProfile").UserProfile | null,
): Promise<RagAnswer> {
  const scoped = await searchChunksForMentors(question, 4);
  const retrieved = {
    hu: scoped.byMentor.hu.length,
    li: scoped.byMentor.li.length,
    xuan: scoped.byMentor.xuan.length,
    merged: scoped.merged.length,
  };
  if (!scoped.merged.length || scoped.merged.every((item) => item.score <= 0)) {
    return {
      answerMarkdown:
        "典籍中暂时没有能贴合你这个困惑的内容。你可以先上传一些相关的书籍或笔记（.md/.txt/.pdf），我再结合它们与你细聊。",
      citations: [],
      usedContext: [],
      pipeline: { mode: "rag", retrieved, retried: false, citationsValid: true, voiceValid: true },
    };
  }

  const provider = getDefaultProvider();
  const context = buildScopedContext(scoped);
  let answer = (await provider.generateAnswer({ question, context, userProfile })).text.trim();
  let outcome = validateCitationsByMentor(answer, scoped);
  let voiceViolations: VoiceViolation[] = checkVoice(parseMentorDialogue(answer));

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
        question: `${question}\n\n上一次回应存在以下问题，请整组重写并逐条修正（保持三段格式、各自声口、各引各库）：\n${problems.join("\n")}`,
        context,
        userProfile,
      })
    ).text.trim();
    outcome = validateCitationsByMentor(answer, scoped);
    voiceViolations = checkVoice(parseMentorDialogue(answer));
  }

  if (needsCitation(answer) && outcome.citations.length === 0) {
    const detail = outcome.violations.length
      ? `（${outcome.violations.map((v) => describeCitationViolation(v).replace(/^- /, "")).join("；")}）`
      : "";
    answer = `${answer}\n\n⚠️ 这段回应中引用的出处未能通过校验${detail}，请打开下方检索到的典籍原文自行核对。`;
  }
  if (voiceViolations.length) {
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
