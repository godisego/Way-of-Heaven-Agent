/**
 * 本地 VectorRecord.embedding 维数应与 supabase/migrations 中 vector(N) 一致。
 * text-embedding-3-large → 3072；若换模型请同步改 SQL 与本常量。
 */
export const SUPABASE_EMBEDDING_DIMENSIONS = 3072;

export const SUPABASE_TABLES = {
  documents: "documents",
  documentPages: "document_pages",
  chunks: "chunks",
  chatSessions: "chat_sessions",
  chatMessages: "chat_messages",
  answerCitations: "answer_citations",
} as const;

export const MATCH_CHUNKS_RPC = "match_chunks";
