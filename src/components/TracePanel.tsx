"use client";

import type { AgentTrace, TraceStep, StopReason } from "@/core/agent/types";

const STOP_LABEL: Record<StopReason, string> = {
  ready: "证据已足（模型自报收束）",
  insufficient: "证据不足（如实降级作答）",
  max_steps: "达到步数上限",
  timeout: "超时刹车",
  repeated_call: "重复调用刹车",
  no_tool: "模型未调工具（裸文本已丢弃）",
  cancelled: "已取消",
  failed: "执行失败",
};

const TOOL_LABEL: Record<string, string> = {
  search_library: "检索藏书",
  read_source_unit: "精读一页",
  ready_to_answer: "宣告收束",
};

function argsBrief(args?: Record<string, unknown>): string {
  if (!args) return "";
  return Object.entries(args)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" · ");
}

function StepRow({ step }: { step: TraceStep }) {
  return (
    <li className={`trace-step${step.error ? " has-error" : ""}`}>
      <span className="trace-step-no">{step.index + 1}</span>
      <div className="trace-step-body">
        {step.planSummary ? <div className="trace-plan">「{step.planSummary}」</div> : null}
        <div className="trace-call">
          <strong>{step.toolName ? (TOOL_LABEL[step.toolName] ?? step.toolName) : step.phase}</strong>
          {step.toolName ? <code>{step.toolName}</code> : null}
          {step.toolArgs ? <span className="trace-args">{argsBrief(step.toolArgs)}</span> : null}
        </div>
        {step.observationSummary ? <div className="trace-obs">{step.observationSummary}</div> : null}
        <div className="trace-meta">
          {step.evidenceIds?.length ? (
            <span className="trace-evs">
              {step.evidenceIds.map((id) => (
                <em key={id}>{id}</em>
              ))}
            </span>
          ) : null}
          <span className="trace-ms">{step.durationMs} ms</span>
          {step.error ? <span className="trace-err">{step.error}</span> : null}
        </div>
      </div>
    </li>
  );
}

/**
 * M4 · 执行轨迹面板：把 Agent 循环的每一步（工具 → 观察 → 证据）摊开给人看。
 * 只展示结构化摘要——轨迹里本就不含私有思维链与敏感信息。
 */
export function TracePanel({ trace }: { trace: AgentTrace }) {
  // 防御：历史会话可能存了结构不完整的 trace（旧版本写入），兜底避免渲染崩溃
  const totals = trace.totals ?? { toolCalls: 0, evidenceCount: 0, modelCalls: 0 };
  const steps = Array.isArray(trace.steps) ? trace.steps : [];
  return (
    <details className="trace-panel" data-tour-id="trace-panel" data-tip="Agent 执行轨迹：调度模型每一步调了什么工具、看到什么观察、收了哪些证据（ev_N），以及最终为何停下。这是学习中心 Agent 径第三课的实景教具。">
      <summary>
        <span className="trace-title">执行轨迹</span>
        <span className="trace-sum">
          {totals.toolCalls} 次工具 · {totals.evidenceCount} 条证据 · {totals.modelCalls} 次模型调用 · {trace.durationMs ?? 0} ms
        </span>
        <span className={`trace-stop is-${trace.finalState ?? "completed"}`}>{STOP_LABEL[trace.stopReason ?? "ready"] ?? trace.stopReason}</span>
      </summary>
      <ol className="trace-steps">
        {steps.map((step) => (
          <StepRow key={step.index} step={step} />
        ))}
      </ol>
    </details>
  );
}
