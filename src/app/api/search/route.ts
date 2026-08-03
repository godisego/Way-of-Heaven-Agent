export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { searchChunks } from "@/core/retrieval/retrieveContext";
import { parseSettingsOverride } from "@/core/config/settingsMapping";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = String(body.query ?? "").trim();
    if (!query) return NextResponse.json({ error: "query 不能为空" }, { status: 400 });
    const configOverride = parseSettingsOverride(body.settings);
    const results = await searchChunks(query, Number(body.topK ?? 8), configOverride);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "检索失败" }, { status: 500 });
  }
}
