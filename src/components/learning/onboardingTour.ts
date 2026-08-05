/**
 * 首次引导链：agent-1（对谈基础）→ mingli-1（命理排盘）→ 学习馆。
 *
 * 不是强制连续播放（那会很烦），而是每段结束后弹一个简短的
 * "接下来"确认提示，用户点"好"才继续，点"以后再说"就停。
 * 让新用户一次性知道全部核心功能。
 */
import { startLesson } from "./tourController";
import { markOnboardingSeen } from "./onboarding";

/** 弹一个轻量确认提示（不用 confirm，用自定义 UI 更友好） */
function askNext(title: string, body: string, okText: string): Promise<boolean> {
  return new Promise((resolve) => {
    // 创建遮罩 + 卡片
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:10000;background:rgba(37,42,48,0.5);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s";
    overlay.innerHTML = `
      <div style="background:#fdfdfb;border-radius:10px;padding:28px 30px;max-width:380px;box-shadow:0 18px 50px rgba(0,0,0,0.2);font-family:'PingFang SC',sans-serif">
        <h3 style="margin:0 0 12px;font-size:18px;color:#252a30;font-weight:700">${title}</h3>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#5f656b">${body}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button id="ob-skip" style="padding:8px 18px;border:1px solid rgba(37,42,48,0.32);background:transparent;border-radius:4px;font-size:13px;color:#5f656b;cursor:pointer;font-family:inherit">以后再说</button>
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
    // 点遮罩也关闭
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 启动完整首次引导链。
 * 顺序：agent-1 → 提示 → mingli-1 → 提示 → 学习馆。
 * 每段之间用户可选继续或跳过。
 */
export async function startOnboardingChain(): Promise<void> {
  // 第一段：对谈基础（agent-1）
  await new Promise<void>((resolve) => {
    startLesson("agent-1", () => resolve());
  });
  markOnboardingSeen();
  await delay(400);

  // 第二段：提示进入命理排盘
  const goMingli = await askNext(
    "对谈学会了！",
    "接下来认识命理排盘——填入你的出生信息，自动排出八字盘面，点开每个字都有释义。",
    "认识排盘",
  );
  if (!goMingli) return;
  await delay(300);

  // 命理引导（mingli-1）
  await new Promise<void>((resolve) => {
    startLesson("mingli-1", () => resolve());
  });
  await delay(400);

  // 第三段：提示去学习馆
  const goLibrary = await askNext(
    "排盘也会看了！",
    "学习馆有 28 篇系统讲义（Agent 原理 + 命理系统课）和 137 项命理速查，随时回来深读。",
    "去学习馆",
  );
  if (goLibrary) {
    window.location.href = "/learn";
  }
}
