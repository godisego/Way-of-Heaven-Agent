import { getAppConfig } from "@/core/config/appConfig";
import { buildMentorSystemPrompt, buildMentorUserPrompt } from "@/data/mentors";
import type { GenerateAnswerInput, GenerateAnswerResult, LlmProvider } from "./llmProvider";

// Anthropic /messages 格式的 provider。
// 人设与对谈规则统一来自 src/data/mentors.ts，避免与 UI 漂移。
export class AnthropicProvider implements LlmProvider {
  private config = getAppConfig();

  private headers() {
    if (!this.config.chatApiKey) {
      throw new Error("缺少 CHAT_API_KEY（Anthropic 格式 provider 需要的鉴权密钥）。");
    }
    return {
      "content-type": "application/json",
      "x-api-key": this.config.chatApiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  async generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult> {
    const url = `${this.config.chatBaseUrl.replace(/\/$/, "")}/v1/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.config.chatModel,
        max_tokens: 4096,
        system: buildMentorSystemPrompt(input.userProfile ?? null),
        messages: [
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
      }),
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
}

export function getAnthropicProvider() {
  return new AnthropicProvider();
}
