import { getDb } from "@/core/db/jsonDb";
import type { ChunkRow, DocumentPageRow, DocumentRow, DocumentStatus } from "./documentTypes";

export function nowIso(): string {
  return new Date().toISOString();
}

export function insertDocument(document: DocumentRow): DocumentRow {
  return getDb().insert<DocumentRow>("documents", document);
}

export function findDocumentByHash(hash: string): DocumentRow | null {
  return getDb().find<DocumentRow>("documents", (document) => document.sha256 === hash);
}

export function updateDocumentStatus(id: string, status: DocumentStatus, updates: Partial<Pick<DocumentRow, "pageCount" | "errorMessage">> = {}) {
  getDb().update<DocumentRow>(
    "documents",
    (document) => document.id === id,
    (document) => ({
      ...document,
      status,
      pageCount: updates.pageCount ?? document.pageCount,
      errorMessage: updates.errorMessage ?? null,
      updatedAt: nowIso(),
    }),
  );
}

export function listDocuments(): DocumentRow[] {
  return getDb()
    .all<DocumentRow>("documents")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDocument(id: string): DocumentRow | null {
  return getDb().find<DocumentRow>("documents", (document) => document.id === id);
}

export function insertPages(pages: DocumentPageRow[]) {
  const db = getDb();
  for (const page of pages) {
    db.insert<DocumentPageRow>(
      "document_pages",
      page,
      (existing) => existing.documentId === page.documentId && existing.pageNumber === page.pageNumber,
    );
  }
}

export function listPages(documentId: string): DocumentPageRow[] {
  return getDb()
    .filter<DocumentPageRow>("document_pages", (page) => page.documentId === documentId)
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

export function getPageByDocumentAndNumber(documentId: string, pageNumber: number): DocumentPageRow | null {
  return getDb().find<DocumentPageRow>(
    "document_pages",
    (page) => page.documentId === documentId && page.pageNumber === pageNumber,
  );
}

export function insertChunks(chunks: ChunkRow[]) {
  const db = getDb();
  for (const chunk of chunks) {
    db.insert<ChunkRow>(
      "chunks",
      chunk,
      (existing) =>
        existing.documentId === chunk.documentId && existing.pageNumber === chunk.pageNumber && existing.chunkIndex === chunk.chunkIndex,
    );
  }
}

export function updateChunkVector(chunkId: string, embeddingModel: string, vectorId: string) {
  getDb().update<ChunkRow>(
    "chunks",
    (chunk) => chunk.id === chunkId,
    (chunk) => ({ ...chunk, embeddingModel, vectorId }),
  );
}

export function listChunks(documentId: string): ChunkRow[] {
  return getDb()
    .filter<ChunkRow>("chunks", (chunk) => chunk.documentId === documentId)
    .sort((a, b) => a.pageNumber - b.pageNumber || a.chunkIndex - b.chunkIndex);
}
