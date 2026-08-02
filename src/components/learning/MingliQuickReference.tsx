"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MINGLI_KB,
  type MingliCategory,
  type MingliEntry,
} from "@/core/mingli/mingliKb";

const CATEGORY_LABEL: Record<MingliCategory | "all", string> = {
  all: "全部",
  concept: "基础概念",
  tiangan: "十天干",
  dizhi: "十二地支",
  shishen: "十神",
  wuxing: "五行",
  gongwei: "四柱宫位",
  shensha: "神煞",
};

const CATEGORY_ORDER: Array<MingliCategory | "all"> = [
  "all",
  "concept",
  "tiangan",
  "dizhi",
  "shishen",
  "wuxing",
  "gongwei",
  "shensha",
];

const ENTRIES = Object.values(MINGLI_KB);

function entryAnchor(id: string): string {
  return `mingli-${id}`;
}

function entryFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (!hash.startsWith("mingli-")) return null;
  const id = hash.slice("mingli-".length);
  return MINGLI_KB[id] ? id : null;
}

/** 学习馆命理词条交叉速查：搜索、分类、深链接与词条关系网共用 mingliKb 唯一数据源。 */
export function MingliQuickReference() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MingliCategory | "all">("all");
  const [selectedId, setSelectedId] = useState("riyuan");

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return ENTRIES.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      if (!keyword) return true;
      return `${entry.term}\n${entry.brief}\n${entry.detail}`.toLowerCase().includes(keyword);
    });
  }, [category, query]);

  const selected = MINGLI_KB[selectedId] ?? MINGLI_KB.riyuan;
  const related = selected.links
    .map((id) => MINGLI_KB[id])
    .filter((entry): entry is MingliEntry => Boolean(entry));

  function selectEntry(id: string, scroll = true) {
    if (!MINGLI_KB[id]) return;
    setSelectedId(id);
    window.history.replaceState(null, "", `#${entryAnchor(id)}`);
    if (scroll) {
      window.requestAnimationFrame(() => {
        document.getElementById(entryAnchor(id))?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  useEffect(() => {
    function syncFromHash() {
      const id = entryFromHash();
      if (!id) return;
      setSelectedId(id);
      window.requestAnimationFrame(() => {
        document.getElementById(entryAnchor(id))?.scrollIntoView({ block: "start" });
      });
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <section className="mingli-quick" aria-labelledby="mingli-quick-title">
      <div className="mingli-quick-head">
        <div>
          <span className="learn-kicker">命理交叉索引</span>
          <h2 id="mingli-quick-title">查一个词，读懂它在盘里的位置</h2>
          <p>{ENTRIES.length} 个基础词条共用同一套释义，并与课程正文、排盘解释保持一致。</p>
        </div>
        <div className="mingli-quick-note">
          <span>当前词库</span>
          <strong>{ENTRIES.length}</strong>
          <small>词条</small>
        </div>
      </div>

      <div className="mingli-quick-controls" data-tour-id="learn-quick-controls">
        <label className="mingli-quick-search">
          <span>搜索词条</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="藏干、甲、正官、大运"
          />
        </label>

        <div className="mingli-quick-tabs" role="tablist" aria-label="命理词条分类">
          {CATEGORY_ORDER.map((key) => {
            const count = key === "all" ? ENTRIES.length : ENTRIES.filter((entry) => entry.category === key).length;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                className={category === key ? "is-active" : ""}
                aria-selected={category === key}
                onClick={() => setCategory(key)}
              >
                {CATEGORY_LABEL[key]} <small>{count}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mingli-quick-workspace" data-tour-id="learn-quick-workspace">
        <div className="mingli-quick-results">
          <div className="mingli-quick-results-head" aria-live="polite">
            <span>{query || category !== "all" ? `匹配 ${results.length} 条` : "全部词条"}</span>
            {query || category !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
              >
                重置
              </button>
            ) : null}
          </div>
          {results.length ? (
            <div className="mingli-quick-grid">
              {results.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={selected.id === entry.id ? "is-selected" : ""}
                  aria-pressed={selected.id === entry.id}
                  onClick={() => selectEntry(entry.id)}
                >
                  <span>{entry.term}</span>
                  <small>{entry.brief}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="mingli-quick-empty">没有匹配词条。可以换一个单字、五行或关系名称。</p>
          )}
        </div>

        <article className="mingli-quick-focus" id={entryAnchor(selected.id)}>
          <div className="mingli-quick-focus-meta">
            <span>{CATEGORY_LABEL[selected.category]}</span>
            <code>#{selected.id}</code>
          </div>
          <h3>{selected.term}</h3>
          <strong>{selected.brief}</strong>
          <p>{selected.detail}</p>
          {related.length ? (
            <div className="mingli-quick-related" aria-label={`${selected.term}的相关词条`}>
              <span>相关词条</span>
              {related.map((entry) => (
                <button key={entry.id} type="button" onClick={() => selectEntry(entry.id)}>
                  {entry.term}
                </button>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
