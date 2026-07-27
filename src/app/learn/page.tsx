import Link from "next/link";
import type { Metadata } from "next";
import { LEARN_DOCS } from "@/data/learnDocs";
import { GLOSSARY } from "@/data/concepts";

export const metadata: Metadata = {
  title: "学习馆 · 天道茶寮",
  description: "Agent 与命理双学径的文档与术语表",
};

/** 学习馆：走读文档 + 术语表（Agent 为重）。课程导览在主界面右下「学习」。 */
export default function LearnPage() {
  const agentDocs = LEARN_DOCS.filter((d) => d.track === "agent");
  const mingliDocs = LEARN_DOCS.filter((d) => d.track === "mingli");

  return (
    <main className="learn-shell">
      <header className="learn-head">
        <h1 className="learn-title">学习馆</h1>
        <p className="learn-sub">AGENT 为重 · 文档与术语 · 课程导览在茶寮右下「学习」</p>
      </header>
      <Link className="learn-back" href="/">
        ← 回茶寮
      </Link>

      <h2 className="learn-section-h">Agent 走读文档</h2>
      <div className="learn-doc-list">
        {agentDocs.map((doc) => (
          <Link key={doc.slug} className="learn-doc-card" href={`/learn/${doc.slug}`}>
            <strong>{doc.title}</strong>
            <span>{doc.blurb}</span>
          </Link>
        ))}
      </div>

      <h2 className="learn-section-h">命理文档</h2>
      <div className="learn-doc-list">
        {mingliDocs.map((doc) => (
          <Link key={doc.slug} className="learn-doc-card" href={`/learn/${doc.slug}`}>
            <strong>{doc.title}</strong>
            <span>{doc.blurb}</span>
          </Link>
        ))}
      </div>

      <h2 className="learn-section-h">Agent 术语表</h2>
      <dl className="learn-glossary">
        {GLOSSARY.agent.map((c) => (
          <div className="learn-term" key={c.term}>
            <dt>
              {c.term}
              {c.where ? <small>{c.where}</small> : null}
            </dt>
            <dd style={{ whiteSpace: "pre-line" }}>{c.explanation}</dd>
          </div>
        ))}
      </dl>

      <h2 className="learn-section-h">命理术语</h2>
      <dl className="learn-glossary">
        {GLOSSARY.mingli.map((c) => (
          <div className="learn-term" key={c.term}>
            <dt>
              {c.term}
              {c.where ? <small>{c.where}</small> : null}
            </dt>
            <dd style={{ whiteSpace: "pre-line" }}>{c.explanation}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
