/**
 * 全检探活端点：一次调用验证 chat + embedding + 与本地索引的匹配。
 *
 * 前端齿轮面板保存后全检：
 *  - chat 通不通（拉模型列表验证 key）
 *  - embedding 通不通（实跑一次向量；区分"供应商不含 embedding→回退 mock"）
 *  - 当前 embedding 与索引是否同向量空间（维度/模型比对，不一致则提示重建）
 *
 * 供前端 /api/probe 调用；配置来自服务器统一配置文件。
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { probeChat, probeEmbedding, summarizeIndex, compareEmbeddingWithIndex } from "@/core/diagnostics/probe";
import { getAppConfig } from "@/core/config/appConfig";

export async function POST() {
  try {
    const config = getAppConfig();
    const chatResult = await probeChat(config.chatBaseUrl, config.chatApiKey, config.chatProtocol);

    const embedding = await probeEmbedding(null);

    // 与本地索引比对
    const index = summarizeIndex();
    const match = compareEmbeddingWithIndex(embedding, index);

    return NextResponse.json({ chat: chatResult, embedding, index, match });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "探活失败" }, { status: 500 });
  }
}
