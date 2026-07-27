"use client";

import type { ReactNode } from "react";
import { findConcept } from "@/data/concepts";

type ConceptTipProps = {
  /**
   * 词条。可与 concepts.ts 里 `term` 匹配(大小写不敏感)。
   * 找不到时静默退化成普通文字,不破坏 UI。
   */
  term: string;
  /** 渲染出来的文本;不传就用 term 本身 */
  children?: ReactNode;
};

/**
 * 给文档/段落里的术语加虚线下划线和 hover 解释。
 *
 * 例子:
 *   <p>
 *     这是一个 <ConceptTip term="RAG">RAG</ConceptTip> 系统,
 *     工作原理是把 <ConceptTip term="Embedding" /> 转成向量。
 *   </p>
 *
 * 注:对 ReactNode 不拆字(有 children 就直接 children 套上 data-tip),
 *  这意味着如果 children 是个长句,整段都会带 data-tip 而不是单个词。
 *  对应常见用法就是给单个词/短语用。
 */
export function ConceptTip({ term, children }: ConceptTipProps) {
  const concept = findConcept(term);
  if (!concept) {
    return <>{children ?? term}</>;
  }

  const lines: string[] = [];
  lines.push(`${concept.term}：${concept.explanation.split("\n")[0]}`);
  const rest = concept.explanation.split("\n").slice(1).join("\n").trim();
  if (rest) lines.push(rest);
  if (concept.where) lines.push(`📁 ${concept.where}`);
  const fullTip = lines.join("\n\n");

  return (
    <span className="concept-tip" data-tip={fullTip}>
      {children ?? term}
    </span>
  );
}
