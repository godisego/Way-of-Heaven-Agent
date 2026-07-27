import fs from "node:fs";
import path from "node:path";
import { getAppConfig } from "@/core/config/appConfig";
import { listChunks, listDocuments, listPages } from "@/core/documents/documentRepository";
import type { VectorRecord } from "@/core/vector/vectorStore";
import { getSupabaseAdmin, isSupabaseConfigured } from "./client";
import {
  embeddingByChunkId,
  storageObjectPath,
  toSupabaseChunk,
  toSupabaseDocument,
  toSupabasePage,
} from "./mappers";
import { resolveLocalDocumentPath, uploadLocalDocumentFile } from "./storage";
import type { SyncReport } from "./types";

const UPSERT_BATCH = 50;

export type SyncLocalToSupabaseOptions = {
  /** 默认 true：上传 data/documents 下的源文件到 Storage */
  uploadFiles?: boolean;
  /** 默认 true：写入 documents / pages / chunks（含 embedding） */
  upsertRows?: boolean;
  /** 只同步这些 document id；默认全部 */
  documentIds?: string[];
  /** 进度日志 */
  onLog?: (message: string) => void;
};

/**
 * 本地 → Supabase 单向同步。
 * 源：data/app.json + data/indexes/chunks.json + data/documents/*
 * 目标：Postgres 表 + Storage bucket
 *
 * 不反向覆盖本地；云端是只读副本 / 部署用快照。
 */
export async function syncLocalToSupabase(
  options: SyncLocalToSupabaseOptions = {},
): Promise<SyncReport> {
  const startedAt = new Date().toISOString();
  const log = options.onLog ?? (() => undefined);
  const uploadFiles = options.uploadFiles !== false;
  const upsertRows = options.upsertRows !== false;

  const report: SyncReport = {
    ok: false,
    startedAt,
    finishedAt: startedAt,
    documentsUpserted: 0,
    pagesUpserted: 0,
    chunksUpserted: 0,
    filesUploaded: 0,
    filesSkipped: 0,
    embeddingsMissing: 0,
    errors: [],
  };

  if (!isSupabaseConfigured()) {
    report.errors.push("Supabase 未配置（SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）");
    report.finishedAt = new Date().toISOString();
    return report;
  }

  const config = getAppConfig();
  const client = getSupabaseAdmin();
  const embeddings = embeddingByChunkId(readLocalVectorIndex(config.indexesDir));
  const syncedAt = new Date().toISOString();

  let documents = listDocuments();
  if (options.documentIds?.length) {
    const allow = new Set(options.documentIds);
    documents = documents.filter((doc) => allow.has(doc.id));
  }

  log(`准备同步 ${documents.length} 个文档…`);

  for (const doc of documents) {
    try {
      const objectPath = storageObjectPath(doc.id, doc.originalFileName, doc.storedFilePath);

      if (uploadFiles) {
        const localPath = resolveLocalDocumentPath(doc.storedFilePath, config.documentsDir);
        const result = await uploadLocalDocumentFile(localPath, objectPath);
        if (result.uploaded) {
          report.filesUploaded += 1;
          log(`  上传文件 ${objectPath}`);
        } else if (result.skipped) {
          report.filesSkipped += 1;
          if (result.error) report.errors.push(`${doc.id}: ${result.error}`);
        } else if (result.error) {
          report.errors.push(`${doc.id} 文件上传失败: ${result.error}`);
        }
      }

      if (!upsertRows) continue;

      const docRow = toSupabaseDocument(doc, syncedAt);
      docRow.stored_file_path = objectPath;

      const { error: docError } = await client.from("documents").upsert(docRow, { onConflict: "id" });
      if (docError) {
        report.errors.push(`document ${doc.id}: ${docError.message}`);
        continue;
      }
      report.documentsUpserted += 1;

      const pages = listPages(doc.id).map(toSupabasePage);
      for (const batch of chunkArray(pages, UPSERT_BATCH)) {
        if (!batch.length) continue;
        const { error } = await client.from("document_pages").upsert(batch, { onConflict: "id" });
        if (error) {
          report.errors.push(`pages ${doc.id}: ${error.message}`);
        } else {
          report.pagesUpserted += batch.length;
        }
      }

      const chunkRows = listChunks(doc.id).map((chunk) => {
        const embedding = embeddings.get(chunk.id) ?? null;
        if (!embedding) report.embeddingsMissing += 1;
        return toSupabaseChunk(chunk, embedding);
      });

      for (const batch of chunkArray(chunkRows, UPSERT_BATCH)) {
        if (!batch.length) continue;
        const { error } = await client.from("chunks").upsert(batch, { onConflict: "id" });
        if (error) {
          report.errors.push(`chunks ${doc.id}: ${error.message}`);
        } else {
          report.chunksUpserted += batch.length;
        }
      }

      log(`  文档 ${doc.bookTitle ?? doc.originalFileName} 元数据已 upsert`);
    } catch (error) {
      report.errors.push(
        `${doc.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  report.ok = report.errors.length === 0;
  report.finishedAt = new Date().toISOString();
  log(
    `完成：docs=${report.documentsUpserted} pages=${report.pagesUpserted} chunks=${report.chunksUpserted} files=${report.filesUploaded} errors=${report.errors.length}`,
  );
  return report;
}

function readLocalVectorIndex(indexesDir: string): VectorRecord[] {
  const indexPath = path.join(indexesDir, "chunks.json");
  if (!fs.existsSync(indexPath)) return [];
  const raw = fs.readFileSync(indexPath, "utf8");
  if (!raw.trim()) return [];
  return JSON.parse(raw) as VectorRecord[];
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
