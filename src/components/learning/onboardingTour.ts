/**
 * 首次引导链（v2 · 重写）：欢迎 → 认命盘 → 学习馆 → 三贤+配置。
 *
 * 设计原则：
 * 1. 先说"这是什么地方"，再教怎么用——不直接灌管道术语
 * 2. 命理在前（用户兴趣），Agent 在后（深入入口）
 * 3. 过渡自然——不假毕业、不 patronizing
 * 4. 每步 popover 短、清楚指出"看哪里"和"为什么重要"
 * 5. 学习馆有 tour，不只是 redirect
 */
import { startLesson } from "./tourController";
import { markOnboardingSeen } from "./onboarding";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 轻量确认卡片（不用 confirm） */
function askNext(title: string, body: string, okText: string, skipText?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:10000;background:rgba(37,42,48,0.45);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s";
    overlay.innerHTML = `
      <div style="background:#fdfdfb;border-radius:10px;padding:28px 30px;max-width:420px;box-shadow:0 18px 50px rgba(0,0,0,0.2);font-family:'PingFang SC',sans-serif">
        <h3 style="margin:0 0 12px;font-size:18px;color:#252a30;font-weight:700">${title}</h3>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.75;color:#5f656b">${body}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button id="ob-skip" style="padding:8px 18px;border:1px solid rgba(37,42,48,0.32);background:transparent;border-radius:4px;font-size:13px;color:#5f656b;cursor:pointer;font-family:inherit">${skipText ?? "以后再说"}</button>
          <button id="ob-ok" style="padding:8px 20px;border:none;background:#252a30;color:#f2f3f1;border-radius:4px;font-size:13px;cursor:pointer;font-family:inherit">${okText}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const cleanup = (result: boolean) => {
      overlay.remove();
      resolve(result);
    };
    overlay.querySelector("#ob-ok")!.addEventListener("click", () => cleanup(true));
    overlay.querySelector("#ob-skip")!.addEventListener("click", () => cleanup(false));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

/**
 * 引导链最终提示——在学习馆导览结束后调用。
 * 不依赖 React，纯 DOM 弹卡片。
 */
export function showFinalOnboardingHint(): void {
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:10000;background:rgba(37,42,48,0.45);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s";
  overlay.innerHTML = `
    <div style="background:#fdfdfb;border-radius:10px;padding:28px 30px;max-width:440px;box-shadow:0 18px 50px rgba(0,0,0,0.2);font-family:'PingFang SC',sans-serif">
      <h3 style="margin:0 0 12px;font-size:17px;color:#252a30;font-weight:700">三位贤者，随时可问</h3>
      <p style="margin:0 0 16px;font-size:13.5px;line-height:1.8;color:#3b4046;white-space:pre-line">回到茶寮就可以与三贤对谈——

<b>老胡</b>（盲派算师）：直给进退时机，基于你的盘面做实战解读
<b>玄</b>（道家掌柜）：谈气机节奏与方向，不批吉凶
<b>李</b>（存在主义导师）：只面对你的现实选择，完全不碰命理

问任何问题，三段回应各有所长。</p>
      <p style="margin:0 0 20px;font-size:12.5px;line-height:1.7;color:#5f656b">右下角齿轮可以配置模型供应商——填好密钥就能真正对谈。不配也能用示例回复浏览全部功能。</p>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button id="onb-final-skip" style="padding:8px 16px;border:1px solid rgba(37,42,48,0.15);background:transparent;border-radius:6px;font-size:13px;color:#5f656b;cursor:pointer;font-family:inherit">回茶寮</button>
        <button id="onb-final-ok" style="padding:8px 18px;background:#a8473c;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600;font-family:inherit">去配置</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector("#onb-final-skip")?.addEventListener("click", () => {
    close();
    window.location.href = "/";
  });
  overlay.querySelector("#onb-final-ok")?.addEventListener("click", () => {
    close();
    const gearBtn = document.querySelector(".settings-dock-btn") as HTMLButtonElement | null;
    if (gearBtn) gearBtn.click();
    else window.location.href = "/";
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
}

/** 居中说明弹窗（无目标元素的导览步骤用） */
function centerPopover(title: string, body: string, okText: string): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:10000;background:rgba(37,42,48,0.45);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s";
    overlay.innerHTML = `
      <div style="background:#fdfdfb;border-radius:10px;padding:28px 30px;max-width:460px;box-shadow:0 18px 50px rgba(0,0,0,0.2);font-family:'PingFang SC',sans-serif">
        <h3 style="margin:0 0 14px;font-size:20px;color:#252a30;font-weight:700">${title}</h3>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.8;color:#5f656b;white-space:pre-line">${body}</p>
        <div style="display:flex;justify-content:flex-end">
          <button id="ob-ok" style="padding:9px 24px;border:none;background:#252a30;color:#f2f3f1;border-radius:4px;font-size:13px;cursor:pointer;font-family:inherit">${okText}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#ob-ok")!.addEventListener("click", () => {
      overlay.remove();
      resolve();
    });
  });
}

/**
 * 启动完整首次引导链（v2）。
 * 顺序：欢迎 → 认命盘 → 过渡 → 学习馆导览 → 三贤+配置。
 * 每段之间用户可选继续或跳过。
 */
export async function startOnboardingChain(): Promise<void> {
  // ─── 第一步：欢迎开场 ───
  await centerPopover(
    "欢迎来到三贤茶寮",
    "这是一间「以茶代酒、以问代卜」的茶寮——\n\n" +
      "老胡懂命理实战，直给进退时机；\n" +
      "玄道长谈气机节奏，不批吉凶；\n" +
      "李先生只面对你的现实选择，不碰命理。\n\n" +
      "在这里你可以：排出自己的八字盘、读 17 篇系统讲义、与三贤对谈。\n\n" +
      "接下来用 5 分钟，带你认识这三个核心功能。",
    "开始认识",
  );
  await delay(300);

  // ─── 第二步：命理排盘 tour（mingli-1） ───
  await new Promise<void>((resolve) => {
    startLesson("mingli-1", () => resolve());
  });
  markOnboardingSeen();
  await delay(400);

  // ─── 第三步：过渡到学习馆（不假毕业） ───
  const goLibrary = await askNext(
    "盘面认识了",
    "你刚才看到的只是盘面最表层的几个字。\n\n" +
      "学习馆里有 17 篇系统讲义——从阴阳五行到格局用神，七层结构带你从零到能独立断盘；还有 132 项命理速查，随时回来核对术语。\n\n" +
      "想深入就跟我去学习馆看看。",
    "去学习馆",
    "先在这里玩",
  );
  if (!goLibrary) return;
  await delay(300);

  // ─── 第四步：跳转到学习馆并启动导览 ───
  // 把 library-tour 的 id 存到 sessionStorage，学习馆页面加载后自动启动
  sessionStorage.setItem("pendingTour", "library-tour");
  window.location.href = "/learn";
  // 页面跳转后引导链自然结束——学习馆页面会读取 pendingTour 并启动 library-tour
}
