import { describe, expect, it } from "vitest";
import { needsCitation, parseCitations, validateCitations } from "./citationPolicy";
import type { VectorSearchResult } from "../vector/vectorStore";

const retrieved: VectorSearchResult[] = [
  {
    id: "chunk_1",
    chunkId: "chunk_1",
    documentId: "doc_1",
    sourceFileName: "存在主义笔记.md",
    pageNumber: 2,
    sectionTitle: "自欺",
    bookTitle: "存在主义笔记",
    author: null,
    tradition: "existentialism",
    text: "假装自己别无选择，是逃避自由的一种方式。",
    embedding: [1, 0],
    score: 0.9,
  },
];

describe("citationPolicy", () => {
  it("解析并验证本轮来源中的书名和章节", () => {
    expect(parseCitations("观点。[《存在主义笔记》, 自欺]"))
      .toEqual([{ bookTitle: "存在主义笔记", section: "自欺" }]);
    expect(validateCitations("观点。[《存在主义笔记》, 自欺]", retrieved)).toHaveLength(1);
  });

  it("只要夹带一条假引用，就拒绝整组引用", () => {
    const answer =
      "真来源。[《存在主义笔记》, 自欺] 假来源。[《不存在的典籍》, 第九章]";
    expect(validateCitations(answer, retrieved)).toEqual([]);
  });

  it("不接受只因包含相同数字就碰巧命中的来源位置", () => {
    expect(validateCitations("观点。[《存在主义笔记》, 伪造位置2]", retrieved)).toEqual([]);
  });

  it("只豁免纯粹的资料不足回应，不允许借关键词绕过", () => {
    expect(needsCitation("【主事·玄】\n暂未入藏。")).toBe(false);
    expect(needsCitation("资料中没有足够信息回答这个问题，但我断言你一定成功。")).toBe(true);
  });
});
