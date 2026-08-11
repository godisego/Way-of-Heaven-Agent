/**
 * 首次访问引导的持久化（localStorage，复刻 learningProgress 的模式）。
 *
 * 首次打开网站时自动启动入门引导（agent-1），引导过一次就不再弹。
 * 用户可在设置面板手动重新触发。
 */

const ONBOARDING_KEY = "tiandao.onboarding.v1";

/** 是否已完成首次引导（看过就不自动弹了） */
export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") return true; // SSR 视为已看，避免重复触发
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

/** 标记首次引导已完成 */
export function markOnboardingSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    /* localStorage 不可用时静默 */
  }
}

/** 重置引导（让下次访问重新自动弹出） */
export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ONBOARDING_KEY);
    window.sessionStorage.removeItem("tiandao.onboarding.pending-library");
    window.sessionStorage.removeItem("tiandao.onboarding.pending-home");
  } catch {
    /* 静默 */
  }
}
