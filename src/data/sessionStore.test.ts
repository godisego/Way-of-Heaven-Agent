import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// sessionStore 依赖 getDb() → ./data/app.json（DATA_DIR 决定）。
// 用独立 tmp 目录避免污染真实数据，测完清理。
const TMP = join(process.cwd(), ".tmp-session-test");
const ORIG_DATA_DIR = process.env.DATA_DIR;

// getDb 内部缓存单例，需在改 DATA_DIR 后重置；通过 vi.resetModules + 动态 import
// 让每个测试拿到全新的 sessionApi 与 jsonDb 实例。
async function freshSessionApi() {
  vi.resetModules();
  const mod = await import("./sessionStore");
  return mod.sessionApi;
}

beforeEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  process.env.DATA_DIR = TMP;
});

afterEach(() => {
  process.env.DATA_DIR = ORIG_DATA_DIR;
  rmSync(TMP, { recursive: true, force: true });
  vi.resetModules();
});

describe("sessionStore", () => {
  it("createSession 返回带 id 的会话", async () => {
    const sessionApi = await freshSessionApi();
    const s = sessionApi.createSession();
    expect(s.id).toMatch(/^sess_/);
    expect(s.title).toBe("新的对谈");
    expect(sessionApi.listSessions()).toHaveLength(1);
  });

  it("首条用户消息回填 title，后续只刷新 updatedAt", async () => {
    const sessionApi = await freshSessionApi();
    const s = sessionApi.createSession();
    sessionApi.appendMessage(s.id, { role: "user", content: "我最近做事总被打断，三贤怎么看？", citations: [] });
    const got = sessionApi.getSession(s.id);
    expect(got?.title).toBe("我最近做事总被打断，三贤怎么看？");

    const before = got?.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    sessionApi.appendMessage(s.id, {
      role: "assistant",
      content: "【盲派算师·老胡】…",
      citations: [{
        sourceFileName: "周易六十四卦处世选读.md",
        bookTitle: "周易六十四卦处世选读",
        sectionTitle: "第三章",
        documentId: "doc_test",
        pageNumber: 3,
        chunkId: "chunk_test",
        citedBy: "hu",
      }],
    });
    const after = sessionApi.getSession(s.id)?.updatedAt;
    expect(after).not.toBe(before);
    expect(sessionApi.getSession(s.id)?.title).toBe("我最近做事总被打断，三贤怎么看？");
  });

  it("getMessages 按时间排序、含 trace 落盘", async () => {
    const sessionApi = await freshSessionApi();
    const s = sessionApi.createSession();
    sessionApi.appendMessage(s.id, { role: "user", content: "问1", citations: [] });
    sessionApi.appendMessage(s.id, {
      role: "assistant",
      content: "答1",
      citations: [],
      trace: {
        runId: "run_test",
        mode: "agent",
        startedAt: "2026-01-01T00:00:00.000Z",
        durationMs: 100,
        stopReason: "ready",
        finalState: "completed",
        steps: [{ index: 0, phase: "tool", toolName: "search_library", durationMs: 10, observationSummary: "ok" }],
        totals: { toolCalls: 1, evidenceCount: 1, modelCalls: 1 },
      },
    });
    const msgs = sessionApi.getMessages(s.id);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("user");
    expect(msgs[1].trace?.runId).toBe("run_test");
    expect(msgs[1].trace?.steps[0].toolName).toBe("search_library");
  });

  it("deleteSession 级联删消息与会话", async () => {
    const sessionApi = await freshSessionApi();
    const s = sessionApi.createSession();
    sessionApi.appendMessage(s.id, { role: "user", content: "问", citations: [] });
    sessionApi.appendMessage(s.id, { role: "assistant", content: "答", citations: [] });
    sessionApi.deleteSession(s.id);
    expect(sessionApi.getSession(s.id)).toBeNull();
    expect(sessionApi.getMessages(s.id)).toHaveLength(0);
  });

  it("listSessions 按 updatedAt 倒序", async () => {
    const sessionApi = await freshSessionApi();
    const a = sessionApi.createSession();
    sessionApi.appendMessage(a.id, { role: "user", content: "先建的", citations: [] });
    // 让 b 的 updatedAt 严格晚于 a（同毫秒创建时字符串比较不稳定）
    await new Promise((r) => setTimeout(r, 5));
    const b = sessionApi.createSession();
    sessionApi.appendMessage(b.id, { role: "user", content: "后建的", citations: [] });
    const list = sessionApi.listSessions();
    expect(list[0].id).toBe(b.id);
    expect(list[1].id).toBe(a.id);
  });

  it("renameSession 改标题并限长", async () => {
    const sessionApi = await freshSessionApi();
    const s = sessionApi.createSession();
    sessionApi.renameSession(s.id, "  关于时机的对谈  ");
    expect(sessionApi.getSession(s.id)?.title).toBe("关于时机的对谈");
    sessionApi.renameSession(s.id, "x".repeat(100));
    expect(sessionApi.getSession(s.id)?.title).toHaveLength(60);
  });
});
