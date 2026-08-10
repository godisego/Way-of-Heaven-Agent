/**
 * 重建索引端点：用前端齿轮面板的配置（body.settings）在内存里重建本地 embedding 索引。
 *
 * 解决「CLI 读不到前端 localStorage 配置」：用户在前端配好 embedding key 后，
 * 直接点「用当前配置重建索引」调本端点，key 只在请求生命周期内使用，不落盘
 * （符合 providerSettingsStore「密钥不落盘」的安全原则）。
 *
 * 长任务：真模型下 266 条可能几十秒；mock 下几秒。前端应显示 loading。
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { parseSettingsOverride } from "@/core/config/settingsMapping";
import { rebuildEmbeddingIndex } from "@/core/ingestion/reindex";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { settings?: unknown };
    const configOverride = parseSettingsOverride(body.settings);
    const result = await rebuildEmbeddingIndex({ configOverride });
    return NextResponse.json({ ok: true, model: result.model, dim: result.dim, count: result.count });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "重建索引失败" },
      { status: 500 },
    );
  }
}
