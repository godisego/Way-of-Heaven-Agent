import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_LAYERS, LEARN_DOCS, getAdjacentDocs, getTrackDocs } from "./learnDocs";
import { QUIZ_QUESTIONS } from "./quizQuestions";
import { renderMarkdownToHtml } from "../core/utils/miniMarkdown";

describe("learning curriculum integrity", () => {
  it("provides readable articles and working lesson links", () => {
    const slugs = new Set(LEARN_DOCS.map((doc) => doc.slug));
    expect(slugs.size).toBe(LEARN_DOCS.length);
    for (const doc of LEARN_DOCS) {
      const markdown = readFileSync(path.resolve(doc.file), "utf8");
      expect(markdown, doc.file).toMatch(/^# .+/m);
      expect(renderMarkdownToHtml(markdown), doc.file).toContain("<h1>");
      for (const link of markdown.matchAll(/\]\(\/learn\/([^\s)#]+)(?:#[^\s)]*)?\)/g)) {
        expect(slugs.has(link[1]), `${doc.slug} → ${link[1]}`).toBe(true);
      }
    }
  });

  it("keeps five layers contiguous and previous/next inside each track", () => {
    const agentDocs = getTrackDocs("agent");
    const stages = agentDocs.map((doc) => doc.stage).filter((stage, i, all) => i === 0 || stage !== all[i - 1]);
    expect(stages).toEqual([...AGENT_LAYERS.map((layer) => layer.stage), "附录 · 基础知识"]);
    for (const track of ["agent", "mingli"] as const) {
      const docs = getTrackDocs(track);
      docs.forEach((doc, index) => {
        const adjacent = getAdjacentDocs(doc);
        expect(adjacent.previous?.slug).toBe(docs[index - 1]?.slug);
        expect(adjacent.next?.slug).toBe(docs[index + 1]?.slug);
      });
    }
  });

  it("connects quizzes to their actual lessons and valid answers", () => {
    expect(new Set(QUIZ_QUESTIONS.map((q) => q.id)).size).toBe(QUIZ_QUESTIONS.length);
    for (const question of QUIZ_QUESTIONS) {
      const doc = LEARN_DOCS.find((item) => item.slug === question.docSlug);
      expect(doc, question.id).toBeDefined();
      expect(doc?.track, question.id).toBe(question.track);
      if (question.track === "agent") expect(question.stage, question.id).toBe(doc?.stage);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(question.options.length);
    }
  });
});
