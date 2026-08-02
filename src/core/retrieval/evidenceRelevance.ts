import type { VectorSearchResult } from "@/core/vector/vectorStore";

const CITATION_REQUEST_PATTERN = /出处|原文|典籍|引用|来源/;
const REQUEST_BOILERPLATE =
  /怎么理解|如何理解|怎么看|如何看待|请|给出|提供|注明|老师|引用|原文|典籍|出处|来源|分析|回答|解释|一下/g;
const PHRASE_SEPARATOR = /[\s，。！？、：；,.!?“”‘’《》()（）]|(?:的|和|与|及|对|从|来|我|你|他)+/;

function bigrams(phrase: string): string[] {
  if (phrase.length < 2) return [];
  const terms: string[] = [];
  for (let i = 0; i < phrase.length - 1; i += 1) terms.push(phrase.slice(i, i + 2));
  return terms;
}

function requestedBookTitles(question: string): string[] {
  return [...question.matchAll(/《([^》]+)》/g)].map((match) => match[1].trim().toLowerCase());
}

function coreTerms(question: string): string[] {
  const phrases = question
    .replace(REQUEST_BOILERPLATE, " ")
    .split(PHRASE_SEPARATOR)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length >= 2);
  return [...new Set(phrases.flatMap(bigrams))];
}

export function isCitationQuestion(question: string): boolean {
  return CITATION_REQUEST_PATTERN.test(question);
}

/** 0~1 的词面覆盖率；用于引用问题的大召回候选重排。 */
export function citationEvidenceCoverage(
  question: string,
  results: Array<Pick<VectorSearchResult, "text" | "bookTitle" | "sectionTitle">>,
): number {
  if (!isCitationQuestion(question) || !results.length) return 0;

  const corpus = results
    .map((item) => `${item.bookTitle ?? ""}\n${item.sectionTitle ?? ""}\n${item.text}`)
    .join("\n")
    .toLowerCase();
  const books = requestedBookTitles(question);
  if (books.length) {
    return books.filter((book) => corpus.includes(book)).length / books.length;
  }

  const terms = coreTerms(question);
  if (!terms.length) return 0;
  return terms.filter((term) => corpus.includes(term)).length / terms.length;
}

/**
 * 引用型问题必须在本轮证据中覆盖足够的核心词面。
 * 这是 mock embedding 的防碰撞门槛：随机正余弦不能证明库里真的有该主题。
 */
export function hasLexicalEvidenceForCitationQuestion(
  question: string,
  results: Array<Pick<VectorSearchResult, "text" | "bookTitle" | "sectionTitle">>,
): boolean {
  if (!isCitationQuestion(question)) return true;
  if (requestedBookTitles(question).length) return citationEvidenceCoverage(question, results) === 1;
  if (!coreTerms(question).length) return true;
  return citationEvidenceCoverage(question, results) >= 0.4;
}
