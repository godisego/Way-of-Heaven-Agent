import { describe, expect, it, vi } from "vitest";
import type { SessionMessage } from "@/data/sessionStore";
import type { LlmProvider, SummarizeInput } from "@/core/providers/llmProvider";
import { buildContextWithSummary } from "./contextBuilder";

/** 造一条消息；createdAt 用递增 ISO 串保证排序稳定。 */
function msg(role: "user" | "assistant", content: string, n: number): SessionMessage {
  const ts = `2026-01-01T00:${String(n).padStart(2, "0")}:00.000Z`;
  return { id: `m${n}`, sessionId: "s1", role, content, citations: [], createdAt: ts };
}

/** 12 轮对话（user/assistant 交替），assistant 含三贤段落标题供规则回退解析。 */
function twelveRounds(): SessionMessage[] {
  const out: SessionMessage[] = [];
  for (let i = 1; i <= 12; i += 1) {
    out.push(msg("user", `这是第 ${i} 个问题，讲讲我的处境 ${i}。`, i * 2 - 1));
    out.push(
      msg(
        "assistant",
        `【盲派算师·老胡】\n老夫瞧着第 ${i} 轮，月令得令。\n\n【存在主义导师·李】\n你在逃避选择 ${i}。\n\n【主事·玄】\n贫道听着，方向 ${i} 已现。`,
        i * 2,
      ),
    );
  }
  return out;
}

/** mock provider：summarize 可被 spy/控制。 */
function makeProvider(
  summarizeImpl?: (input: SummarizeInput) => Promise<{ text: string }>,
): LlmProvider & { calls: SummarizeInput[] } {
  const calls: SummarizeInput[] = [];
  const provider = {
    async generateAnswer() {
      return { text: "" };
    },
    async summarize(input: SummarizeInput) {
      calls.push(input);
      return summarizeImpl ? summarizeImpl(input) : { text: "默认摘要" };
    },
  } as unknown as LlmProvider & { calls: SummarizeInput[] };
  provider.calls = calls;
  return provider;
}

describe("buildContextWithSummary", () => {
  it("短对话（≤窗口）不触发摘要，直接原文", async () => {
    const provider = makeProvider();
    const messages = twelveRounds().slice(0, 6); // 6 条 < 8
    const result = await buildContextWithSummary(messages, {}, provider);
    expect(provider.calls.length).toBe(0);
    expect(result.summarized).toBe(false);
    // 6 条全部进原文
    expect(result.context).toContain("第 1 个问题");
    expect(result.context).toContain("第 3 个问题");
  });

  it("超窗口触发 LLM 摘要，context = 摘要 + 最近窗口", async () => {
    const provider = makeProvider(async () => ({ text: "LLM 压缩的摘要" }));
    const messages = twelveRounds(); // 24 条
    const result = await buildContextWithSummary(messages, {}, provider);

    expect(result.summarized).toBe(true);
    expect(result.summary).toBe("LLM 压缩的摘要");
    // 摘要部分出现在 context 顶部
    expect(result.context.startsWith("【此前对谈摘要】\nLLM 压缩的摘要")).toBe(true);
    // 最近 8 条（msg 17-24）原文在 context 中
    expect(result.context).toContain("第 9 个问题"); // msg 17
    // 窗口外的早期消息不应以原文形式出现（已被摘要取代）
    expect(result.context).not.toContain("第 1 个问题");
  });

  it("rolling：第二次只摘要 summaryUpTo 之后的增量", async () => {
    const provider = makeProvider(async () => ({ text: "合并后的摘要" }));
    const messages = twelveRounds();
    // 第一轮：已摘要到 msg 8（createdAt = T00:08）
    const firstState = { summary: "旧摘要", summaryUpTo: "2026-01-01T00:08:00.000Z" };
    const result = await buildContextWithSummary(messages, firstState, provider);

    expect(provider.calls.length).toBe(1);
    const userPrompt = provider.calls[0].userPrompt;
    // 增量消息（msg 9-16，即第 5-8 轮）应在 prompt 里
    expect(userPrompt).toContain("第 5 个问题");
    // 旧摘要被并入
    expect(userPrompt).toContain("已有摘要");
    expect(userPrompt).toContain("旧摘要");
    // summaryUpTo 推进到窗口外最后一条
    expect(result.summaryUpTo).toBe("2026-01-01T00:16:00.000Z"); // msg 16
  });

  it("LLM 摘要抛错 → 规则回退，不阻塞，按角色压缩", async () => {
    const provider = makeProvider(async () => {
      throw new Error("网络失败");
    });
    const messages = twelveRounds();
    const result = await buildContextWithSummary(messages, {}, provider);

    expect(result.summarized).toBe(true);
    expect(result.summary).toBeTruthy();
    // 规则回退按角色标注：应含三贤各自的短名标签
    expect(result.summary).toContain("问者：");
    // 三贤段落被 parseMentorDialogue 拆开（取首句）
    expect(result.summary).toContain("老胡：");
    expect(result.summary).toContain("李：");
    expect(result.summary).toContain("玄：");
  });

  it("provider 无 summarize 方法 → 规则回退", async () => {
    const provider = { async generateAnswer() {
      return { text: "" };
    } } as unknown as LlmProvider;
    const messages = twelveRounds();
    const result = await buildContextWithSummary(messages, {}, provider);

    expect(result.summarized).toBe(true);
    expect(result.summary).toContain("问者：");
    expect(result.summary).toContain("老胡：");
  });

  it("窗口外消息数不足 batch 时不触发摘要", async () => {
    const provider = makeProvider();
    // summaryUpTo 在 msg 14，recent 起于 msg 17 → toSummarize 只有 msg 15-16（2 条）
    // batch 默认 2，刚好触发；这里把 summaryUpTo 设到 msg 16 让 toSummarize 为空
    const messages = twelveRounds();
    const result = await buildContextWithSummary(
      messages,
      { summary: "已有摘要", summaryUpTo: "2026-01-01T00:16:00.000Z" },
      provider,
    );
    expect(provider.calls.length).toBe(0);
    expect(result.summarized).toBe(false);
    // 旧摘要仍出现在 context
    expect(result.context).toContain("已有摘要");
  });

  it("summarize 返回空文本 → 走规则回退", async () => {
    const provider = makeProvider(async () => ({ text: "   " }));
    const messages = twelveRounds();
    const result = await buildContextWithSummary(messages, {}, provider);
    expect(result.summarized).toBe(true);
    expect(result.summary).toContain("问者：");
  });
});
