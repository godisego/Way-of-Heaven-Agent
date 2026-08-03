import path from "node:path";

export type AppConfig = {
  dataDir: string;
  documentsDir: string;
  indexesDir: string;
  metadataPath: string;
  // 聊天（Anthropic 兼容 /messages 协议，比如 minimax /anthropic 端点）
  chatBaseUrl: string;
  chatApiKey: string;
  chatModel: string;
  /** 聊天协议：anthropic（/v1/messages）或 openai（/chat/completions）。默认 openai（市面主流） */
  chatProtocol: "anthropic" | "openai";
  // Embedding（OpenAI 兼容 /embeddings 协议，比如 ggniao /v1）
  openAICompatBaseUrl: string;
  openAICompatApiKey: string;
  embeddingModel: string;
  /**
   * 向量后端：local = data/indexes/chunks.json（默认）；
   * supabase = 读云端 match_chunks（仅在已配置且需要云端检索时使用）。
   * 入库仍始终写本地；上云靠 npm run sync:supabase。
   */
  vectorBackend: "local" | "supabase";
  // Supabase（本地建库 → 同步上云；Vercel 只读时使用）
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseDocumentsBucket: string;
};

export function getAppConfig(): AppConfig {
  const dataDir = path.resolve(process.env.DATA_DIR ?? "./data");
  const vectorBackend =
    process.env.VECTOR_BACKEND === "supabase" ? "supabase" : "local";
  return {
    dataDir,
    documentsDir: path.join(dataDir, "documents"),
    indexesDir: path.join(dataDir, "indexes"),
    metadataPath: path.join(dataDir, "app.json"),
    // 聊天走 Anthropic 格式端点；默认值兜底用 minimax 的官方 /anthropic 入口
    chatBaseUrl: process.env.CHAT_BASE_URL ?? "https://api.minimaxi.com/anthropic",
    chatApiKey: process.env.CHAT_API_KEY ?? "",
    chatModel: process.env.CHAT_MODEL ?? "MiniMax-M3",
    // 聊天协议：env 可显式指定；默认按 CHAT_BASE_URL 推断（含 /anthropic 走 anthropic，否则 openai）
    chatProtocol: resolveChatProtocol(),
    // Embedding 仍走 OpenAI 兼容端点（如 ggniao）
    openAICompatBaseUrl: process.env.OPENAI_COMPAT_BASE_URL ?? "https://api.openai.com/v1",
    openAICompatApiKey: process.env.OPENAI_COMPAT_API_KEY ?? "",
    embeddingModel: process.env.OPENAI_COMPAT_EMBEDDING_MODEL ?? "text-embedding-3-large",
    vectorBackend,
    supabaseUrl: process.env.SUPABASE_URL ?? "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    supabaseDocumentsBucket: process.env.SUPABASE_DOCUMENTS_BUCKET ?? "documents",
  };
}

/**
 * 运行时配置覆盖（前端面板提供，随请求体传入）。
 * 仅覆盖聊天/嵌入相关字段；dataDir/supabase 等保持 env（与 CLI 脚本一致）。
 * 空覆盖 → mergeConfig 回退到 getAppConfig()，行为与 v1 完全一致。
 */
export type ConfigOverride = Partial<
  Pick<
    AppConfig,
    | "chatBaseUrl"
    | "chatApiKey"
    | "chatModel"
    | "chatProtocol"
    | "openAICompatBaseUrl"
    | "openAICompatApiKey"
    | "embeddingModel"
  >
>;

/** 环境配置 ⊕ 运行时覆盖（覆盖优先）。provider/transport 构造时统一走这里。 */
export function mergeConfig(override?: ConfigOverride | null): AppConfig {
  const base = getAppConfig();
  if (!override) return base;
  return { ...base, ...override };
}

/**
 * 推断聊天协议：env 显式指定优先；否则按 CHAT_BASE_URL 是否含 /anthropic 判断。
 * 含 /anthropic 的端点（如 minimax 官方入口）用 anthropic 协议；其余默认 openai。
 */
function resolveChatProtocol(): "anthropic" | "openai" {
  const explicit = (process.env.CHAT_PROTOCOL ?? "").toLowerCase();
  if (explicit === "anthropic" || explicit === "openai") return explicit;
  const baseUrl = process.env.CHAT_BASE_URL ?? "";
  return baseUrl.includes("/anthropic") ? "anthropic" : "openai";
}
