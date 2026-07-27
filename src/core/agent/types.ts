/**
 * Agent 工具循环 · 共享类型（agent-loop-design.md 第 6/7 节）
 *
 * 轨迹原则：只记录结构化摘要（计划一句话、工具、观察、证据、停止原因），
 * 不保存任何私有思维链；不含密钥与完整出生信息。
 */

import type { VectorSearchResult } from "@/core/vector/vectorStore";
import type { Citation } from "@/core/retrieval/citationPolicy";

export type StopReason =
  | "ready" // 模型调用 ready_to_answer(sufficient=true)
  | "insufficient" // ready_to_answer(sufficient=false) 或证据台账为空
  | "max_steps"
  | "timeout"
  | "repeated_call"
  | "no_tool" // 取证阶段模型不调工具直接输出文本（文本被丢弃）
  | "cancelled"
  | "failed";

export type AgentState = "completed" | "insufficient" | "failed" | "cancelled";

export type TracePhase = "plan" | "tool" | "draft" | "verify";

export type TraceStep = {
  index: number;
  phase: TracePhase;
  /** 模型的一句话计划（≤80 字，来自工具调用同返回的文本块） */
  planSummary?: string;
  toolName?: string;
  /** 已截断的工具参数（不含敏感信息） */
  toolArgs?: Record<string, unknown>;
  /** 程序生成的观察摘要（非模型文本） */
  observationSummary?: string;
  /** 本步新增的证据 id */
  evidenceIds?: string[];
  durationMs: number;
  error?: string;
};

export type AgentTrace = {
  runId: string;
  mode: "agent";
  startedAt: string;
  durationMs: number;
  stopReason: StopReason;
  finalState: AgentState;
  steps: TraceStep[];
  totals: {
    toolCalls: number;
    evidenceCount: number;
    modelCalls: number;
  };
};

/** 证据台账条目：形状与 VectorSearchResult 对齐，复用 buildContext / 引用校验 */
export type EvidenceItem = VectorSearchResult;

export type EvidenceEntry = {
  evidenceId: string;
  addedAtStep: number;
  item: EvidenceItem;
};

export type AgentLimits = {
  /** 最大工具步数（含被拒绝的无效调用） */
  maxSteps: number;
  /** 单次模型调用超时（毫秒） */
  modelCallTimeoutMs: number;
  /** 整轮墙钟预算（毫秒） */
  totalTimeoutMs: number;
};

export const DEFAULT_AGENT_LIMITS: AgentLimits = {
  maxSteps: 6,
  modelCallTimeoutMs: 45_000,
  totalTimeoutMs: 90_000,
};

/** 事件流（Pi 式）：v1 由 API 层聚合返回；将来 SSE 逐步推送时内核零改动 */
export type AgentEvent =
  | { type: "step"; step: TraceStep }
  | { type: "stop"; stopReason: StopReason }
  | { type: "done"; state: AgentState };

export type AgentAnswer = {
  answerMarkdown: string;
  citations: Citation[];
  usedContext: Array<{
    chunkId: string;
    sourceFileName: string;
    pageNumber: number;
    score: number;
  }>;
  trace: AgentTrace;
};
