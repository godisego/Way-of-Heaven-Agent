/**
 * 模型列拉取端点：用前端填的 baseUrl+key 调供应商 /models，返回模型 id 列表。
 *
 * 用途：配置面板「拉取模型」按钮——让用户从真实可用模型里选，而非手填。
 * 探活逻辑已提取到 src/core/diagnostics/probe.ts，与 /api/probe 共享，避免漂移。
 * 不存任何东西（key 只用于本次探测，不落盘）。
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { probeChat } from "@/core/diagnostics/probe";
import { getAppConfig } from "@/core/config/appConfig";
import type { AuthStyle } from "@/data/providerPresets";

export async function POST(request: Request) {
  let body: { kind?: string; baseUrl?: string; apiKey?: string; authStyle?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const baseUrl = String(body.baseUrl ?? "").trim();
  const config = getAppConfig();
  const storedApiKey = body.kind === "embedding" ? config.openAICompatApiKey : config.chatApiKey;
  const apiKey = String(body.apiKey ?? "").trim() || storedApiKey;
  const authStyle: AuthStyle = body.authStyle === "openai" ? "openai" : "anthropic";

  const result = await probeChat(baseUrl, apiKey, authStyle);
  if (result.ok) return NextResponse.json({ models: result.models });
  return NextResponse.json({ models: [], error: result.error ?? "拉取模型失败" });
}
