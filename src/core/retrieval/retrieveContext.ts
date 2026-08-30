import { getDefaultProvider } from "@/core/providers/openAICompatibleProvider";
import type { ConfigOverride } from "@/core/config/appConfig";
import { getVectorStore } from "@/core/vector/localJsonVectorStore";
import type { VectorSearchResult } from "@/core/vector/vectorStore";
import { DIALOGUE_MENTORS, isSourceAllowedFor, type MentorId } from "@/data/mentors";
import { resolveMentorIds } from "@/data/mentorSelection";
import { citationEvidenceCoverage, isCitationQuestion } from "./evidenceRelevance";

/** 每条 Source 送入 prompt 的文本上限（成本与串扰保护） */
const MAX_CHUNK_CHARS = 800;

/** 全库检索（调试接口 /api/search 与「查典籍」使用；跨库查询是特性） */
export async function searchChunks(query: string, topK = 8, configOverride?: ConfigOverride): Promise<VectorSearchResult[]> {
  const provider = getDefaultProvider(configOverride);
  const embedding = await provider.embedTexts({ texts: [query], purpose: "query" });
  const [queryEmbedding] = embedding.embeddings;
  return getVectorStore().search(queryEmbedding, topK, undefined, embedding.model);
}

export type ScopedRetrieval = {
  /** 三贤各自专库（含共享池）的命中，各取 topKPerMentor 条 */
  byMentor: Record<MentorId, VectorSearchResult[]>;
  /** 去重后的总表（usedContext 与出典使用） */
  merged: VectorSearchResult[];
  /** 本轮实际在席角色；旧调用缺省时视为三贤全到。 */
  activeMentors?: MentorId[];
};

/**
 * 三贤分库检索：一次 embedding，一次大召回，JS 三路分拣。
 *
 * 为什么不逐库下推过滤查三次：单次大召回 + 分拣对本地/云端后端行为完全一致
 * （云端 RPC 暂不支持多传统过滤），且共享池命中天然复用。个人书库量级下
 * 引用型问题会扩大候选池并用词面覆盖率重排，避免 mock embedding 的 hash
 * 碰撞把明确书名或主题章节挤出前列；普通问答仍保持原向量顺序。
 */
export async function searchChunksForMentors(
  query: string,
  topKPerMentor = 4,
  configOverride?: ConfigOverride,
  mentorIds?: readonly MentorId[],
): Promise<ScopedRetrieval> {
  const provider = getDefaultProvider(configOverride);
  const embedding = await provider.embedTexts({ texts: [query], purpose: "query" });
  const [queryEmbedding] = embedding.embeddings;

  const citationQuestion = isCitationQuestion(query);
  const candidateLimit = citationQuestion ? Math.max(topKPerMentor * 6, 120) : topKPerMentor * 6;
  const candidates = await getVectorStore().search(queryEmbedding, candidateLimit, undefined, embedding.model);

  function rankCandidates(a: VectorSearchResult, b: VectorSearchResult): number {
    if (citationQuestion) {
      const coverageDifference =
        citationEvidenceCoverage(query, [b]) - citationEvidenceCoverage(query, [a]);
      if (coverageDifference !== 0) return coverageDifference;
    }
    return b.score - a.score;
  }

  const byMentor = { hu: [], li: [], xuan: [] } as Record<MentorId, VectorSearchResult[]>;
  const activeMentors = resolveMentorIds(mentorIds);
  for (const mentor of DIALOGUE_MENTORS.filter((item) => activeMentors.includes(item.id))) {
    byMentor[mentor.id] = candidates
      .filter((r) => isSourceAllowedFor(mentor.id, r.tradition))
      .sort(rankCandidates)
      .slice(0, topKPerMentor);
  }

  const seen = new Set<string>();
  const merged: VectorSearchResult[] = [];
  for (const mentorId of activeMentors) {
    const list = byMentor[mentorId];
    for (const r of list) {
      if (seen.has(r.chunkId)) continue;
      seen.add(r.chunkId);
      merged.push(r);
    }
  }
  merged.sort((a, b) => b.score - a.score);

  return { byMentor, merged, activeMentors };
}

function truncate(text: string): string {
  if (text.length <= MAX_CHUNK_CHARS) return text;
  return `${text.slice(0, MAX_CHUNK_CHARS)}…（已截断）`;
}

function sourceEntry(result: VectorSearchResult, label: string): string {
  const book = result.bookTitle ?? result.sourceFileName;
  const section = result.sectionTitle ?? `第${result.pageNumber}节`;
  return [
    `[Source ${label}]`,
    `book: ${book}`,
    `section: ${section}`,
    result.tradition ? `tradition: ${result.tradition}` : null,
    `cite_as: [《${book}》, ${section}]`,
    `text: ${truncate(result.text)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 旧版全库拼接（/api/search 调试与向后兼容） */
export function buildContext(results: VectorSearchResult[]): string {
  return results.map((result, index) => sourceEntry(result, String(index + 1))).join("\n\n");
}

const MENTOR_PREFIX: Record<MentorId, string> = { hu: "H", li: "L", xuan: "X" };

/** 分区 Sources：每位只可引用自己分区（越库由 validateCitationsByMentor 硬性拦截） */
export function buildScopedContext(scoped: ScopedRetrieval): string {
  const activeMentors = resolveMentorIds(scoped.activeMentors);
  const sections = DIALOGUE_MENTORS
    .filter((mentor) => activeMentors.includes(mentor.id))
    .map((mentor) => {
    const list = scoped.byMentor[mentor.id];
    const header = `[${mentor.shortName}之专库 · 以下来源仅${mentor.title}可引用]`;
    if (!list.length) {
      return `${header}\n（专库暂空——无据则言「暂未入藏」，不得引用其他分区）`;
    }
    const body = list
      .map((result, index) => sourceEntry(result, `${MENTOR_PREFIX[mentor.id]}${index + 1}`))
      .join("\n\n");
    return `${header}\n${body}`;
    });
  return sections.join("\n\n");
}
