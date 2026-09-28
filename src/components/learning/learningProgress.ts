/** 课程进度：只存本机 localStorage；与问者档无关（清档不清进度）。 */

const KEY = "tiandao.learning.progress.v1";
const READ_KEY = "tiandao.learning.read.v1";
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

/** 文章由读者手动标记；与导览完成、答题和能力评价分别记录。 */
export function loadReadProgress(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(READ_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value === true));
  } catch {
    return {};
  }
}

export function setDocRead(slug: string, read: boolean): boolean {
  if (typeof window === "undefined") return false;
  const progress = loadReadProgress();
  if (read) progress[slug] = true;
  else delete progress[slug];
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify(progress));
  } catch {
    return false;
  }
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
  return true;
}
