"use client";

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { WuxingCard, ShishenCard } from "./MingliFigures";
import { ExampleChartFigure, GanZhiCangFigure } from "./ExampleChartFigure";

/**
 * 讲义正文容器 + 命理图表注入器。
 *
 * miniMarkdown 把 ```wuxing / ```shishen / ```chart 围栏渲染为
 * <div class="mingli-fig-slot" data-mingli-fig="xxx"></div> 占位符。
 * 本组件在正文渲染后扫描这些占位符，用 createRoot 把可交互的
 * React 图表组件注入进去——这样图表出现在对应文字段落处。
 */
export function LearnArticle({ html }: { html: string }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const slots = root.querySelectorAll<HTMLElement>(".mingli-fig-slot[data-mingli-fig]");
    const roots: Array<{ el: Element; root: ReturnType<typeof createRoot> }> = [];
    slots.forEach((slot) => {
      const fig = slot.getAttribute("data-mingli-fig");
      const r = createRoot(slot);
      r.render(<FigureRouter fig={fig} />);
      roots.push({ el: slot, root: r });
    });
    // 清理：组件卸载或 html 变化时卸载注入的 roots
    return () => {
      roots.forEach(({ root }) => root.unmount());
    };
  }, [html]);

  return (
    <article
      ref={ref}
      className="learn-article"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function FigureRouter({ fig }: { fig: string | null }) {
  if (fig === "wuxing") return <WuxingCard title="五行生克关系" />;
  if (fig === "shishen") return <ShishenCard title="十神关系（以日主为轴）" />;
  if (fig === "chart") return <ExampleChartFigure />;
  if (fig === "ganzhi") return <GanZhiCangFigure />;
  return null;
}
