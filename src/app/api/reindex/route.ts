/**
 * 重建索引端点：使用网页与 CLI 共用的服务器供应商配置。
 *
 * 长任务：真模型下 266 条可能几十秒；mock 下几秒。前端应显示 loading。
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { rebuildEmbeddingIndex } from "@/core/ingestion/reindex";

export async function POST() {
  try {
    const result = await rebuildEmbeddingIndex();
    return NextResponse.json({ ok: true, model: result.model, dim: result.dim, count: result.count });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "重建索引失败" },
      { status: 500 },
    );
  }
}
