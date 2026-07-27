/**
 * Agent Orchestrator —— 受控取证循环（agent-loop-design.md 第 6 节，含 v1.1 事件流修订）。
 *
 * 状态机：received → (planning → tool_call → observing)* → evidence_ready
 *         → drafting → verifying → completed | insufficient | failed | cancelled
 *
 * 停止条件（6.3）：最大步数 / 单调用超时 / 总墙钟 / 重复调用 / ready_to_answer /
 * 模型不调工具（其文本被丢弃）/ 用户取消。
 *
 * 事件流：每步产出结构化 TraceStep，经 onEvent 即时外发（Pi 式）；
 * v1 的 API 层聚合成一次性响应，将来 SSE 逐步推送时本文件零改动。
 */

import { getDefaultProvider } from "@/core/providers/openAICompatibleProvider";
import type { GenerateAnswerInput, GenerateAnswerResult } from "@/core/providers/llmProvider";
import type { UserProfile } from "@/data/userProfile";
import { parseMentorDialogue } from "@/data/mentors";
import { buildContext } from "@/core/retrieval/retrieveContext";
import { needsCitation, validateCitations, type Citation } from "@/core/retrieval/citationPolicy";
import { checkVoice, violationRetryText, type VoiceViolation } from "@/core/retrieval/voicePolicy";
import { EvidenceLedger } from "./evidenceLedger";
import { ToolRegistry, type ToolHooks } from "./toolRegistry";
import { defaultTools } from "./tools";
import {
  AnthropicToolTransport,
  toolResultTurn,
  userTurn,
  type ToolTransport,
  type TransportTurn,
} from "./transport";
import {
  DEFAULT_AGENT_LIMITS,
  type AgentAnswer,
  type AgentEvent,
  type AgentLimits,
  type AgentState,
  type AgentTrace,
  type StopReason,
  type TraceStep,
} from "./types";

/** 取证阶段的调度者 prompt——不是三贤人设；三贤只在生成阶段出场 */
const GATHERING_SYSTEM = `你是「天道茶寮」的取证调度者（不是三贤本人，问者看不到你）。
你的唯一职责：为问者的困惑收集典籍证据，然后交棒给三贤生成。

规则：
1. 每次只调用一个工具。调用前用一句话（不超过 40 字）说明这一步的计划，除此之外不输出任何其他文字。
2. 证据够支撑回答就立刻 ready_to_answer(sufficient=true)——够用即收，不贪多。
3. 检索无命中就换角度改写检索词再试；确认库中确实无据，则 ready_to_answer(sufficient=false, missing=一句话说明缺什么)。
4. 检索命中但只有零散片段、不确定语境时，用 read_source_unit 核对完整原文再收。
5. 你不生成最终回答，不使用引用格式，不涉及问者生辰。`;

type DraftProvider = {
  generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult>;
};

export type RunAgentOptions = {
  transport?: ToolTransport;
  registry?: ToolRegistry;
  draftProvider?: DraftProvider;
  limits?: Partial<AgentLimits>;
  hooks?: ToolHooks;
  onEvent?: (event: AgentEvent) => void;
  signal?: AbortSignal;
};

function sanitizeArgs(args: unknown): Record<string, unknown> | undefined {
  if (!args || typeof args !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v.length > 120 ? `${v.slice(0, 120)}…` : v;
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
    else out[k] = "…";
  }
  return out;
}

export async function runAgentLoop(
  question: string,
  userProfile: UserProfile | null,
  opts: RunAgentOptions = {},
): Promise<AgentAnswer> {
  const startedAt = Date.now();
  const limits: AgentLimits = { ...DEFAULT_AGENT_LIMITS, ...opts.limits };
  const ledger = new EvidenceLedger();
  const seenDocumentIds = new Set<string>();
  const registry = opts.registry ?? new ToolRegistry(defaultTools(), opts.hooks);
  const transport = opts.transport ?? new AnthropicToolTransport();

  const steps: TraceStep[] = [];
  let toolCalls = 0;
  let modelCalls = 0;
  let stopReason: StopReason = "max_steps";
  let insufficientMissing: string | undefined;
  const seenCalls = new Set<string>();
  const turns: TransportTurn[] = [userTurn(`问者的困惑：${question}`)];

  const emit = (event: AgentEvent) => opts.onEvent?.(event);
  const pushStep = (step: Omit<TraceStep, "index">) => {
    const full: TraceStep = { index: steps.length, ...step };
    steps.push(full);
    emit({ type: "step", step: full });
    return full;
  };

  // ── 取证循环 ──
  try {
    while (toolCalls < limits.maxSteps) {
      if (opts.signal?.aborted) {
        stopReason = "cancelled";
        break;
      }
      if (Date.now() - startedAt > limits.totalTimeoutMs) {
        stopReason = "timeout";
        pushStep({ phase: "plan", observationSummary: "总时长超出预算，带现有证据收束", durationMs: 0 });
        break;
      }

      modelCalls += 1;
      const decision = await transport.step({
        system: GATHERING_SYSTEM,
        turns,
        tools: registry.list(),
        timeoutMs: limits.modelCallTimeoutMs,
        signal: opts.signal,
      });

      if (decision.kind === "no_tool") {
        // 取证阶段不许直接作答：文本一律丢弃（只留 80 字计划位），转入正式生成
        stopReason = "no_tool";
        pushStep({
          phase: "plan",
          planSummary: decision.text.slice(0, 80) || undefined,
          observationSummary: "模型未调用工具；其文本已丢弃，带现有证据转入生成",
          durationMs: 0,
        });
        break;
      }

      if (decision.name === "ready_to_answer") {
        const args = (decision.args ?? {}) as { sufficient?: boolean; missing?: string };
        const sufficient = args.sufficient === true;
        stopReason = sufficient ? "ready" : "insufficient";
        if (!sufficient && typeof args.missing === "string" && args.missing.trim()) {
          insufficientMissing = args.missing.trim().slice(0, 100);
        }
        pushStep({
          phase: "tool",
          toolName: "ready_to_answer",
          toolArgs: sanitizeArgs(args),
          planSummary: decision.planSummary || undefined,
          observationSummary: sufficient
            ? `证据充分（${ledger.count()} 条），进入三贤生成`
            : `证据不足${insufficientMissing ? `：${insufficientMissing}` : ""}`,
          durationMs: 0,
        });
        break;
      }

      const callKey = `${decision.name}:${JSON.stringify(decision.args ?? {})}`;
      if (seenCalls.has(callKey)) {
        stopReason = "repeated_call";
        pushStep({
          phase: "tool",
          toolName: decision.name,
          toolArgs: sanitizeArgs(decision.args),
          planSummary: decision.planSummary || undefined,
          observationSummary: "重复调用（同工具同参数），停止取证",
          durationMs: 0,
        });
        break;
      }
      seenCalls.add(callKey);

      toolCalls += 1;
      const stepIndex = steps.length;
      const t0 = Date.now();
      const result = await registry.run(decision.name, decision.args, {
        ledger,
        seenDocumentIds,
        stepIndex,
      });
      const evidenceIds = result.evidence
        .map((e) => ledger.idOf(e.chunkId))
        .filter((id): id is string => Boolean(id));
      pushStep({
        phase: "tool",
        toolName: decision.name,
        toolArgs: sanitizeArgs(decision.args),
        planSummary: decision.planSummary || undefined,
        observationSummary: result.observationSummary,
        evidenceIds: evidenceIds.length ? evidenceIds : undefined,
        durationMs: Date.now() - t0,
        error: result.isError ? result.observationSummary.slice(0, 120) : undefined,
      });

      turns.push({ role: "assistant", content: decision.assistantContent });
      turns.push(toolResultTurn(decision.toolUseId, result.observationForModel));
    }
  } catch (error) {
    stopReason = opts.signal?.aborted ? "cancelled" : "failed";
    pushStep({
      phase: "tool",
      observationSummary: "取证循环中断",
      error: (error instanceof Error ? error.message : String(error)).slice(0, 200),
      durationMs: 0,
    });
  }

  // ── 生成与校验 ──
  let finalState: AgentState;
  let answer = "";
  let citations: Citation[] = [];

  if (stopReason === "cancelled") {
    finalState = "cancelled";
    answer = "本轮已取消。";
  } else if (stopReason === "failed") {
    finalState = "failed";
    answer = "取证过程出错，本轮未能生成回应。请稍后重试。";
  } else if (stopReason === "insufficient" || ledger.count() === 0) {
    finalState = "insufficient";
    answer =
      `典籍中暂时没有能贴合你这个困惑的内容${insufficientMissing ? `（${insufficientMissing}）` : ""}。` +
      "你可以先上传一些相关的书籍或笔记（.md/.txt/.pdf），我再结合它们与你细聊。";
  } else {
    const provider: DraftProvider = opts.draftProvider ?? getDefaultProvider();
    const context = buildContext(ledger.records());

    const tDraft = Date.now();
    modelCalls += 1;
    answer = (await provider.generateAnswer({ question, context, userProfile })).text.trim();
    pushStep({
      phase: "draft",
      observationSummary: `三贤生成完成（证据 ${ledger.count()} 条进入 Sources）`,
      durationMs: Date.now() - tDraft,
    });

    // 校验：引用（对证据台账）+ 声口；合并一次定向重试
    citations = validateCitations(answer, ledger.records());
    let voiceViolations: VoiceViolation[] = checkVoice(parseMentorDialogue(answer));
    const problems: string[] = [];
    if (needsCitation(answer) && citations.length === 0) {
      problems.push(
        "- 引用的出处无法核对：凡引述思想或原文，必须使用 [《书名》, 章节] 格式，且只能取自 Sources 的 cite_as。",
      );
    }
    if (voiceViolations.length) problems.push(violationRetryText(voiceViolations));

    let retried = false;
    if (problems.length) {
      retried = true;
      modelCalls += 1;
      answer = (
        await provider.generateAnswer({
          question: `${question}\n\n上一次回应存在以下问题，请整组重写并逐条修正（保持三段格式与各自声口）：\n${problems.join("\n")}`,
          context,
          userProfile,
        })
      ).text.trim();
      citations = validateCitations(answer, ledger.records());
      voiceViolations = checkVoice(parseMentorDialogue(answer));
    }

    if (needsCitation(answer) && citations.length === 0) {
      answer = `${answer}\n\n⚠️ 这段回应中引用的出处未能通过校验，请打开下方检索到的典籍原文自行核对。`;
    }
    if (voiceViolations.length) {
      answer = `${answer}\n\n⚠️ 本轮未完全通过角色声口校验：${voiceViolations.map((v) => v.detail).join("；")}。`;
    }

    pushStep({
      phase: "verify",
      observationSummary: `校验完成：有效引用 ${citations.length} 条${retried ? "（曾定向重试一次）" : ""}${voiceViolations.length ? "，声口警告未清" : ""}`,
      durationMs: 0,
    });
    finalState = "completed";
  }

  const trace: AgentTrace = {
    runId: `run_${startedAt.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    mode: "agent",
    startedAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    stopReason,
    finalState,
    steps,
    totals: { toolCalls, evidenceCount: ledger.count(), modelCalls },
  };
  emit({ type: "stop", stopReason });
  emit({ type: "done", state: finalState });

  return {
    answerMarkdown: answer,
    citations,
    usedContext: ledger.records().map((item) => ({
      chunkId: item.chunkId,
      sourceFileName: item.sourceFileName,
      pageNumber: item.pageNumber,
      score: item.score,
    })),
    trace,
  };
}
