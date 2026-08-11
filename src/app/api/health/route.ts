export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readLocalVectorRecords } from "@/core/vector/localJsonVectorStore";
import { getAppConfig } from "@/core/config/appConfig";
import { shouldUseMockEmbedding } from "@/core/providers/openAICompatibleProvider";

/**
 * 只读健康检查：返回向量索引状态与 provider 配置状态。
 * 不打印任何密钥值。
 */
export async function POST() {
  try {
    const config = getAppConfig();

    const records = readLocalVectorRecords();
    const vectorCount = records.length;
    const docIds = new Set(records.map((r) => r.documentId));

    const chatConfigured = !!(config.chatBaseUrl && config.chatApiKey && config.chatModel);
    const embeddingConfigured = !!(config.openAICompatBaseUrl && config.openAICompatApiKey && config.embeddingModel);
    const usingMockEmbedding = shouldUseMockEmbedding();
    const indexModel = records.find((r) => r.embeddingModel)?.embeddingModel ?? null;
    const indexIsMock = !!indexModel && indexModel.startsWith("mock-local-");

    return NextResponse.json({
      vectorIndex: {
        count: vectorCount,
        documents: docIds.size,
        dimensions: records[0]?.embedding?.length ?? 0,
        embeddingModel: indexModel,
        empty: vectorCount === 0,
      },
      providers: {
        chat: {
          configured: chatConfigured,
          model: chatConfigured ? config.chatModel : null,
          protocol: config.chatProtocol,
        },
        embedding: {
          configured: embeddingConfigured,
          model: embeddingConfigured ? config.embeddingModel : null,
          mock: usingMockEmbedding,
        },
      },
      vectorBackend: config.vectorBackend,
      hint:
        vectorCount === 0
          ? "索引为空——请运行 npm run seed:all 入库典籍"
          : usingMockEmbedding
            ? "使用 mock embedding（bigram hash）——配置 embedding provider 可大幅提升语义检索质量"
            : indexIsMock
              ? "索引由 mock 构建，但已配置真实 embedding 模型——请运行 npm run reindex:embeddings 重建，否则检索会被向量空间守卫拦截"
              : indexModel && indexModel !== config.embeddingModel
                ? `索引由「${indexModel}」构建，但当前配置为「${config.embeddingModel}」——请运行 npm run reindex:embeddings 重建`
                : "一切就绪",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "健康检查失败" },
      { status: 500 },
    );
  }
}
