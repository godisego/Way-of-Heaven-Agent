/**
 * 全量重建本地 Embedding 索引（共享）：读现有记录 → 分批重 embed → 校验维度/模型一致
 * → 原子替换索引 → 同步 chunk 元数据的 embeddingModel。供 CLI 脚本与 /api/reindex 复用。
 *
 * 只在所有批次成功后才 replaceLocalVectorRecords（先写临时文件再 rename），失败则旧索引不动。
 * 常规调用从服务器统一配置读取；configOverride 只保留给内部测试或显式调用方。
 */
import { updateChunkVectors } from "@/core/documents/documentRepository";
import { getDefaultProvider } from "@/core/providers/openAICompatibleProvider";
import { readLocalVectorRecords, replaceLocalVectorRecords } from "@/core/vector/localJsonVectorStore";
import type { VectorRecord } from "@/core/vector/vectorStore";
import type { ConfigOverride } from "@/core/config/appConfig";

export type ReindexProgress = { done: number; total: number };

export type ReindexOptions = {
  configOverride?: ConfigOverride | null;
  batchSize?: number;
  onProgress?: (p: ReindexProgress) => void;
};

export type ReindexResult = { model: string; dim: number; count: number };

const DEFAULT_BATCH_SIZE = 32;

export async function rebuildEmbeddingIndex(opts: ReindexOptions = {}): Promise<ReindexResult> {
  const batchSize = opts.batchSize ?? DEFAULT_BATCH_SIZE;
  const provider = getDefaultProvider(opts.configOverride ?? null);
  const records = readLocalVectorRecords();
  if (!records.length) {
    throw new Error("本地索引为空，没有需要重建的记录。请先运行 npm run seed:all 入库典籍。");
  }
  for (const record of records) {
    if (!record.id || !record.chunkId || !record.documentId || !record.text) {
      throw new Error(`索引记录不完整：${record.id || "未知 id"}`);
    }
  }

  const rebuilt: VectorRecord[] = [];
  let model = "";
  let dim = 0;

  for (let start = 0; start < records.length; start += batchSize) {
    const batch = records.slice(start, start + batchSize);
    const result = await provider.embedTexts({ texts: batch.map((r) => r.text) });
    if (result.embeddings.length !== batch.length) {
      throw new Error(`Embedding 返回数量不一致：请求 ${batch.length}，得到 ${result.embeddings.length}。`);
    }
    if (!model) model = result.model;
    if (model !== result.model) {
      throw new Error(`Embedding 模型在批次之间发生变化：${model} / ${result.model}。`);
    }
    for (const embedding of result.embeddings) {
      if (!embedding.length) throw new Error("Embedding 返回了空向量。");
      if (!dim) dim = embedding.length;
      if (embedding.length !== dim) {
        throw new Error(`Embedding 维度不一致：预期 ${dim}，得到 ${embedding.length}。`);
      }
    }
    rebuilt.push(
      ...batch.map((record, index) => ({ ...record, embedding: result.embeddings[index], embeddingModel: result.model })),
    );
    opts.onProgress?.({ done: Math.min(start + batch.length, records.length), total: records.length });
  }

  replaceLocalVectorRecords(rebuilt);
  updateChunkVectors(rebuilt.map((record) => ({ chunkId: record.chunkId, embeddingModel: model, vectorId: record.id })));
  return { model, dim, count: rebuilt.length };
}
