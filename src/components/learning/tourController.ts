"use client";

import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { getLesson, type LessonId } from "@/data/tours";
import { markLessonDone } from "./learningProgress";

let active: Driver | null = null;

/**
 * 启动前的现场准备：
 * 展开侧栏全部「卷」。折叠的 <details> 内容不渲染，driver 会圈到一片空白——
 * 这是 v1 导览错位的根因，先开卷再引导。
 */
function prepare(): void {
  document
    .querySelectorAll<HTMLDetailsElement>("details.side-block")
    .forEach((d) => {
      d.open = true;
    });
}

/**
 * 宿主元素兜底：selector 找不到时去掉 element，让该步降级为居中弹窗——
 * 内容不丢、位置不错（如未建档时的 bazi-card、尚未打开的释义卡）。
 */
function resolveSteps(steps: DriveStep[]): DriveStep[] {
  return steps.map((step) => {
    if (typeof step.element === "string" && !document.querySelector(step.element)) {
      const fallback = { ...step };
      delete fallback.element;
      return fallback;
    }
    return step;
  });
}

/** 启动一课。走到最后一步后退出才记为完成（中途 ESC 不算）。 */
export function startLesson(id: LessonId): void {
  if (typeof window === "undefined") return;
  const lesson = getLesson(id);
  if (!lesson) return;

  prepare();
  const steps = resolveSteps(lesson.steps());
  if (steps.length === 0) return;

  active?.destroy();
  let reached = 0;
  const instance = driver({
    showProgress: true,
    allowClose: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 8,
    doneBtnText: "完成",
    nextBtnText: "下一步",
    prevBtnText: "上一步",
    onHighlightStarted: () => {
      const i = instance.getActiveIndex();
      if (typeof i === "number" && i > reached) reached = i;
    },
    onDestroyed: () => {
      if (reached >= steps.length - 1) markLessonDone(id);
    },
  });
  active = instance;
  instance.setSteps(steps);
  instance.drive();
}

export function stopTour(): void {
  active?.destroy();
  active = null;
}
