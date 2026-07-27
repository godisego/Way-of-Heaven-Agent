import type { ChunkRow, DocumentPageRow, DocumentRow } from "@/core/documents/documentTypes";
import type { VectorRecord } from "@/core/vector/vectorStore";
import type { SupabaseChunkRow, SupabaseDocumentRow, SupabasePageRow } from "./types";

/** 本地 DocumentRow → Supabase documents 行 */
export function toSupabaseDocument(doc: DocumentRow, syncedAt: string): SupabaseDocumentRow {
  return {
    id: doc.id,
    original_file_name: doc.originalFileName,
    // 云端统一用 bucket 内相对路径；本地绝对路径在上传时再解析
    stored_file_path: storageObjectPath(doc.id, doc.originalFileName, doc.storedFilePath),
    sha256: doc.sha256,
    book_title: doc.bookTitle,
    author: doc.author,
    tradition: doc.tradition,
    file_type: doc.fileType,
    page_count: doc.pageCount,
    status: doc.status,
    error_message: doc.errorMessage,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
    local_synced_at: syncedAt,
  };
}

export function toSupabasePage(page: DocumentPageRow): SupabasePageRow {
  return {
    id: page.id,
    document_id: page.documentId,
    page_number: page.pageNumber,
    section_title: page.sectionTitle,
    text: page.text,
    text_hash: page.textHash,
    char_count: page.charCount,
    extraction_method: page.extractionMethod,
    created_at: page.createdAt,
  };
}

export function toSupabaseChunk(
  chunk: ChunkRow,
  embedding: number[] | null,
): SupabaseChunkRow {
  return {
    id: chunk.id,
    document_id: chunk.documentId,
    page_id: chunk.pageId,
    page_number: chunk.pageNumber,
    section_title: chunk.sectionTitle,
    chunk_index: chunk.chunkIndex,
    text: chunk.text,
    text_hash: chunk.textHash,
    start_offset: chunk.startOffset,
    end_offset: chunk.endOffset,
    embedding_model: chunk.embeddingModel,
    vector_id: chunk.vectorId,
    embedding,
    created_at: chunk.createdAt,
  };
}

/**
 * Storage 对象键：优先 documents/{id}{ext}，与本地 safeDocumentFileName 一致。
 * 若 storedFilePath 已是相对路径则沿用 basename。
 */
export function storageObjectPath(
  documentId: string,
  originalFileName: string,
  storedFilePath: string,
): string {
  const fromLocal = basename(storedFilePath);
  if (fromLocal.startsWith(documentId)) return fromLocal;
  const ext = extensionOf(originalFileName) || extensionOf(storedFilePath) || ".bin";
  return `${documentId}${ext.toLowerCase()}`;
}

export function embeddingByChunkId(records: VectorRecord[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const record of records) {
    map.set(record.chunkId, record.embedding);
  }
  return map;
}

function basename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || filePath;
}

function extensionOf(name: string): string {
  const base = basename(name);
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot) : "";
}
