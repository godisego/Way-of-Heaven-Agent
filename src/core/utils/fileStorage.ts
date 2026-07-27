import fs from "node:fs";
import path from "node:path";
import { getAppConfig } from "@/core/config/appConfig";

export function ensureDataDirs() {
  const config = getAppConfig();
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.documentsDir, { recursive: true });
  fs.mkdirSync(config.indexesDir, { recursive: true });
}

export function safeDocumentFileName(documentId: string, originalFileName: string): string {
  const extension = path.extname(originalFileName) || ".pdf";
  return `${documentId}${extension.toLowerCase()}`;
}

export function saveDocumentBuffer(documentId: string, originalFileName: string, buffer: Buffer): string {
  ensureDataDirs();
  const config = getAppConfig();
  const filePath = path.join(config.documentsDir, safeDocumentFileName(documentId, originalFileName));
  fs.writeFileSync(filePath, buffer);
  return filePath;
}
