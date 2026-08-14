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
 *
 * SECURITY: 使用 dangerouslySetInnerHTML 注入 HTML。
 * 安全性保障：
 * 1. 内容仅来自本地 docs/ 目录的 Markdown 文件（受版本控制）
 * 2. miniMarkdown.ts 实现了完整的 HTML 转义（escapeHtml 函数）
 * 3. 不接受任何用户输入或动态内容
 * 4. 所有链接协议受白名单限制（http/https/mailto/#/相对路径）
 */
// slot 容器 → 其 React root 的注册表。
// 复用已有 root（再次调 render()）而非对同一 DOM 容器重复 createRoot——
// 后者会触发 React 警告：“createRoot() on a container that has already been passed to createRoot()”。
const slotRoots = new WeakMap<Element, ReturnType<typeof createRoot>>();

export function LearnArticle({ html }: { html: string }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const slots = root.querySelectorAll<HTMLElement>(".mingli-fig-slot[data-mingli-fig]");
    const managed: Array<{ el: Element; root: ReturnType<typeof createRoot> }> = [];

    slots.forEach((slot) => {
      const fig = slot.getAttribute("data-mingli-fig");
      // StrictMode 下 effect 会重跑；html 不变时是同一批 DOM 节点，
      // 复用已有 root 并再次 render()，避免对同一容器重复 createRoot。
      let r = slotRoots.get(slot);
      if (!r) {
        r = createRoot(slot);
        slotRoots.set(slot, r);
      }
      r.render(<FigureRouter fig={fig} />);
      managed.push({ el: slot, root: r });
    });

    // 清理：组件卸载或 html 变化时处理注入的 roots。
    // cleanup 在 React commit 阶段同步执行，此时同步 unmount 另一个 createRoot 会触发
    // “Attempted to synchronously unmount a root while React was already rendering” 警告——
    // 推迟到微任务（当前 commit 完成后）再卸载即可消除该 race condition。
    // 此外，只卸载「已脱离文档」的容器（html 变化把旧 slot 换成了新节点）；
    // 仍在文档中的（StrictMode 重跑 / 同一份 html）保留 root，下一轮 effect 复用。
    return () => {
      queueMicrotask(() => {
        managed.forEach(({ el, root }) => {
          if (el.isConnected) return;
          root.unmount();
          slotRoots.delete(el);
        });
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
