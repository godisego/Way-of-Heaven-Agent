import { getDocument, updateChunkVector } from "@/core/documents/documentRepository";
import type { ChunkRow } from "@/core/documents/documentTypes";
import { getDefaultProvider } from "@/core/providers/openAICompatibleProvider";
import type { ConfigOverride } from "@/core/config/appConfig";
import { getLocalVectorStore } from "@/core/vector/localJsonVectorStore";
import type { VectorRecord } from "@/core/vector/vectorStore";

const BATCH_SIZE = 32;

export async function indexChunks(chunks: ChunkRow[], configOverride?: ConfigOverride) {
  if (!chunks.length) return;
  const provider = getDefaultProvider(configOverride);
  // 入库始终先写本地索引；Supabase 是本地快照的同步/读取后端。
  // 否则 VECTOR_BACKEND=supabase 时会尝试更新尚不存在的云端 chunk 行。
  const vectorStore = getLocalVectorStore();

  for (let start = 0; start < chunks.length; start += BATCH_SIZE) {
    const batch = chunks.slice(start, start + BATCH_SIZE);
    const embeddingResult = await provider.embedTexts({ texts: batch.map((chunk) => chunk.text) });
    const records: VectorRecord[] = batch.map((chunk, index) => {
      const document = getDocument(chunk.documentId);
      if (!document) throw new Error(`找不到文档：${chunk.documentId}`);
      return {
        id: chunk.id,
        chunkId: chunk.id,
        documentId: chunk.documentId,
        sourceFileName: document.originalFileName,
        pageNumber: chunk.pageNumber,
        sectionTitle: chunk.sectionTitle,
        bookTitle: document.bookTitle,
        author: document.author,
        tradition: document.tradition,
        text: chunk.text,
        embedding: embeddingResult.embeddings[index],
        embeddingModel: embeddingResult.model,
      };
    });
    await vectorStore.upsert(records);
    for (const record of records) updateChunkVector(record.chunkId, embeddingResult.model, record.id);
  }
}
