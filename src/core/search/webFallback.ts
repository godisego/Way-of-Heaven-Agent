/**
 * 联网搜索回退（知识库未命中 → 网络兜底）。
 *
 * 链路：先用真实 embedding 做一次分库检索，最高分低于阈值即视为
 * 「典籍库没有相关内容」——此时不再跑重型的三贤 Agent 循环，而是
 * 联网搜索 + 单轮 LLM 生成，并在回答下方标注联网来源。
 *
 * 为什么阈值 0.4：embo-01 实测域内问题（十神/斯多葛/RAG 等）最高分
 * 0.66~0.99，域外问题（红烧肉/天气/奥运会）最高分 0.07~0.18，
 * 0.4 两侧留白充足。若更换 embedding 模型需重新校准。
 *
 * 引用问题（《xx书》讲了什么）不触发联网：用户明确在问库内书，
 * 应走 RAG 拿到诚实的「暂未入藏」，而不是拿网上同名文章冒充。
 */
import { searchWeb, type WebSearchBadge, type WebSearchResult } from "./webSearch";
import { searchChunksForMentors } from "@/core/retrieval/retrieveContext";
import { isCitationQuestion } from "@/core/retrieval/evidenceRelevance";
import { resolveMentorIds } from "@/data/mentorSelection";
import { DIALOGUE_MENTORS, type MentorId } from "@/data/mentors";
import { getDefaultProvider } from "@/core/providers/openAICompatibleProvider";
import type { ConfigOverride } from "@/core/config/appConfig";
import type { AgentTrace } from "@/core/agent/types";

export const WEB_FALLBACK_MIN_SCORE = 0.4;

export type { WebSearchBadge };

export type WebFallbackAnswer = {
  answerMarkdown: string;
  webSearch: WebSearchBadge;
  /** 复用 Agent 轨迹面板展示本次联网取证步骤 */
  trace: AgentTrace;
};

/** 知识库是否未命中（低于阈值且不是明确引用库内书的问题） */
export function isKnowledgeMiss(question: string, topScore: number): boolean {
  if (topScore >= WEB_FALLBACK_MIN_SCORE) return false;
  return !isCitationQuestion(question);
}

function buildSystemPrompt(mentorIds?: readonly MentorId[]): string {
  const active = DIALOGUE_MENTORS.filter((m) => resolveMentorIds(mentorIds).includes(m.id));
  const roleSpec = active
    .map((m) => `【${m.title}】（${m.epithet}）语声要点：${m.voice.slice(0, 60)}…`)
    .join("\n");
  return [
    "你是「天道导师」茶寮的联网模式主持。本轮茶寮典籍库没有与问题相关的内容，由在席贤者结合联网搜索结果回答。",
    "",
    "回应格式（严格按此顺序，每人一段，段首用【标题】）：",
    roleSpec,
    "",
    "铁律：",
    "- 本轮不走典籍库：禁止输出《书名, 位置》格式的典籍引用（没有入库证据，编造会被当场作废）。",
    "- 结合联网搜索结果与你自己的知识回答；搜索结果只是线索，与问题无关就忽略它，并说明你基于自身知识作答。",
    "- 不确定的数字、日期、事件要明说「不确定」，不要用搜索标题撑腰编造。",
    `-${active.length > 1 ? "每人 2~4 句，总长不超过 500 字" : "回答 4~6 句，不超过 400 字"}；不要写总结段、不要复述用户问题。`,
  ].join("\n");
}

function buildUserPrompt(question: string, sources: WebSearchResult[], searchOk: boolean): string {
  if (!searchOk) {
    return `用户提问：${question}\n\n（联网搜索暂不可用。请基于你自己的知识直接回答，并在回答里明确说明「以下为模型自身知识，未联网核实」。）`;
  }
  const dated = new Date().toISOString().slice(0, 10);
  const blocks = sources
    .map((s, i) => `[Web${i + 1}] ${s.title}\n链接: ${s.url}\n摘要: ${s.snippet || "（无摘要）"}`)
    .join("\n\n");
  return `用户提问：${question}\n\n联网搜索结果（${dated}，仅供参考）：\n\n${blocks}`;
}

/** 联网回答的执行轨迹（复用 Agent 轨迹面板渲染） */
export function buildWebFallbackTrace(query: string, searchOk: boolean, durationMs: number): AgentTrace {
  const startedAt = new Date(Date.now() - durationMs).toISOString();
  return {
    runId: `web_${Date.now().toString(36)}`,
    mode: "agent",
    startedAt,
    durationMs,
    stopReason: searchOk ? "ready" : "insufficient",
    finalState: "completed",
    steps: [
      {
        index: 0,
        phase: "tool",
        toolName: "web_search",
        toolArgs: { query },
        observationSummary: searchOk
          ? `典籍库未命中（低于 ${WEB_FALLBACK_MIN_SCORE}），联网搜索「${query}」完成`
          : `典籍库未命中（低于 ${WEB_FALLBACK_MIN_SCORE}），联网搜索失败，改为模型直答`,
        durationMs,
      },
    ],
    totals: { toolCalls: 1, evidenceCount: 0, modelCalls: 1 },
  };
}

export type WebFallbackOptions = {
  mentorIds?: readonly MentorId[];
  configOverride?: ConfigOverride | null;
  searchTimeoutMs?: number;
};

/**
 * 联网兜底回答：搜索 → summarize 单轮生成（自带三贤格式）。
 * 任何一步失败都降级为纯模型直答，不抛异常——兜底链路不允许把问答卡死。
 */
export async function answerFromWeb(question: string, opts?: WebFallbackOptions): Promise<WebFallbackAnswer> {
  const startedAt = Date.now();
  const outcome = await searchWeb(question, { limit: 5, timeoutMs: opts?.searchTimeoutMs });
  if (!outcome.ok) {
    console.warn(`[web-fallback] ${outcome.error}`);
  }

  const provider = getDefaultProvider(opts?.configOverride ?? null);
  const systemPrompt = buildSystemPrompt(opts?.mentorIds);
  const userPrompt = buildUserPrompt(question, outcome.results, outcome.ok);
  let text = "";
  try {
    const result = await provider.summarize?.({ systemPrompt, userPrompt, maxTokens: 1024 });
    text = result?.text?.trim() ?? "";
  } catch (error) {
    console.warn("[web-fallback] 生成失败：", error instanceof Error ? error.message : error);
  }
  if (!text) {
    text = "茶寮网络这会儿不通，贤者们也未能联网取证。稍候再问一次，或换个问法试试。";
  }

  const badge: WebSearchBadge = {
    query: outcome.query,
    engine: outcome.ok ? outcome.engine : "none",
    sources: outcome.ok ? outcome.results : [],
    note: outcome.ok ? undefined : outcome.error,
  };

  return {
    answerMarkdown: text,
    webSearch: badge,
    trace: buildWebFallbackTrace(question, outcome.ok, Date.now() - startedAt),
  };
}

/**
 * 问答入口的联网回退判定：做一次真实 embedding 分库检索，
 * 命中过阈值则返回 null（继续走正常 RAG/Agent 链路），否则返回兜底回答。
 * 返回的 scoped 供调用方复用（避免 Agent 循环重复检索时可自行取舍）。
 */
export async function maybeAnswerFromWeb(
  question: string,
  opts?: WebFallbackOptions & { topKPerMentor?: number },
): Promise<WebFallbackAnswer | null> {
  const scoped = await searchChunksForMentors(question, opts?.topKPerMentor ?? 4, opts?.configOverride ?? undefined);
  const topScore = scoped.merged[0]?.score ?? 0;
  if (!isKnowledgeMiss(question, topScore)) return null;
  console.info(`[web-fallback] 典籍库最高分 ${topScore.toFixed(3)} 低于阈值，触发联网回退：${question.slice(0, 40)}`);
  return answerFromWeb(question, opts);
}
