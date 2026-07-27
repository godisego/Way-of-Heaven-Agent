/** 学习馆 /learn 可读文档白名单（slug → 仓库内 Markdown）。 */

export type LearnDoc = {
  slug: string;
  file: string;
  title: string;
  blurb: string;
  track: "agent" | "mingli";
};

export const LEARN_DOCS: LearnDoc[] = [
  {
    slug: "rag-concepts",
    file: "docs/rag-concepts-primer.md",
    title: "RAG 概念入门",
    blurb: "检索增强生成的基本拼图：embedding、向量库、topK、上下文窗口",
    track: "agent",
  },
  {
    slug: "rag-walkthrough",
    file: "docs/rag-beginner-walkthrough.md",
    title: "RAG 代码走读",
    blurb: "对照本仓库源码，把摄取 → 检索 → 生成 → 校验一行行走一遍",
    track: "agent",
  },
  {
    slug: "agent-walkthrough",
    file: "docs/agent-beginner-walkthrough.md",
    title: "Agent 基础概念",
    blurb: "从 RAG 到 Agent：工具使用、规划、记忆、反思都是什么",
    track: "agent",
  },
  {
    slug: "agent-loop",
    file: "docs/agent-loop-design.md",
    title: "工具循环设计（M0–M5）",
    blurb: "本项目最小 Agent 循环的完整设计：工具、台账、停止条件、轨迹",
    track: "agent",
  },
  {
    slug: "citation-design",
    file: "docs/rag-citation-design.md",
    title: "引用校验设计",
    blurb: "来源位置如何定义、假引用如何整组作废——可信链的图纸",
    track: "agent",
  },
  {
    slug: "bazi-guide",
    file: "docs/bazi-guide.md",
    title: "八字排盘使用指南",
    blurb: "填档、真太阳时与起运口径、点击释义与完整分析",
    track: "mingli",
  },
];

export function getLearnDoc(slug: string): LearnDoc | null {
  return LEARN_DOCS.find((d) => d.slug === slug) ?? null;
}
