export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sessionApi } from "@/data/sessionStore";

type RouteContext = { params: Promise<{ id: string }> };

async function getId(context: RouteContext): Promise<string> {
  const { id } = await context.params;
  return id;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = await getId(context);
    const session = sessionApi.getSession(id);
    if (!session) return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    return NextResponse.json({ session, messages: sessionApi.getMessages(id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取会话失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const id = await getId(context);
    if (!sessionApi.getSession(id)) return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    const body = await request.json().catch(() => ({})) as { title?: unknown };
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "title 不能为空" }, { status: 400 });
    }
    sessionApi.renameSession(id, body.title);
    return NextResponse.json({ session: sessionApi.getSession(id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "修改会话失败" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = await getId(context);
    if (!sessionApi.getSession(id)) return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    sessionApi.deleteSession(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "删除会话失败" }, { status: 500 });
  }
}
