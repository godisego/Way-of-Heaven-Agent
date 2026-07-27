export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { answerQuestion } from "@/core/retrieval/answerWithCitations";
import { runAgentLoop } from "@/core/agent/orchestrator";
import { isProfileComplete, type UserProfile } from "@/data/userProfile";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = String(body.question ?? "").trim();
    if (!question) return NextResponse.json({ error: "question 不能为空" }, { status: 400 });
    const userProfile = (body.userProfile ?? null) as UserProfile | null;
    const safeProfile = isProfileComplete(userProfile) ? userProfile : null;

    // mode=agent：受控工具循环（含执行轨迹面板数据）。默认仍走 rag 固定链路；
    // 跑通 docs/m5-acceptance.md 的验收清单后，把下行条件翻转即可切默认。
    if (body.mode === "agent") {
      const answer = await runAgentLoop(question, safeProfile, { signal: request.signal });
      return NextResponse.json(answer);
    }

    const answer = await answerQuestion(question, safeProfile);
    return NextResponse.json(answer);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "问答失败" }, { status: 500 });
  }
}
