import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEARN_DOCS, getAdjacentDocs, getLearnDoc, getTrackDocs } from "@/data/learnDocs";
import { renderMarkdownToHtml } from "@/core/utils/miniMarkdown";
import { LearnArticle } from "@/components/learning/MingliFigureInjector";
import { QuickAsk } from "@/components/learning/QuickAsk";
import styles from "@/components/learning/LearningLibrary.module.css";

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
  const adjacent = getAdjacentDocs(doc);
  const trackTitle = doc.track === "agent" ? "Agent 径" : "命理径";
  const trackDocs = getTrackDocs(doc.track);
  const docIndex = trackDocs.findIndex((item) => item.slug === doc.slug);
  const stageTitle = doc.stage.replace(/^.+?·\s*/, "");

  return (
    <main className={`learn-shell learn-doc-page ${styles.docPage}`}>
      <nav className="learn-doc-breadcrumb" aria-label="文档位置">
        <Link href="/learn">学习馆</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/learn#${doc.track}-curriculum`}>{trackTitle}</Link>
        <span aria-hidden="true">/</span>
        <span>{stageTitle}</span>
      </nav>

      <header className={`learn-doc-context is-${doc.track}`}>
        <div>
          <span className="learn-kicker">{doc.level}课程</span>
          <p>{doc.blurb}</p>
        </div>
        <div className="learn-doc-position" aria-label={`本学径第 ${docIndex + 1} 篇，共 ${trackDocs.length} 篇`}>
          <span>课程进度</span>
          <strong>{String(docIndex + 1).padStart(2, "0")}</strong>
          <small>/ {String(trackDocs.length).padStart(2, "0")}</small>
        </div>
      </header>

      {doc.quickRefs?.length ? (
        <nav className="learn-doc-quickrefs" aria-label="本文相关命理词条">
          <span>本文速查</span>
          {doc.quickRefs.map((item) => (
            <Link key={item.id} href={`/learn#mingli-${item.id}`}>
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
      {/* 内容来自本仓库 docs/ 白名单，渲染前已逐行 HTML 转义；图表围栏由渲染器识别 */}
      {/* 正文：图表围栏（```wuxing 等）由 miniMarkdown 渲染为占位符，LearnArticle 注入可交互图表 */}
      <LearnArticle html={html} />
      <nav className="learn-doc-next" aria-label="学径内上一篇和下一篇">
        {adjacent.previous ? (
          <Link href={`/learn/${adjacent.previous.slug}`}>
            <span>← 上一篇</span>
            <strong>{adjacent.previous.title}</strong>
          </Link>
        ) : <span />}
        {adjacent.next ? (
          <Link href={`/learn/${adjacent.next.slug}`}>
            <span>下一篇 →</span>
            <strong>{adjacent.next.title}</strong>
          </Link>
        ) : <span />}
      </nav>
      <QuickAsk docTitle={doc.title} />
    </main>
  );
}
