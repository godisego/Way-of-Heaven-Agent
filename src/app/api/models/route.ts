/**
 * 模型列拉取端点：用前端填的 baseUrl+key 调供应商 /models，返回模型 id 列表。
 *
 * 用途：配置面板「拉取模型」按钮——让用户从真实可用模型里选，而非手填。
 * 失败优雅：任何错误返回 { models: [], error }，前端据此回退手填。
 *
 * 不存任何东西（key 只用于本次探测，不落盘）。
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { AuthStyle } from "@/data/providerPresets";

export async function POST(request: Request) {
  let body: { kind?: string; baseUrl?: string; apiKey?: string; authStyle?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const baseUrl = String(body.baseUrl ?? "").trim().replace(/\/$/, "");
  const apiKey = String(body.apiKey ?? "").trim();
  if (!baseUrl || !apiKey) {
    return NextResponse.json({ models: [], error: "请先填写 Base URL 和 API Key" });
  }
  const authStyle: AuthStyle = body.authStyle === "openai" ? "openai" : "anthropic";

  try {
    const models = await fetchModels(baseUrl, apiKey, authStyle);
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json({
      models: [],
      error: error instanceof Error ? error.message : "拉取模型失败",
    });
  }
}

async function fetchModels(baseUrl: string, apiKey: string, authStyle: AuthStyle): Promise<string[]> {
  // Anthropic 风格：x-api-key 头，/v1/models；OpenAI 风格：Bearer 头，/models
  const url = authStyle === "anthropic" ? `${baseUrl}/v1/models` : `${baseUrl}/models`;
  const headers: Record<string, string> =
    authStyle === "anthropic"
      ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
      : { authorization: `Bearer ${apiKey}` };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { method: "GET", headers, signal: controller.signal });
    if (!response.ok) {
      throw new Error(diagnoseHttpError(response.status, authStyle));
    }
    const data = (await response.json()) as { data?: Array<{ id?: string }>; models?: Array<{ id?: string } | string> };
    // 兼容两种响应：{data:[{id}]}（OpenAI/Anthropic）或 {models:[{id}|str]}
    const list = data.data ?? data.models ?? [];
    const ids = list
      .map((item) => (typeof item === "string" ? item : item?.id))
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    return ids.sort();
  } catch (error) {
    // 把底层错误翻译成可读原因
    throw new Error(diagnoseError(error));
  } finally {
    clearTimeout(timer);
  }
}

/** 把 HTTP 状态码翻译成可读的中文原因，帮助用户定位配置问题。 */
function diagnoseHttpError(status: number, authStyle: AuthStyle): string {
  if (status === 401 || status === 403) return `鉴权失败（${status}）：API Key 无效或无权限`;
  if (status === 404) {
    return authStyle === "anthropic"
      ? "404：该地址无 /v1/models 端点——请确认这是 Anthropic 兼容的聊天端点（嵌入请用 OpenAI 兼容端点）"
      : "404：该地址无 /models 端点——请确认 Base URL 正确（如 https://api.openai.com/v1）";
  }
  if (status === 429) return "请求过于频繁（429），请稍后再试";
  return `供应商返回 ${status}`;
}

/** 把 fetch 层错误（DNS/超时/网络）翻译成可读原因。 */
function diagnoseError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  // AbortController 触发
  if (error instanceof Error && error.name === "AbortError") return "连接超时（15 秒无响应），请检查 Base URL 或网络";
  // Node undici 的 DNS / 连接失败统一报 "fetch failed"，带 cause
  if (msg === "fetch failed") {
    const cause = (error as Error & { cause?: { code?: string; message?: string } }).cause;
    const code = cause?.code ?? "";
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "域名无法解析：Base URL 可能写错";
    if (code === "ECONNREFUSED") return "连接被拒绝：服务未启动或端口不对";
    if (code === "ECONNRESET") return "连接被重置：可能是网络或代理问题";
    return `网络连接失败（${code || cause?.message || "未知"}）：请检查 Base URL 与网络`;
  }
  return msg;
}
