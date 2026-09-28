import type { QuizQuestion } from "@/data/quizQuestions";

export type QuizAnswer = { selectedIndex: number; revision: number };
export type QuizAnswers = Record<string, QuizAnswer>;
const KEY = "tiandao.learning.quiz.v1";

function readSaved(): QuizAnswers {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as QuizAnswers : {};
  } catch { return {}; }
}

export function loadQuizAnswers(questions: QuizQuestion[]): QuizAnswers {
  const saved = readSaved();
  return Object.fromEntries(questions.flatMap((q) => {
    const answer = saved[q.id];
    return answer && answer.revision === q.revision && Number.isInteger(answer.selectedIndex) && answer.selectedIndex >= 0 && answer.selectedIndex < q.options.length
      ? [[q.id, answer]] : [];
  }));
}

/** 只更新当前学径，不覆盖另一学径的答题记录。 */
export function saveQuizAnswers(questions: QuizQuestion[], answers: QuizAnswers): boolean {
  if (typeof window === "undefined") return false;
  const saved = readSaved();
  for (const q of questions) {
    delete saved[q.id];
    if (answers[q.id]) saved[q.id] = answers[q.id];
  }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(saved));
    return true;
  } catch { return false; }
}

export function quizSummary(questions: QuizQuestion[], answers: QuizAnswers) {
  let answered = 0;
  let correct = 0;
  for (const q of questions) {
    const answer = answers[q.id];
    if (!answer || answer.revision !== q.revision || !Number.isInteger(answer.selectedIndex) || answer.selectedIndex < 0 || answer.selectedIndex >= q.options.length) continue;
    answered++;
    if (answer.selectedIndex === q.correctIndex) correct++;
  }
  const remaining = questions.length - answered;
  return {
    answered, correct, wrong: answered - correct, remaining,
    message: remaining > 0
      ? `尚有 ${remaining} 题未答；当前正确率只统计已答题。`
      : "本轮知识自测已完成。请按毕业实践的评分标准检验应用能力。",
  };
}
