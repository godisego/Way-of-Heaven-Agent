"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { safeFetchJson } from "@/lib/safeFetch";

type QuickAskResponse = {
  answer: string;
  relatedDocs?: Array<{ slug: string; title: string }>;
};

type QuickAskProps = {
  docTitle?: string;
};

/**
 * 快速问 AI —— 学习馆文档页的浮动问号按钮。
 *
 * 点击展开一个输入框，学生提问后调 /api/learn-ask（非 /api/chat），
 * 返回简短回答 + 相关讲义链接。
 *
 * 与对谈的区别：
 * - 不走三贤人设 / RAG / 引用校验
 * - 独立限流 10次/分钟
 * - 回答限 300 字
 * - 回答下方有"AI 助教回答仅供参考，以讲义原文为准"声明
 */
export function QuickAsk({ docTitle }: QuickAskProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [related, setRelated] = useState<Array<{ slug: string; title: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = useCallback(async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    setRelated([]);

    try {
      const { ok, data } = await safeFetchJson<QuickAskResponse>("/api/learn-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          context: docTitle ? `学生正在读《${docTitle}》` : undefined,
        }),
      });
      if (!ok) {
        throw new Error((data as { error?: string }).error ?? "请求失败");
      }
      setAnswer(data.answer);
      setRelated(data.relatedDocs ?? []);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("请求失败，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  }, [question, loading, docTitle]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <>
      <button
        className="quick-ask-fab"
        onClick={() => setOpen(!open)}
        aria-label="快速问 AI"
        title="快速问 AI 助教"
      >
        ?
      </button>

      {open && (
        <div className="quick-ask-panel">
          <h3>💬 AI 助教</h3>
          {docTitle && (
            <p className="quick-ask-context">当前讲义：{docTitle}</p>
          )}
          <div className="quick-ask-input-row">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="读到不懂的地方？在这里问 AI 助教…（Ctrl+Enter 发送）"
              disabled={loading}
            />
            <button
              className="quick-ask-send-btn"
              onClick={handleAsk}
              disabled={loading || !question.trim()}
            >
              {loading ? "思考中…" : "发送"}
            </button>
          </div>

          {error && (
            <div className="quick-ask-error">
              <p>❌ {error}</p>
            </div>
          )}

          {answer && (
            <div className="quick-ask-answer">
              <p className="quick-ask-answer-text">{answer}</p>
              {related.length > 0 && (
                <div className="quick-ask-related">
                  <p className="quick-ask-related-title">📖 相关讲义：</p>
                  <ul>
                    {related.map((doc) => (
                      <li key={doc.slug}>
                        <Link href={`/learn/${doc.slug}`}>{doc.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="quick-ask-disclaimer">
                ⚠️ AI 助教回答仅供参考，以讲义原文为准。
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
