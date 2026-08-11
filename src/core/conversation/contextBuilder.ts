/**
 * 对话上下文构建（含 LLM rolling summary）。
 *
 * 取代 src/data/sessionStore.ts 的纯截断 buildConversationContext：
 * 长对话超窗口时，把更早的消息用 LLM 压成语义摘要，与最近 N 条原文一起送模型。
 * 每条消息只摘要一次（rolling）——摘要覆盖到 summaryUpTo，下次只摘要这之后的窗口外消息。
 * 摘要持久化在 SessionRow（见 sessionStore.updateSessionSummary），重启不重算。
 *
 * 失败安全：LLM 摘要抛错或 provider 未实现 → 回退规则压缩（按角色取核心句），不阻塞对话。
 *
 * 设计见 plans/reflective-orbiting-muffin.md。
 */
import { getMentor, parseMentorDialogue } from "@/data/mentors";
import { buildConversationContext, type SessionMessage } from "@/data/sessionStore";
import type { LlmProvider } from "@/core/providers/llmProvider";

/** 摘要状态（SessionRow 的子集，避免整行耦合）。 */
export type SessionSummaryState = {
  summary?: string | null;
  summaryUpTo?: string | null;
};

export type ContextBuildOptions = {
  /** 最近窗口大小（原文，默认 8）。 */
  maxRecentMessages?: number;
  /** 窗口外攒到几条触发一次摘要（默认 2，控制 LLM 调用频率）。 */
  summarizeBatchSize?: number;
  /** 摘要字符上限（默认 1500）。 */
  maxSummaryChars?: number;
};

export type ContextBuildResult = {
  /** 拼好的上下文：[此前对谈摘要] + [最近 N 条原文]。 */
  context: string;
  /** 新摘要（若本次产生了，调用方应回写 session）。 */
  summary: string | null;
  /** 摘要覆盖到的最后一条消息 createdAt。 */
  summaryUpTo: string | null;
  /** 本次是否产生了新摘要（LLM 或规则回退均算）。 */
  summarized: boolean;
};

const DEFAULT_RECENT = 8;
const DEFAULT_BATCH = 2;
const DEFAULT_SUMMARY_CHARS = 1500;
const RULE_USER_TRUNC = 80;
const RULE_MENTOR_TRUNC = 60;

/**
 * 摘要系统提示：强调保留语义关键点（问者处境/三贤方向/命理判断）、合并而非拼接、限制字数。
 */
function summarizeSystemPrompt(maxChars: number): string {
  return (
    "你是天道茶寮的对话摘要助手。任务：把多轮三贤对谈压缩成关键信息摘要，供后续轮次承接上下文。\n\n" +
    "保留：\n- 问者的处境、困惑、关键背景、已做的决定\n" +
    "- 三贤（老胡/李/玄）各自给的核心方向、建议、命理判断（若有）\n" +
    "- 重要的时间节点、人物、事件因果\n\n" +
    "去掉：寒暄、口头禅、重复表述、格式套话、引用出处细节与检索轨迹。\n\n" +
    "输出要求：\n" +
    "- 纯文本，按「问者情况 / 三贤建议 / 关键结论」分段\n" +
    "- 若提供了「已有摘要」，把它与新对话合并成一份连贯摘要，不要简单拼接\n" +
    `- 不超过 ${maxChars} 字`
  );
}

/**
 * 把一批消息格式化成给 LLM 的输入文本（不截断，让模型看到完整内容去压缩）。
 */
function formatMessagesForSummary(messages: SessionMessage[]): string {
  return messages
    .map((m) => {
      const speaker = m.role === "user" ? "问者" : "三贤";
      return `${speaker}：${m.content.trim()}`;
    })
    .join("\n\n");
}

/**
 * 规则压缩（LLM 失败时回退）：把消息压成「角色：核心句」行。
 * 顺带修复"三贤不分"——用 parseMentorDialogue 拆出老胡/李/玄各自要点。
 */
function ruleBasedSummary(
  oldSummary: string | null,
  messages: SessionMessage[],
  maxChars: number,
): string {
  const lines: string[] = [];
  if (oldSummary) lines.push(oldSummary);
  for (const m of messages) {
    if (m.role === "user") {
      const text = m.content.trim().slice(0, RULE_USER_TRUNC);
      if (text) lines.push(`问者：${text}`);
      continue;
    }
    const segments = parseMentorDialogue(m.content);
    for (const seg of segments) {
      const label = seg.mentorId ? getMentor(seg.mentorId).shortName : "三贤";
      const text = seg.body.replace(/\s+/g, " ").trim().slice(0, RULE_MENTOR_TRUNC);
      if (text) lines.push(`${label}：${text}`);
    }
  }
  // 超长保留尾部（最近的更重要）；join 后整体截断。
  const joined = lines.join("\n");
  return joined.length > maxChars ? joined.slice(-maxChars) : joined;
}

/**
 * 构建「摘要 + 最近窗口」的上下文。
 *
 * @param messages 本 session 全量历史（不含当前轮问题，按 createdAt 升序）
 * @param session 当前摘要状态（旧 summary / summaryUpTo）
 * @param provider LLM provider（用于摘要；未实现 summarize 则走规则回退）
 */
export async function buildContextWithSummary(
  messages: SessionMessage[],
  session: SessionSummaryState,
  provider: LlmProvider,
  options?: ContextBuildOptions,
): Promise<ContextBuildResult> {
  const maxRecent = options?.maxRecentMessages ?? DEFAULT_RECENT;
  const batch = options?.summarizeBatchSize ?? DEFAULT_BATCH;
  const maxSummaryChars = options?.maxSummaryChars ?? DEFAULT_SUMMARY_CHARS;

  // 短对话：不摘要，直接原文。
  if (messages.length <= maxRecent) {
    return {
      context: buildConversationContext(messages),
      summary: session.summary ?? null,
      summaryUpTo: session.summaryUpTo ?? null,
      summarized: false,
    };
  }

  const recent = messages.slice(-maxRecent);
  const recentStartCreatedAt = recent[0].createdAt;

  // 窗口外、且在旧 summaryUpTo 之后的 = 本次待摘要。
  const toSummarize = messages.filter(
    (m) =>
      m.createdAt < recentStartCreatedAt &&
      (!session.summaryUpTo || m.createdAt > session.summaryUpTo),
  );

  let summary = session.summary ?? null;
  let summaryUpTo = session.summaryUpTo ?? null;
  let summarized = false;

  if (toSummarize.length >= batch) {
    const userPrompt =
      (summary ? `已有摘要：\n${summary}\n\n需要并入的新对话：\n` : "需要压缩成摘要的对话：\n") +
      formatMessagesForSummary(toSummarize);
    // LLM 摘要：provider 未实现 / 抛错 / 返回空 → 统一落到规则压缩回退，不阻塞对话。
    let llmText: string | null = null;
    if (typeof provider.summarize === "function") {
      try {
        llmText =
          (await provider.summarize({
            systemPrompt: summarizeSystemPrompt(maxSummaryChars),
            userPrompt,
            maxTokens: 768,
          }))?.text?.trim() || null;
      } catch (error) {
        console.warn(
          "[contextBuilder] LLM 摘要失败，回退规则压缩：",
          error instanceof Error ? error.message : error,
        );
      }
    }
    if (llmText) {
      summary = llmText.length > maxSummaryChars ? llmText.slice(0, maxSummaryChars) : llmText;
    } else {
      summary = ruleBasedSummary(summary, toSummarize, maxSummaryChars);
    }
    summaryUpTo = toSummarize[toSummarize.length - 1].createdAt;
    summarized = true;
  }

  const recentContext = buildConversationContext(recent);
  const summaryPart = summary ? `【此前对谈摘要】\n${summary}\n\n` : "";
  return {
    context: `${summaryPart}${recentContext}`,
    summary,
    summaryUpTo,
    summarized,
  };
}
