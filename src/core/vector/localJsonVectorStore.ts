import fs from "node:fs";
import path from "node:path";
import { getAppConfig } from "@/core/config/appConfig";
import { getSupabaseVectorStore } from "@/core/supabase/vectorStore";
import { ensureDataDirs } from "@/core/utils/fileStorage";
import { cosineSimilarity, type VectorRecord, type VectorSearchResult, type VectorStore } from "./vectorStore";

export class LocalJsonVectorStore implements VectorStore {
  private indexPath: string;

  constructor() {
    ensureDataDirs();
    this.indexPath = path.join(getAppConfig().indexesDir, "chunks.json");
  }

  private readAll(): VectorRecord[] {
    if (!fs.existsSync(this.indexPath)) return [];
    const raw = fs.readFileSync(this.indexPath, "utf8");
    if (!raw.trim()) return [];
    return JSON.parse(raw) as VectorRecord[];
  }

  private writeAll(records: VectorRecord[]) {
    fs.writeFileSync(this.indexPath, JSON.stringify(records, null, 2), "utf8");
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    const existing = this.readAll();
    const byId = new Map(existing.map((record) => [record.id, record]));
    for (const record of records) byId.set(record.id, record);
    this.writeAll([...byId.values()]);
  }

  async search(
    embedding: number[],
    topK: number,
    filter?: (record: VectorRecord) => boolean,
  ): Promise<VectorSearchResult[]> {
    const all = this.readAll();
    const candidates = filter ? all.filter(filter) : all;
    return candidates
      .map((record) => ({ ...record, score: cosineSimilarity(embedding, record.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

export function getLocalVectorStore(): VectorStore {
  return new LocalJsonVectorStore();
}

/**
 * 默认本地 JSON 向量库。
 * 设置 VECTOR_BACKEND=supabase 且已配置密钥时，检索走 Supabase（见 docs/supabase-setup.md）。
 * 入库路径仍应写本地；云端靠 sync:supabase 推送。
 */
export function getVectorStore(): VectorStore {
  if (getAppConfig().vectorBackend === "supabase") {
    return getSupabaseVectorStore();
  }
  return getLocalVectorStore();
}
