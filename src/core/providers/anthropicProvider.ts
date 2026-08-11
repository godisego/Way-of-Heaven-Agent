import { mergeConfig, type ConfigOverride } from "@/core/config/appConfig";
import { buildMentorSystemPrompt, buildMentorUserPrompt } from "@/data/mentors";
import type {
  GenerateAnswerInput,
  GenerateAnswerResult,
  LlmProvider,
  OnAnswerToken,
  SummarizeInput,
  SummarizeResult,
} from "./llmProvider";

// Anthropic /messages 格式的 provider。
// 人设与对谈规则统一来自 src/data/mentors.ts，避免与 UI 漂移。
export class AnthropicProvider implements LlmProvider {
  /**
   * 运行时覆盖：供内部测试或显式调用方覆盖服务器/env 配置。
   * getter cfg 每次读时合并，因此 env 改动也会反映（尽管实际 env 在进程启动时固定）。
   */
  constructor(private override: ConfigOverride | null = null) {}

  private get cfg() {
    return mergeConfig(this.override);
  }

  private headers() {
    const apiKey = this.cfg.chatApiKey;
    if (!apiKey) {
      throw new Error("缺少 CHAT_API_KEY（Anthropic 格式 provider 需要的鉴权密钥）。");
    }
    return {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  /** /messages 请求体（非流式与流式共用，仅 stream 字段不同） */
  private buildBody(input: GenerateAnswerInput, stream: boolean) {
    return {
      model: this.cfg.chatModel,
      max_tokens: 4096,
      stream,
      system: buildMentorSystemPrompt(input.userProfile ?? null, input.mentorIds),
      messages: [
        {
          role: "user",
          content: buildMentorUserPrompt(
            input.question,
            input.context,
            input.userProfile ?? null,
            input.conversationContext,
            input.mentorIds,
          ),
        },
      ],
    };
  }

  async generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult> {
    const url = `${this.cfg.chatBaseUrl.replace(/\/$/, "")}/v1/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(input, false)),
    });
    if (!response.ok) {
      throw new Error(`Anthropic Chat 接口失败：${response.status} ${await response.text()}`);
    }
    const data = await response.json();
    const blocks: Array<{ type?: string; text?: string }> = Array.isArray(data.content) ? data.content : [];
    const text = blocks
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n");
    return { text };
  }

  /**
   * 流式生成（Anthropic SSE 协议）。
   *
   * 协议要点（anthropic-version: 2023-06-01，MiniMax /anthropic 端点同构）：
   *   event: content_block_delta
   *   data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"…"}}
   * 收到 message_stop 帧结束。错误以 event: error 携带。
   *
   * 与 generateAnswer 等价：返回完整 text；每个 text_delta 经 onToken 即时外发。
   */
  async streamAnswer(input: GenerateAnswerInput, onToken: OnAnswerToken): Promise<GenerateAnswerResult> {
    const apiKey = this.cfg.chatApiKey;
    if (!apiKey) {
      throw new Error("缺少 CHAT_API_KEY（Anthropic 格式 provider 需要的鉴权密钥）。");
    }
    const url = `${this.cfg.chatBaseUrl.replace(/\/$/, "")}/v1/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(input, true)),
    });
    if (!response.ok || !response.body) {
      throw new Error(`Anthropic Chat 流式接口失败：${response.status} ${await response.text()}`);
    }
    const text = await consumeAnthropicSse(response.body, onToken);
    return { text };
  }

  /**
   * 通用文本生成（非三贤）：用于对话摘要等内部任务。
   * 与 generateAnswer 同端点同鉴权，但 system/messages 用传入文本，不绑人设。
   * max_tokens 默认 512（摘要输出短）；失败抛错，由调用方回退规则压缩。
   */
  async summarize(input: SummarizeInput): Promise<SummarizeResult> {
    const url = `${this.cfg.chatBaseUrl.replace(/\/$/, "")}/v1/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.cfg.chatModel,
        max_tokens: input.maxTokens ?? 512,
        stream: false,
        system: input.systemPrompt,
        messages: [{ role: "user", content: input.userPrompt }],
      }),
    });
    if (!response.ok) {
      throw new Error(`Anthropic 摘要接口失败：${response.status} ${await response.text()}`);
    }
    const data = await response.json();
    const blocks: Array<{ type?: string; text?: string }> = Array.isArray(data.content) ? data.content : [];
    const text = blocks
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n");
    return { text };
  }
}

export function getAnthropicProvider(override?: ConfigOverride | null) {
  return new AnthropicProvider(override ?? null);
}

// ── SSE 解析 ──────────────────────────────────────────────────────────────
// 独立、可测：逐块读取字节流，按 \n\n 分帧，解析 event:/data: 行。

type SseEvent = { event: string; data: string };

/**
 * 把一段已切好的 SSE 帧（不含结尾的 \n\n 分隔）解析为 { event, data }。
 * event 行缺省时按 Anthropic 约定由 data.type 推断（兼容部分端点只发 data 的情形）。
 */
function parseSseFrame(frame: string): SseEvent | null {
  let event = "";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  const data = dataLines.join("\n");
  if (!data) return null;
  return { event: event || dataJsonType(data), data };
}

/** 某些端点省略 event: 行，从 data.type 退化推断事件名。 */
function dataJsonType(data: string): string {
  try {
    const parsed = JSON.parse(data) as { type?: string };
    return parsed.type ?? "message";
  } catch {
    return "message";
  }
}

/**
 * 消费 Anthropic /messages 流式响应体：
 * - text_delta 增量 → 调 onDelta(text)，累加到返回值；
 * - message_stop / reader done → 结束；
 * - error 帧 → 抛出（含服务端 message）；
 * - 其余事件（ping / message_start / content_block_start 等）忽略。
 *
 * 跨块边界安全：buffer 缓存未成帧的尾部，下次拼接。
 */
export async function consumeAnthropicSse(
  body: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let full = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      // SSE 帧以空行（\n\n）分隔；逐帧处理完整帧，尾部留 buffer。
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const parsed = parseSseFrame(frame);
        if (!parsed) continue;
        if (parsed.event === "error") {
          throw new Error(parseSseError(parsed.data));
        }
        if (parsed.event === "message_stop") {
          return full;
        }
        if (parsed.event === "content_block_delta") {
          const text = extractTextDelta(parsed.data);
          if (text) {
            full += text;
            onDelta(text);
          }
        }
      }
    }
    // 流自然结束（未显式 message_stop，少数兼容端点会这样）。
    return full;
  } finally {
    reader.releaseLock();
  }
}

function extractTextDelta(data: string): string | null {
  try {
    const parsed = JSON.parse(data) as {
      type?: string;
      delta?: { type?: string; text?: string };
    };
    if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
      return typeof parsed.delta.text === "string" ? parsed.delta.text : null;
    }
    return null;
  } catch {
    return null;
  }
}

function parseSseError(data: string): string {
  try {
    const parsed = JSON.parse(data) as { error?: { message?: string }; message?: string };
    return parsed.error?.message ?? parsed.message ?? "Anthropic 流式接口返回错误";
  } catch {
    return "Anthropic 流式接口返回错误";
  }
}
