"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CitationList, type Citation } from "./CitationList";
import { MentorAvatar } from "./MentorAvatar";
import {
  DIALOGUE_MENTORS,
  getMentor,
  parseMentorDialogue,
  type DialogueSegment,
  type MentorId,
} from "@/data/mentors";
import { TAVERN_DEMO_HINTS } from "@/data/tavernDemoReplies";
import { userProfileApi } from "@/data/userProfileStore";
import { isProfileComplete, type UserProfile } from "@/data/userProfile";
import { TracePanel } from "./TracePanel";
import { useLearning } from "./learning/LearningProvider";
import { readSseStream } from "./streamSse";
import { safeFetchJson, FetchNotJsonError } from "@/lib/safeFetch";
import type { AgentTrace, TraceStep } from "@/core/agent/types";
import type { RagPipelineNotes } from "@/core/retrieval/answerWithCitations";

type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  /** 标记这条回复来自 demo 模板（用于在 UI 上加视觉提示） */
  isDemo?: boolean;
  /** mode=agent 时的执行轨迹（M4 面板） */
  trace?: AgentTrace;
  /** RAG 管线注解（学习模式下展示） */
  pipeline?: RagPipelineNotes;
};

type SessionSummary = { id: string; title: string; updatedAt: string };

type StoredMessage = Message & { id: string; createdAt: string };

function toMessages(messages: StoredMessage[]): Message[] {
  return messages.map(({ role, content, citations, isDemo, trace, pipeline }) => ({
    role,
    content: content ?? "",
    // 防御：历史会话（旧版本写入）可能缺这些字段，兜底成空数组/丢弃残缺对象
    citations: Array.isArray(citations) ? citations : [],
    isDemo,
    // trace 残缺（无 steps 或 totals）则丢弃，避免 TracePanel 渲染崩溃
    trace: trace && Array.isArray(trace.steps) && trace.totals ? trace : undefined,
    // pipeline 残缺（无 retrieved）则丢弃
    pipeline: pipeline && pipeline.retrieved ? pipeline : undefined,
  }));
}

/** 流式中给一条助手消息追加轨迹步骤（trace 缺省时建空壳）。 */
function appendStep(trace: AgentTrace | undefined, step: TraceStep): AgentTrace {
  return {
    mode: "agent",
    runId: trace?.runId ?? "streaming",
    startedAt: trace?.startedAt ?? new Date().toISOString(),
    durationMs: trace?.durationMs ?? 0,
    stopReason: trace?.stopReason ?? "ready",
    finalState: trace?.finalState ?? "completed",
    steps: [...(trace?.steps ?? []), step],
    totals: trace?.totals ?? { toolCalls: 0, evidenceCount: 0, modelCalls: 0 },
  };
}

function selectMentorReply(content: string, mentorIds: readonly MentorId[]): string {
  const selected = parseMentorDialogue(content).filter(
    (segment) => segment.mentorId && mentorIds.includes(segment.mentorId),
  );
  if (!selected.length) return content;
  return selected.map((segment) => `【${segment.heading}】\n${segment.body}`).join("\n\n");
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoIdx, setDemoIdx] = useState(0);
  const [agentMode, setAgentMode] = useState(true);
  const [selectedMentorIds, setSelectedMentorIds] = useState<MentorId[]>(
    () => DIALOGUE_MENTORS.map((mentor) => mentor.id),
  );
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [sessionBusy, setSessionBusy] = useState(true);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const { enabled: learningOn } = useLearning();
  const listRef = useRef<HTMLDivElement>(null);
  /** 流式中：已收到首个事件（步骤/正文）但 final 帧未到。用于把等待动画换成实时内容。 */
  const [streaming, setStreaming] = useState(false);
  /** 当前一轮的取消句柄；流式 agent 模式下用于「停止」。 */
  const abortRef = useRef<AbortController | null>(null);
  const activeMentors = DIALOGUE_MENTORS.filter((mentor) => selectedMentorIds.includes(mentor.id));
  const attendanceLabel = activeMentors.length === 3
    ? "三贤在席"
    : activeMentors.length === 2
      ? "二贤在席"
      : `${activeMentors[0].shortName}独席`;

  function toggleMentor(id: MentorId) {
    if (busy) return;
    setSelectedMentorIds((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        return current.filter((mentorId) => mentorId !== id);
      }
      return DIALOGUE_MENTORS
        .map((mentor) => mentor.id)
        .filter((mentorId) => mentorId === id || current.includes(mentorId));
    });
  }

  const loadSession = useCallback(async (id: string) => {
    setSessionBusy(true);
    try {
      const { ok, data } = await safeFetchJson<{ session: { id: string }; messages?: StoredMessage[]; error?: string }>(
        `/api/sessions/${encodeURIComponent(id)}`,
      );
      if (!ok) throw new Error(data.error ?? "读取会话失败");
      setSessionId(data.session.id);
      setMessages(toMessages(data.messages ?? []));
    } finally {
      setSessionBusy(false);
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    const { ok, data } = await safeFetchJson<{ sessions?: SessionSummary[]; error?: string }>("/api/sessions");
    if (!ok) throw new Error(data.error ?? "读取会话列表失败");
    const next = (data.sessions ?? []) as SessionSummary[];
    setSessions(next);
    return next;
  }, []);

  const createSession = useCallback(async () => {
    setSessionBusy(true);
    try {
      const { ok, data } = await safeFetchJson<{ session: { id: string }; error?: string }>("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!ok) throw new Error(data.error ?? "创建会话失败");
      setSessionId(data.session.id);
      setMessages([]);
      setRenamingSessionId(null);
      await refreshSessions();
    } finally {
      setSessionBusy(false);
    }
  }, [refreshSessions]);

  const startRename = useCallback((session: SessionSummary) => {
    setRenamingSessionId(session.id);
    setRenameValue(session.title);
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingSessionId(null);
    setRenameValue("");
  }, []);

  const saveRename = useCallback(async (id: string) => {
    const title = renameValue.trim();
    if (!title) return;
    setSessionBusy(true);
    try {
      const { ok, data } = await safeFetchJson<{ error?: string }>(
        `/api/sessions/${encodeURIComponent(id)}`,
        { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) },
      );
      if (!ok) throw new Error(data.error ?? "重命名失败");
      await refreshSessions();
      cancelRename();
    } catch (err) {
      setError(err instanceof FetchNotJsonError ? err.message : err instanceof Error ? err.message : "重命名失败");
    } finally {
      setSessionBusy(false);
    }
  }, [cancelRename, refreshSessions, renameValue]);

  const deleteSession = useCallback(async (session: SessionSummary) => {
    if (!window.confirm(`确定删除“${session.title}”吗？\n其中的对话和引用也会一并删除。`)) return;
    setSessionBusy(true);
    try {
      const { ok, data } = await safeFetchJson<{ error?: string }>(
        `/api/sessions/${encodeURIComponent(session.id)}`,
        { method: "DELETE" },
      );
      if (!ok) throw new Error(data.error ?? "删除失败");
      const next = await refreshSessions();
      if (session.id === sessionId) {
        if (next[0]) await loadSession(next[0].id);
        else await createSession();
      }
    } catch (err) {
      setError(err instanceof FetchNotJsonError ? err.message : err instanceof Error ? err.message : "删除失败");
    } finally {
      setSessionBusy(false);
    }
  }, [createSession, loadSession, refreshSessions, sessionId]);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const next = await refreshSessions();
        if (cancelled) return;
        if (next[0]) await loadSession(next[0].id);
        else await createSession();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "会话初始化失败");
      } finally {
        if (!cancelled) setSessionBusy(false);
      }
    }
    void initialize();
    return () => {
      cancelled = true;
    };
  }, [createSession, loadSession, refreshSessions]);

  // 方案 A：顶部「看示例回复」——直接塞入一轮 demo 对答，不调 /api/chat；多次点击轮换
  function showDemo() {
    if (busy) return;
    const hint = TAVERN_DEMO_HINTS[demoIdx % TAVERN_DEMO_HINTS.length];
    setDemoIdx((i) => i + 1);
    setError("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: hint.question },
      { role: "assistant", content: selectMentorReply(hint.reply, selectedMentorIds), isDemo: true },
    ]);
  }

  // 自动滚动到底部：仅在用户已接近底部、且没有正在选择文字时触发。
  // 这样用户往上翻看历史或拖选复制时，不会被强制拉回底部打断操作。
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // 用户正在选择文字（复制中）→ 不打断
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    // 用户已主动滚离底部（在看历史）→ 不强制拉回，除非距离底部很近
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > 120) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  // 命理释义面板的「问三贤」：把问题递到输入框（不自动发送，主动权在问者）
  useEffect(() => {
    function onAsk(event: Event) {
      const q = (event as CustomEvent<{ question?: string }>).detail?.question;
      if (typeof q === "string" && q) setInput(q);
    }
    window.addEventListener("tavern:ask", onAsk);
    return () => window.removeEventListener("tavern:ask", onAsk);
  }, []);

  async function ask(questionRaw: string, demoReply?: string) {
    const question = questionRaw.trim();
    if (!question || busy) return;
    setBusy(true);
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    const mentorIds = [...selectedMentorIds];

    // 命中 demo 模板：直接展示，不调 /api/chat
    if (demoReply) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: selectMentorReply(demoReply, mentorIds), isDemo: true },
      ]);
      setBusy(false);
      return;
    }

    const usingStream = agentMode;
    // 流式：先插入一条占位助手消息，后续增量更新它的 content/trace/citations。
    // trace 不预置——首个 step 事件到达时由 appendStep 建壳（此时 typing 让位于面板）。
    if (usingStream) {
      setMessages((prev) => [...prev, { role: "assistant", content: "" } as Message]);
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const saved = await userProfileApi.load();
      const userProfile = isProfileComplete(saved) ? saved : null;
      if (usingStream) {
        await streamAgentReply(question, userProfile, sessionId, mentorIds, controller.signal);
      } else {
        // RAG 模式：一次性 JSON（保持原行为，作为固定对照）
        const { ok, data } = await safeFetchJson<{
          answerMarkdown?: string;
          citations?: Citation[];
          pipeline?: unknown;
          sessionId?: string;
          error?: string;
        }>("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question, userProfile, sessionId, mode: "rag", mentors: mentorIds }),
          signal: controller.signal,
        });
        if (!ok) {
          setError(data.error ?? "未能得答");
          return;
        }
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answerMarkdown ?? "",
            citations: data.citations ?? [],
            pipeline: data.pipeline as Message["pipeline"],
          },
        ]);
        if (typeof data.sessionId === "string") setSessionId(data.sessionId);
        await refreshSessions();
      }
    } catch (err) {
      // 用户主动取消不算错误
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "未能得答");
    } finally {
      abortRef.current = null;
      setBusy(false);
      setStreaming(false);
    }
  }

  /**
   * agent 流式：消费 /api/chat/stream 的 SSE 帧，逐帧更新最后一条助手消息。
   * - step → 追加轨迹步骤；首个事件到达后，把等待动画切换为实时内容（streaming=true）；
   * - delta → 追加正文文本；
   * - final → 写入完整 citations / trace / sessionId（覆盖占位）；
   * - error → 抛出，交由 ask 的 catch 处理。
   */
  async function streamAgentReply(
    question: string,
    userProfile: UserProfile | null,
    currentSessionId: string,
    mentorIds: MentorId[],
    signal: AbortSignal,
  ) {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, userProfile, sessionId: currentSessionId, mode: "agent", mentors: mentorIds }),
      signal,
    });

    if (!response.ok) {
      // 非流式错误（如 400/404）：尝试读 JSON 错误体
      let message = "未能得答";
      try {
        const data = await response.json();
        if (data?.error) message = String(data.error);
      } catch {
        /* 忽略，用默认 message */
      }
      throw new Error(message);
    }
    if (!response.body) throw new Error("浏览器不支持流式读取");

    // 末尾助手消息的索引（流式开始时已插入占位）
    const lastAssistantIndex = -1;
    let touched = false;

    await readSseStream(response.body, (event) => {
      if (!touched) {
        touched = true;
        setStreaming(true);
      }
      switch (event.type) {
        case "step":
          updateLastAssistant((msg) => ({
            ...msg,
            trace: appendStep(msg.trace, event.step as AgentTrace["steps"][number]),
          }));
          break;
        case "delta":
          if (typeof event.text === "string") {
            updateLastAssistant((msg) => ({ ...msg, content: msg.content + (event.text as string) }));
          }
          break;
        case "final": {
          const final = event as {
            answerMarkdown?: string;
            citations?: Citation[];
            trace?: AgentTrace;
            usedContext?: unknown;
            sessionId?: string;
          };
          updateLastAssistant((msg) => ({
            ...msg,
            content: typeof final.answerMarkdown === "string" ? final.answerMarkdown : msg.content,
            citations: Array.isArray(final.citations) ? final.citations : msg.citations,
            trace: final.trace ?? msg.trace,
          }));
          if (typeof final.sessionId === "string") setSessionId(final.sessionId);
          void refreshSessions();
          break;
        }
        case "error":
          throw new Error(typeof event.message === "string" ? event.message : "流式问答失败");
        default:
          break; // stop / done / end 忽略
      }
    }, signal);

    // 记录 lastAssistantIndex 给闭包（上面用 -1 标记「最后一条」）
    function updateLastAssistant(updater: (msg: Message) => Message) {
      setMessages((prev) => {
        const next = [...prev];
        const idx = next.length + lastAssistantIndex;
        if (idx >= 0 && next[idx]?.role === "assistant") {
          next[idx] = updater(next[idx]);
        }
        return next;
      });
    }
  }

  return (
    <div className="tavern-workspace">
      <aside className="conversation-rail" aria-label="对话列表">
        <div className="conversation-rail-head">
          <div>
            <p className="conversation-kicker">茶寮案头</p>
            <h2>对话</h2>
          </div>
          <button
            type="button"
            className="conversation-new"
            onClick={() => void createSession()}
            disabled={sessionBusy || busy}
            aria-label="新建对话"
            title="新建对话"
          >
            +
          </button>
        </div>
        <p className="conversation-rail-note">每一席对谈都留在这里，随时回来续问。</p>
        <div className="conversation-list">
          {sessions.length === 0 ? <p className="conversation-empty">正在准备新席位…</p> : null}
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`conversation-row${session.id === sessionId ? " is-active" : ""}`}
            >
              {renamingSessionId === session.id ? (
                <form className="conversation-rename" onSubmit={(event) => { event.preventDefault(); void saveRename(session.id); }}>
                  <input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    maxLength={60}
                    aria-label="新的对话名称"
                    autoFocus
                  />
                  <button type="submit" disabled={sessionBusy || !renameValue.trim()} aria-label="保存名称">✓</button>
                  <button type="button" onClick={cancelRename} disabled={sessionBusy} aria-label="取消重命名">×</button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    className="conversation-item"
                    onClick={() => void loadSession(session.id)}
                    disabled={sessionBusy || busy}
                    aria-pressed={session.id === sessionId}
                    title={session.title}
                  >
                    <span className="conversation-item-mark" aria-hidden />
                    <span className="conversation-item-title">{session.title}</span>
                  </button>
                  <div className="conversation-actions">
                    <button
                      type="button"
                      className="conversation-action"
                      onClick={() => startRename(session)}
                      disabled={sessionBusy || busy}
                      aria-label={`重命名 ${session.title}`}
                      title="重命名"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="conversation-action conversation-delete"
                      onClick={() => void deleteSession(session)}
                      disabled={sessionBusy || busy}
                      aria-label={`删除 ${session.title}`}
                      title="删除对话"
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

      <div className="tavern-room" data-tour-id="chat-panel">
        {/* 顶栏：店招 + 在席角色 */}
        <header className="room-top">
          <div className="room-brand">
            <span className="room-lantern" aria-hidden>
              道
            </span>
            <div>
              <h1 className="room-title">天道茶寮</h1>
              <p className="room-sub">
                夜场对谈 · {attendanceLabel}
              </p>
            </div>
          </div>
          <div className="room-top-actions">
          <button
            type="button"
            className={`secondary-button room-agent-btn${agentMode ? " is-on" : ""}`}
            onClick={() => setAgentMode((v) => !v)}
            aria-pressed={agentMode}
            data-tour-id="agent-toggle"
            data-tip="循迹模式：Agent 工具循环——调度模型自主检索与精读取证，回答下方附完整执行轨迹面板。关闭后走固定 RAG 链路。"
            title={agentMode ? "循迹已开：Agent 自主取证，回答附执行轨迹" : "开启循迹：Agent 自主取证（较慢，但能看它怎么做）"}
          >
            {agentMode ? "循迹 · 开" : "循迹"}
          </button>
          <button
            type="button"
            className="secondary-button room-demo-btn"
            data-tour-id="demo-reply"
            onClick={showDemo}
            disabled={busy}
            title="不调模型，直接看一轮三贤示例对答（多次点击轮换示例）"
          >
            看示例回复
          </button>
          <div className="room-cast" data-tour-id="mentor-selection">
            {DIALOGUE_MENTORS.map((m) => {
              const isActive = selectedMentorIds.includes(m.id);
              const isLastActive = isActive && selectedMentorIds.length === 1;
              return (
              <button
                key={m.id}
                type="button"
                className={`cast-item tone-${m.tone}${isActive ? " is-active" : " is-away"}`}
                onClick={() => toggleMentor(m.id)}
                aria-pressed={isActive}
                aria-label={isActive ? `请${m.shortName}下席` : `请${m.shortName}入席`}
                title={isLastActive ? `${m.shortName}是当前唯一在席角色` : `${isActive ? "请下席" : "请入席"}：${m.epithet}`}
                disabled={busy || isLastActive}
              >
                <MentorAvatar mentor={m} size="sm" />
                <span className="cast-name">{m.selfAddress.split(" / ")[0]}</span>
              </button>
              );
            })}
          </div>
          </div>
        </header>

      {/* 消息流 */}
      <div className="room-stream" ref={listRef} data-tour-id="messages">
        {messages.length === 0 ? (
          <div className="room-welcome">
            <p className="room-welcome-line">茶温着。把心里那件事说出来就好。</p>
            <p className="room-welcome-meta">
              {selectedMentorIds.length === DIALOGUE_MENTORS.length
                ? "老胡先批局势，李再拆自欺，贫道·玄收尾——听完会给你能走的下一步。"
                : activeMentors.length === 1
                  ? `${activeMentors[0].shortName}独席，只从自己的专长回应这轮问题。`
                  : `${activeMentors.map((mentor) => mentor.shortName).join("、")}在席，只从各自专长回应这轮问题。`}
            </p>
            <div className="room-hints">
              {TAVERN_DEMO_HINTS.map((hint) => (
                <button
                  key={hint.question}
                  type="button"
                  className="room-hint"
                  onClick={() => void ask(hint.question, hint.reply)}
                  disabled={busy}
                >
                  {hint.question}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) =>
          message.role === "user" ? (
            <div className="bubble-row user" key={index}>
              <div className="bubble user-bubble">
                <div className="bubble-meta">你</div>
                <div className="bubble-text">{message.content}</div>
              </div>
              <MentorAvatar guest size="sm" />
            </div>
          ) : (
            <AssistantRound
              key={index}
              content={message.content}
              citations={message.citations}
              isDemo={message.isDemo}
              trace={message.trace}
              pipeline={message.pipeline}
              learningOn={learningOn}
            />
          ),
        )}

        {busy && !streaming ? (
          <div className="typing-row">
            {activeMentors.map((m) => (
              <div key={m.id} className="typing-pill">
                <MentorAvatar mentor={m} size="sm" />
                <span>{m.shortName}在想…</span>
              </div>
            ))}
          </div>
        ) : null}
        {busy && streaming ? (
          <div className="streaming-stop">
            <button
              type="button"
              className="room-stop"
              onClick={() => abortRef.current?.abort()}
            >
              停止生成
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className="room-error">{error}</p> : null}

      {/* 输入 */}
      <footer className="room-composer">
        <textarea
          data-tour-id="chat-input"
          placeholder={`跟${activeMentors.length === 1 ? activeMentors[0].shortName : "在席诸贤"}说点什么… Enter 发送，Shift+Enter 换行`}
          value={input}
          rows={2}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            // Enter 发送、Shift+Enter 换行；中文输入法 composing 时回车是确认候选词，不发送
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void ask(input);
            }
          }}
          disabled={busy}
        />
        <button
          type="button"
          className="room-send"
          data-tour-id="chat-submit"
          onClick={() => void ask(input)}
          disabled={busy || sessionBusy || !sessionId || !input.trim()}
        >
          {sessionBusy ? "准备中" : busy ? "…" : "送上茶案"}
        </button>
      </footer>
      </div>
    </div>
  );
}

function AssistantRound({
  content,
  citations,
  isDemo,
  trace,
  pipeline,
  learningOn,
}: {
  content: string;
  citations?: Citation[];
  isDemo?: boolean;
  trace?: AgentTrace;
  pipeline?: RagPipelineNotes;
  learningOn?: boolean;
}) {
  const segments = parseMentorDialogue(content);
  return (
    <div className="round-block" data-demo={isDemo ? "true" : undefined}>
      {isDemo ? <p className="round-demo-tag">— 模板回复（未调真实模型） —</p> : null}
      {segments.map((seg, i) => (
        <MentorSpeech key={`${seg.heading}-${i}`} segment={seg} />
      ))}
      {citations && citations.length > 0 ? (
        <div className="round-citations">
          <CitationList citations={citations} />
        </div>
      ) : null}
      {trace ? (
        <div className="round-citations">
          <TracePanel trace={trace} />
        </div>
      ) : null}
      {!trace && learningOn && pipeline?.retrieved ? (
        <p className="round-pipeline" data-tip="RAG 管线注解：这轮回答背后的检索命中与校验结果——学习模式专属的轻量版轨迹。">
          检索 {pipeline.retrieved.merged} 条（胡 {pipeline.retrieved.hu} · 李 {pipeline.retrieved.li} · 玄 {pipeline.retrieved.xuan}）
          · 引用校验 {pipeline.citationsValid ? "✓" : "✕"} · 声口 {pipeline.voiceValid ? "✓" : "✕"} · {pipeline.retried ? "已定向重试" : "未重试"}
        </p>
      ) : null}
    </div>
  );
}

function MentorSpeech({ segment }: { segment: DialogueSegment }) {
  const mentor = segment.mentorId ? getMentor(segment.mentorId as MentorId) : null;
  const tone = mentor?.tone ?? "ink";
  const name = mentor ? mentor.selfAddress.split(" / ")[0] : segment.heading;
  const sub = mentor?.title ?? "";

  return (
    <div className={`bubble-row mentor tone-${tone}`}>
      <MentorAvatar mentor={mentor} size="md" />
      <div className="bubble mentor-bubble">
        <div className="bubble-meta">
          <strong>{name}</strong>
          {sub ? <span>{sub}</span> : null}
        </div>
        <div className="bubble-text">{segment.body}</div>
      </div>
    </div>
  );
}
