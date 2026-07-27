/** 课程进度：只存本机 localStorage；与问者档无关（清档不清进度）。 */

const KEY = "tiandao.learning.progress.v1";
export const PROGRESS_EVENT = "tavern:learning-progress";

export function loadProgress(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function markLessonDone(id: string): void {
  if (typeof window === "undefined") return;
  const p = loadProgress();
  if (p[id]) return;
  p[id] = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* 存储失败不阻断学习 */
  }
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
}
