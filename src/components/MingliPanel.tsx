"use client";

/**
 * 命理释义面板（规则引擎 · 交互层）
 *
 * 接收「用户点了盘面哪个元素」，用 explainChart 组合器生成解释卡：
 * - 词条链接可继续点击跳转（交叉引用）
 * - 「问三贤」把该元素连同盘面上下文递到茶案输入框
 * - 「查典籍」用 RAG 检索已入藏的命理书，给出可核验出处
 */

import { useEffect, useState } from "react";
import type { BaziResult } from "@/core/user/baziCalculator";
import {
  explainSelection,
  type ExplainCard,
  type MingliSelection,
} from "@/core/mingli/explainChart";

type SearchHit = {
  chunkId: string;
  documentId: string;
  sourceFileName: string;
  bookTitle: string | null;
  sectionTitle: string | null;
  pageNumber: number;
  text: string;
  score: number;
};

export function MingliPanel({
  chart,
  selection,
  onSelect,
}: {
  chart: BaziResult;
  selection: MingliSelection | null;
  onSelect: (sel: MingliSelection | null) => void;
}) {
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [asked, setAsked] = useState(false);

  // 切换选中元素时重置检索与提问状态
  useEffect(() => {
    setHits(null);
    setSearching(false);
    setSearchError("");
    setAsked(false);
  }, [selection]);

  if (!selection) return null;
  const card: ExplainCard = explainSelection(chart, selection);

  function askTavern() {
    window.dispatchEvent(new CustomEvent("tavern:ask", { detail: { question: card.askText } }));
    setAsked(true);
  }

  async function searchLibrary() {
    setSearching(true);
    setSearchError("");
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: card.searchText, topK: 3 }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSearchError(data.error ?? "检索失败");
        setHits([]);
        return;
      }
      setHits((data.results ?? []) as SearchHit[]);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "检索失败");
      setHits([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mingli-panel" data-tour-id="mingli-panel" data-tip="命理释义卡：内容由词条库 + 确定性规则按你的盘组合生成，不是模型现编的。卡里的词条可以继续点击。">
      <div className="mingli-head">
        <div>
          <div className="mingli-title">{card.title}</div>
          {card.subtitle ? <div className="mingli-sub">{card.subtitle}</div> : null}
        </div>
        <button type="button" className="mingli-close" onClick={() => onSelect(null)} aria-label="收起释义">
          收
        </button>
      </div>

      {card.sections.map((s, i) => (
        <div className="mingli-section" key={i}>
          {s.heading ? <div className="mingli-section-h">{s.heading}</div> : null}
          <p className="mingli-section-p">{s.body}</p>
        </div>
      ))}

      {card.links.length ? (
        <div className="mingli-links">
          <span className="mingli-links-label">相关</span>
          {card.links.map((l) => (
            <button
              key={l.id}
              type="button"
              className="mingli-link"
              onClick={() => onSelect({ kind: "entry", id: l.id })}
            >
              {l.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mingli-actions">
        <button type="button" className="mingli-action" onClick={askTavern}>
          {asked ? "已递到茶案 ↓" : "问三贤"}
        </button>
        <button type="button" className="mingli-action" onClick={() => void searchLibrary()} disabled={searching}>
          {searching ? "翻卷中…" : "查典籍"}
        </button>
      </div>

      {hits !== null ? (
        <div className="mingli-hits">
          {searchError ? <p className="error">{searchError}</p> : null}
          {!searchError && hits.length === 0 ? (
            <p className="mingli-note">暂未入藏相关典籍。上传命理书籍（入阁藏书）后，这里会给出可核验的原文出处。</p>
          ) : null}
          {hits.map((h) => (
            <div className="mingli-hit" key={h.chunkId}>
              <div className="mingli-hit-head">
                《{h.bookTitle ?? h.sourceFileName}》 · {h.sectionTitle ?? `第${h.pageNumber}节`}
                <span className="mingli-hit-score">{h.score.toFixed(2)}</span>
              </div>
              <p className="mingli-hit-text">{h.text.slice(0, 160)}…</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
