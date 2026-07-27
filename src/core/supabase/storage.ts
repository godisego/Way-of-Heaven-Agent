import fs from "node:fs";
import path from "node:path";
import { getSupabaseAdmin, getDocumentsBucket } from "./client";

export type UploadLocalFileResult = {
  objectPath: string;
  uploaded: boolean;
  skipped: boolean;
  error?: string;
};

/**
 * 把本地磁盘上的文档文件推到 Supabase Storage bucket。
 * 已存在且同 path 时默认覆盖（upsert），保证本地改完再同步一致。
 */
export async function uploadLocalDocumentFile(
  localFilePath: string,
  objectPath: string,
): Promise<UploadLocalFileResult> {
  if (!fs.existsSync(localFilePath)) {
    return {
      objectPath,
      uploaded: false,
      skipped: true,
      error: `本地文件不存在：${localFilePath}`,
    };
  }

  const buffer = fs.readFileSync(localFilePath);
  const contentType = guessContentType(objectPath);
  const client = getSupabaseAdmin();
  const bucket = getDocumentsBucket();

  const { error } = await client.storage.from(bucket).upload(objectPath, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    return {
      objectPath,
      uploaded: false,
      skipped: false,
      error: error.message,
    };
  }

  return { objectPath, uploaded: true, skipped: false };
}

export function resolveLocalDocumentPath(storedFilePath: string, documentsDir: string): string {
  if (path.isAbsolute(storedFilePath) && fs.existsSync(storedFilePath)) {
    return storedFilePath;
  }
  const base = path.basename(storedFilePath);
  const candidate = path.join(documentsDir, base);
  return candidate;
}

function guessContentType(objectPath: string): string {
  const lower = objectPath.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "text/markdown; charset=utf-8";
  if (lower.endsWith(".txt") || lower.endsWith(".text")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}
