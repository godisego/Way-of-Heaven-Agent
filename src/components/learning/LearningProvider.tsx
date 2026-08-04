"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { hasSeenOnboarding, markOnboardingSeen } from "./onboarding";

type LearningContextValue = {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (next: boolean) => void;
};

const LearningContext = createContext<LearningContextValue | null>(null);

const TOOLTIP_ID = "learning-tooltip";
const TOOLTIP_WIDTH = 320;
const TOOLTIP_GAP = 10;

function placeTooltip(target: HTMLElement, tip: HTMLDivElement) {
  const rect = target.getBoundingClientRect();
  const viewportW = window.innerWidth;
  // 默认水平:tooltip 中心对齐元素中心,再 clamp 到视口内
  let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  left = Math.max(8, Math.min(viewportW - TOOLTIP_WIDTH - 8, left));

  // 默认垂直:优先上方,空间不够放下方
  let placement: "top" | "bottom" = "top";
  let top = rect.top - TOOLTIP_GAP;
  if (top < 80) {
    placement = "bottom";
    top = rect.bottom + TOOLTIP_GAP;
  }

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
  tip.dataset.placement = placement;
}

export function LearningProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  // body data attribute 切换 —— CSS 通过它控制 data-tip 是否展示虚线下划线
  useEffect(() => {
    document.body.dataset.learning = String(enabled);
    return () => {
      if (document.body.dataset.learning === "true") {
        delete document.body.dataset.learning;
      }
    };
  }, [enabled]);

  // 首次访问自动启动入门引导（只在首页，看过一次就不再弹）
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasSeenOnboarding()) return;
    if (window.location.pathname !== "/") return;
    const timer = setTimeout(() => {
      try {
        import("./tourController").then(({ startLesson }) => {
          startLesson("agent-1");
          markOnboardingSeen();
        });
      } catch {
        markOnboardingSeen();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);


  // 全局 hover 监听,把单一 tooltip 元素定位到当前 [data-tip] 元素
  useEffect(() => {
    if (!enabled) return;
    const foundTip = document.getElementById(TOOLTIP_ID) as HTMLDivElement | null;
    if (!foundTip) return;
    const tip: HTMLDivElement = foundTip;

    let activeEl: HTMLElement | null = null;

    function show(el: HTMLElement) {
      const text = el.dataset.tip ?? "";
      if (!text) return;
      tip.textContent = text;
      placeTooltip(el, tip);
      tip.classList.add("visible");
    }

    function hide() {
      tip.classList.remove("visible");
    }

    function onOver(event: MouseEvent) {
      const target = event.target as Element | null;
      const el = target?.closest("[data-tip]") as HTMLElement | null;
      if (el && el !== activeEl) {
        activeEl = el;
        show(el);
      } else if (!el && activeEl && !activeEl.contains(event.relatedTarget as Node | null)) {
        activeEl = null;
        hide();
      }
    }

    function onOut(event: MouseEvent) {
      if (!activeEl) return;
      const related = event.relatedTarget as Node | null;
      if (!related || !activeEl.contains(related)) {
        activeEl = null;
        hide();
      }
    }

    function onScroll() {
      if (activeEl) placeTooltip(activeEl, tip);
    }

    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      activeEl = null;
      hide();
    };
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  const value = useMemo<LearningContextValue>(
    () => ({ enabled, toggle, setEnabled }),
    [enabled, toggle],
  );

  return (
    <LearningContext.Provider value={value}>
      {children}
      <div id={TOOLTIP_ID} className="learning-tooltip" role="tooltip" aria-hidden="true" />
    </LearningContext.Provider>
  );
}

export function useLearning(): LearningContextValue {
  const ctx = useContext(LearningContext);
  if (!ctx) throw new Error("useLearning must be used within LearningProvider");
  return ctx;
}
