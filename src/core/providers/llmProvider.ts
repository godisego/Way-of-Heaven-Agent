export type EmbedTextsInput = {
  texts: string[];
};

export type EmbedTextsResult = {
  model: string;
  embeddings: number[][];
  /**
   * 当 embedding 链路掉链子（无 Key、网络失败、鉴权失败、限流、供应商 200 报错等）
   * 而静默回退到本地 mock 时置 true。trace 面板 / doctor / health 据此把回退暴露给用户，
   * 避免"向量空间错位 → 全员 0 分 → 假装没证据"的静默故障。
   */
  fellBackToMock?: boolean;
};

export type GenerateAnswerInput = {
  question: string;
  context: string;
  /** 本轮在席角色；缺省表示三位全到，保持原对谈契约。 */
  mentorIds?: import("@/data/mentors").MentorId[];
  /** 问者档（来自 localStorage / 未来云端）。三贤 agent 据此带出命理 / 人生背景。 */
  userProfile?: import("@/data/userProfile").UserProfile | null;
  /** 当前会话此前的可见对谈，仅用于承接上下文，不作为典籍证据。 */
  conversationContext?: string;
};

export type GenerateAnswerResult = {
  text: string;
};

/**
 * 通用文本生成输入（非三贤）：用于对话摘要等内部任务。
 * 与 GenerateAnswerInput 区别：不绑人设/典籍/问者档，只传 system + user 两段文本。
 * 复用与 generateAnswer 同一套 chat 配置（baseUrl/key/model），但走最朴素的单轮补全。
 */
export type SummarizeInput = {
  systemPrompt: string;
  userPrompt: string;
  /** 生成上限，默认较小（摘要无需长输出）。 */
  maxTokens?: number;
};

export type SummarizeResult = {
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

  /**
   * 通用文本生成（非三贤）：用于对话摘要等内部任务。
   * 设为可选——provider 未实现时调用方应回退到规则压缩。
   */
  summarize?(input: SummarizeInput): Promise<SummarizeResult>;
}
