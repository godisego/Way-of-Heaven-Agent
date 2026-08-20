import { mergeConfig, type ConfigOverride } from "@/core/config/appConfig";
import { hasPersistedEmbeddingConfig } from "@/core/config/providerSettingsFile";
import type { EmbedTextsInput, EmbedTextsResult, EmbeddingProvider, GenerateAnswerInput, GenerateAnswerResult, LlmProvider, OnAnswerToken, SummarizeInput, SummarizeResult } from "./llmProvider";
import { AnthropicProvider } from "./anthropicProvider";
import { OpenAIChatProvider } from "./openAIChatProvider";
import { MockEmbeddingProvider } from "./mockEmbeddingProvider";

// 组合 provider：embedding 默认走 OpenAI 兼容接口，无 Key 或显式 mock 时回退本地 mock。
// 服务器配置文件或显式 override 配了完整 embedding 时优先用真模型，
// 不被旧 .env 的 USE_MOCK_EMBEDDING 架空。
// 聊天按 chatProtocol 委托给 Anthropic 或 OpenAI。
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

  /** 服务器配置 > env mock 开关；纯 env 场景仍可用 USE_MOCK_EMBEDDING=1 强制 mock。 */
  private useMockEmbedding(): boolean {
    return shouldUseMockEmbedding(this.override);
  }

  async embedTexts(input: EmbedTextsInput): Promise<EmbedTextsResult> {
    if (this.useMockEmbedding()) {
      return this.mockEmbedding.embedTexts(input);
    }
    // 同时发多个字段以兼容各供应商：
    // - input（OpenAI/智谱/通义/Ollama/硅基流动标准）
    // - texts（MiniMax 原生读这个）
    // - type=db（MiniMax 必填，"db"=入库用 / "query"=查询用；其他端点忽略此字段）
    let response: Response;
    try {
      response = await fetch(`${this.cfg.openAICompatBaseUrl.replace(/\/$/, "")}/embeddings`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ model: this.cfg.embeddingModel, input: input.texts, texts: input.texts, type: "db" }),
      });
    } catch (e) {
      // 网络层失败（DNS/连接拒绝）→ 回退 mock，不阻塞聊天
      return this.fallbackToMock(input, `网络失败（${e instanceof Error ? e.message : e}）`);
    }
    // 任何 HTTP 错误统一回退 mock：401/403 鉴权（如套餐不含嵌入）、404 端点、
    // 429 限流/欠费、5xx 网关。设计意图是 embedding 掉链子时不阻塞聊天，
    // 但通过 fellBackToMock 标记把回退暴露给 trace/doctor，避免静默错位。
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const detail = body ? `：${body.slice(0, 200)}` : "";
      return this.fallbackToMock(input, `HTTP ${response.status}${detail}`);
    }
    const data = await response.json();
    // 供应商返回错误（如 MiniMax 的 {base_resp:{status_msg}} 或 智谱 code:2013 invalid params）也要识别
    // 这些"200 但 body 是错误"的情况同样回退 mock，不阻塞聊天
    const errMsg = extractEmbeddingError(data);
    if (errMsg) {
      return this.fallbackToMock(input, `供应商返回错误（${errMsg}）`);
    }
    const embeddings = extractEmbeddings(data);
    if (!embeddings.length) {
      return this.fallbackToMock(input, "返回格式无法识别");
    }
    return {
      model: this.cfg.embeddingModel,
      embeddings,
    };
  }

  /**
   * 统一封装回退 mock：带 fellBackToMock 标记，让 trace 面板 / doctor / health 可见，
   * 而不是无声地把查询切成 256 维 hash 向量（与真实索引维度错位后会全员 0 分）。
   */
  private async fallbackToMock(input: EmbedTextsInput, reason: string): Promise<EmbedTextsResult> {
    console.warn(`[embedding] ${reason}，回退 mock（fellBackToMock=true）。`);
    const mockResult = await this.mockEmbedding.embedTexts(input);
    return { ...mockResult, fellBackToMock: true };
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

  // 通用文本生成（非三贤）：委托给底层 chat provider（如 Anthropic / OpenAI Chat）
  async summarize(input: SummarizeInput): Promise<SummarizeResult> {
    if (typeof this.chatProvider.summarize === "function") {
      return this.chatProvider.summarize(input);
    }
    throw new Error("当前 chat provider 未实现 summarize 接口");
  }
}

export function getDefaultProvider(override?: ConfigOverride | null) {
  return new OpenAICompatibleProvider(override ?? null);
}

export function shouldUseMockEmbedding(override: ConfigOverride | null = null): boolean {
  const cfg = mergeConfig(override);
  const explicitConfig = Boolean(
    override?.openAICompatBaseUrl &&
      override.openAICompatApiKey &&
      override.embeddingModel,
  );
  if (explicitConfig || hasPersistedEmbeddingConfig()) return false;
  if (process.env.USE_MOCK_EMBEDDING === "1") return true;
  return !cfg.openAICompatApiKey;
}

/**
 * 兼容多种 embedding 响应格式：
 * - OpenAI 标准：{data: [{embedding: [...]}]}
 * - 智谱/部分国产：{data: {embedding: [...]}} 或 {embeddings: [[...]]}
 * - MiniMax 原生：{vectors: [[...], ...]}
 * - 单条简写：{embedding: [...]}
 * 无法识别时返回空数组（调用方据此报错）。
 */
function extractEmbeddings(data: unknown): number[][] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;

  // OpenAI 标准：data 是数组，每项有 embedding
  if (Array.isArray(obj.data)) {
    return obj.data
      .map((item: unknown) => (item as { embedding?: number[] })?.embedding)
      .filter((e): e is number[] => Array.isArray(e));
  }
  // data 是对象，含 embedding（单条）
  if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as { embedding?: unknown }).embedding)) {
    return [(obj.data as { embedding: number[] }).embedding];
  }
  // 顶层 embeddings 数组（智谱等）
  if (Array.isArray(obj.embeddings)) {
    return obj.embeddings.filter((e): e is number[] => Array.isArray(e));
  }
  // MiniMax 原生格式：{vectors: [[...], ...]}
  if (Array.isArray(obj.vectors)) {
    return obj.vectors.filter((e): e is number[] => Array.isArray(e));
  }
  // 顶层 embedding（单条简写）
  if (Array.isArray(obj.embedding)) return [obj.embedding];
  return [];
}

/**
 * 识别供应商在 HTTP 200 但业务错误时的报错格式（HTTP 状态正常但 body 含错误）。
 * - MiniMax：{base_resp: {status_code, status_msg}}
 * - 通用：{error: {message}} 或 {message}
 * 无错误返回 null。
 */
function extractEmbeddingError(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const baseResp = obj.base_resp as { status_msg?: string; status_code?: number } | undefined;
  if (baseResp && typeof baseResp.status_msg === "string" && baseResp.status_msg) {
    return `${baseResp.status_msg}（code ${baseResp.status_code ?? "?"}）`;
  }
  const err = obj.error as { message?: string } | undefined;
  if (err && typeof err.message === "string" && err.message) return err.message;
  if (typeof obj.message === "string" && obj.message) return obj.message;
  return null;
}
