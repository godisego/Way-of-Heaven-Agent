/**
 * ToolTransport —— 模型协议隔离层（agent-loop-design.md 第 5 节）。
 *
 * Orchestrator 不关心「工具调用长什么报文」：它只消费 TransportDecision。
 * v1 实现 Anthropic 原生 tool use（MiniMax /anthropic 端点兼容性由
 * scripts/probe-tool-support.ts 实测；若不支持，再补 JSON 协议 Transport，
 * 循环本体零改动）。测试用 ScriptedTransport 注入，完全不花 token。
 */

import { getAppConfig } from "@/core/config/appConfig";
import type { AnyToolDefinition } from "./toolRegistry";

/** 对话轮：Anthropic messages 形状（assistant 内容块原样保存，保证多轮工具对话合法） */
export type TransportTurn = { role: "user" | "assistant"; content: unknown };

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
  private config = getAppConfig();

  async step(input: {
    system: string;
    turns: TransportTurn[];
    tools: AnyToolDefinition[];
    timeoutMs: number;
    signal?: AbortSignal;
  }): Promise<TransportDecision> {
    if (!this.config.chatApiKey) {
      throw new Error("缺少 CHAT_API_KEY（Agent 取证循环需要聊天模型）。");
    }
    const url = `${this.config.chatBaseUrl.replace(/\/$/, "")}/v1/messages`;
    const body = {
      model: this.config.chatModel,
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
            "x-api-key": this.config.chatApiKey,
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
