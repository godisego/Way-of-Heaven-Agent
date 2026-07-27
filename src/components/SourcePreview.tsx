"use client";

import { useEffect, useState } from "react";
import type { Citation } from "./CitationList";

export function SourcePreview({ citation, onClose }: { citation: Citation; onClose: () => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const params = new URLSearchParams({
        documentId: citation.documentId,
        pageNumber: String(citation.pageNumber),
      });
      const response = await fetch(`/api/documents?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (cancelled) return;
      if (!response.ok) {
        setError(data.error ?? "未能读取原文");
        return;
      }
      setText(data.page?.text ?? "");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [citation.documentId, citation.pageNumber]);

  const book = citation.bookTitle ?? citation.sourceFileName;
  const section = citation.sectionTitle ?? `第${citation.pageNumber}节`;

  return (
    <div
      className="citation source-preview-panel"
      data-tip="这是人眼核验的最后一步:把导师的引用对照典籍原章节的全文,确认它没编。"
    >
      <div className="source-preview-head">
        <strong>
          原文 · 《{book}》 · {section}
        </strong>
        <button className="secondary-button" onClick={onClose} type="button">
          合卷
        </button>
      </div>
      {error ? <p className="error">{error}</p> : <pre>{text || "展卷中…"}</pre>}
    </div>
  );
}
