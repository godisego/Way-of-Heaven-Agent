export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sessionApi } from "@/data/sessionStore";

export async function GET() {
  try {
    return NextResponse.json({ sessions: sessionApi.listSessions() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取会话失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { title?: unknown };
    const title = typeof body.title === "string" ? body.title : undefined;
    const session = sessionApi.createSession(title);
    return NextResponse.json({ session, messages: [] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "创建会话失败" }, { status: 500 });
  }
}
