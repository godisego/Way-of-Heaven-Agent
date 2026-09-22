import { describe, expect, it } from "vitest";
import { renderMarkdownToHtml } from "./miniMarkdown";

describe("learning article rendering", () => {
  it("preserves ordinary numbers beside inline code and in tables", () => {
    const html = renderMarkdownToHtml("最近 8 条；`topK` 为 10，100 次任务。\n\n| 指标 | 值 |\n| --- | --- |\n| 成功 | 80 次 |");
    expect(html).toContain("最近 8 条");
    expect(html).toContain("<code>topK</code> 为 10，100 次任务");
    expect(html).toContain("<td>80 次</td>");
  });

  it("keeps literal markup inside inline code", () => {
    expect(renderMarkdownToHtml("`<tag>` 和 `**bold**`"))
      .toBe("<p><code>&lt;tag&gt;</code> 和 <code>**bold**</code></p>");
  });

  it("maps registered repository links and rejects script links", () => {
    const html = renderMarkdownToHtml("[Jev](docs/jev-decision-models.md) [RAG](./rag-concepts-primer.md) [unsafe](javascript:alert)");
    expect(html).toContain('href="/learn/jev-decision-models"');
    expect(html).toContain('href="/learn/rag-concepts"');
    expect(html).not.toContain('href="javascript:');
  });
});
