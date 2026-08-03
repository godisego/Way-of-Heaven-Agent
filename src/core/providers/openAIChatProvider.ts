import { mergeConfig, type ConfigOverride } from "@/core/config/appConfig";
import { buildMentorSystemPrompt, buildMentorUserPrompt } from "@/data/mentors";
import type {
  GenerateAnswerInput,
  GenerateAnswerResult,
  LlmProvider,
  OnAnswerToken,
} from "./llmProvider";

/**
 * OpenAI 兼容 /chat/completions 的聊天 provider。
 *
 * 与 AnthropicProvider 并列：根据供应商预设的 chatProtocol 选择其一。
 * 协议差异：
 * - 端点 /chat/completions（非 /v1/messages）
 * - system 放进 messages[0]（非顶层 system 字段）
 * - 鉴权 Authorization: Bearer（非 x-api-key）
 * - 响应 choices[0].message.content（字符串，非 content blocks）
 * - 流式 choices[0].delta.content + [DONE] 哨兵（非 content_block_delta）
 */
export class OpenAIChatProvider implements LlmProvider {
  constructor(private override: ConfigOverride | null = null) {}
  private get cfg() {
    return mergeConfig(this.override);
  }

  private headers(): Record<string, string> {
    const apiKey = this.cfg.chatApiKey;
    if (!apiKey) {
      throw new Error("缺少 CHAT_API_KEY（OpenAI 兼容 provider 需要的鉴权密钥）。");
    }
    return { "content-type": "application/json", authorization: `Bearer ${apiKey}` };
  }

  /** /chat/completions 请求体（非流式与流式共用，仅 stream 字段不同） */
  private buildBody(input: GenerateAnswerInput, stream: boolean) {
    return {
      model: this.cfg.chatModel,
      max_tokens: 4096,
      stream,
      messages: [
        { role: "system", content: buildMentorSystemPrompt(input.userProfile ?? null) },
        {
          role: "user",
          content: buildMentorUserPrompt(
            input.question,
            input.context,
            input.userProfile ?? null,
            input.conversationContext,
          ),
        },
      ],
    };
  }

  async generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult> {
    const url = `${this.cfg.chatBaseUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(input, false)),
    });
    if (!response.ok) {
      throw new Error(`OpenAI Chat 接口失败：${response.status} ${await response.text()}`);
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    return { text };
  }

  /**
   * 流式生成（OpenAI SSE 协议）。
   * 帧格式：data: {"choices":[{"delta":{"content":"…"}}]}\n\n，末尾 data: [DONE]
   */
  async streamAnswer(input: GenerateAnswerInput, onToken: OnAnswerToken): Promise<GenerateAnswerResult> {
    const url = `${this.cfg.chatBaseUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(input, true)),
    });
    if (!response.ok || !response.body) {
      throw new Error(`OpenAI Chat 流式接口失败：${response.status} ${await response.text()}`);
    }
    const text = await consumeOpenAiSse(response.body, onToken);
    return { text };
  }
}

export function getOpenAIChatProvider(override?: ConfigOverride | null) {
  return new OpenAIChatProvider(override ?? null);
}

// ── OpenAI SSE 解析 ──────────────────────────────────────────────────────
// 与 consumeAnthropicSse 对称：按 \n\n 分帧，解析 data: 行的 JSON。

/**
 * 消费 OpenAI /chat/completions 流式响应体：
 * - choices[0].delta.content → 调 onDelta，累加返回值；
 * - [DONE] 哨兵 / reader done → 结束。
 * 跨块边界安全：buffer 缓存未成帧的尾部。
 */
export async function consumeOpenAiSse(
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
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const delta = extractDelta(frame);
        if (delta === "[DONE]") return full;
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      }
    }
    return full;
  } finally {
    reader.releaseLock();
  }
}

/** 解析一帧：取 data: 行；[DONE] 哨兵返回 "[DONE]"；否则提取 choices[0].delta.content。 */
function extractDelta(frame: string): string | null {
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return null;
  const data = dataLines.join("\n").trim();
  if (data === "[DONE]") return "[DONE]";
  try {
    const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
    const content = parsed.choices?.[0]?.delta?.content;
    return typeof content === "string" ? content : null;
  } catch {
    return null;
  }
}
