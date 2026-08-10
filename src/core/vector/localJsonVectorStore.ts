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

  readAll(): VectorRecord[] {
    if (!fs.existsSync(this.indexPath)) return [];
    const raw = fs.readFileSync(this.indexPath, "utf8");
    if (!raw.trim()) return [];
    return JSON.parse(raw) as VectorRecord[];
  }

  private writeAll(records: VectorRecord[]) {
    fs.writeFileSync(this.indexPath, JSON.stringify(records, null, 2), "utf8");
  }

  /**
   * 全量替换本地索引。先写同目录临时文件，再 rename，避免重建过程中留下半个索引。
   */
  replaceAll(records: VectorRecord[]): void {
    const temporaryPath = `${this.indexPath}.rebuild-${process.pid}-${Date.now()}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(records, null, 2), "utf8");
    try {
      fs.renameSync(temporaryPath, this.indexPath);
    } catch (error) {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      throw error;
    }
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
    expectedModel?: string,
  ): Promise<VectorSearchResult[]> {
    const all = this.readAll();
    // 守卫：索引非空时，先校验向量空间一致，避免错位后「全员 0 分」或「伪相似度」静默通过。
    if (all.length) {
      const indexDim = all[0].embedding?.length ?? 0;
      // 取第一条带戳记录作为模型样本（records[0] 可能是旧的无戳残留）
      const stamped = all.find((record) => record.embeddingModel);
      const indexModel = stamped?.embeddingModel ?? null;
      // 维度守卫：查询维度 ≠ 索引维度 → cosine 必然全员 0（见 vectorStore.cosineSimilarity）。
      // 这是最常见也最隐蔽的故障（如 mock 256 维 × 真模型 3072 维），必须在打分前拦下。
      if (indexDim && embedding.length !== indexDim) {
        throw new Error(
          `向量空间错位：索引为 ${indexDim} 维（模型 ${indexModel ?? "未知"}），本次查询为 ${embedding.length} 维（模型 ${expectedModel ?? "未知"}）。` +
            `维度不一致会让检索全员 0 分，三贤将统一答「暂未入藏」。请运行 \`npm run reindex:embeddings\` 用当前 embedding 模型重建索引。`,
        );
      }
      // 模型守卫：维度相同但模型不同 → cosine 返回伪相似度，比维度错位更隐蔽。
      // 用带戳记录判断；旧索引无戳则降级跳过，靠维度守卫 + doctor 兜底。
      if (expectedModel && indexModel && expectedModel !== indexModel) {
        throw new Error(
          `向量模型不一致：索引由「${indexModel}」构建，本次查询用「${expectedModel}」。` +
            `即使维度相同，不同模型的向量空间也不兼容，检索结果会失真。请运行 \`npm run reindex:embeddings\` 重建索引。`,
        );
      }
    }
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

export function readLocalVectorRecords(): VectorRecord[] {
  return new LocalJsonVectorStore().readAll();
}

export function replaceLocalVectorRecords(records: VectorRecord[]): void {
  new LocalJsonVectorStore().replaceAll(records);
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
