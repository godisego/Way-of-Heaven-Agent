"use client";

import { useEffect, useRef, useState } from "react";
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
import { isProfileComplete } from "@/data/userProfile";
import { TracePanel } from "./TracePanel";
import { useLearning } from "./learning/LearningProvider";
import type { AgentTrace } from "@/core/agent/types";
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

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoIdx, setDemoIdx] = useState(0);
  const [agentMode, setAgentMode] = useState(false);
  const { enabled: learningOn } = useLearning();
  const listRef = useRef<HTMLDivElement>(null);

  // 方案 A：顶部「看示例回复」——直接塞入一轮 demo 对答，不调 /api/chat；多次点击轮换
  function showDemo() {
    if (busy) return;
    const hint = TAVERN_DEMO_HINTS[demoIdx % TAVERN_DEMO_HINTS.length];
    setDemoIdx((i) => i + 1);
    setError("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: hint.question },
      { role: "assistant", content: hint.reply, isDemo: true },
    ]);
  }

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
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

    // 命中 demo 模板：直接展示，不调 /api/chat
    if (demoReply) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: demoReply, isDemo: true },
      ]);
      setBusy(false);
      return;
    }

    try {
      const saved = await userProfileApi.load();
      const userProfile = isProfileComplete(saved) ? saved : null;
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, userProfile, mode: agentMode ? "agent" : undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "未能得答");
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answerMarkdown ?? "",
          citations: data.citations ?? [],
          trace: data.trace,
          pipeline: data.pipeline,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未能得答");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tavern-room" data-tour-id="chat-panel">
      {/* 顶栏：店招 + 在席角色 */}
      <header className="room-top">
        <div className="room-brand">
          <span className="room-lantern" aria-hidden>
            道
          </span>
          <div>
            <h1 className="room-title">天道茶寮</h1>
            <p className="room-sub">夜场对谈 · 三贤在席</p>
          </div>
        </div>
        <div className="room-top-actions">
          <button
            type="button"
            className={`secondary-button room-agent-btn${agentMode ? " is-on" : ""}`}
            onClick={() => setAgentMode((v) => !v)}
            aria-pressed={agentMode}
            data-tour-id="agent-toggle"
            data-tip="循迹模式：改走 Agent 工具循环——调度模型自主检索与精读取证，回答下方附完整执行轨迹面板。默认关闭时走固定 RAG 链路。"
            title={agentMode ? "循迹已开：Agent 自主取证，回答附执行轨迹" : "开启循迹：Agent 自主取证（较慢，但能看它怎么想）"}
          >
            {agentMode ? "循迹 · 开" : "循迹"}
          </button>
          <button
            type="button"
            className="secondary-button room-demo-btn"
            onClick={showDemo}
            disabled={busy}
            title="不调模型，直接看一轮三贤示例对答（多次点击轮换示例）"
          >
            看示例回复
          </button>
          <div className="room-cast">
            {DIALOGUE_MENTORS.map((m) => (
              <div key={m.id} className={`cast-item tone-${m.tone}`} title={m.epithet}>
                <MentorAvatar mentor={m} size="sm" />
                <span className="cast-name">{m.selfAddress.split(" / ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* 消息流 */}
      <div className="room-stream" ref={listRef} data-tour-id="messages">
        {messages.length === 0 ? (
          <div className="room-welcome">
            <p className="room-welcome-line">茶温着。把心里那件事说出来就好。</p>
            <p className="room-welcome-meta">
              老胡先批局势，李再拆自欺，贫道·玄收尾——听完会给你能走的下一步。
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

        {busy ? (
          <div className="typing-row">
            {DIALOGUE_MENTORS.map((m) => (
              <div key={m.id} className="typing-pill">
                <MentorAvatar mentor={m} size="sm" />
                <span>{m.shortName}在想…</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {error ? <p className="room-error">{error}</p> : null}

      {/* 输入 */}
      <footer className="room-composer">
        <textarea
          data-tour-id="chat-input"
          placeholder="跟三贤说点什么… Enter 发送，Shift+Enter 换行"
          value={input}
          rows={2}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
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
          disabled={busy || !input.trim()}
        >
          {busy ? "…" : "送上茶案"}
        </button>
      </footer>
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
      {!trace && learningOn && pipeline ? (
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
