/** 全量重建本地 Embedding 索引；只有所有批次成功后才替换旧索引。
 *  核心逻辑见 src/core/ingestion/reindex.ts，与 /api/reindex 共享。
 *  CLI 无 configOverride → 走 .env（与 npm run doctor 一致）。 */
import { loadEnvConfig } from "@next/env";
import { rebuildEmbeddingIndex } from "../src/core/ingestion/reindex";

const DEFAULT_BATCH_SIZE = 32;

function readBatchSize(): number {
  const argument = process.argv.find((value) => value.startsWith("--batch-size="));
  const parsed = argument ? Number(argument.slice("--batch-size=".length)) : DEFAULT_BATCH_SIZE;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 256) {
    throw new Error("--batch-size 必须是 1 到 256 的整数。");
  }
  return parsed;
}

async function main() {
  loadEnvConfig(process.cwd());
  const batchSize = readBatchSize();
  console.log(`开始重建 Embedding（批次 ${batchSize}）…`);
  const result = await rebuildEmbeddingIndex({
    batchSize,
    onProgress: (p) => console.log(`已完成 ${p.done}/${p.total}。`),
  });
  console.log(`重建完成：模型 ${result.model}，维度 ${result.dim}，${result.count} 条。`);
}

main().catch((error) => {
  console.error("Embedding 重建失败，旧索引未替换：", error instanceof Error ? error.message : error);
  process.exit(1);
});
