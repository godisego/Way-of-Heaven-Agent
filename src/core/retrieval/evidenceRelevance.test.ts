import { describe, expect, it } from "vitest";
import {
  citationEvidenceCoverage,
  hasLexicalEvidenceForCitationQuestion,
} from "./evidenceRelevance";

const evidence = [
  {
    bookTitle: "存在主义笔记",
    sectionTitle: "自欺",
    text: "自欺是把自己当成被动的物，并否认作为自由主体的责任。",
  },
  {
    bookTitle: "周易六十四卦处世选读",
    sectionTitle: "乾卦",
    text: "天行健，君子以自强不息。",
  },
];

describe("hasLexicalEvidenceForCitationQuestion", () => {
  it("允许有明确词面证据的引用问题", () => {
    expect(hasLexicalEvidenceForCitationQuestion("怎么理解自欺？请给出出处。", evidence)).toBe(true);
    expect(citationEvidenceCoverage("怎么理解自欺？请给出出处。", [evidence[0]])).toBe(1);
    expect(citationEvidenceCoverage("怎么理解自欺？请给出出处。", [evidence[1]])).toBe(0);
  });

  it("拒绝只有 embedding 随机正分、没有主题覆盖的库外问题", () => {
    expect(
      hasLexicalEvidenceForCitationQuestion(
        "量子力学的多世界诠释怎么看自由意志？请给出典籍出处。",
        evidence,
      ),
    ).toBe(false);
  });

  it("书名明确出现时按书名判断", () => {
    expect(hasLexicalEvidenceForCitationQuestion("请引用《周易》的原文", evidence)).toBe(true);
    expect(hasLexicalEvidenceForCitationQuestion("请引用《不存在的书》的原文", evidence)).toBe(false);
  });

  it("不要求引用的问题不受词面门槛影响", () => {
    expect(hasLexicalEvidenceForCitationQuestion("最近总被打断，怎么稳住？", [])).toBe(true);
  });
});
