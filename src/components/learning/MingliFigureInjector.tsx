"use client";

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { WuxingCard, ShishenCard } from "./MingliFigures";
import { ExampleChartFigure, GanZhiCangFigure } from "./ExampleChartFigure";
import { VectorSearchFigure, AgentLoopFigure } from "./AgentFigures";
import {
  TianganHeCard,
  LiuheCard,
  SanheCard,
  SanhuiCard,
  LiuchongCard,
  SanxingCard,
  LiuhaiCard,
} from "./BranchRelationsFigures";
import { TwelveStagesCard } from "./TwelveStagesFigure";
import { YongshenFlowCard } from "./YongshenFlowFigure";
import { SystemOverviewCard } from "./SystemOverviewFigure";

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
    // 清理：组件卸载或 html 变化时卸载注入的 roots。
    // cleanup 在 React commit 阶段同步执行，此时同步 unmount 另一个 createRoot 会触发
    // “Attempted to synchronously unmount a root while React was already rendering” 警告——
    // 推迟到微任务（当前 commit 完成后）再卸载即可消除该 race condition。
    return () => {
      queueMicrotask(() => {
        roots.forEach(({ root }) => root.unmount());
      });
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
  if (fig === "vector") return <VectorSearchFigure />;
  if (fig === "agentloop") return <AgentLoopFigure />;
  // 干支字间关系
  if (fig === "tianganhe") return <TianganHeCard title="天干五合" />;
  if (fig === "liuhe") return <LiuheCard title="地支六合" />;
  if (fig === "sanhe") return <SanheCard title="地支三合局" />;
  if (fig === "sanhui") return <SanhuiCard title="地支三会局" />;
  if (fig === "liuchong") return <LiuchongCard title="地支六冲" />;
  if (fig === "sanxing") return <SanxingCard title="地支三刑" />;
  if (fig === "liuhai") return <LiuhaiCard title="地支六害" />;
  // 十二长生
  if (fig === "twelvestages") return <TwelveStagesCard title="十二长生" />;
  // 用神决策流程
  if (fig === "yongshenflow") return <YongshenFlowCard title="用神取用决策" />;
  // 命理系统分层
  if (fig === "systemoverview") return <SystemOverviewCard title="命理系统七层结构" />;
  return null;
}
