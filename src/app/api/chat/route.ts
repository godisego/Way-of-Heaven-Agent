export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { answerQuestion } from "@/core/retrieval/answerWithCitations";
import { runAgentLoop } from "@/core/agent/orchestrator";
import { buildContextWithSummary } from "@/core/conversation/contextBuilder";
import { sessionApi } from "@/data/sessionStore";
import { getDefaultProvider } from "@/core/providers/openAICompatibleProvider";
import { prepareUserProfileForAgent, type UserProfile } from "@/data/userProfile";
import { readLocalVectorRecords } from "@/core/vector/localJsonVectorStore";
import { maybeAnswerFromWeb } from "@/core/search/webFallback";
import { MentorSelectionError, parseMentorSelection } from "@/data/mentorSelection";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  // 速率限制：每分钟最多 20 次问答请求
  const rateCheck = checkRateLimit(request, {
    maxRequests: 20,
    windowMs: 60000,
  });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `请求过于频繁，请 ${rateCheck.retryAfter} 秒后重试` },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } },
    );
  }
  try {
    const body = await request.json();
    const question = String(body.question ?? "").trim();
    if (!question) return NextResponse.json({ error: "question 不能为空" }, { status: 400 });
    const mentorIds = parseMentorSelection(body.mentors);
    const userProfile = (body.userProfile ?? null) as UserProfile | null;
    const safeProfile = prepareUserProfileForAgent(userProfile);
    const requestedSessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const session = requestedSessionId ? sessionApi.getSession(requestedSessionId) : null;
    if (requestedSessionId && !session) {
      return NextResponse.json({ error: "会话不存在，请重新选择会话" }, { status: 404 });
    }
    const activeSession = session ?? sessionApi.createSession();
    const previousMessages = sessionApi.getMessages(activeSession.id);
    // 构建上下文：长对话超窗口时用 LLM 摘要压缩更早的消息（rolling，持久化在 session）。
    const { context: conversationContext, summarized, summary, summaryUpTo } =
      await buildContextWithSummary(previousMessages, activeSession, getDefaultProvider());
    if (summarized && summary && summaryUpTo) {
      sessionApi.updateSessionSummary(activeSession.id, summary, summaryUpTo);
    }
    sessionApi.appendMessage(activeSession.id, { role: "user", content: question, citations: [] });
    // 早期检测：索引为空时直接返回明确提示，不让模型说"材料不足"
    const vectorCount = readLocalVectorRecords().length;
    if (vectorCount === 0) {
      const hint =
        "典籍库尚未入库——请先在终端运行 `npm run seed:all`，将自带的 27 卷示例藏书与命理教材导入向量索引。入库后再回来提问，三贤才能从典籍中取证据回答。";
      sessionApi.appendMessage(activeSession.id, {
        role: "assistant",
        content: hint,
        citations: [],
      });
      return NextResponse.json({
        answerMarkdown: hint,
        citations: [],
        pipeline: { mode: "rag", retrieved: { hu: 0, li: 0, xuan: 0, merged: 0 }, retried: false, citationsValid: true, voiceValid: true },
        sessionId: activeSession.id,
      });
    }

    // M5 已完成人工验收：默认走受控工具循环；显式 mode="rag" 时保留固定链路。
    if (body.mode !== "rag") {
      // 联网回退：真实 embedding 检索最高分低于阈值（典籍库确实没有相关内容）
      // 且不是引用库内书的问题时，不再空转 Agent 循环，改为联网搜索 + 单轮生成。
      const webAnswer = await maybeAnswerFromWeb(question, { mentorIds, configOverride: null });
      if (webAnswer) {
        sessionApi.appendMessage(activeSession.id, {
          role: "assistant",
          content: webAnswer.answerMarkdown,
          citations: [],
          trace: webAnswer.trace,
          webSearch: webAnswer.webSearch,
        });
        return NextResponse.json({
          answerMarkdown: webAnswer.answerMarkdown,
          citations: [],
          usedContext: "",
          trace: webAnswer.trace,
          webSearch: webAnswer.webSearch,
          sessionId: activeSession.id,
        });
      }
      const answer = await runAgentLoop(question, safeProfile, {
        signal: request.signal,
        conversationContext,
        mentorIds,
      });
      sessionApi.appendMessage(activeSession.id, {
        role: "assistant",
        content: answer.answerMarkdown,
        citations: answer.citations,
        trace: answer.trace,
      });
      return NextResponse.json({ ...answer, sessionId: activeSession.id });
    }

    const answer = await answerQuestion(question, safeProfile, conversationContext, undefined, mentorIds);
    sessionApi.appendMessage(activeSession.id, {
      role: "assistant",
      content: answer.answerMarkdown,
      citations: answer.citations,
      pipeline: answer.pipeline,
    });
    return NextResponse.json({ ...answer, sessionId: activeSession.id });
  } catch (error) {
    if (error instanceof MentorSelectionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[/api/chat] 问答失败:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "问答失败" }, { status: 500 });
  }
}
