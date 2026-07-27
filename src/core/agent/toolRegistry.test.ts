import { describe, expect, it } from "vitest";
import { z } from "zod";
import { EvidenceLedger } from "./evidenceLedger";
import { ToolRegistry, type ToolContext, type ToolDefinition, type ToolResult } from "./toolRegistry";

const ctx = (): ToolContext => ({ ledger: new EvidenceLedger(), seenDocumentIds: new Set(), stepIndex: 0 });

const ok = (msg: string): ToolResult => ({ observationForModel: msg, observationSummary: msg, evidence: [] });

const echoTool: ToolDefinition<{ text: string }> = {
  name: "echo",
  description: "回声",
  inputJsonSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
  argsSchema: z.object({ text: z.string().min(1).max(10) }),
  timeoutMs: 200,
  maxCallsPerRun: 2,
  async execute(args) {
    return ok(`echo:${args.text}`);
  },
};

const slowTool: ToolDefinition<Record<string, never>> = {
  name: "slow",
  description: "慢",
  inputJsonSchema: { type: "object", properties: {} },
  argsSchema: z.object({}),
  timeoutMs: 30,
  maxCallsPerRun: 5,
  async execute() {
    await new Promise((r) => setTimeout(r, 120));
    return ok("不该到这");
  },
};

describe("ToolRegistry（校验 / 限次 / 超时 / 钩子）", () => {
  it("正常执行", async () => {
    const r = await new ToolRegistry([echoTool]).run("echo", { text: "hi" }, ctx());
    expect(r.isError).toBeFalsy();
    expect(r.observationForModel).toBe("echo:hi");
  });

  it("未知工具返回错误观察（不抛出）", async () => {
    const r = await new ToolRegistry([echoTool]).run("nope", {}, ctx());
    expect(r.isError).toBe(true);
    expect(r.observationForModel).toContain("不存在");
  });

  it("zod 校验失败：错误文本喂回模型", async () => {
    const r = await new ToolRegistry([echoTool]).run("echo", { text: "" }, ctx());
    expect(r.isError).toBe(true);
    expect(r.observationForModel).toContain("参数校验失败");
  });

  it("单轮调用次数上限", async () => {
    const reg = new ToolRegistry([echoTool]);
    await reg.run("echo", { text: "1" }, ctx());
    await reg.run("echo", { text: "2" }, ctx());
    const r = await reg.run("echo", { text: "3" }, ctx());
    expect(r.isError).toBe(true);
    expect(r.observationForModel).toContain("上限");
  });

  it("超时转错误观察", async () => {
    const r = await new ToolRegistry([slowTool]).run("slow", {}, ctx());
    expect(r.isError).toBe(true);
    expect(r.observationForModel).toContain("超时");
  });

  it("before/after 钩子触发", async () => {
    const seen: string[] = [];
    const reg = new ToolRegistry([echoTool], {
      beforeToolCall: (c) => seen.push(`before:${c.name}`),
      afterToolCall: (c) => seen.push(`after:${c.name}:${c.result.isError ? "err" : "ok"}`),
    });
    await reg.run("echo", { text: "hi" }, ctx());
    expect(seen).toEqual(["before:echo", "after:echo:ok"]);
  });
});
