export type DocumentStatus = "uploaded" | "extracting" | "indexing" | "indexed" | "failed";

export type DocumentFileType = "pdf" | "markdown" | "text";

export type DocumentRow = {
  id: string;
  originalFileName: string;
  storedFilePath: string;
  sha256: string;
  // 书籍/文献元数据（天道导师知识库）
  bookTitle: string | null; // 书名，如《存在与虚无》
  author: string | null; // 作者
  tradition: string | null; // 思想传统，如 existentialism / yijing / stoicism
  fileType: DocumentFileType;
  pageCount: number; // PDF 页数；Markdown/TXT 为章节或段落单元数
  status: DocumentStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentPageRow = {
  id: string;
  documentId: string;
  pageNumber: number; // PDF 页码；Markdown/TXT 为章节或段落序号
  sectionTitle: string | null; // 章节标题，如「第二章 自欺」
  text: string;
  textHash: string;
  charCount: number;
  extractionMethod: string;
  createdAt: string;
};

export type ChunkRow = {
  id: string;
  documentId: string;
  pageId: string;
  pageNumber: number; // PDF 页码；Markdown/TXT 为章节或段落序号
  sectionTitle: string | null; // 章节标题
  chunkIndex: number;
  text: string;
  textHash: string;
  startOffset: number;
  endOffset: number;
  embeddingModel: string | null;
  vectorId: string | null;
  createdAt: string;
};
