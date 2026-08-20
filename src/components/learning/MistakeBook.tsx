"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { loadMistakes, clearMistakes, MISTAKES_EVENT, resolveMistake } from "@/data/mistakeBook";
import { getQuizById } from "@/data/quizQuestions";

/**
 * 错题本 —— 展示做错过的题目，支持"回看讲义"和"标记已掌握"。
 *
 * 数据纯 localStorage，不上传服务器。
 */
export function MistakeBook() {
  const [version, setVersion] = useState(0);
  const [trackFilter, setTrackFilter] = useState<"all" | "agent" | "mingli">("all");

  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    window.addEventListener(MISTAKES_EVENT, handler);
    return () => window.removeEventListener(MISTAKES_EVENT, handler);
  }, []);

  const mistakes = useMemo(() => {
    void version;
    return loadMistakes();
  }, [version]);

  const filteredMistakes = useMemo(() => {
    if (trackFilter === "all") return mistakes;
    return mistakes.filter((m) => {
      const q = getQuizById(m.questionId);
      return q?.track === trackFilter;
    });
  }, [mistakes, trackFilter]);

  const handleClear = useCallback(() => {
    if (window.confirm("确定要清空所有错题记录吗？此操作不可撤销。")) {
      clearMistakes();
    }
  }, []);

  if (mistakes.length === 0) {
    return (
      <div className="mistake-book">
        <p className="mistake-empty">
          🎉 还没有错题记录！<br />
          去做「自测练习」，做错的题会自动收集到这里。
        </p>
      </div>
    );
  }

  return (
    <div className="mistake-book">
      <div className="mistake-filters">
        <button
          className={`mistake-filter-btn ${trackFilter === "all" ? "active" : ""}`}
          onClick={() => setTrackFilter("all")}
        >
          全部 ({mistakes.length})
        </button>
        <button
          className={`mistake-filter-btn ${trackFilter === "agent" ? "active" : ""}`}
          onClick={() => setTrackFilter("agent")}
        >
          Agent 径
        </button>
        <button
          className={`mistake-filter-btn ${trackFilter === "mingli" ? "active" : ""}`}
          onClick={() => setTrackFilter("mingli")}
        >
          命理径
        </button>
        <button className="mistake-clear-btn" onClick={handleClear}>
          清空全部
        </button>
      </div>

      <ol className="mistake-list">
        {filteredMistakes.map((m) => {
          const q = getQuizById(m.questionId);
          if (!q) return null;
          return (
            <li key={m.questionId} className="mistake-item">
              <p className="mistake-item-meta">
                {q.track === "agent" ? "Agent 径" : "命理径"} · {q.stage} · {q.level}
              </p>
              <p className="mistake-item-question">{q.question}</p>
              <div className="mistake-answers">
                <p className="mistake-wrong">
                  你的答案：{String.fromCharCode(65 + m.selectedIndex)} · {q.options[m.selectedIndex]}
                </p>
                <p className="mistake-right">
                  正确答案：{String.fromCharCode(65 + q.correctIndex)} · {q.options[q.correctIndex]}
                </p>
              </div>
              <p className="mistake-explanation">{q.explanation}</p>
              <div className="mistake-actions">
                {q.docSlug && (
                  <Link href={`/learn/${q.docSlug}`} className="mistake-doc-link">
                    → 回看讲义
                  </Link>
                )}
                <button className="mistake-resolve-btn" onClick={() => resolveMistake(m.questionId)}>
                  标记已掌握
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mistake-note">
        错题本仅存储在本机浏览器中，清除浏览器数据会一并清除。
      </p>
    </div>
  );
}
