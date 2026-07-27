import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEARN_DOCS, getLearnDoc } from "@/data/learnDocs";
import { renderMarkdownToHtml } from "@/core/utils/miniMarkdown";

export function generateStaticParams() {
  return LEARN_DOCS.map((d) => ({ slug: d.slug }));
}

/** 学习馆文档页：白名单内的仓库 Markdown，经手写迷你渲染器输出。 */
export default async function LearnDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getLearnDoc(slug);
  if (!doc) notFound();

  let markdown: string;
  try {
    markdown = await readFile(path.join(process.cwd(), doc.file), "utf-8");
  } catch {
    markdown = `# ${doc.title}\n\n（未找到 ${doc.file}——请确认仓库完整。）`;
  }
  const html = renderMarkdownToHtml(markdown);

  return (
    <main className="learn-shell">
      <header className="learn-head">
        <h1 className="learn-title">{doc.title}</h1>
        <p className="learn-sub">{doc.file}</p>
      </header>
      <Link className="learn-back" href="/learn">
        ← 回学习馆
      </Link>
      {/* 内容来自本仓库 docs/ 白名单，渲染前已逐行 HTML 转义 */}
      <article className="learn-article" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
