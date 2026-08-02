/** 全量重建本地 Embedding 索引；只有所有批次成功后才替换旧索引。 */
import { loadEnvConfig } from "@next/env";
import { updateChunkVectors } from "../src/core/documents/documentRepository";
import { getDefaultProvider } from "../src/core/providers/openAICompatibleProvider";
import { readLocalVectorRecords, replaceLocalVectorRecords } from "../src/core/vector/localJsonVectorStore";
import type { VectorRecord } from "../src/core/vector/vectorStore";

const DEFAULT_BATCH_SIZE = 32;

function readBatchSize(): number {
  const argument = process.argv.find((value) => value.startsWith("--batch-size="));
  const parsed = argument ? Number(argument.slice("--batch-size=".length)) : DEFAULT_BATCH_SIZE;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 256) {
    throw new Error("--batch-size 必须是 1 到 256 的整数。");
  }
  return parsed;
}

function assertRecords(records: VectorRecord[]) {
  if (!records.length) throw new Error("本地索引为空，没有需要重建的记录。");
  for (const record of records) {
    if (!record.id || !record.chunkId || !record.documentId || !record.text) {
      throw new Error(`索引记录不完整：${record.id || "未知 id"}`);
    }
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  const batchSize = readBatchSize();
  const records = readLocalVectorRecords();
  assertRecords(records);

  const provider = getDefaultProvider();
  const rebuilt: VectorRecord[] = [];
  let model = "";
  let dimensions = 0;

  console.log(`开始重建 Embedding：${records.length} 条，批次 ${batchSize}。`);
  for (let start = 0; start < records.length; start += batchSize) {
    const batch = records.slice(start, start + batchSize);
    const result = await provider.embedTexts({ texts: batch.map((record) => record.text) });
    if (result.embeddings.length !== batch.length) {
      throw new Error(`Embedding 返回数量不一致：请求 ${batch.length}，得到 ${result.embeddings.length}。`);
    }
    if (!model) model = result.model;
    if (model !== result.model) throw new Error(`Embedding 模型在批次之间发生变化：${model} / ${result.model}。`);
    for (const embedding of result.embeddings) {
      if (!embedding.length) throw new Error("Embedding 返回了空向量。");
      if (!dimensions) dimensions = embedding.length;
      if (embedding.length !== dimensions) {
        throw new Error(`Embedding 维度不一致：预期 ${dimensions}，得到 ${embedding.length}。`);
      }
    }
    rebuilt.push(...batch.map((record, index) => ({ ...record, embedding: result.embeddings[index] })));
    console.log(`已完成 ${Math.min(start + batch.length, records.length)}/${records.length}。`);
  }

  replaceLocalVectorRecords(rebuilt);
  updateChunkVectors(rebuilt.map((record) => ({ chunkId: record.chunkId, embeddingModel: model, vectorId: record.id })));
  console.log(`重建完成：模型 ${model}，维度 ${dimensions}，${rebuilt.length} 条。`);
}

main().catch((error) => {
  console.error("Embedding 重建失败，旧索引未替换：", error instanceof Error ? error.message : error);
  process.exit(1);
});
