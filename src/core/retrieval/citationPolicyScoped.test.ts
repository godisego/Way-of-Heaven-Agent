import { describe, expect, it } from "vitest";
import type { VectorSearchResult } from "../vector/vectorStore";
import { buildScopedContext, type ScopedRetrieval } from "./retrieveContext";
import { validateCitationsByMentor } from "./citationPolicy";

function chunk(
  id: string,
  bookTitle: string,
  sectionTitle: string,
  tradition: string | null,
): VectorSearchResult {
  return {
    id,
    chunkId: id,
    documentId: `doc_${id}`,
    sourceFileName: `${bookTitle}.md`,
    pageNumber: 1,
    sectionTitle,
    bookTitle,
    author: null,
    tradition,
    text: `${bookTitle}·${sectionTitle} 的内容。`,
    embedding: [],
    score: 0.8,
  };
}

const zhouYi = chunk("c_zhouyi", "周易", "需卦", "yijing");
const notes = chunk("c_notes", "存在主义笔记", "自欺", "existentialism");
const tiandao = chunk("c_tiandao", "天道笔记", "文化属性", "tiandao");

const scoped: ScopedRetrieval = {
  byMentor: {
    hu: [zhouYi, tiandao],
    li: [notes, tiandao],
    xuan: [tiandao],
  },
  merged: [zhouYi, notes, tiandao],
};

const wrap = (hu: string, li: string, xuan: string) =>
  `【盲派算师·老胡】\n${hu}\n\n【存在主义导师·李】\n${li}\n\n【主事·玄】\n${xuan}`;

describe("validateCitationsByMentor（按发言人 × 专库）", () => {
  it("各引各库全部通过，并标注发言人归属", () => {
    const answer = wrap(
      "势在等。[《周易》, 需卦]",
      "你在假装没得选。[《存在主义笔记》, 自欺]",
      "两位说的是一件事。[《天道笔记》, 文化属性]",
    );
    const r = validateCitationsByMentor(answer, scoped);
    expect(r.violations).toEqual([]);
    expect(r.citations).toHaveLength(3);
    expect(r.citations.find((c) => c.chunkId === "c_zhouyi")?.citedBy).toBe("hu");
    expect(r.citations.find((c) => c.chunkId === "c_notes")?.citedBy).toBe("li");
  });

  it("李引《周易》→ 越库违规，整组作废", () => {
    const answer = wrap(
      "势在等。[《周易》, 需卦]",
      "宿命论也是自欺。[《周易》, 需卦]",
      "且去，莫急。",
    );
    const r = validateCitationsByMentor(answer, scoped);
    expect(r.citations).toEqual([]);
    const v = r.violations.find((x) => x.mentorId === "li");
    expect(v?.reason).toBe("cross-library");
    expect(v?.cite).toContain("周易");
  });

  it("引用本轮不存在的出处 → not-found，整组作废", () => {
    const answer = wrap("[《不存在的书》, 第九章] 老夫瞧着。", "你在等许可。", "且去。");
    const r = validateCitationsByMentor(answer, scoped);
    expect(r.citations).toEqual([]);
    expect(r.violations[0]?.reason).toBe("not-found");
  });

  it("共享库（天道）三人皆可引；同一 chunk 去重", () => {
    const answer = wrap(
      "老夫也引。[《天道笔记》, 文化属性]",
      "选择先于救主。",
      "收束。[《天道笔记》, 文化属性]",
    );
    const r = validateCitationsByMentor(answer, scoped);
    expect(r.violations).toEqual([]);
    expect(r.citations).toHaveLength(1);
    expect(r.citations[0].chunkId).toBe("c_tiandao");
  });

  it("无法归属发言人的段落按总表校验", () => {
    const answer = `开场引一句。[《存在主义笔记》, 自欺]\n\n${wrap("老夫瞧着。", "你在等。", "且去。")}`;
    const r = validateCitationsByMentor(answer, scoped);
    expect(r.violations).toEqual([]);
    expect(r.citations).toHaveLength(1);
  });

  it("角色子集的 Sources 只暴露在席角色专库", () => {
    const context = buildScopedContext({ ...scoped, activeMentors: ["hu"] });
    expect(context).toContain("老胡");
    expect(context).not.toContain("存在主义导师");
    expect(context).not.toContain("主事·玄");
    expect(context).not.toContain("存在主义笔记");
  });
});
