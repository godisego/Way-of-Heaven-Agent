import { describe, expect, it } from "vitest";
import { extractTextSections } from "./textExtractor";

describe("extractTextSections", () => {
  it("按 Markdown 标题保留章节名和连续序号", () => {
    const sections = extractTextSections("# 自由\n选择意味着承担。\n## 自欺\n假装别无选择。");
    expect(sections).toEqual([
      { pageNumber: 1, sectionTitle: "自由", text: "选择意味着承担。" },
      { pageNumber: 2, sectionTitle: "自欺", text: "假装别无选择。" },
    ]);
  });

  it("无标题文本按段落单元切分", () => {
    const sections = extractTextSections("第一段。\n\n第二段。");
    expect(sections.map((section) => section.pageNumber)).toEqual([1, 2]);
    expect(sections.map((section) => section.text)).toEqual(["第一段。", "第二段。"]);
  });
});
