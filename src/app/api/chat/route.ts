export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { answerQuestion } from "@/core/retrieval/answerWithCitations";
import { runAgentLoop } from "@/core/agent/orchestrator";
import { buildConversationContext, sessionApi } from "@/data/sessionStore";
import { prepareUserProfileForAgent, type UserProfile } from "@/data/userProfile";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = String(body.question ?? "").trim();
    if (!question) return NextResponse.json({ error: "question 不能为空" }, { status: 400 });
    const userProfile = (body.userProfile ?? null) as UserProfile | null;
    const safeProfile = prepareUserProfileForAgent(userProfile);
    const requestedSessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const session = requestedSessionId ? sessionApi.getSession(requestedSessionId) : null;
    if (requestedSessionId && !session) {
      return NextResponse.json({ error: "会话不存在，请重新选择会话" }, { status: 404 });
    }
    const activeSession = session ?? sessionApi.createSession();
    const previousMessages = sessionApi.getMessages(activeSession.id);
    const conversationContext = buildConversationContext(previousMessages);
    sessionApi.appendMessage(activeSession.id, { role: "user", content: question, citations: [] });

    // M5 已完成人工验收：默认走受控工具循环；显式 mode="rag" 时保留固定链路。
    if (body.mode !== "rag") {
      const answer = await runAgentLoop(question, safeProfile, {
        signal: request.signal,
        conversationContext,
      });
      sessionApi.appendMessage(activeSession.id, {
        role: "assistant",
        content: answer.answerMarkdown,
        citations: answer.citations,
        trace: answer.trace,
      });
      return NextResponse.json({ ...answer, sessionId: activeSession.id });
    }

    const answer = await answerQuestion(question, safeProfile, conversationContext);
    sessionApi.appendMessage(activeSession.id, {
      role: "assistant",
      content: answer.answerMarkdown,
      citations: answer.citations,
      pipeline: answer.pipeline,
    });
    return NextResponse.json({ ...answer, sessionId: activeSession.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "问答失败" }, { status: 500 });
  }
}
