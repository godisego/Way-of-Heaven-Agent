import path from "node:path";
import { pathToFileURL } from "node:url";

export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
};

export async function extractPdfPages(buffer: Buffer): Promise<ExtractedPdfPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdfjs 在 Node 环境下会走 fake worker，但它仍然要求 GlobalWorkerOptions.workerSrc
  // 必须指向一个能 import 的模块路径（fake worker 通过 dynamic import 加载源码）。
  // 默认的 "./pdf.worker.mjs" 在 Next dev / vendor-chunks 下解析不到，所以手动设到
  // node_modules 里包自带的真实 worker 文件路径，转成 file:// URL 让 Node 能解析。
  const workerPath = path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  }
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const pages: ExtractedPdfPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ pageNumber, text });
  }

  return pages;
}
