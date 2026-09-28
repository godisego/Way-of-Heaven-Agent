"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { QUIZ_QUESTIONS, type QuizQuestion } from "@/data/quizQuestions";
import { addMistake, resolveMistake } from "@/data/mistakeBook";
import { loadQuizAnswers, saveQuizAnswers, quizSummary, type QuizAnswers } from "./quizProgress";

type QuizPanelProps = { track: "agent" | "mingli"; docSlug?: string };

export function QuizPanel({ track, docSlug }: QuizPanelProps) {
  return <QuizSession key={`${track}:${docSlug ?? "all"}`} track={track} docSlug={docSlug} />;
}

function QuizSession({ track, docSlug }: QuizPanelProps) {
  const questions = useMemo(() => QUIZ_QUESTIONS.filter((q) => q.track === track && (!docSlug || q.docSlug === docSlug)), [track, docSlug]);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [ready, setReady] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    setAnswers(loadQuizAnswers(questions));
    setReady(true);
  }, [questions]);

  function save(next: QuizAnswers) {
    setAnswers(next);
    setSaveError(!saveQuizAnswers(questions, next));
  }
  function handleAnswer(q: QuizQuestion, selectedIndex: number) {
    if (!ready || answers[q.id]) return;
    save({ ...answers, [q.id]: { selectedIndex, revision: q.revision } });
    if (selectedIndex !== q.correctIndex) addMistake(q.id, selectedIndex, q);
    else resolveMistake(q.id);
  }
  function retry(id?: string) {
    const next = { ...answers };
    if (id) delete next[id];
    save(id ? next : {});
    setShowResults(false);
  }
  const result = quizSummary(questions, answers);
  if (!questions.length) return <p className="quiz-empty">本学径暂无自测题。</p>;

  return (
    <div className="quiz-panel">
      <p>知识自测用于查漏补缺。答题记录只存此浏览器；完成自测后，请继续毕业实践。</p>
      {saveError && <p role="status">答题结果暂未保存到浏览器，刷新后可能丢失。</p>}
      <div className="quiz-stats" aria-live="polite">
        <span>已答 <strong>{result.answered} / {questions.length}</strong></span>
        <span>正确 <strong>{result.correct}</strong></span>
        <span className="quiz-stats-wrong">错误 <strong>{result.wrong}</strong></span>
        <span>未答 <strong>{result.remaining}</strong></span>
        <span>已答正确率 <strong>{result.answered ? Math.round(result.correct / result.answered * 100) : 0}%</strong></span>
      </div>
      <ol className="quiz-list">
        {questions.map((q, idx) => {
          const answer = answers[q.id];
          const answered = !!answer;
          const correct = answer?.selectedIndex === q.correctIndex;
          return (
            <li key={q.id} className="quiz-item">
              <p className="quiz-item-meta">第 {idx + 1} 题 · {q.stage} · {q.level}</p>
              <p className="quiz-item-question">{q.question}</p>
              <ul className="quiz-options" aria-label={`第 ${idx + 1} 题选项`}>
                {q.options.map((option, optIdx) => {
                  const selected = answered && answer.selectedIndex === optIdx;
                  const className = ["quiz-option", selected && "selected", answered && optIdx === q.correctIndex && "correct", selected && !correct && "wrong"].filter(Boolean).join(" ");
                  return (
                    <li key={optIdx}>
                      <button type="button" className={className} disabled={!ready || answered} onClick={() => handleAnswer(q, optIdx)}>
                        <span className="quiz-option-letter">{String.fromCharCode(65 + optIdx)}.</span>
                        <span>{option}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {answered && (
                <div className={`quiz-explain ${correct ? "quiz-explain-correct" : "quiz-explain-wrong"}`}>
                  <p><strong>{correct ? "✓ 正确！" : "✗ 答错了"}</strong>{!correct && <span> · 正确答案是 <strong>{String.fromCharCode(65 + q.correctIndex)}</strong></span>}</p>
                  <p className="quiz-explain-text">{q.explanation}</p>
                  {q.docSlug && <Link href={`/learn/${q.docSlug}`} className="quiz-doc-link">→ 回看讲义</Link>}
                  <button type="button" className="quiz-retry-btn" onClick={() => retry(q.id)}>重做本题</button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {result.answered > 0 && <div className="learn-route-actions">
        <button type="button" className="quiz-submit-btn" onClick={() => setShowResults(true)}>查看本轮结果</button>
        <button type="button" className="quiz-retry-btn" onClick={() => retry()}>重新练习当前题组</button>
      </div>}
      {showResults && <div className="quiz-results-banner" role="status">
        <p>已答 {result.answered} / {questions.length} 题 · 正确 {result.correct} · 错误 {result.wrong}</p>
        <p className="quiz-results-hint">{result.message}</p>
        {result.wrong > 0 && <p>错题已收入错题本，可回看讲义后重做。</p>}
        <Link href={`/learn/${track === "agent" ? "ai-capstone" : "bazi-capstone"}`}>查看毕业实践与评分标准 →</Link>
      </div>}
    </div>
  );
}
