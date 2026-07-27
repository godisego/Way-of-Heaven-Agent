/**
 * Supabase 表行类型（snake_case，与 supabase/migrations/001_init.sql 对齐）。
 * 本地 DocumentRow 等仍是 camelCase；同步层负责双向映射。
 */

export type SupabaseDocumentRow = {
  id: string;
  original_file_name: string;
  stored_file_path: string;
  sha256: string;
  book_title: string | null;
  author: string | null;
  tradition: string | null;
  file_type: "pdf" | "markdown" | "text";
  page_count: number;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  local_synced_at: string | null;
};

export type SupabasePageRow = {
  id: string;
  document_id: string;
  page_number: number;
  section_title: string | null;
  text: string;
  text_hash: string;
  char_count: number;
  extraction_method: string;
  created_at: string;
};

export type SupabaseChunkRow = {
  id: string;
  document_id: string;
  page_id: string;
  page_number: number;
  section_title: string | null;
  chunk_index: number;
  text: string;
  text_hash: string;
  start_offset: number;
  end_offset: number;
  embedding_model: string | null;
  vector_id: string | null;
  /** pgvector；同步时从本地 indexes/chunks.json 写入 */
  embedding: number[] | null;
  created_at: string;
};

export type SupabaseChatSessionRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type SupabaseChatMessageRow = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  metadata_json: unknown;
  created_at: string;
};

export type SupabaseAnswerCitationRow = {
  id: string;
  message_id: string;
  document_id: string;
  chunk_id: string;
  source_file_name: string;
  page_number: number;
  quote: string | null;
  created_at: string;
};

export type MatchChunkRow = {
  id: string;
  chunk_id: string;
  document_id: string;
  source_file_name: string;
  page_number: number;
  section_title: string | null;
  book_title: string | null;
  author: string | null;
  tradition: string | null;
  text: string;
  score: number;
};

export type SyncReport = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  documentsUpserted: number;
  pagesUpserted: number;
  chunksUpserted: number;
  filesUploaded: number;
  filesSkipped: number;
  embeddingsMissing: number;
  errors: string[];
};
