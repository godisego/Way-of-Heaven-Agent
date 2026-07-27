import { getAppConfig } from "@/core/config/appConfig";
import type { EmbedTextsInput, EmbedTextsResult, EmbeddingProvider, GenerateAnswerInput, GenerateAnswerResult, LlmProvider } from "./llmProvider";
import { AnthropicProvider } from "./anthropicProvider";
import { MockEmbeddingProvider } from "./mockEmbeddingProvider";

// 组合 provider：embedding 默认走 OpenAI 兼容接口，但当 .env 里设置了 USE_MOCK_EMBEDDING=1 时
// 切到本地 mockEmbeddingProvider（完全不打外网）。聊天统一转交给 AnthropicProvider。
// 这保留了 `getDefaultProvider()` 这一历史唯一入口，调用方（retrieveContext、answerWithCitations、indexChunks）一行不用动。
export class OpenAICompatibleProvider implements EmbeddingProvider, LlmProvider {
  private config = getAppConfig();
  private anthropic = new AnthropicProvider();
  private mockEmbedding = new MockEmbeddingProvider();

  private headers() {
    if (!this.config.openAICompatApiKey) {
      throw new Error("缺少 OPENAI_COMPAT_API_KEY。请配置 embedding 链路的密钥。");
    }
    return {
      "content-type": "application/json",
      authorization: `Bearer ${this.config.openAICompatApiKey}`,
    };
  }

  private useMockEmbedding(): boolean {
    return process.env.USE_MOCK_EMBEDDING === "1";
  }

  async embedTexts(input: EmbedTextsInput): Promise<EmbedTextsResult> {
    if (this.useMockEmbedding()) {
      return this.mockEmbedding.embedTexts(input);
    }
    const response = await fetch(`${this.config.openAICompatBaseUrl.replace(/\/$/, "")}/embeddings`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model: this.config.embeddingModel, input: input.texts }),
    });
    if (!response.ok) throw new Error(`Embedding 接口失败：${response.status} ${await response.text()}`);
    const data = await response.json();
    return {
      model: this.config.embeddingModel,
      embeddings: data.data.map((item: { embedding: number[] }) => item.embedding),
    };
  }

  async generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult> {
    return this.anthropic.generateAnswer(input);
  }
}

export function getDefaultProvider() {
  return new OpenAICompatibleProvider();
}
