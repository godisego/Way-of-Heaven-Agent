import type { VectorSearchResult } from "@/core/vector/vectorStore";
import { parseMentorDialogue, type MentorId } from "@/data/mentors";
import type { ScopedRetrieval } from "./retrieveContext";

export type Citation = {
  sourceFileName: string;
  bookTitle: string | null;
  sectionTitle: string | null;
  documentId: string;
  pageNumber: number;
  chunkId: string;
  quote?: string;
  /** 该引用出自哪位发言人的段落（分库校验时标注，UI 可展示小印） */
  citedBy?: MentorId;
};

// 引用格式：[《书名》, 章节]。章节部分可以是章节标题或「第N节」。
// 例：[《存在与虚无》, 第二章 自欺]  或  [《周易》, 乾卦]
const citationRegex = /\[《([^》]+)》\s*[,，]\s*([^\]]+)\]/g;

export function parseCitations(answer: string): Array<{ bookTitle: string; section: string }> {
  const citations: Array<{ bookTitle: string; section: string }> = [];
  for (const match of answer.matchAll(citationRegex)) {
    citations.push({ bookTitle: match[1].trim(), section: match[2].trim() });
  }
  return citations;
}

// 来源位置匹配：优先要求与 Sources 的 section 完全一致；仅为无标题旧数据兼容
// 「N / 第N页 / 第N节 / 第N章」这几种严格的序号写法。
function sectionMatches(result: VectorSearchResult, section: string): boolean {
  const s = section.trim();
  if (result.sectionTitle && result.sectionTitle.trim() === s) return true;
  const numMatch = s.match(/^(?:第\s*)?(\d+)\s*(?:页|节|章)?$/);
  if (numMatch && Number(numMatch[1]) === result.pageNumber) return true;
  return false;
}

/** 在给定来源集合中匹配一条引用（书名 + 来源位置） */
function matchCitation(
  retrieved: VectorSearchResult[],
  citation: { bookTitle: string; section: string },
): VectorSearchResult | null {
  return (
    retrieved.find((result) => {
      const book = result.bookTitle ?? result.sourceFileName;
      return book === citation.bookTitle && sectionMatches(result, citation.section);
    }) ?? null
  );
}

function toCitation(match: VectorSearchResult, citedBy?: MentorId): Citation {
  return {
    sourceFileName: match.sourceFileName,
    bookTitle: match.bookTitle,
    sectionTitle: match.sectionTitle,
    documentId: match.documentId,
    pageNumber: match.pageNumber,
    chunkId: match.chunkId,
    quote: match.text.slice(0, 500),
    ...(citedBy ? { citedBy } : {}),
  };
}

export function validateCitations(answer: string, retrieved: VectorSearchResult[]): Citation[] {
  const parsed = parseCitations(answer);
  const valid: Citation[] = [];
  for (const citation of parsed) {
    const match = matchCitation(retrieved, citation);
    // 一条假引用就让整组引用失败，避免“夹带一条真引用”绕过校验。
    if (!match) return [];
    if (!valid.some((item) => item.chunkId === match.chunkId)) {
      valid.push(toCitation(match));
    }
  }
  return valid;
}

export type ScopedCitationViolation = {
  mentorId: MentorId | null;
  cite: string;
  reason: "cross-library" | "not-found";
};

export type ScopedCitationOutcome = {
  citations: Citation[];
  violations: ScopedCitationViolation[];
};

/**
 * 按发言人 × 专库校验（M3）：
 * 把回答拆成三贤段落，每段引用只允许匹配该贤自己的分区（共享池已并入各自分区）；
 * 无法归属发言人的段落（如「序」）按 merged 总表校验。
 * 任一违规（越库或查无此源）⇒ 整组引用作废（与既有严规则一致）。
 */
export function validateCitationsByMentor(
  answer: string,
  scoped: ScopedRetrieval,
): ScopedCitationOutcome {
  const segments = parseMentorDialogue(answer);
  const valid: Citation[] = [];
  const violations: ScopedCitationViolation[] = [];

  for (const seg of segments) {
    const allowed = seg.mentorId ? scoped.byMentor[seg.mentorId] : scoped.merged;
    for (const citation of parseCitations(seg.body)) {
      const citeText = `[《${citation.bookTitle}》, ${citation.section}]`;
      const own = matchCitation(allowed, citation);
      if (own) {
        if (!valid.some((item) => item.chunkId === own.chunkId)) {
          valid.push(toCitation(own, seg.mentorId ?? undefined));
        }
        continue;
      }
      const anywhere = matchCitation(scoped.merged, citation);
      violations.push({
        mentorId: seg.mentorId,
        cite: citeText,
        reason: anywhere ? "cross-library" : "not-found",
      });
    }
  }

  if (violations.length) return { citations: [], violations };
  return { citations: valid, violations: [] };
}

export function needsCitation(answer: string): boolean {
  // 无据兜底是固定三贤文本：只陈述证据边界和下一步，不是在引用思想内容。
  if (
    answer.includes("典籍中暂时没有能贴合你这个困惑的内容") &&
    answer.includes("无据，不妄言")
  ) {
    return false;
  }
  const residue = answer
    .replace(/【[^】]+】/g, "")
    .replace(
      /资料中没有足够信息回答这个问题|典籍中暂时没有能贴合你这个困惑的内容|暂未入藏|未找到相关资料|无法从(?:资料|典籍)中回答|尚未收录相关内容/g,
      "",
    )
    .replace(/你可以先上传一些相关的书籍或笔记(?:（[^）]*）)?，?我再结合它们与你细聊/g, "")
    .replace(/[\s，。！？、：；,.!?—-]/g, "");
  return residue.length > 0;
}
