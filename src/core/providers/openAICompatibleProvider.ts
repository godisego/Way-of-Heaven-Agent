import { mergeConfig, type ConfigOverride } from "@/core/config/appConfig";
import type { EmbedTextsInput, EmbedTextsResult, EmbeddingProvider, GenerateAnswerInput, GenerateAnswerResult, LlmProvider, OnAnswerToken } from "./llmProvider";
import { AnthropicProvider } from "./anthropicProvider";
import { OpenAIChatProvider } from "./openAIChatProvider";
import { MockEmbeddingProvider } from "./mockEmbeddingProvider";

// 组合 provider：embedding 默认走 OpenAI 兼容接口，但当 .env 里设置了 USE_MOCK_EMBEDDING=1 时
// 切到本地 mockEmbeddingProvider（完全不打外网）。聊天按 chatProtocol 委托给 Anthropic 或 OpenAI。
export class OpenAICompatibleProvider implements EmbeddingProvider, LlmProvider {
  private override: ConfigOverride | null;
  private anthropic: AnthropicProvider;
  private openaiChat: OpenAIChatProvider;
  private mockEmbedding = new MockEmbeddingProvider();

  constructor(override: ConfigOverride | null = null) {
    this.override = override;
    // 在构造器内初始化，确保 override 已赋值后传给各 provider
    this.anthropic = new AnthropicProvider(this.override);
    this.openaiChat = new OpenAIChatProvider(this.override);
  }
  private get cfg() {
    return mergeConfig(this.override);
  }
  // 聊天按协议选 provider（anthropic / openai）
  private get chatProvider(): LlmProvider {
    return this.cfg.chatProtocol === "anthropic" ? this.anthropic : this.openaiChat;
  }

  private headers() {
    const apiKey = this.cfg.openAICompatApiKey;
    if (!apiKey) {
      throw new Error("缺少 OPENAI_COMPAT_API_KEY。请配置 embedding 链路的密钥。");
    }
    return {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    };
  }

  /** 是否用本地 mock embedding：显式开 USE_MOCK_EMBEDDING=1，或没配真实 key 时自动回退。
   *  这样不配嵌入也能对谈（用 mock 检索），符合「不配 Key 也能跑大半」的承诺。 */
  private useMockEmbedding(): boolean {
    if (process.env.USE_MOCK_EMBEDDING === "1") return true;
    // 既无 env key、前端也没传嵌入配置 → 回退 mock，避免检索直接崩
    return !this.cfg.openAICompatApiKey;
  }

  async embedTexts(input: EmbedTextsInput): Promise<EmbedTextsResult> {
    if (this.useMockEmbedding()) {
      return this.mockEmbedding.embedTexts(input);
    }
    const response = await fetch(`${this.cfg.openAICompatBaseUrl.replace(/\/$/, "")}/embeddings`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model: this.cfg.embeddingModel, input: input.texts }),
    });
    if (!response.ok) throw new Error(`Embedding 接口失败：${response.status} ${await response.text()}`);
    const data = await response.json();
    return {
      model: this.cfg.embeddingModel,
      embeddings: data.data.map((item: { embedding: number[] }) => item.embedding),
    };
  }

  async generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult> {
    return this.chatProvider.generateAnswer(input);
  }

  // 流式：按协议委托（OpenAI 与 Anthropic 都实现了 streamAnswer）
  async streamAnswer(input: GenerateAnswerInput, onToken: OnAnswerToken): Promise<GenerateAnswerResult> {
    if (typeof this.chatProvider.streamAnswer === "function") {
      return this.chatProvider.streamAnswer(input, onToken);
    }
    return this.chatProvider.generateAnswer(input);
  }
}

export function getDefaultProvider(override?: ConfigOverride | null) {
  return new OpenAICompatibleProvider(override ?? null);
}
