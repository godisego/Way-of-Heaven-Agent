/** 只读环境自检：检查 Key、模型、向量后端和本地索引，不打印任何密钥值。 */
import fs from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { getAppConfig } from "../src/core/config/appConfig";

function isConfigured(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  return !/^(your_|replace_|change[-_]?me|<|\[)/i.test(value.trim());
}

function status(ok: boolean, label: string, detail: string) {
  console.log(`${ok ? "✅" : "❌"} ${label}：${detail}`);
}

function indexSummary(indexPath: string): string {
  if (!fs.existsSync(indexPath)) return "尚未生成（0 条）";
  try {
    const records = JSON.parse(fs.readFileSync(indexPath, "utf8")) as Array<{
      documentId?: string;
      embedding?: number[];
    }>;
    const dimensions = [...new Set(records.map((record) => record.embedding?.length ?? 0))];
    return `${records.length} 条，${new Set(records.map((record) => record.documentId)).size} 份文档，维度 ${dimensions.join(", ") || "未知"}`;
  } catch {
    return "文件存在但无法解析";
  }
}

function main() {
  loadEnvConfig(process.cwd());
  const config = getAppConfig();
  const mockEmbedding = process.env.USE_MOCK_EMBEDDING === "1";
  let failed = false;

  console.log("天道智能体环境自检\n");
  const chatReady = isConfigured(config.chatBaseUrl) && isConfigured(config.chatApiKey) && isConfigured(config.chatModel);
  status(chatReady, "聊天链路", chatReady ? `${config.chatModel}，Endpoint 已配置` : "CHAT_BASE_URL / CHAT_API_KEY / CHAT_MODEL 未完整配置");
  if (!chatReady) failed = true;

  if (mockEmbedding) {
    status(true, "Embedding 链路", "当前为本地 Mock 模式，不需要 Embedding Key");
  } else {
    const embeddingReady = isConfigured(config.openAICompatBaseUrl) && isConfigured(config.openAICompatApiKey) && isConfigured(config.embeddingModel);
    status(embeddingReady, "Embedding 链路", embeddingReady ? `${config.embeddingModel}，Endpoint 已配置` : "OPENAI_COMPAT_BASE_URL / OPENAI_COMPAT_API_KEY / OPENAI_COMPAT_EMBEDDING_MODEL 未完整配置");
    if (!embeddingReady) failed = true;
  }

  const supabaseReady = config.vectorBackend !== "supabase" || (isConfigured(config.supabaseUrl) && isConfigured(config.supabaseServiceRoleKey));
  status(supabaseReady, "向量后端", config.vectorBackend === "supabase" ? (supabaseReady ? "Supabase 已配置" : "Supabase URL 或 service role key 缺失") : "local JSON");
  if (!supabaseReady) failed = true;

  const indexPath = path.join(config.indexesDir, "chunks.json");
  console.log(`📦 本地索引：${indexSummary(indexPath)}`);
  console.log(`📁 数据目录：${config.dataDir}`);
  console.log(`\n结论：${failed ? "配置仍有缺项，请先修复上面的 ❌ 项。" : "基础配置可用，可以启动开发服务或执行验收。"}`);
  if (failed) process.exitCode = 1;
}

main();
