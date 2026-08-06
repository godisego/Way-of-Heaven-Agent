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
      console.warn("[embedding] 网络失败，回退 mock：", e instanceof Error ? e.message : e);
      return this.mockEmbedding.embedTexts(input);
    }
    // 401/403（无权限，如 MiniMax Coding Plan 不含嵌入）→ 回退 mock，不阻塞聊天
    if ([401, 403, 404, 500].includes(response.status)) {
      console.warn(`[embedding] 鉴权失败（${response.status}），回退 mock。可能是套餐不含嵌入权限。`);
      return this.mockEmbedding.embedTexts(input);
    }
    if (!response.ok) throw new Error(`Embedding 接口失败：${response.status} ${await response.text()}`);
    const data = await response.json();
    // 供应商返回错误（如 MiniMax 的 {base_resp:{status_msg}} 或 智谱 code:2013 invalid params）也要识别
    // 这些"200 但 body 是错误"的情况同样回退 mock，不阻塞聊天
    const errMsg = extractEmbeddingError(data);
    if (errMsg) {
      console.warn(`[embedding] 供应商返回错误（${errMsg}），回退 mock。`);
      return this.mockEmbedding.embedTexts(input);
    }
    const embeddings = extractEmbeddings(data);
    if (!embeddings.length) {
      console.warn("[embedding] 返回格式无法识别，回退 mock。");
      return this.mockEmbedding.embedTexts(input);
    }
    return {
      model: this.cfg.embeddingModel,
      embeddings,
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
