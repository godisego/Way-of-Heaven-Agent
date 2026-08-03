"use client";

import { useState } from "react";
import { SourcePreview } from "./SourcePreview";

export type Citation = {
  sourceFileName: string;
  bookTitle: string | null;
  sectionTitle: string | null;
  documentId: string;
  pageNumber: number;
  chunkId: string;
  quote?: string;
};

function citationLabel(citation: Citation): string {
  const book = citation.bookTitle ?? citation.sourceFileName;
  const section = citation.sectionTitle ?? `第${citation.pageNumber}节`;
  return `《${book}》 · ${section}`;
}

export function CitationList({ citations }: { citations?: Citation[] }) {
  const [selected, setSelected] = useState<Citation | null>(null);
  const list = Array.isArray(citations) ? citations : [];

  return (
    <div
      className="citations"
      data-tip="导师引用的出处。程序会核对每个 [《书名》, 来源位置] 是否来自本轮 Sources；任意一条无法核对，整组引用都不会通过。"
    >
      <div className="citations-label">出典</div>
      {list.map((citation) => (
        <div className="citation" key={`${citation.chunkId}-${citation.pageNumber}`}>
          <div className="citation-actions">
            <button
              className="secondary-button"
              onClick={() => setSelected(citation)}
              data-tip="点这个看引用对应的典籍原文,可以人手核验。"
            >
              {citationLabel(citation)}
            </button>
          </div>
          {citation.quote ? (
            <div className="source-preview" data-tip="这段文本就是模型看到的那段 chunk 的内容。">
              {citation.quote}
            </div>
          ) : null}
        </div>
      ))}
      {selected ? <SourcePreview citation={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
