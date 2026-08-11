/** 首次引导的跨页编排：首页总览 → 学习馆 → 返回对话页配置供应商。 */

import { startLesson } from "./tourController";
import { markOnboardingSeen } from "./onboarding";

export const PENDING_LIBRARY_TOUR_KEY = "tiandao.onboarding.pending-library";
export const PENDING_HOME_TOUR_KEY = "tiandao.onboarding.pending-home";

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type Choice = {
  title: string;
  body: string;
  primary: string;
  secondary: string;
};

/**
 * 两段引导之间的轻量选择卡；内容用 textContent 写入，避免 HTML 注入。
 *
 * SECURITY: 使用 innerHTML 创建静态 DOM 结构。
 * 安全性保障：
 * 1. innerHTML 仅用于静态 HTML 模板（无用户输入）
 * 2. 所有动态内容通过 textContent 安全写入（line 39-47）
 * 3. choice 参数来自硬编码的提示文本，不包含用户输入
 */
function chooseNext(choice: Choice): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "onboarding-overlay";
    overlay.innerHTML = `
      <section class="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <span class="onboarding-kicker">导览进度</span>
        <h2 id="onboarding-title"></h2>
        <div class="onboarding-copy"></div>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-secondary"></button>
          <button type="button" class="onboarding-primary"></button>
        </div>
      </section>`;
    const title = overlay.querySelector("h2");
    const body = overlay.querySelector(".onboarding-copy");
    const primary = overlay.querySelector(".onboarding-primary") as HTMLButtonElement | null;
    const secondary = overlay.querySelector(".onboarding-secondary") as HTMLButtonElement | null;
    if (title) title.textContent = choice.title;
    if (body) {
      choice.body.split(/\n{2,}/).forEach((text) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        body.appendChild(paragraph);
      });
    }
    if (primary) primary.textContent = choice.primary;
    if (secondary) secondary.textContent = choice.secondary;
    document.body.appendChild(overlay);
    primary?.focus();

    const finish = (result: boolean) => {
      overlay.remove();
      resolve(result);
    };
    primary?.addEventListener("click", () => finish(true));
    secondary?.addEventListener("click", () => finish(false));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) finish(false);
    });
  });
}

/** 学习馆导览完成后调用：明确返回对话页，再续接供应商配置。 */
export function showFinalOnboardingHint(): void {
  void chooseNext({
    title: "学习馆已经可以独立使用",
    body:
      "Agent 讲义、命理讲义、互动图和术语速查都来自项目本地内容，不调用模型，也不需要 Key。你随时可以从对话页的「学习」入口回来。\n\n现在回到茶寮，完成最后一步：配置真实对话模型，并决定是否启用真实 Embedding。",
    primary: "回对话页配置",
    secondary: "暂不配置",
  }).then((configure) => {
    if (configure) sessionStorage.setItem(PENDING_HOME_TOUR_KEY, "provider");
    window.location.href = "/";
  });
}

/** 启动完整首次引导。 */
export async function startOnboardingChain(): Promise<void> {
  await new Promise<void>((resolve) => {
    startLesson("onboarding-home", resolve);
  });
  markOnboardingSeen();
  await delay(220);

  const visitLibrary = await chooseNext({
    title: "首页四个部分已经串起来了",
    body:
      "接下来可以进入学习馆，分别看看 Agent 工程学径、命理学径和术语速查怎样使用。全程不需要 Key；看完会自动回到对话页继续供应商配置。",
    primary: "继续看学习馆",
    secondary: "直接配置模型",
  });

  if (visitLibrary) {
    sessionStorage.setItem(PENDING_LIBRARY_TOUR_KEY, "library-tour");
    window.location.href = "/learn";
    return;
  }
  await startProviderOnboarding();
}

/** 返回首页后续接供应商配置。非首页调用时先导航回首页。 */
export async function startProviderOnboarding(): Promise<void> {
  if (window.location.pathname !== "/") {
    sessionStorage.setItem(PENDING_HOME_TOUR_KEY, "provider");
    window.location.href = "/";
    return;
  }
  await delay(360);
  await new Promise<void>((resolve) => {
    startLesson("onboarding-provider", resolve);
  });
  markOnboardingSeen();
}
