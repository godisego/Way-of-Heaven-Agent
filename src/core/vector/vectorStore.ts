export type VectorRecord = {
  id: string;
  chunkId: string;
  documentId: string;
  sourceFileName: string;
  pageNumber: number; // 章节序号
  sectionTitle: string | null; // 章节标题
  bookTitle: string | null; // 书名（引用时优先用）
  author: string | null;
  tradition: string | null;
  text: string;
  embedding: number[];
};

export type VectorSearchResult = VectorRecord & {
  score: number;
};

export interface VectorStore {
  upsert(records: VectorRecord[]): Promise<void>;
  /**
   * 相似度检索。filter 为可选元数据谓词（如按 tradition 分库）：
   * 本地实现下推到排序前过滤（不占 topK 名额）；云端实现暂为召回后过滤。
   */
  search(
    embedding: number[],
    topK: number,
    filter?: (record: VectorRecord) => boolean,
  ): Promise<VectorSearchResult[]>;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aNorm += a[i] * a[i];
    bNorm += b[i] * b[i];
  }
  if (!aNorm || !bNorm) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}
