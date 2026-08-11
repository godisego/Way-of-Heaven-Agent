/**
 * SSE 流式问答端点（Phase 3 · 流式回答）。
 *
 * 与 /api/chat 的区别：agent 模式下把 AgentEvent 逐帧推给客户端，
 * 让三贤正文逐字出现、执行轨迹面板实时填充；RAG 模式仍走一次性 JSON（见 /api/chat）。
 *
 * 内核零改动：runAgentLoop 已内置 onEvent 钩子，本路由只做「事件 → SSE 帧」的序列化。
 *
 * 帧协议（每帧 data: <json>\n\n）：
 *   { type:"step",  step }          取证/生成/校验步骤（轨迹面板逐条填充）
 *   { type:"delta", text }          三贤正文文本增量
 *   { type:"stop",  stopReason }    收束信号（取证结束）
 *   { type:"done",  state }         生成与校验完成
 *   { type:"final", answerMarkdown, citations, usedContext, trace, sessionId }
 *                                   终结帧：完整结果，已落盘，前端据此收尾
 *   { type:"error", message }       异常（不落盘部分助手消息）
 *   { type:"end" }                  关流
 */
export const runtime = "nodejs";

import { runAgentLoop } from "@/core/agent/orchestrator";
import type { AgentEvent } from "@/core/agent/types";
import { sessionApi } from "@/data/sessionStore";
import { buildContextWithSummary } from "@/core/conversation/contextBuilder";
import { getDefaultProvider } from "@/core/providers/openAICompatibleProvider";
import { prepareUserProfileForAgent, type UserProfile } from "@/data/userProfile";
import { MentorSelectionError, parseMentorSelection } from "@/data/mentorSelection";
import type { MentorId } from "@/data/mentors";
import { checkRateLimit } from "@/lib/rateLimit";

const SSE_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  // 禁止反向代理（含部分 Next 内部）缓冲，保证 token 即时下发
  "x-accel-buffering": "no",
};

export async function POST(request: Request) {
  // 速率限制：流式端点每分钟最多 15 次（比普通端点更严格）
  const rateCheck = checkRateLimit(request, {
    maxRequests: 15,
    windowMs: 60000,
  });
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: `请求过于频繁，请 ${rateCheck.retryAfter} 秒后重试` }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "Retry-After": String(rateCheck.retryAfter),
        },
      },
    );
  }
  let body: {
    question?: unknown;
    userProfile?: unknown;
    sessionId?: unknown;
    mode?: unknown;
    mentors?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const question = String(body.question ?? "").trim();
  if (!question) {
    return new Response(JSON.stringify({ error: "question 不能为空" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  let mentorIds: MentorId[] | undefined;
  try {
    mentorIds = parseMentorSelection(body.mentors);
  } catch (error) {
    const message = error instanceof MentorSelectionError ? error.message : "mentors 参数无效";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  // RAG 模式不支持流式（answerQuestion 无事件钩子）——回退到一次性 /api/chat。
  // 这里显式拒绝并提示，前端会改走 /api/chat。
  if (body.mode === "rag") {
    return new Response(
      JSON.stringify({ error: "RAG 模式暂不支持流式，请走 /api/chat" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const userProfile = (body.userProfile ?? null) as UserProfile | null;
  const safeProfile = prepareUserProfileForAgent(userProfile);
  const requestedSessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const session = requestedSessionId ? sessionApi.getSession(requestedSessionId) : null;
  if (requestedSessionId && !session) {
    return new Response(JSON.stringify({ error: "会话不存在，请重新选择会话" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  const activeSession = session ?? sessionApi.createSession();
  const previousMessages = sessionApi.getMessages(activeSession.id);
  // 构建上下文：长对话超窗口时用 LLM 摘要压缩更早的消息（rolling，持久化在 session）。
  const { context: conversationContext, summarized, summary, summaryUpTo } =
    await buildContextWithSummary(previousMessages, activeSession, getDefaultProvider());
  if (summarized && summary && summaryUpTo) {
    sessionApi.updateSessionSummary(activeSession.id, summary, summaryUpTo);
  }
  // 用户消息先落盘：即使中途断开，提问也保留（与 /api/chat 一致）。
  sessionApi.appendMessage(activeSession.id, { role: "user", content: question, citations: [] });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      const onEvent = (event: AgentEvent) => send(event);

      try {
        const answer = await runAgentLoop(question, safeProfile, {
          signal: request.signal,
          conversationContext,
          onEvent,
          mentorIds,
        });

        // done 已由 orchestrator 发出。落盘助手消息后，发终结帧给前端收尾。
        sessionApi.appendMessage(activeSession.id, {
          role: "assistant",
          content: answer.answerMarkdown,
          citations: answer.citations,
          trace: answer.trace,
        });
        send({
          type: "final",
          answerMarkdown: answer.answerMarkdown,
          citations: answer.citations,
          usedContext: answer.usedContext,
          trace: answer.trace,
          sessionId: activeSession.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "流式问答失败";
        // request.signal 触发的 abort 在多数运行时表现为 AbortError——视为取消，文案对齐。
        const isAbort = error instanceof Error && (error.name === "AbortError" || request.signal.aborted);
        send({ type: "error", message: isAbort ? "已取消" : message });
      } finally {
        send({ type: "end" });
        closed = true;
        controller.close();
      }
    },
    cancel() {
      // 客户端断开：request.signal 会传到 runAgentLoop，循环已能感知取消。
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
