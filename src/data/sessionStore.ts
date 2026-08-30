/**
 * 会话存储（Phase 3）—— 本地优先，复用 JsonDb 预留的三张表
 * （src/core/db/jsonDb.ts 里的 chat_sessions / chat_messages / answer_citations）。
 *
 * 设计同 src/data/userProfileStore.ts：接口 + 本地实现 + 留云端钩子。
 * 将来上 Supabase 只需新建一个 SessionApi 实现替换下方 defaultApi 即可，
 * 调用方（/api/chat、ChatPanel）零改动。
 *
 * trace 落盘遵循 agent-loop-design.md 第 7 节：只存结构化摘要
 * （TraceStep 已脱敏，不含思维链/密钥/完整生辰）。
 */

import { getDb } from "@/core/db/jsonDb";
import type { AgentTrace } from "@/core/agent/types";
import type { Citation } from "@/core/retrieval/citationPolicy";
import type { RagPipelineNotes } from "@/core/retrieval/answerWithCitations";

export type SessionRow = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /**
   * 此前对谈的 LLM 压缩摘要（rolling summary）：覆盖窗口（最近 N 条）之外的更早消息。
   * 长对话超窗口时由 contextBuilder 生成并回写，避免第 9 轮起丢失第 1 轮关键信息。
   * 短对话或未触发摘要时为 undefined。
   */
  summary?: string;
  /** 摘要覆盖到的最后一条消息 createdAt（ISO）。rolling 增量用：只摘要这之后的窗口外消息。 */
  summaryUpTo?: string;
};

export type SessionMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  trace?: AgentTrace;
  pipeline?: RagPipelineNotes;
  /** 联网回答回答的来源标注（web-fallback 链路写入） */
  webSearch?: import("@/core/search/webSearch").WebSearchBadge;
  /** demo 模板回复，不落库（但允许标记 assistant 消息来源） */
  isDemo?: boolean;
  createdAt: string;
};

/**
 * 给模型的轻量历史上下文：只保留最近几轮可见文本，不把 trace、引用元数据
 * 或完整的内部存储结构送回模型。它不是证据，提示词会明确标注这一点。
 */
export function buildConversationContext(messages: SessionMessage[], maxMessages = 8, maxChars = 6000): string {
  const recent = messages.slice(-maxMessages);
  let remaining = maxChars;
  const lines: string[] = [];
  for (const message of recent) {
    if (remaining <= 0) break;
    const speaker = message.role === "user" ? "问者" : "三贤";
    const content = message.content.trim().slice(0, Math.max(0, remaining - speaker.length - 3));
    if (!content) continue;
    lines.push(`${speaker}：${content}`);
    remaining -= content.length + speaker.length + 3;
  }
  return lines.join("\n\n");
}

export interface SessionApi {
  createSession(title?: string): SessionRow;
  appendMessage(sessionId: string, message: Omit<SessionMessage, "id" | "sessionId" | "createdAt">): SessionMessage;
  listSessions(): SessionRow[];
  getMessages(sessionId: string): SessionMessage[];
  deleteSession(sessionId: string): void;
  renameSession(sessionId: string, title: string): void;
  getSession(sessionId: string): SessionRow | null;
  /** 回写 rolling summary：摘要文本 + 覆盖到的最后一条消息 createdAt。 */
  updateSessionSummary(sessionId: string, summary: string, summaryUpTo: string): void;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

class JsonDbSessionApi implements SessionApi {
  createSession(title?: string): SessionRow {
    const now = new Date().toISOString();
    const row: SessionRow = {
      id: newId("sess"),
      title: (title?.trim() || "新的对谈").slice(0, 60),
      createdAt: now,
      updatedAt: now,
    };
    getDb().insert<SessionRow>("chat_sessions", row, (e) => e.id === row.id);
    return row;
  }

  appendMessage(
    sessionId: string,
    message: Omit<SessionMessage, "id" | "sessionId" | "createdAt">,
  ): SessionMessage {
    const db = getDb();
    const session = db.find<SessionRow>("chat_sessions", (s) => s.id === sessionId);
    if (!session) throw new Error(`会话不存在：${sessionId}`);

    const row: SessionMessage = {
      ...message,
      id: newId("msg"),
      sessionId,
      createdAt: new Date().toISOString(),
    };
    db.insert<SessionMessage>("chat_messages", row, (e) => e.id === row.id);

    // 引用拆 answer_citations 便于将来按引用反查；trace/pipeline 走 chat_messages
    if (row.citations?.length) {
      for (const c of row.citations) {
        db.insert<{ messageId: string; citation: Citation }>(
          "answer_citations",
          { messageId: row.id, citation: c },
          (e) => e.messageId === row.id && (e.citation as Citation).chunkId === c.chunkId,
        );
      }
    }

    // 首条用户消息回填 session.title；其余只刷新 updatedAt
    const update = { updatedAt: row.createdAt } as Partial<SessionRow>;
    if (message.role === "user" && (session.title === "新的对谈" || !session.title)) {
      update.title = message.content.slice(0, 60);
    }
    db.update<SessionRow>(
      "chat_sessions",
      (s) => s.id === sessionId,
      (s) => ({ ...s, ...update }),
    );
    return row;
  }

  listSessions(): SessionRow[] {
    return getDb()
      .all<SessionRow>("chat_sessions")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getMessages(sessionId: string): SessionMessage[] {
    return getDb()
      .filter<SessionMessage>("chat_messages", (m) => m.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  deleteSession(sessionId: string): void {
    const db = getDb();
    const msgs = db.filter<SessionMessage>("chat_messages", (m) => m.sessionId === sessionId);
    const ids = new Set(msgs.map((m) => m.id));
    // 级联删：消息 → 引用 → 会话。JsonDb 无 delete API，removeRows 反射重写文件。
    removeRows("chat_messages", (m) => m.sessionId === sessionId);
    removeRows("answer_citations", (r) => ids.has(r.messageId as string));
    removeRows("chat_sessions", (s) => s.id === sessionId);
  }

  renameSession(sessionId: string, title: string): void {
    const t = title.trim().slice(0, 60);
    if (!t) return;
    getDb().update<SessionRow>(
      "chat_sessions",
      (s) => s.id === sessionId,
      (s) => ({ ...s, title: t, updatedAt: new Date().toISOString() }),
    );
  }

  getSession(sessionId: string): SessionRow | null {
    return getDb().find<SessionRow>("chat_sessions", (s) => s.id === sessionId);
  }

  updateSessionSummary(sessionId: string, summary: string, summaryUpTo: string): void {
    getDb().update<SessionRow>(
      "chat_sessions",
      (s) => s.id === sessionId,
      (s) => ({ ...s, summary, summaryUpTo, updatedAt: new Date().toISOString() }),
    );
  }
}

/**
 * JsonDb 没有 delete API（Phase 1 已记事务化留后）。
 * 这里临时用反射直接重写文件，避免给 JsonDb 加 API。
 * 仅 sessionStore 内部使用，调用方不感知。
 */
function removeRows(
  table: "chat_messages" | "chat_sessions" | "answer_citations",
  predicate: (row: Record<string, unknown>) => boolean,
): void {
  const db = getDb();
  const allRows = db.all<Record<string, unknown>>(table);
  const remaining = allRows.filter((r) => !predicate(r));
  if (remaining.length === allRows.length) return; // 无删除，不重写
  // JsonDb 没有 delete API（Phase 1 已记事务化留后），
  // 这里反射覆盖 store.data[table] 并持久化；仅 sessionStore 内部使用。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (db as any).data as Record<string, unknown[]>;
  data[table] = remaining;
  (db as unknown as { persist: () => void }).persist();
}

export const sessionApi: SessionApi = new JsonDbSessionApi();
