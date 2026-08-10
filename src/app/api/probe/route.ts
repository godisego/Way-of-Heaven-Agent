/**
 * 全检探活端点：一次调用验证 chat + embedding + 与本地索引的匹配。
 *
 * 前端齿轮面板"测试连接"升级为全检：填 key 后立即知道
 *  - chat 通不通（拉模型列表验证 key）
 *  - embedding 通不通（实跑一次向量；区分"供应商不含 embedding→回退 mock"）
 *  - 当前 embedding 与索引是否同向量空间（维度/模型比对，不一致则提示重建）
 *
 * key 只在请求内存里用于本次探测，不落盘。供前端 /api/probe 调用。
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { parseSettingsOverride } from "@/core/config/settingsMapping";
import { probeChat, probeEmbedding, summarizeIndex, compareEmbeddingWithIndex } from "@/core/diagnostics/probe";
import { findPreset, type AuthStyle } from "@/data/providerPresets";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { settings?: unknown };
    const settings = (body.settings ?? {}) as {
      chat?: { baseUrl?: string; apiKey?: string; provider?: string; protocol?: string };
    };
    const override = parseSettingsOverride(body.settings);

    // chat 探活：authStyle 优先看 protocol，其次用该供应商 preset 的默认
    const chat = settings.chat ?? {};
    const chatPreset = chat.provider ? findPreset("chat", chat.provider) : undefined;
    const authStyle: AuthStyle =
      chat.protocol === "anthropic" ? "anthropic" : chat.protocol === "openai" ? "openai" : chatPreset?.authStyle ?? "openai";
    const chatResult = await probeChat(chat.baseUrl ?? "", chat.apiKey ?? "", authStyle);

    // embedding 探活（override 让前端 embedding 配置生效）
    const embedding = await probeEmbedding(override);

    // 与本地索引比对
    const index = summarizeIndex();
    const match = compareEmbeddingWithIndex(embedding, index);

    return NextResponse.json({ chat: chatResult, embedding, index, match });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "探活失败" }, { status: 500 });
  }
}
