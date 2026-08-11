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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatText(value: string): string {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

/** 把纯文本讲解整理成可扫读的段落、小标题和要点列表。 */
function formatDescription(description: string): string {
  if (description.includes('class="tour-copy"')) return description;

  const blocks = description.trim().split(/\n{2,}/);
  const content = blocks.map((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length > 0 && lines.every((line) => line.startsWith("· "))) {
      const items = lines.map((line) => {
        const value = line.slice(2);
        const match = value.match(/^([^：\n，。！？；]{1,18})：\s*(.+)$/);
        if (!match) return `<li>${formatText(value)}</li>`;
        return `<li><strong>${formatText(match[1])}</strong><span>${formatText(match[2])}</span></li>`;
      });
      return `<ul class="tour-list">${items.join("")}</ul>`;
    }

    const section = block.match(/^([^：\n，。！？；]{1,18})：\s*([\s\S]+)$/);
    if (section) {
      return (
        '<section class="tour-section">' +
        `<h4>${formatText(section[1])}</h4>` +
        `<p>${formatText(section[2])}</p>` +
        "</section>"
      );
    }

    const className = index === 0 ? "tour-lead" : "tour-paragraph";
    return `<p class="${className}">${formatText(block)}</p>`;
  });

  return `<div class="tour-copy">${content.join("")}</div>`;
}

/**
 * 宿主元素兜底：selector 找不到时去掉 element，让该步降级为居中弹窗——
 * 内容不丢、位置不错（如未建档时的 bazi-card、尚未打开的释义卡）。
 */
function resolveSteps(steps: DriveStep[]): DriveStep[] {
  return steps.map((step) => {
    const formatted = typeof step.popover?.description === "string"
      ? {
          ...step,
          popover: {
            ...step.popover,
            description: formatDescription(step.popover.description),
          },
        }
      : step;

    if (typeof formatted.element === "string" && !document.querySelector(formatted.element)) {
      const fallback = { ...formatted };
      delete fallback.element;
      return fallback;
    }
    return formatted;
  });
}

/** 启动一课。走到最后一步后退出才记为完成（中途 ESC 不算）。 */
export function startLesson(id: LessonId, onComplete?: () => void): void {
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
      if (reached >= steps.length - 1) {
        markLessonDone(id);
        onComplete?.();
      }
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
