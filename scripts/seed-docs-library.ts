/**
 * 把 docs/ 下的命理/玄学教材收入向量库（补 seed-sample-library 的缺口）。
 *
 * 背景：seed-sample-library 只入了 9 卷哲学书（存在主义/斯多葛/道家/易传），
 * 命理技术内容（八字/五行/十神/排盘/格局）一篇都没有。
 * 导致检索命理问题时全是无关结果，触发"资料不足"。
 *
 * 本脚本把 docs/ 下 18 篇命理系统课入库，tradition 统一标 "yijing"
 * （命理归易学大类；分库检索时老胡/玄的专库能命中）。
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { ingestDocumentBuffer } from "../src/core/ingestion/ingestionPipeline";
import { shouldUseMockEmbedding } from "../src/core/providers/openAICompatibleProvider";

type DocBook = {
  fileName: string;
  bookTitle: string;
};

// docs/ 下的命理系统课（与 LearningLibrary 的 LESSONS 一一对应）
const DOC_BOOKS: DocBook[] = [
  { fileName: "bazi-overview.md", bookTitle: "命理大局观" },
  { fileName: "bazi-yinyang-wuxing-primer.md", bookTitle: "阴阳与五行入门" },
  { fileName: "bazi-stems-branches.md", bookTitle: "天干地支与藏干系统" },
  { fileName: "bazi-chart-anatomy.md", bookTitle: "八字盘面解剖" },
  { fileName: "bazi-shishen-zuhe.md", bookTitle: "十神组合断法" },
  { fileName: "bazi-ten-gods-strength.md", bookTitle: "十神与身强身弱" },
  { fileName: "bazi-branch-relations.md", bookTitle: "地支合冲刑害会" },
  { fileName: "bazi-twelve-stages.md", bookTitle: "十二长生系统" },
  { fileName: "bazi-gege-yongshen.md", bookTitle: "格局取用与用神" },
  { fileName: "bazi-tiaohou.md", bookTitle: "调候用神法" },
  { fileName: "bazi-luck-cycles.md", bookTitle: "大运与流年时间轴" },
  { fileName: "bazi-reading-workflow.md", bookTitle: "八字看盘标准流程" },
  { fileName: "bazi-school-differences.md", bookTitle: "子平与盲派流派差异" },
  { fileName: "bazi-mangpai-primer.md", bookTitle: "盲派命理入门" },
  { fileName: "bazi-classics-guide.md", bookTitle: "命理经典导读" },
  { fileName: "bazi-guide.md", bookTitle: "八字排盘使用方法" },
  { fileName: "metaphysics-overview.md", bookTitle: "玄学门派速览" },
  { fileName: "mentor-libraries-and-bazi-design.md", bookTitle: "三贤藏书与命理设计" },
];

async function main() {
  loadEnvConfig(process.cwd());
  const embeddingMode = shouldUseMockEmbedding() ? "本地 mock" : "真实 embedding";
  console.log(`入库向量模式：${embeddingMode}`);
  console.log(`待入库命理教材：${DOC_BOOKS.length} 篇\n`);

  let success = 0;
  let skipped = 0;
  for (const book of DOC_BOOKS) {
    const docPath = path.resolve("docs", book.fileName);
    if (!fs.existsSync(docPath)) {
      console.log(`⚠ 跳过（文件不存在）：${book.fileName}`);
      skipped += 1;
      continue;
    }
    try {
      const document = await ingestDocumentBuffer({
        buffer: fs.readFileSync(docPath),
        originalFileName: book.fileName,
        bookTitle: book.bookTitle,
        author: "天道茶寮·命理系统课",
        tradition: "yijing",
      });
      console.log(`✓ 已入藏：${book.bookTitle}（${document.pageCount} 节，${document.status}）`);
      success += 1;
    } catch (error) {
      // 已入库的文档（hash 重复）会跳过，不算错误
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("已存在") || msg.includes("duplicate") || msg.includes("exists")) {
        console.log(`→ 已存在，跳过：${book.bookTitle}`);
        skipped += 1;
      } else {
        console.error(`✗ 入库失败：${book.bookTitle} —— ${msg}`);
      }
    }
  }

  console.log(`\n命理教材入库完成：${success} 篇入库，${skipped} 篇跳过。`);
}

main().catch((error) => {
  console.error("命理教材入库失败：", error instanceof Error ? error.message : error);
  process.exit(1);
});
