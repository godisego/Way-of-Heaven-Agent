export {
  getSupabaseAdmin,
  getDocumentsBucket,
  isSupabaseConfigured,
} from "./client";
export { syncLocalToSupabase } from "./syncLocalToSupabase";
export type { SyncLocalToSupabaseOptions } from "./syncLocalToSupabase";
export { getSupabaseVectorStore, SupabaseVectorStore } from "./vectorStore";
export type { SyncReport, MatchChunkRow } from "./types";
