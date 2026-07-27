import { describe, expect, it } from "vitest";
import { z } from "zod";
import { runAgentLoop } from "./orchestrator";
import { ToolRegistry, type ToolDefinition, type ToolResult } from "./toolRegistry";
import type { ToolTransport, TransportDecision } from "./transport";
import type { AgentEvent, EvidenceItem } from "./types";

/** 脚本化 Transport：按预设序列吐决策，零 token 复现循环行为 */
class ScriptedTransport implements ToolTransport {
  private queue: TransportDecision[];
  calls = 0;
  constructor(decisions: TransportDecision[]) {
    this.queue = [...decisions];
  }
  async step(): Promise<TransportDecision> {
    this.calls += 1;
    const next = this.queue.shift();
    if (!next) throw new Error("ScriptedTransport 脚本耗尽");
    return next;
  }
}

const toolCall = (name: string, args: unknown, plan = "计划一步"): TransportDecision => ({
  kind: "tool_call",
  toolUseId: `tu_${Math.random().toString(36).slice(2, 8)}`,
  name,
  args,
  planSummary: plan,
  assistantContent: [],
});

const evidence = (chunkId: string): EvidenceItem => ({
  id: chunkId,
  chunkId,
  documentId: "doc_1",
  sourceFileName: "测试书.md",
  pageNumber: 1,
  sectionTitle: "第1节",
  bookTitle: "测试书",
  author: null,
  tradition: null,
  text: "测试内容：势未成时宜守。",
  embedding: [],
  score: 0.9,
});

/** 假检索工具：登记一条证据 */
const fakeSearch: ToolDefinition<{ query: string }> = {
  name: "search_library",
  description: "假检索",
  inputJsonSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  argsSchema: z.object({ query: z.string().min(1) }),
  timeoutMs: 1000,
  maxCallsPerRun: 5,
  async execute(args, ctx): Promise<ToolResult> {
    const item = evidence(`c_${args.query}`);
    ctx.seenDocumentIds.add(item.documentId);
    ctx.ledger.add([item], ctx.stepIndex);
    return {
      observationForModel: `命中 1 条：[${ctx.ledger.idOf(item.chunkId)}]`,
      observationSummary: `检索「${args.query}」：1 命中`,
      evidence: [item],
    };
  },
};

const GOOD_ANSWER = `【盲派算师·老胡】
哎，老夫瞧着——势未成，宜守。[《测试书》, 第1节] 这两周钱别动，人别硬碰。

【存在主义导师·李】
「等」也是选择。今晚把那件事写成一句话，贴在明早看得见的地方。

【主事·玄】
两位说的是一件事。这周只做一件：停下搅浑水的手。贫道听着。且去，莫急。`;

function draftStub(answers: string[] = [GOOD_ANSWER]) {
  const queue = [...answers];
  const calls: string[] = [];
  return {
    calls,
    provider: {
      async generateAnswer(input: { question: string }) {
        calls.push(input.question);
        return { text: queue.shift() ?? GOOD_ANSWER };
      },
    },
  };
}

function registryWith() {
  return new ToolRegistry([fakeSearch]);
}

describe("runAgentLoop（受控取证循环）", () => {
  it("顺畅路径：检索 → ready(true) → 生成 → completed，引用可核", async () => {
    const stub = draftStub();
    const r = await runAgentLoop("我该守还是动？", null, {
      transport: new ScriptedTransport([
        toolCall("search_library", { query: "进退" }, "先查进退之势"),
        toolCall("ready_to_answer", { sufficient: true }),
      ]),
      registry: registryWith(),
      draftProvider: stub.provider,
    });
    expect(r.trace.finalState).toBe("completed");
    expect(r.trace.stopReason).toBe("ready");
    expect(r.trace.totals.toolCalls).toBe(1);
    expect(r.trace.totals.evidenceCount).toBe(1);
    expect(r.citations).toHaveLength(1);
    expect(r.trace.steps.some((s) => s.evidenceIds?.includes("ev_1"))).toBe(true);
    expect(r.trace.steps.map((s) => s.phase)).toContain("draft");
    expect(r.trace.steps.map((s) => s.phase)).toContain("verify");
    expect(stub.calls).toHaveLength(1);
  });

  it("ready(false)：insufficient，透出 missing，不进入生成", async () => {
    const stub = draftStub();
    const r = await runAgentLoop("问", null, {
      transport: new ScriptedTransport([
        toolCall("ready_to_answer", { sufficient: false, missing: "库中暂无命理典籍" }),
      ]),
      registry: registryWith(),
      draftProvider: stub.provider,
    });
    expect(r.trace.finalState).toBe("insufficient");
    expect(r.answerMarkdown).toContain("库中暂无命理典籍");
    expect(stub.calls).toHaveLength(0);
  });

  it("步数上限：到顶后带证据收束生成", async () => {
    const stub = draftStub();
    const r = await runAgentLoop("问", null, {
      transport: new ScriptedTransport([
        toolCall("search_library", { query: "一" }),
        toolCall("search_library", { query: "二" }),
        toolCall("search_library", { query: "三" }),
      ]),
      registry: registryWith(),
      draftProvider: stub.provider,
      limits: { maxSteps: 2 },
    });
    expect(r.trace.stopReason).toBe("max_steps");
    expect(r.trace.totals.toolCalls).toBe(2);
    expect(r.trace.finalState).toBe("completed");
  });

  it("重复调用（同工具同参数）即停", async () => {
    const stub = draftStub();
    const r = await runAgentLoop("问", null, {
      transport: new ScriptedTransport([
        toolCall("search_library", { query: "同" }),
        toolCall("search_library", { query: "同" }),
      ]),
      registry: registryWith(),
      draftProvider: stub.provider,
    });
    expect(r.trace.stopReason).toBe("repeated_call");
    expect(r.trace.totals.toolCalls).toBe(1);
    expect(r.trace.finalState).toBe("completed");
  });

  it("取证阶段直接输出文本：文本被丢弃，带证据转入生成", async () => {
    const stub = draftStub();
    const r = await runAgentLoop("问", null, {
      transport: new ScriptedTransport([
        toolCall("search_library", { query: "势" }),
        { kind: "no_tool", text: "我直接替三贤回答：你应该辞职！", assistantContent: [] },
      ]),
      registry: registryWith(),
      draftProvider: stub.provider,
    });
    expect(r.trace.stopReason).toBe("no_tool");
    expect(r.answerMarkdown).not.toContain("辞职");
    expect(r.trace.finalState).toBe("completed");
  });

  it("参数校验失败：错误观察计入轨迹，循环继续；证据为空则 insufficient", async () => {
    const stub = draftStub();
    const r = await runAgentLoop("问", null, {
      transport: new ScriptedTransport([
        toolCall("search_library", { topK: 3 }), // 缺 query
        toolCall("ready_to_answer", { sufficient: true }),
      ]),
      registry: registryWith(),
      draftProvider: stub.provider,
    });
    expect(r.trace.steps.some((s) => s.error)).toBe(true);
    expect(r.trace.finalState).toBe("insufficient"); // ready(true) 但台账为空
    expect(stub.calls).toHaveLength(0);
  });

  it("取消信号：cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const r = await runAgentLoop("问", null, {
      transport: new ScriptedTransport([toolCall("search_library", { query: "x" })]),
      registry: registryWith(),
      draftProvider: draftStub().provider,
      signal: controller.signal,
    });
    expect(r.trace.finalState).toBe("cancelled");
  });

  it("事件流：每步即时外发，收尾有 stop/done", async () => {
    const events: AgentEvent[] = [];
    await runAgentLoop("问", null, {
      transport: new ScriptedTransport([
        toolCall("search_library", { query: "a" }),
        toolCall("ready_to_answer", { sufficient: true }),
      ]),
      registry: registryWith(),
      draftProvider: draftStub().provider,
      onEvent: (e) => events.push(e),
    });
    expect(events.filter((e) => e.type === "step").length).toBeGreaterThanOrEqual(3);
    expect(events.some((e) => e.type === "stop")).toBe(true);
    expect(events.at(-1)?.type).toBe("done");
  });

  it("生成不合规时定向重试一次（引用与声口）", async () => {
    const bad = "【盲派算师·老胡】\n没引用瞎说。\n\n【存在主义导师·李】\n你的大运不行。\n\n【主事·玄】\n且去。";
    const stub = draftStub([bad, GOOD_ANSWER]);
    const r = await runAgentLoop("问", null, {
      transport: new ScriptedTransport([
        toolCall("search_library", { query: "q" }),
        toolCall("ready_to_answer", { sufficient: true }),
      ]),
      registry: registryWith(),
      draftProvider: stub.provider,
    });
    expect(stub.calls).toHaveLength(2);
    expect(stub.calls[1]).toContain("命理语汇");
    expect(r.citations).toHaveLength(1);
    expect(r.trace.finalState).toBe("completed");
  });
});
