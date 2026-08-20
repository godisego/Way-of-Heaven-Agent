/**
 * 错题本 —— 本地存储，与 learningProgress 同模式。
 *
 * 数据不上传服务器，清浏览器数据会清除。
 * 不绑定用户档案——和进度一样是"本机学习记录"。
 *
 * localStorage key: "tiandao.mistakes.v1"
 */

import type { QuizQuestion } from "./quizQuestions";

export type MistakeRecord = {
  questionId: string;
  /** 用户选了哪个（索引） */
  selectedIndex: number;
  /** 做错时间 ISO */
  createdAt: string;
  /** 是否已重做正确 */
  resolved: boolean;
};

const KEY = "tiandao.mistakes.v1";
export const MISTAKES_EVENT = "tavern:mistakes-updated";

export function loadMistakes(): MistakeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as MistakeRecord[]) : [];
  } catch {
    return [];
  }
}

export function addMistake(questionId: string, selectedIndex: number): void {
  if (typeof window === "undefined") return;
  const mistakes = loadMistakes();
  // 同一题只保留最新一条
  const filtered = mistakes.filter((m) => m.questionId !== questionId);
  filtered.push({
    questionId,
    selectedIndex,
    createdAt: new Date().toISOString(),
    resolved: false,
  });
  try {
    window.localStorage.setItem(KEY, JSON.stringify(filtered));
  } catch {
    /* 存储失败不阻断 */
  }
  window.dispatchEvent(new CustomEvent(MISTAKES_EVENT));
}

export function resolveMistake(questionId: string): void {
  if (typeof window === "undefined") return;
  const mistakes = loadMistakes();
  const updated = mistakes.filter((m) => m.questionId !== questionId);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    /* 存储失败不阻断 */
  }
  window.dispatchEvent(new CustomEvent(MISTAKES_EVENT));
}

export function clearMistakes(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* 存储失败不阻断 */
  }
  window.dispatchEvent(new CustomEvent(MISTAKES_EVENT));
}

/** 未解决的错题（有数据 + 未 resolved） */
export function getUnresolvedMistakes(): MistakeRecord[] {
  return loadMistakes().filter((m) => !m.resolved);
}

/** 错题总数 */
export function getMistakeCount(): number {
  return getUnresolvedMistakes().length;
}
