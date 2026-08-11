/**
 * 供应商链路探活（共享诊断）：chat 拉 /models 验证 key；embedding 实跑一次向量；
 * 与本地索引比对维度/模型。供 /api/probe、/api/models、scripts/doctor 复用，
 * 避免诊断逻辑分散漂移。所有探活只读，不落盘任何 key。
 */
import { getDefaultProvider } from "@/core/providers/openAICompatibleProvider";
import type { ConfigOverride } from "@/core/config/appConfig";
import { readLocalVectorRecords } from "@/core/vector/localJsonVectorStore";
import type { AuthStyle } from "@/data/providerPresets";

// ── Chat 探活：拉模型列表，验证 baseUrl + key 是否可用 ─────────────
export type ChatProbeResult = {
  ok: boolean;
  models: string[];
  error?: string;
};

export async function probeChat(baseUrl: string, apiKey: string, authStyle: AuthStyle): Promise<ChatProbeResult> {
  const trimmedBase = baseUrl.trim().replace(/\/$/, "");
  if (!trimmedBase || !apiKey.trim()) {
    return { ok: false, models: [], error: "请先填写 Base URL 和 API Key" };
  }
  const url = authStyle === "anthropic" ? `${trimmedBase}/v1/models` : `${trimmedBase}/models`;
  const headers: Record<string, string> =
    authStyle === "anthropic"
      ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
      : { authorization: `Bearer ${apiKey}` };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, { method: "GET", headers, signal: controller.signal });
      if (!response.ok) return { ok: false, models: [], error: diagnoseHttpError(response.status, authStyle) };
      const data = (await response.json()) as { data?: Array<{ id?: string }>; models?: Array<{ id?: string } | string> };
      const list = data.data ?? data.models ?? [];
      const ids = list
        .map((item) => (typeof item === "string" ? item : item?.id))
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .sort();
      return { ok: true, models: ids };
    } catch (error) {
      if (attempt === 0 && isTransientNetworkError(error)) continue;
      return { ok: false, models: [], error: diagnoseError(error) };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, models: [], error: "连接失败" };
}

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error) || error.name === "AbortError") return false;
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  return ["ECONNRESET", "ETIMEDOUT", "EPIPE", "UND_ERR_SOCKET"].includes(cause?.code ?? "");
}

// ── Embedding 探活：实跑一次向量，看是否真模型（非 mock 回退） ─────────────
export type EmbeddingProbeResult = {
  /** 是否成功用真模型（mock 回退不算） */
  ok: boolean;
  model: string | null;
  dim: number;
  fellBackToMock: boolean;
  /** model 以 mock-local- 开头 或 fellBackToMock——任一为真即视为走了 mock */
  viaMock: boolean;
  error?: string;
};

export async function probeEmbedding(configOverride: ConfigOverride | null): Promise<EmbeddingProbeResult> {
  try {
    const provider = getDefaultProvider(configOverride);
    const result = await provider.embedTexts({ texts: ["探活 probe"] });
    const emb = result.embeddings[0] ?? [];
    const viaMock = result.model.startsWith("mock-local-") || result.fellBackToMock === true;
    return {
      ok: !viaMock,
      model: result.model,
      dim: emb.length,
      fellBackToMock: result.fellBackToMock === true,
      viaMock,
    };
  } catch (e) {
    return { ok: false, model: null, dim: 0, fellBackToMock: false, viaMock: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── 索引摘要（取带戳记录的模型；维度按首条；空索引单独标记） ─────────────
export type IndexSummary = {
  count: number;
  documents: number;
  dim: number;
  model: string | null;
  /** 未盖戳的记录数（旧索引残留 / 多次 seed 累积） */
  unstamped: number;
  empty: boolean;
};

export function summarizeIndex(): IndexSummary {
  const records = readLocalVectorRecords();
  if (!records.length) return { count: 0, documents: 0, dim: 0, model: null, unstamped: 0, empty: true };
  const stamped = records.find((r) => r.embeddingModel);
  return {
    count: records.length,
    documents: new Set(records.map((r) => r.documentId)).size,
    dim: records[0].embedding.length,
    model: stamped?.embeddingModel ?? null,
    unstamped: records.filter((r) => !r.embeddingModel).length,
    empty: false,
  };
}

// ── 比对当前 embedding 与索引，判断是否需要重建 ─────────────
export type MatchResult = {
  dimensionOk: boolean;
  modelOk: boolean;
  needReindex: boolean;
  reason: string | null;
};

export function compareEmbeddingWithIndex(emb: EmbeddingProbeResult, idx: IndexSummary): MatchResult {
  if (idx.empty) return { dimensionOk: true, modelOk: true, needReindex: false, reason: null };
  const dimensionOk = !idx.dim || !emb.dim || idx.dim === emb.dim;
  // 模型比对：双方都走 mock 视为一致；都带戳且相同视为一致；索引未盖戳则跳过
  const bothMock = !!idx.model?.startsWith("mock-local-") && emb.viaMock;
  const modelOk = !idx.model || bothMock || idx.model === emb.model;
  const needReindex = !dimensionOk || !modelOk;
  let reason: string | null = null;
  if (!dimensionOk) reason = `索引 ${idx.dim} 维 ≠ 当前 ${emb.dim || "?"} 维`;
  else if (!modelOk) reason = `索引由「${idx.model}」构建，当前用「${emb.model ?? "?"}」`;
  return { dimensionOk, modelOk, needReindex, reason };
}

// ── HTTP / 网络错误诊断（从 /api/models 提取，共享） ─────────────
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

function diagnoseError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (error instanceof Error && error.name === "AbortError") return "连接超时（15 秒无响应），请检查 Base URL 或网络";
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
