/**
 * ToolTransport —— 模型协议隔离层（agent-loop-design.md 第 5 节）。
 *
 * Orchestrator 不关心「工具调用长什么报文」：它只消费 TransportDecision。
 * v1 实现 Anthropic 原生 tool use（MiniMax /anthropic 端点兼容性由
 * scripts/probe-tool-support.ts 实测；若不支持，再补 JSON 协议 Transport，
 * 循环本体零改动）。测试用 ScriptedTransport 注入，完全不花 token。
 */

import { mergeConfig, type ConfigOverride } from "@/core/config/appConfig";
import type { AnyToolDefinition } from "./toolRegistry";

/** 对话轮：内部统一表示。role 含 "tool" 以兼容 OpenAI 的工具结果消息。
 *  Anthropic 把工具结果塞进 user 消息的 content 块；OpenAI 用独立 role:"tool" 消息。
 *  各 transport 的 appendToolResult 负责生成符合自身协议的形状，orchestrator 不感知。 */
export type TransportTurn = { role: "user" | "assistant" | "tool"; content: unknown };

export type TransportDecision =
  | {
      kind: "tool_call";
      toolUseId: string;
      name: string;
      args: unknown;
      /** 工具调用同返回的一句话计划（≤80 字，进轨迹；不含私有思维链） */
      planSummary: string;
      /** 模型本轮的原始内容块（回填对话用） */
      assistantContent: unknown;
    }
  | { kind: "no_tool"; text: string; assistantContent: unknown };

export interface ToolTransport {
  step(input: {
    system: string;
    turns: TransportTurn[];
    tools: AnyToolDefinition[];
    timeoutMs: number;
    signal?: AbortSignal;
  }): Promise<TransportDecision>;
  /** 把一条 user 消息追加进对话（各协议的 user turn 形状一致，但收进接口便于多协议）。 */
  appendUserTurn(turns: TransportTurn[], text: string): TransportTurn[];
  /** 把模型的 assistant 回复（含工具调用块）追加进对话。 */
  appendAssistantTurn(turns: TransportTurn[], assistantContent: unknown): TransportTurn[];
  /** 把工具执行结果追加进对话（Anthropic 与 OpenAI 形状不同）。 */
  appendToolResult(turns: TransportTurn[], toolUseId: string, observation: string): TransportTurn[];
}

export function userTurn(text: string): TransportTurn {
  return { role: "user", content: text };
}

export function toolResultTurn(toolUseId: string, observation: string): TransportTurn {
  return {
    role: "user",
    content: [{ type: "tool_result", tool_use_id: toolUseId, content: observation }],
  };
}

type ContentBlock = {
  type?: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
};

export class AnthropicToolTransport implements ToolTransport {
  constructor(private override: ConfigOverride | null = null) {}
  private get cfg() {
    return mergeConfig(this.override);
  }

  async step(input: {
    system: string;
    turns: TransportTurn[];
    tools: AnyToolDefinition[];
    timeoutMs: number;
    signal?: AbortSignal;
  }): Promise<TransportDecision> {
    const apiKey = this.cfg.chatApiKey;
    if (!apiKey) {
      throw new Error("缺少 CHAT_API_KEY（Agent 取证循环需要聊天模型）。");
    }
    const url = `${this.cfg.chatBaseUrl.replace(/\/$/, "")}/v1/messages`;
    const body = {
      model: this.cfg.chatModel,
      max_tokens: 1024,
      system: input.system,
      tools: input.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputJsonSchema,
      })),
      messages: input.turns,
    };

    // 单次调用超时 + 失败重试一次（网络抖动保护）
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), input.timeoutMs);
      const onOuterAbort = () => controller.abort();
      input.signal?.addEventListener("abort", onOuterAbort, { once: true });
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Anthropic Chat 接口失败：${response.status} ${await response.text()}`);
        }
        const data = (await response.json()) as { content?: ContentBlock[] };
        return parseDecision(Array.isArray(data.content) ? data.content : []);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (input.signal?.aborted) throw new Error("已取消");
      } finally {
        clearTimeout(timer);
        input.signal?.removeEventListener("abort", onOuterAbort);
      }
    }
    throw lastError ?? new Error("模型调用失败");
  }

  appendUserTurn(turns: TransportTurn[], text: string): TransportTurn[] {
    return [...turns, userTurn(text)];
  }

  appendAssistantTurn(turns: TransportTurn[], assistantContent: unknown): TransportTurn[] {
    return [...turns, { role: "assistant", content: assistantContent }];
  }

  appendToolResult(turns: TransportTurn[], toolUseId: string, observation: string): TransportTurn[] {
    return [...turns, toolResultTurn(toolUseId, observation)];
  }
}

// ── OpenAI 兼容协议（function calling）───────────────────────────────────
// OpenAIChatProvider 配套：与 AnthropicToolTransport 并列，循环本体（orchestrator）零感知。
// 协议差异：
// - 工具描述 {type:"function", function:{name, description, parameters}}
// - 模型调用 message.tool_calls:[{id, function:{name, arguments(JSON 字符串)}}]
// - 工具结果 {role:"tool", tool_call_id, content}

/** OpenAI tool_calls 块的形状 */
type OpenAIToolCall = {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
};

/** OpenAI 响应消息形状（assistant 轮可能带 tool_calls） */
type OpenAIMessage = {
  role: string;
  content: string | null;
  tool_calls?: OpenAIToolCall[];
};

export class OpenAIToolTransport implements ToolTransport {
  constructor(private override: ConfigOverride | null = null) {}
  private get cfg() {
    return mergeConfig(this.override);
  }

  async step(input: {
    system: string;
    turns: TransportTurn[];
    tools: AnyToolDefinition[];
    timeoutMs: number;
    signal?: AbortSignal;
  }): Promise<TransportDecision> {
    const apiKey = this.cfg.chatApiKey;
    if (!apiKey) {
      throw new Error("缺少 CHAT_API_KEY（Agent 取证循环需要聊天模型）。");
    }
    const url = `${this.cfg.chatBaseUrl.replace(/\/$/, "")}/chat/completions`;
    const body = {
      model: this.cfg.chatModel,
      max_tokens: 1024,
      // OpenAI 把 system 放进 messages 首位
      messages: [{ role: "system", content: input.system }, ...input.turns.map(toOpenAIMessage)],
      // 工具描述转 OpenAI function 格式
      tools: input.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.inputJsonSchema },
      })),
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), input.timeoutMs);
      const onOuterAbort = () => controller.abort();
      input.signal?.addEventListener("abort", onOuterAbort, { once: true });
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`OpenAI Chat 接口失败：${response.status} ${await response.text()}`);
        }
        const data = (await response.json()) as { choices?: Array<{ message?: OpenAIMessage }> };
        const msg = data.choices?.[0]?.message;
        return parseOpenAIDecision(msg ?? { role: "assistant", content: "" });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (input.signal?.aborted) throw new Error("已取消");
      } finally {
        clearTimeout(timer);
        input.signal?.removeEventListener("abort", onOuterAbort);
      }
    }
    throw lastError ?? new Error("模型调用失败");
  }

  appendUserTurn(turns: TransportTurn[], text: string): TransportTurn[] {
    return [...turns, { role: "user", content: text }];
  }

  /** assistant 回复原样存回（含 tool_calls，供下一轮模型读取）。 */
  appendAssistantTurn(turns: TransportTurn[], assistantContent: unknown): TransportTurn[] {
    return [...turns, { role: "assistant", content: assistantContent }];
  }

  /** 工具结果作为独立的 role:"tool" 消息。 */
  appendToolResult(turns: TransportTurn[], toolUseId: string, observation: string): TransportTurn[] {
    return [...turns, { role: "tool", content: { tool_call_id: toolUseId, content: observation } }];
  }
}

/** 把内部 TransportTurn 转成 OpenAI messages 数组能直接序列化的形状。
 *  role:"tool" 的 content 存的是 {tool_call_id, content} 对象，需展开成独立消息。 */
function toOpenAIMessage(turn: TransportTurn): unknown {
  // 工具结果轮：内部存 {role:"tool", content:{tool_call_id, content}}，展开
  if (turn.role === "tool" && turn.content && typeof turn.content === "object") {
    const c = turn.content as { tool_call_id?: string; content?: string };
    return { role: "tool", tool_call_id: c.tool_call_id, content: c.content };
  }
  return turn;
}

function parseOpenAIDecision(msg: OpenAIMessage): TransportDecision {
  const text = (msg.content ?? "").trim();
  const toolCall = msg.tool_calls?.[0];
  if (toolCall && toolCall.function?.name) {
    const toolUseId = toolCall.id ?? `call_${Math.random().toString(36).slice(2, 10)}`;
    if (!toolCall.id) toolCall.id = toolUseId;
    // OpenAI 的 arguments 是 JSON 字符串，需解析
    let args: unknown = {};
    if (toolCall.function.arguments) {
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }
    }
    // assistantContent 保留完整 message（含 tool_calls），供下一轮回填
    return {
      kind: "tool_call",
      toolUseId,
      name: toolCall.function.name,
      args,
      planSummary: text.slice(0, 80),
      assistantContent: msg,
    };
  }
  return { kind: "no_tool", text, assistantContent: msg };
}

function parseDecision(blocks: ContentBlock[]): TransportDecision {
  const text = blocks
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim();
  const toolUse = blocks.find((b) => b.type === "tool_use" && typeof b.name === "string");
  if (toolUse) {
    // Orchestrator 一次只执行一个工具。若模型在一轮里返回多个 tool_use（指令要求只调一个，
    // 但模型未必遵守），只保留第一个，丢弃其余——否则 assistant 消息里有 N 个 tool_use、
    // 下一轮却只补 1 个 tool_result，端点会以 "tool call result does not follow tool
    // call"（MiniMax 2013）拒掉整条请求。
    const kept = blocks.filter((b) => b.type !== "tool_use" || b === toolUse);
    // 端点要求 tool_result.tool_use_id 与 assistant 中 tool_use.id 严格一致；个别兼容端点
    // 不回 id，此处补一个并写回 block，避免 id 错配。
    const toolUseId = toolUse.id ?? `tu_${Math.random().toString(36).slice(2, 10)}`;
    if (!toolUse.id) toolUse.id = toolUseId;
    return {
      kind: "tool_call",
      toolUseId,
      name: toolUse.name as string,
      args: toolUse.input ?? {},
      planSummary: text.slice(0, 80),
      assistantContent: kept,
    };
  }
  return { kind: "no_tool", text, assistantContent: blocks.length ? blocks : [{ type: "text", text }] };
}
