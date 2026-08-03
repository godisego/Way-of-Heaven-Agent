export type EmbedTextsInput = {
  texts: string[];
};

export type EmbedTextsResult = {
  model: string;
  embeddings: number[][];
};

export type GenerateAnswerInput = {
  question: string;
  context: string;
  /** 问者档（来自 localStorage / 未来云端）。三贤 agent 据此带出命理 / 人生背景。 */
  userProfile?: import("@/data/userProfile").UserProfile | null;
  /** 当前会话此前的可见对谈，仅用于承接上下文，不作为典籍证据。 */
  conversationContext?: string;
};

export type GenerateAnswerResult = {
  text: string;
};

/**
 * 流式生成的输入：与 GenerateAnswerInput 同构。
 * 沿用既有 input 形状，避免流式与非流式两套字段漂移。
 */
export type StreamAnswerInput = GenerateAnswerInput;

/**
 * 每个文本增量（token / 片段）经此回调即时外发。
 * 调用方据此把 delta 推给 SSE 或 UI；provider 仍负责拼出完整 text 返回。
 */
export type OnAnswerToken = (delta: string) => void;

export interface EmbeddingProvider {
  embedTexts(input: EmbedTextsInput): Promise<EmbedTextsResult>;
}

export interface LlmProvider {
  generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult>;
  /**
   * 流式生成（SSE）：每个文本增量经 onToken 即时外发，返回值仍是完整 text。
   * 设为可选——mock / 测试 provider 不必实现，调用方按能力探测后回退到 generateAnswer。
   */
  streamAnswer?(input: StreamAnswerInput, onToken: OnAnswerToken): Promise<GenerateAnswerResult>;
}
