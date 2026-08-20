"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { QUIZ_QUESTIONS, type QuizQuestion } from "@/data/quizQuestions";
import { addMistake, resolveMistake } from "@/data/mistakeBook";

type QuizPanelProps = {
  track: "agent" | "mingli";
};

type AnswerState = {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
};

/**
 * 自测练习面板 —— 学生答题后即时判对错，错题自动入错题本。
 */
export function QuizPanel({ track }: QuizPanelProps) {
  const questions = useMemo(() => QUIZ_QUESTIONS.filter((q) => q.track === track), [track]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = useCallback((question: QuizQuestion, selectedIndex: number) => {
    const isCorrect = selectedIndex === question.correctIndex;
    setAnswers((prev) => ({ ...prev, [question.id]: { questionId: question.id, selectedIndex, isCorrect } }));
    if (!isCorrect) {
      addMistake(question.id, selectedIndex);
    } else {
      resolveMistake(question.id);
    }
  }, []);

  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((a) => a.isCorrect).length;
  const wrongCount = answeredCount - correctCount;

  if (questions.length === 0) {
    return <p className="quiz-empty">本学径暂无自测题。</p>;
  }

  return (
    <div className="quiz-panel">
      <div className="quiz-stats">
        <span>已答 <strong>{answeredCount}</strong></span>
        <span>正确 <strong>{correctCount}</strong></span>
        <span className="quiz-stats-wrong">错误 <strong>{wrongCount}</strong></span>
        <span>正确率 <strong>{answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0}%</strong></span>
      </div>

      <ol className="quiz-list">
        {questions.map((q, idx) => {
          const answer = answers[q.id];
          const isAnswered = !!answer;
          return (
            <li key={q.id} className="quiz-item">
              <p className="quiz-item-meta">
                第 {idx + 1} 题 · {q.stage} · {q.level}
              </p>
              <p className="quiz-item-question">{q.question}</p>
              <ul className="quiz-options">
                {q.options.map((option, optIdx) => {
                  const isSelected = isAnswered && answer.selectedIndex === optIdx;
                  const isCorrect = optIdx === q.correctIndex;
                  let className = "quiz-option";
                  if (isSelected) className += " selected";
                  if (isAnswered && isCorrect) className += " correct";
                  if (isAnswered && isSelected && !isCorrect) className += " wrong";
                  return (
                    <li
                      key={optIdx}
                      className={className}
                      onClick={() => !isAnswered && handleAnswer(q, optIdx)}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="quiz-option-letter">{String.fromCharCode(65 + optIdx)}.</span>
                      <span>{option}</span>
                    </li>
                  );
                })}
              </ul>
              {isAnswered && (
                <div className={`quiz-explain ${answer.isCorrect ? "quiz-explain-correct" : "quiz-explain-wrong"}`}>
                  <p>
                    <strong>{answer.isCorrect ? "✓ 正确！" : "✗ 答错了"}</strong>
                    {!answer.isCorrect && (
                      <span> · 正确答案是 <strong>{String.fromCharCode(65 + q.correctIndex)}</strong></span>
                    )}
                  </p>
                  <p className="quiz-explain-text">{q.explanation}</p>
                  {q.docSlug && (
                    <Link href={`/learn/${q.docSlug}`} className="quiz-doc-link">
                      → 回看讲义
                    </Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {answeredCount > 0 && !showResults && (
        <button className="quiz-submit-btn" onClick={() => setShowResults(true)}>
          查看测试结果
        </button>
      )}

      {showResults && (
        <div className="quiz-results-banner">
          <p>
            共 {answeredCount} 题 · 正确 {correctCount} · 错误 {wrongCount} · 正确率{" "}
            {Math.round((correctCount / answeredCount) * 100)}%
          </p>
          <p className="quiz-results-hint">
            {wrongCount > 0 ? "错题已自动收入错题本，可在上方回看。" : "全部正确！你已掌握本学径核心知识。"}
          </p>
        </div>
      )}
    </div>
  );
}
