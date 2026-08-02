/** 把仓库自带的三贤示例藏书收入当前 DATA_DIR。 */
import fs from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { ingestDocumentBuffer } from "../src/core/ingestion/ingestionPipeline";

type SampleBook = {
  fileName: string;
  bookTitle: string;
  author: string | null;
  tradition: "existentialism" | "stoicism" | "yijing" | "chinese-classics" | "daoism";
};

const SAMPLE_BOOKS: SampleBook[] = [
  {
    fileName: "存在主义笔记.md",
    bookTitle: "存在主义笔记",
    author: null,
    tradition: "existentialism",
  },
  {
    fileName: "荒诞与反抗行动札记.md",
    bookTitle: "荒诞与反抗行动札记",
    author: "知识库原创整理",
    tradition: "existentialism",
  },
  {
    fileName: "斯多葛可控圈实践.md",
    bookTitle: "斯多葛可控圈实践",
    author: "知识库原创整理",
    tradition: "stoicism",
  },
  {
    fileName: "周易六十四卦处世选读.md",
    bookTitle: "周易六十四卦处世选读",
    author: "公版古籍选句·知识库整理",
    tradition: "yijing",
  },
  {
    fileName: "鬼谷子捭阖与决策札记.md",
    bookTitle: "鬼谷子捭阖与决策札记",
    author: "知识库原创整理",
    tradition: "chinese-classics",
  },
  {
    fileName: "命理判断边界与人事建议.md",
    bookTitle: "命理判断边界与人事建议",
    author: "知识库原创整理",
    tradition: "yijing",
  },
  {
    fileName: "道德经处世选读.md",
    bookTitle: "道德经处世选读",
    author: "公版古籍选句·知识库整理",
    tradition: "daoism",
  },
  {
    fileName: "庄子内篇行动札记.md",
    bookTitle: "庄子内篇行动札记",
    author: "公版古籍提要·知识库整理",
    tradition: "daoism",
  },
  {
    fileName: "列子虚静与应物札记.md",
    bookTitle: "列子虚静与应物札记",
    author: "公版古籍提要·知识库整理",
    tradition: "daoism",
  },
];

async function main() {
  // 独立 tsx 脚本不会像 `next dev` 那样自动读取 .env.local。
  // 必须先载入，再让 provider 判断走 mock 还是真实 embedding。
  loadEnvConfig(process.cwd());
  const embeddingMode = process.env.USE_MOCK_EMBEDDING === "1" ? "本地 mock" : "真实 embedding";
  console.log(`入库向量模式：${embeddingMode}`);

  for (const book of SAMPLE_BOOKS) {
    const samplePath = path.resolve("data/samples", book.fileName);
    const document = await ingestDocumentBuffer({
      buffer: fs.readFileSync(samplePath),
      originalFileName: path.basename(samplePath),
      bookTitle: book.bookTitle,
      author: book.author,
      tradition: book.tradition,
    });

    console.log(
      `已入藏：${document.bookTitle ?? document.originalFileName}（${document.pageCount} 节，${document.status}）`,
    );
  }

  console.log(`三贤示例藏书就绪：共 ${SAMPLE_BOOKS.length} 卷。`);
}

main().catch((error) => {
  console.error("示例藏书入库失败：", error instanceof Error ? error.message : error);
  process.exit(1);
});
