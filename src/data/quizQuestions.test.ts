import { describe, expect, it } from "vitest";
import { LEARN_DOCS } from "./learnDocs";
import { QUIZ_QUESTIONS, getQuizById } from "./quizQuestions";

// Released IDs may already exist in a learner's local mistake book.
const RELEASED_QUESTION_IDS = [
  "agent-map-layers", "agent-map-worldview", "agent-0-q1", "agent-0-q2",
  "agent-map-taxonomy", "agent-1-q3", "agent-1-q7", "agent-map-jev-type",
  "agent-map-jev-confidence", "agent-1-q1", "agent-1-q2", "agent-map-attention",
  "agent-map-causal", "agent-map-embedding", "agent-map-training", "agent-1-q5",
  "agent-1-q6", "agent-map-context", "agent-map-memory", "agent-2-q3",
  "agent-2-q4", "agent-2-q1", "agent-2-q2", "agent-3-q1", "agent-4-q1",
  "agent-4-q2", "agent-map-protocols", "agent-map-retry", "agent-map-eval",
  "agent-map-judge", "agent-map-cost", "agent-5-q1", "agent-8-q2", "agent-8-q1",
  "agent-7-q1", "agent-7-q2", "agent-1-q4", "agent-map-product", "agent-map-roi",
  "agent-map-metric", "agent-map-handoff", "agent-app-q1", "agent-app-q2",
  "mingli-0-q1", "mingli-0-q2", "mingli-1-q1", "mingli-1-q2", "mingli-2-q1",
  "mingli-2-q2", "mingli-3-q1", "mingli-5-q1",
] as const;

describe("learning assessment coverage", () => {
  it("offers a linked knowledge check for every published lesson", () => {
    for (const doc of LEARN_DOCS) {
      const questions = QUIZ_QUESTIONS.filter((question) => question.docSlug === doc.slug);
      expect(questions.length, `${doc.slug} has no knowledge check`).toBeGreaterThan(0);
      for (const question of questions) {
        expect(question.track, question.id).toBe(doc.track);
        expect(question.stage, question.id).toBe(doc.stage);
      }
    }
  });

  it("preserves released IDs with revised versions for historical mistakes", () => {
    for (const id of RELEASED_QUESTION_IDS) {
      const question = getQuizById(id);
      expect(question, id).toBeDefined();
      expect(question?.revision, id).toBeGreaterThanOrEqual(2);
    }
  });

  it("has versioned, distinct answer choices and nonempty explanations", () => {
    for (const question of QUIZ_QUESTIONS) {
      expect(Number.isInteger(question.revision), question.id).toBe(true);
      expect(question.revision, question.id).toBeGreaterThan(0);
      expect(question.options.length, question.id).toBe(4);
      expect(new Set(question.options.map((option) => option.trim())).size, question.id).toBe(4);
      expect(question.options.every((option) => option.trim().length > 0), question.id).toBe(true);
      expect(Number.isInteger(question.correctIndex), question.id).toBe(true);
      expect(question.options[question.correctIndex], question.id).toBeTruthy();
      expect(question.question.trim().length, question.id).toBeGreaterThan(0);
      expect(question.explanation.trim().length, question.id).toBeGreaterThan(0);
    }
  });

  it("avoids making a single answer position the majority strategy in either track", () => {
    for (const track of ["agent", "mingli"] as const) {
      const questions = QUIZ_QUESTIONS.filter((question) => question.track === track);
      for (let answer = 0; answer < 4; answer += 1) {
        const frequency = questions.filter((question) => question.correctIndex === answer).length;
        expect(frequency / questions.length, `${track}: option ${answer + 1}`).toBeLessThan(0.5);
      }
    }
  });
});
