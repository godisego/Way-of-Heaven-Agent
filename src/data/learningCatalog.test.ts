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

  it("keeps five layers contiguous and navigation within the chosen learning route", () => {
    const agentDocs = getTrackDocs("agent");
    const stages = agentDocs.map((doc) => doc.stage).filter((stage, i, all) => i === 0 || stage !== all[i - 1]);
    expect(stages).toEqual([...AGENT_LAYERS.map((layer) => layer.stage), "案例 · 项目演进", "附录 · 基础知识"]);
    for (const track of ["agent", "mingli"] as const) {
      const docs = getTrackDocs(track);
      docs.forEach((doc) => {
        const route = docs.filter((item) => item.role === doc.role);
        const index = route.findIndex((item) => item.slug === doc.slug);
        const adjacent = getAdjacentDocs(doc);
        expect(adjacent.previous?.slug).toBe(route[index - 1]?.slug);
        expect(adjacent.next?.slug).toBe(route[index + 1]?.slug);
      });
    }
  });

  it("offers resolvable, acyclic prerequisites and a practical assessment for each track", () => {
    const visit = (slug: string, ancestors: string[] = []) => {
      expect(ancestors, `prerequisite cycle: ${[...ancestors, slug].join(" → ")}`).not.toContain(slug);
      const doc = LEARN_DOCS.find((item) => item.slug === slug);
      expect(doc, slug).toBeDefined();
      doc!.prerequisites.forEach((prior) => visit(prior, [...ancestors, slug]));
    };
    LEARN_DOCS.forEach((doc) => visit(doc.slug));
    for (const slug of ["ai-capstone", "bazi-capstone"]) {
      expect(LEARN_DOCS.find((doc) => doc.slug === slug)?.role).toBe("必修");
    }
    const jev = LEARN_DOCS.find((doc) => doc.slug === "jev-decision-models")!;
    expect(jev.role).toBe("选修");
    expect(jev.prerequisites).toContain("agent-evaluation-observability");
    LEARN_DOCS.filter((doc) => doc.stage === "四 · AI Engineering").forEach((doc) => expect(doc.module, doc.slug).toBeTruthy());
  });

  it("connects quizzes to their actual lessons and valid answers", () => {
    expect(new Set(QUIZ_QUESTIONS.map((q) => q.id)).size).toBe(QUIZ_QUESTIONS.length);
    for (const question of QUIZ_QUESTIONS) {
      const doc = LEARN_DOCS.find((item) => item.slug === question.docSlug);
      expect(doc, question.id).toBeDefined();
      expect(doc?.track, question.id).toBe(question.track);
      expect(question.stage, question.id).toBe(doc?.stage);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(question.options.length);
    }
  });
});
