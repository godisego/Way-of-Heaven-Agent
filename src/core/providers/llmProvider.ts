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

export interface EmbeddingProvider {
  embedTexts(input: EmbedTextsInput): Promise<EmbedTextsResult>;
}

export interface LlmProvider {
  generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult>;
}
