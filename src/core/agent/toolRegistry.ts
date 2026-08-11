/**
 * Tool Registry —— agent-loop-design.md 第 4.1 节（含 v1.1 修订：before/after 钩子）。
 *
 * 模型永远不直接执行任何东西：它只输出「调用哪个工具 + 参数」，
 * 本注册表负责 zod 校验、超时、调用次数限制与结果截断，然后把
 * Observation 交回循环。校验失败的错误文本也会喂回模型——它有一次
 * 修正参数的机会（计入步数）。
 */

import type { ZodType } from "zod";
import type { ConfigOverride } from "@/core/config/appConfig";
import type { EvidenceItem } from "./types";
import type { EvidenceLedger } from "./evidenceLedger";
import type { MentorId } from "@/data/mentors";

export type ToolContext = {
  /** 证据台账（工具登记证据、生成 ev_N 观察文本用） */
  ledger: EvidenceLedger;
  /** 原始问句；工具可用它做跨轮次的相关性安全校验 */
  question?: string;
  /** 本轮已在检索结果中出现过的 documentId（read_source_unit 的白名单） */
  seenDocumentIds: Set<string>;
  /** 当前步序（登记证据用） */
  stepIndex: number;
  /** 运行时配置覆盖（内部测试或显式调用方）：search_library 据此选择 embedding */
  configOverride?: ConfigOverride;
  /** 子集对谈时，检索结果只允许落入这些角色的专库。 */
  activeMentors?: MentorId[];
};

export type ToolResult = {
  /** 回给模型的 Observation（已截断、不含敏感信息） */
  observationForModel: string;
  /** 程序生成的一行摘要（进轨迹，非模型文本） */
  observationSummary: string;
  /** 本次带回的证据（orchestrator 经台账去重登记） */
  evidence: EvidenceItem[];
  /** 是否为错误观察（参数校验失败 / 超时 / 白名单拒绝等） */
  isError?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyToolDefinition = ToolDefinition<any>;

export type ToolDefinition<Args> = {
  name: string;
  /** 给模型看的说明：说清「何时该用我」 */
  description: string;
  /** 给模型的 JSON Schema（手写；工具少，不引 schema 生成依赖） */
  inputJsonSchema: Record<string, unknown>;
  /** 运行时校验 */
  argsSchema: ZodType<Args>;
  timeoutMs: number;
  maxCallsPerRun: number;
  execute(args: Args, ctx: ToolContext): Promise<ToolResult>;
};

export type ToolHooks = {
  beforeToolCall?: (call: { name: string; args: unknown }) => void;
  afterToolCall?: (call: { name: string; args: unknown; result: ToolResult; durationMs: number }) => void;
};

function errorResult(text: string): ToolResult {
  return { observationForModel: text, observationSummary: text, evidence: [], isError: true };
}

export class ToolRegistry {
  private tools = new Map<string, AnyToolDefinition>();
  private callCounts = new Map<string, number>();
  private hooks: ToolHooks;

  constructor(tools: AnyToolDefinition[], hooks: ToolHooks = {}) {
    this.hooks = hooks;
    for (const tool of tools) this.tools.set(tool.name, tool);
  }

  list(): AnyToolDefinition[] {
    return [...this.tools.values()];
  }

  get(name: string): AnyToolDefinition | null {
    return this.tools.get(name) ?? null;
  }

  /** 校验 + 限次 + 超时的受控执行。任何失败都返回错误观察，而不是抛出。 */
  async run(name: string, rawArgs: unknown, ctx: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return errorResult(`工具「${name}」不存在。可用工具：${[...this.tools.keys()].join("、")}。`);
    }

    const used = this.callCounts.get(name) ?? 0;
    if (used >= tool.maxCallsPerRun) {
      return errorResult(`工具「${name}」本轮调用次数已达上限（${tool.maxCallsPerRun} 次）。请基于已有证据继续，或调用 ready_to_answer。`);
    }
    this.callCounts.set(name, used + 1);

    const parsed = tool.argsSchema.safeParse(rawArgs);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("；");
      return errorResult(`参数校验失败：${issues}。请修正参数后重试（参数 schema 见工具说明）。`);
    }

    this.hooks.beforeToolCall?.({ name, args: parsed.data });
    const startedAt = Date.now();
    try {
      const result = await withTimeout(tool.execute(parsed.data, ctx), tool.timeoutMs);
      this.hooks.afterToolCall?.({ name, args: parsed.data, result, durationMs: Date.now() - startedAt });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const result = errorResult(`工具「${name}」执行失败：${message}`);
      this.hooks.afterToolCall?.({ name, args: parsed.data, result, durationMs: Date.now() - startedAt });
      return result;
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`超时（${ms}ms）`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}
