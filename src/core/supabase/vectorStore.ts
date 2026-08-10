import { getSupabaseAdmin } from "./client";
import type { MatchChunkRow } from "./types";
import type { VectorRecord, VectorSearchResult, VectorStore } from "@/core/vector/vectorStore";

/**
 * 云端向量库骨架：读写 Supabase chunks.embedding + match_chunks RPC。
 * 本地开发默认仍用 LocalJsonVectorStore；同步脚本负责把本地 embedding 推上去。
 * 日后 Vercel 只读模式可 getVectorStore() 切到本实现。
 */
export class SupabaseVectorStore implements VectorStore {
  async upsert(records: VectorRecord[]): Promise<void> {
    if (!records.length) return;
    const client = getSupabaseAdmin();

    // 仅更新已有 chunk 行的 embedding / 元数据字段；同步脚本会先 upsert 元数据行
    for (const record of records) {
      const { error } = await client
        .from("chunks")
        .update({
          embedding: record.embedding,
          embedding_model: null,
          vector_id: record.id,
          section_title: record.sectionTitle,
          text: record.text,
        })
        .eq("id", record.chunkId);

      if (error) {
        throw new Error(`SupabaseVectorStore.upsert 失败 (${record.chunkId}): ${error.message}`);
      }
    }
  }

  async search(
    embedding: number[],
    topK: number,
    filter?: (record: VectorRecord) => boolean,
    // expectedModel 预留给模型守卫：云端维度由 vector(N) schema 天然校验，
    // 模型级比对待补（chunks.embedding_model 列已就绪，可后续在 RPC 内做）。
    _expectedModel?: string,
  ): Promise<VectorSearchResult[]> {
    const client = getSupabaseAdmin();
    // RPC 暂只支持单 tradition 参数，谓词过滤在召回后做：带过滤时多召回一些再筛
    const { data, error } = await client.rpc("match_chunks", {
      query_embedding: embedding,
      match_count: filter ? topK * 4 : topK,
      filter_tradition: null,
    });

    if (error) {
      throw new Error(`SupabaseVectorStore.search 失败: ${error.message}`);
    }

    const rows = (data ?? []) as MatchChunkRow[];
    const mapped = rows.map((row) => ({
      id: row.id,
      chunkId: row.chunk_id,
      documentId: row.document_id,
      sourceFileName: row.source_file_name,
      pageNumber: row.page_number,
      sectionTitle: row.section_title,
      bookTitle: row.book_title,
      author: row.author,
      tradition: row.tradition,
      text: row.text,
      embedding: [],
      score: row.score,
    }));
    const filtered = filter ? mapped.filter((r) => filter(r)) : mapped;
    return filtered.slice(0, topK);
  }
}

export function getSupabaseVectorStore(): VectorStore {
  return new SupabaseVectorStore();
}
