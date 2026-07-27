import { chunkPages } from "./chunkPages";
import { extractPdfPages } from "./pdfPageExtractor";
import { extractTextSections } from "./textExtractor";
import { indexChunks } from "./indexChunks";
import {
  findDocumentByHash,
  getDocument,
  insertChunks,
  insertDocument,
  insertPages,
  listChunks,
  listPages,
  nowIso,
  updateDocumentStatus,
} from "@/core/documents/documentRepository";
import type {
  DocumentFileType,
  DocumentPageRow,
  DocumentRow,
} from "@/core/documents/documentTypes";
import { randomId, sha256 } from "@/core/utils/hashing";
import { saveDocumentBuffer } from "@/core/utils/fileStorage";

export type IngestInput = {
  buffer: Buffer;
  originalFileName: string;
  // 可选：调用方（如上传表单）显式提供的书籍元数据，优先于文件名推断。
  bookTitle?: string | null;
  author?: string | null;
  tradition?: string | null;
};

const TEXT_EXTENSIONS = [".md", ".markdown", ".txt", ".text"];

function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

// 从文件名推断书名与思想传统。书名去掉扩展名和《》，传统按关键词匹配。
function inferBookMetadata(fileName: string): Pick<DocumentRow, "bookTitle" | "tradition"> {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[《》]/g, "").trim();
  const lower = base.toLowerCase();
  let tradition: string | null = null;
  if (/易经|周易|yijing|i-?ching|卦|八字|命理|盲派/.test(base) || /yijing|iching/.test(lower)) tradition = "yijing";
  else if (/存在|虚无|萨特|加缪|海德格尔|尼采|existential|sartre|camus/.test(base) || /existential/.test(lower)) tradition = "existentialism";
  else if (/斯多葛|沉思录|塞涅卡|stoic|aurelius|seneca/.test(base) || /stoic/.test(lower)) tradition = "stoicism";
  else if (/天道|遥远的救世主|丁元英|文化属性|格律/.test(base) || /tiandao|yuanying/.test(lower)) tradition = "tiandao";
  else if (/道德经|庄子|列子|老子|daoism|laozi|zhuangzi/.test(base)) tradition = "daoism";
  else if (/论语|孟子|confuci/.test(base)) tradition = "chinese-classics";
  return { bookTitle: base || fileName, tradition };
}

export async function ingestDocumentBuffer(input: IngestInput): Promise<DocumentRow> {
  const ext = fileExtension(input.originalFileName);
  const isText = TEXT_EXTENSIONS.includes(ext);
  const isPdf = ext === ".pdf";
  if (!isText && !isPdf) {
    throw new Error(`不支持的文件类型：${ext || "(无扩展名)"}。目前支持 .md / .txt / .pdf。`);
  }

  const fileHash = sha256(input.buffer);
  const existing = findDocumentByHash(fileHash);
  if (existing?.status === "indexed") return existing;
  if (existing) {
    return processDocument(existing, input.buffer);
  }

  const id = randomId("doc");
  const inferred = inferBookMetadata(input.originalFileName);
  const storedFilePath = saveDocumentBuffer(id, input.originalFileName, input.buffer);
  const createdAt = nowIso();
  const document: DocumentRow = {
    id,
    originalFileName: input.originalFileName,
    storedFilePath,
    sha256: fileHash,
    bookTitle: input.bookTitle ?? inferred.bookTitle,
    author: input.author ?? null,
    tradition: input.tradition ?? inferred.tradition,
    fileType: (isPdf
      ? "pdf"
      : ext === ".md" || ext === ".markdown"
        ? "markdown"
        : "text") satisfies DocumentFileType,
    pageCount: 0,
    status: "uploaded",
    errorMessage: null,
    createdAt,
    updatedAt: createdAt,
  };
  insertDocument(document);

  return processDocument(document, input.buffer);
}

async function processDocument(document: DocumentRow, buffer: Buffer): Promise<DocumentRow> {
  const { id } = document;
  const isPdf = document.fileType === "pdf";
  try {
    let pages = listPages(id);
    if (!pages.length) {
      updateDocumentStatus(id, "extracting");
      const extractionMethod = isPdf ? "pdfjs-dist" : "text-sections";
      const extracted = isPdf
        ? (await extractPdfPages(buffer)).map((page) => ({
            pageNumber: page.pageNumber,
            sectionTitle: `第${page.pageNumber}页`,
            text: page.text,
          }))
        : extractTextSections(buffer.toString("utf8"));

      const extractedPages: DocumentPageRow[] = extracted.map((section) => ({
        id: randomId("page"),
        documentId: id,
        pageNumber: section.pageNumber,
        sectionTitle: section.sectionTitle,
        text: section.text,
        textHash: sha256(section.text),
        charCount: section.text.length,
        extractionMethod,
        createdAt: nowIso(),
      }));
      insertPages(extractedPages);
      pages = listPages(id);
    }

    updateDocumentStatus(id, "indexing", { pageCount: pages.length });
    let chunks = listChunks(id);
    if (!chunks.length) {
      chunks = chunkPages(pages);
      insertChunks(chunks);
    }
    await indexChunks(chunks);

    updateDocumentStatus(id, "indexed", { pageCount: pages.length });
    return (
      getDocument(id) ?? {
        ...document,
        status: "indexed",
        pageCount: pages.length,
        errorMessage: null,
        updatedAt: nowIso(),
      }
    );
  } catch (error) {
    updateDocumentStatus(id, "failed", { errorMessage: error instanceof Error ? error.message : "未知错误" });
    throw error;
  }
}
