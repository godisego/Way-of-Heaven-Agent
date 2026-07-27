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
