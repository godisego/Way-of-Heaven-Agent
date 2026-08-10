/**
 * 第一批工具（agent-loop-design.md 第 4.2 节）：全部只读、确定性、有硬约束。
 *
 * - search_library   检索私人典籍库（可按思想传统过滤）
 * - read_source_unit 读某来源单元完整原文（documentId 白名单防瞎猜）
 * - ready_to_answer  显式收尾：让「停」成为轨迹里看得见的决定
 */

import { z } from "zod";
import { getDefaultProvider } from "@/core/providers/openAICompatibleProvider";
import { getVectorStore } from "@/core/vector/localJsonVectorStore";
import { getDocument, getPageByDocumentAndNumber } from "@/core/documents/documentRepository";
import { hasLexicalEvidenceForCitationQuestion } from "@/core/retrieval/evidenceRelevance";
import type { EvidenceItem } from "./types";
import type { ToolDefinition, ToolResult, ToolContext } from "./toolRegistry";

const OBS_TEXT_CHARS = 300; // 检索观察里每条证据给模型看的文本上限
const UNIT_TEXT_CHARS = 6000; // 读原文给模型的上限

// ── search_library ───────────────────────────────────────

type SearchLibraryArgs = {
  query: string;
  topK?: number;
  tradition?: string;
};

export const searchLibraryTool: ToolDefinition<SearchLibraryArgs> = {
  name: "search_library",
  description:
    "在问者的私人典籍库中做语义检索。输入检索词（可换角度改写多次），可选按思想传统过滤" +
    "（existentialism / stoicism / yijing / daoism / chinese-classics / tiandao）。" +
    "返回候选片段与证据编号 ev_N。检索不到就换个说法，仍不足则 ready_to_answer(sufficient=false)。",
  inputJsonSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "检索词（≤200 字）" },
      topK: { type: "integer", minimum: 1, maximum: 8, description: "返回条数，默认 5" },
      tradition: {
        type: "string",
        enum: ["existentialism", "stoicism", "yijing", "daoism", "chinese-classics", "tiandao"],
        description: "可选：只搜某一思想传统",
      },
    },
    required: ["query"],
  },
  argsSchema: z.object({
    query: z.string().min(1).max(200),
    topK: z.number().int().min(1).max(8).optional(),
    tradition: z
      .enum(["existentialism", "stoicism", "yijing", "daoism", "chinese-classics", "tiandao"])
      .optional(),
  }),
  timeoutMs: 15_000,
  maxCallsPerRun: 4,
  async execute(args, ctx): Promise<ToolResult> {
    const provider = getDefaultProvider(ctx.configOverride);
    const { embeddings, model } = await provider.embedTexts({ texts: [args.query] });
    const topK = args.topK ?? 5;
    const candidateHits = await getVectorStore().search(
      embeddings[0],
      topK,
      args.tradition ? (r) => r.tradition === args.tradition : undefined,
      model,
    );
    // Agent 不能把“向量有一点相似”当成“库里有据”。尤其是库外且要求出处的问题，
    // 用原始问句做一次词面门槛；模型后续改写查询也不能绕过这道安全边界。
    const relevanceQuestion = ctx.question?.trim() || args.query;
    const hits = hasLexicalEvidenceForCitationQuestion(relevanceQuestion, candidateHits)
      ? candidateHits
      : [];

    if (!hits.length) {
      const scope = args.tradition ? `（传统=${args.tradition}）` : "";
      return {
        observationForModel: `检索「${args.query}」${scope}无命中。可换角度改写检索词，或换/去掉传统过滤；确认库中无据则 ready_to_answer(sufficient=false)。`,
        observationSummary: `检索「${args.query}」${scope}：0 命中`,
        evidence: [],
      };
    }

    for (const h of hits) ctx.seenDocumentIds.add(h.documentId);
    const entries = ctx.ledger.add(hits, ctx.stepIndex);
    const lines = hits.map((h) => {
      const evId = ctx.ledger.idOf(h.chunkId) ?? "ev_?";
      const book = h.bookTitle ?? h.sourceFileName;
      const section = h.sectionTitle ?? `第${h.pageNumber}节`;
      const text = h.text.length > OBS_TEXT_CHARS ? `${h.text.slice(0, OBS_TEXT_CHARS)}…` : h.text;
      return `[${evId}] 《${book}》· ${section}（documentId=${h.documentId}，第${h.pageNumber}单元，相关度${h.score.toFixed(2)}）\n${text}`;
    });
    const best = hits[0];
    return {
      observationForModel:
        `检索「${args.query}」命中 ${hits.length} 条（新增证据 ${entries.length} 条）：\n\n${lines.join("\n\n")}\n\n` +
        "如需核对某条的完整上下文，用 read_source_unit(documentId, pageNumber)。",
      observationSummary: `检索「${args.query}」：${hits.length} 命中，最高 ${best.score.toFixed(2)}《${best.bookTitle ?? best.sourceFileName}》`,
      evidence: hits,
    };
  },
};

// ── read_source_unit ─────────────────────────────────────

type ReadSourceUnitArgs = {
  documentId: string;
  pageNumber: number;
};

export const readSourceUnitTool: ToolDefinition<ReadSourceUnitArgs> = {
  name: "read_source_unit",
  description:
    "读取某文档某来源单元（PDF 一页 / 文本一章节）的完整原文，用于检索命中后核对上下文，" +
    "而不是仅凭一个片段下结论。documentId 必须来自本轮 search_library 的结果。",
  inputJsonSchema: {
    type: "object",
    properties: {
      documentId: { type: "string", description: "来自本轮检索结果的 documentId" },
      pageNumber: { type: "integer", minimum: 1, description: "页码 / 章节序号" },
    },
    required: ["documentId", "pageNumber"],
  },
  argsSchema: z.object({
    documentId: z.string().min(1),
    pageNumber: z.number().int().min(1),
  }),
  timeoutMs: 5_000,
  maxCallsPerRun: 3,
  async execute(args, ctx): Promise<ToolResult> {
    if (!ctx.seenDocumentIds.has(args.documentId)) {
      return {
        observationForModel:
          "该 documentId 未出现在本轮检索结果中，不可读取（防止凭空猜测文档）。先用 search_library 找到目标文档。",
        observationSummary: `read_source_unit 拒绝：未知 documentId`,
        evidence: [],
        isError: true,
      };
    }
    const page = getPageByDocumentAndNumber(args.documentId, args.pageNumber);
    if (!page) {
      return {
        observationForModel: `该文档没有第 ${args.pageNumber} 个来源单元。`,
        observationSummary: `read_source_unit：单元不存在（p${args.pageNumber}）`,
        evidence: [],
        isError: true,
      };
    }
    const doc = getDocument(args.documentId);
    const book = doc?.bookTitle ?? doc?.originalFileName ?? "未知文档";
    const truncated = page.text.length > UNIT_TEXT_CHARS;
    const text = truncated ? `${page.text.slice(0, UNIT_TEXT_CHARS)}…（已截断）` : page.text;

    const item: EvidenceItem = {
      id: `unit:${args.documentId}:${args.pageNumber}`,
      chunkId: `unit:${args.documentId}:${args.pageNumber}`,
      documentId: args.documentId,
      sourceFileName: doc?.originalFileName ?? book,
      pageNumber: args.pageNumber,
      sectionTitle: page.sectionTitle,
      bookTitle: doc?.bookTitle ?? null,
      author: doc?.author ?? null,
      tradition: doc?.tradition ?? null,
      text: page.text,
      embedding: [],
      score: 1,
    };
    ctx.ledger.add([item], ctx.stepIndex);
    const evId = ctx.ledger.idOf(item.chunkId) ?? "ev_?";
    const section = page.sectionTitle ?? `第${args.pageNumber}节`;
    return {
      observationForModel: `[${evId}] 《${book}》· ${section} 完整原文${truncated ? "（超长已截断）" : ""}：\n${text}`,
      observationSummary: `读原文《${book}》· ${section}（${page.text.length} 字${truncated ? "，截断" : ""}）`,
      evidence: [item],
    };
  },
};

// ── ready_to_answer ──────────────────────────────────────

type ReadyToAnswerArgs = {
  sufficient: boolean;
  missing?: string;
};

/** 标记工具：orchestrator 拦截处理，不执行任何副作用 */
export const readyToAnswerTool: ToolDefinition<ReadyToAnswerArgs> = {
  name: "ready_to_answer",
  description:
    "结束取证：sufficient=true 表示证据足够、进入三贤生成；sufficient=false 表示典籍中确实不足," +
    "并在 missing 里用一句话说明缺什么（会展示给问者）。不要在证据明显不足时硬答。",
  inputJsonSchema: {
    type: "object",
    properties: {
      sufficient: { type: "boolean" },
      missing: { type: "string", description: "sufficient=false 时：缺什么材料（≤100 字）" },
    },
    required: ["sufficient"],
  },
  argsSchema: z.object({
    sufficient: z.boolean(),
    missing: z.string().max(100).optional(),
  }),
  timeoutMs: 1_000,
  maxCallsPerRun: 2,
  async execute(): Promise<ToolResult> {
    // orchestrator 在 registry.run 之前拦截；此实现只作兜底
    return { observationForModel: "收到。", observationSummary: "ready_to_answer", evidence: [] };
  },
};

export function defaultTools() {
  return [searchLibraryTool, readSourceUnitTool, readyToAnswerTool];
}

export type { ToolContext };
