import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QUIZ_QUESTIONS } from "@/data/quizQuestions";
import { loadQuizAnswers, saveQuizAnswers, quizSummary, type QuizAnswers } from "./quizProgress";
import { loadReadProgress, setDocRead, loadProgress, markLessonDone } from "./learningProgress";
import { addMistake, loadMistakes } from "@/data/mistakeBook";

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
    dispatchEvent: vi.fn(),
  });
});
afterEach(() => vi.unstubAllGlobals());

const agent = QUIZ_QUESTIONS.filter((q) => q.track === "agent");
const mingli = QUIZ_QUESTIONS.filter((q) => q.track === "mingli");
const answer = (q: typeof agent[number]): QuizAnswers => ({ [q.id]: { selectedIndex: q.correctIndex, revision: q.revision } });

describe("learning records reflect actual activity", () => {
  it("one correct answer reports remaining questions, never mastery", () => {
    const result = quizSummary(agent, answer(agent[0]));
    expect(result.correct).toBe(1);
    expect(result.remaining).toBe(agent.length - 1);
    expect(result.message).toContain("未答");
    expect(result.message).not.toContain("已掌握");
    const all = Object.assign({}, ...agent.map(answer));
    expect(quizSummary(agent, all).message).toContain("毕业实践");
  });
  it("keeps tracks separate, restores answers and clears only the current group", () => {
    saveQuizAnswers(agent, answer(agent[0]));
    saveQuizAnswers(mingli, answer(mingli[0]));
    expect(loadQuizAnswers(agent)).toEqual(answer(agent[0]));
    expect(loadQuizAnswers(mingli)).toEqual(answer(mingli[0]));
    expect(quizSummary(mingli, answer(agent[0])).answered).toBe(0);
    saveQuizAnswers([agent[0]], {});
    expect(loadQuizAnswers(agent)).toEqual({});
    expect(loadQuizAnswers(mingli)).toEqual(answer(mingli[0]));
  });
  it("invalidates obsolete quiz revisions and malformed answers", () => {
    saveQuizAnswers(agent, { [agent[0].id]: { revision: agent[0].revision - 1, selectedIndex: agent[0].correctIndex } });
    expect(loadQuizAnswers(agent)).toEqual({});
    store.set("tiandao.learning.quiz.v1", JSON.stringify({ [agent[0].id]: { revision: agent[0].revision, selectedIndex: 999 } }));
    expect(loadQuizAnswers(agent)).toEqual({});
    store.set("tiandao.learning.quiz.v1", "bad json");
    expect(loadQuizAnswers(agent)).toEqual({});
  });
  it("tracks manually read articles independently of guided tours", () => {
    markLessonDone("agent-1");
    setDocRead("ai-worldview", true);
    expect(loadReadProgress()).toEqual({ "ai-worldview": true });
    expect(loadProgress()).toEqual({ "agent-1": true });
    setDocRead("ai-worldview", false);
    expect(loadReadProgress()).toEqual({});
    expect(loadProgress()["agent-1"]).toBe(true);
  });
  it("saves question revision and original option text for new mistakes", () => {
    const q = agent[0];
    addMistake(q.id, 0, q);
    expect(loadMistakes()[0]).toMatchObject({ revision: q.revision, selectedText: q.options[0] });
  });
  it("handles unavailable local storage without pretending a read record was saved", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } }, dispatchEvent: vi.fn() });
    expect(loadReadProgress()).toEqual({});
    expect(setDocRead("ai-worldview", true)).toBe(false);
    expect(saveQuizAnswers(agent, answer(agent[0]))).toBe(false);
  });
});
