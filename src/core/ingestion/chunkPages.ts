import type { ChunkRow, DocumentPageRow } from "@/core/documents/documentTypes";
import { nowIso } from "@/core/documents/documentRepository";
import { randomId, sha256 } from "@/core/utils/hashing";

const TARGET_CHARS = 1200;
const OVERLAP_CHARS = 160;

export function chunkPages(pages: DocumentPageRow[]): ChunkRow[] {
  const chunks: ChunkRow[] = [];
  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;

    let start = 0;
    let chunkIndex = 0;
    while (start < text.length) {
      const end = Math.min(text.length, start + TARGET_CHARS);
      const chunkText = text.slice(start, end).trim();
      if (chunkText) {
        chunks.push({
          id: randomId("chk"),
          documentId: page.documentId,
          pageId: page.id,
          pageNumber: page.pageNumber,
          sectionTitle: page.sectionTitle ?? null,
          chunkIndex,
          text: chunkText,
          textHash: sha256(chunkText),
          startOffset: start,
          endOffset: end,
          embeddingModel: null,
          vectorId: null,
          createdAt: nowIso(),
        });
        chunkIndex += 1;
      }
      if (end === text.length) break;
      start = Math.max(0, end - OVERLAP_CHARS);
    }
  }
  return chunks;
}
