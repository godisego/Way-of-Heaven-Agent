/**
 * 供应商预设：内置常见供应商的 baseUrl 与协议风格，减少手填。
 *
 * 协议风格（authStyle）决定 /api/models 与实际请求的鉴权头：
 * - "anthropic"：x-api-key 头；聊天走此风格（Anthropic /messages 兼容）
 * - "openai"：Authorization: Bearer 头；嵌入走此风格（OpenAI /embeddings 兼容）
 *
 * 注意：聊天与嵌入分属不同协议。聊天面板只列聊天预设，嵌入面板只列嵌入预设。
 */

export type ProviderKind = "chat" | "embedding";
export type AuthStyle = "anthropic" | "openai";

export type ProviderPreset = {
  id: string;
  /** 显示名 */
  label: string;
  /** 聊天还是嵌入 */
  kind: ProviderKind;
  /** 默认 Base URL（用户可改） */
  baseUrl: string;
  /** 鉴权头风格 */
  authStyle: AuthStyle;
  /** 该供应商是否提供可拉取的 /models 列表（无则前端回退手填） */
  supportsModelList: boolean;
  /** 预填的常用模型名（用户可改 / 覆盖） */
  defaultModel?: string;
  /** 该供应商配套的 embedding 模型名（unified 模式下嵌入自动用这个）。空=不支持嵌入 */
  embeddingModel?: string;
  /** embedding 的 Base URL（与聊天不同时填，如 MiniMax 聊天走 /anthropic、嵌入走 /v1） */
  embeddingBaseUrl?: string;
  /** 选定该供应商时显示的注意事项（如套餐限制），空=无特殊提醒 */
  note?: string;
};

/**
 * 聊天供应商预设（Anthropic /messages 兼容协议）。
 * 项目默认端点是 MiniMax 的 /anthropic 入口。
 */
export const CHAT_PRESETS: ProviderPreset[] = [
  {
    id: "minimax",
    label: "MiniMax",
    kind: "chat",
    baseUrl: "https://api.minimaxi.com/anthropic",
    authStyle: "anthropic",
    supportsModelList: false,
    defaultModel: "MiniMax-M3",
    embeddingModel: "embo-01",
    embeddingBaseUrl: "https://api.minimaxi.com/v1",
    note: "2026-08 实测：Coding Plan 的 key 可直接调通嵌入（embo-01，1536 维，入库用 type=db / 查询用 type=query）。若你的套餐返回 403/无权限，再考虑开通按量付费或典籍检索另配智谱/Ollama。",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    kind: "chat",
    baseUrl: "https://api.anthropic.com",
    authStyle: "anthropic",
    supportsModelList: true,
    defaultModel: "claude-3-5-sonnet-20241022",
    note: "Anthropic 不提供嵌入接口。典籍检索将用本地 mock，或另配智谱/Ollama。",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "chat",
    baseUrl: "https://api.deepseek.com",
    authStyle: "openai",
    supportsModelList: true,
    defaultModel: "deepseek-chat",
    note: "DeepSeek 暂未开放嵌入接口。典籍检索将用本地 mock，或另配智谱/Ollama。",
  },
  {
    id: "openai-chat",
    label: "OpenAI",
    kind: "chat",
    baseUrl: "https://api.openai.com/v1",
    authStyle: "openai",
    supportsModelList: true,
    defaultModel: "gpt-4o",
    embeddingModel: "text-embedding-3-small",
  },
  {
    id: "dashscope-chat",
    label: "通义千问（DashScope）",
    kind: "chat",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    authStyle: "openai",
    supportsModelList: true,
    defaultModel: "qwen-plus",
    embeddingModel: "text-embedding-v3",
  },
  {
    id: "zhipu-chat",
    label: "智谱（GLM）",
    kind: "chat",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    authStyle: "openai",
    supportsModelList: false,
    defaultModel: "glm-4-plus",
    embeddingModel: "embedding-3",
  },
  {
    id: "moonshot",
    label: "Kimi（Moonshot）",
    kind: "chat",
    baseUrl: "https://api.moonshot.cn/v1",
    authStyle: "openai",
    supportsModelList: true,
    defaultModel: "moonshot-v1-8k",
    note: "Moonshot 暂未开放嵌入接口。典籍检索将用本地 mock，或另配智谱/Ollama。",
  },
  {
    id: "siliconflow",
    label: "硅基流动",
    kind: "chat",
    baseUrl: "https://api.siliconflow.cn/v1",
    authStyle: "openai",
    supportsModelList: true,
    defaultModel: "Qwen/Qwen2.5-7B-Instruct",
    embeddingModel: "BAAI/bge-m3",
  },
  {
    id: "ollama",
    label: "本地 Ollama",
    kind: "chat",
    baseUrl: "http://localhost:11434/v1",
    authStyle: "openai",
    supportsModelList: true,
    defaultModel: "llama3.1",
    embeddingModel: "nomic-embed-text",
  },
  {
    id: "custom-chat",
    label: "自定义",
    kind: "chat",
    baseUrl: "",
    authStyle: "openai",
    supportsModelList: false,
  },
];

/** 嵌入供应商预设（OpenAI /embeddings 兼容协议）。 */
export const EMBEDDING_PRESETS: ProviderPreset[] = [
  {
    id: "openai-embed",
    label: "OpenAI",
    kind: "embedding",
    baseUrl: "https://api.openai.com/v1",
    authStyle: "openai",
    supportsModelList: true,
    defaultModel: "text-embedding-3-large",
  },
  {
    id: "minimax-embed",
    label: "MiniMax",
    kind: "embedding",
    baseUrl: "https://api.minimaxi.com/v1",
    authStyle: "openai",
    supportsModelList: false,
    defaultModel: "embo-01",
    note: "2026-08 实测：Coding Plan key 可直接调通 embo-01（1536 维）。若返回 403/无权限，说明你的套餐类型不含嵌入，需开通按量付费。",
  },
  {
    id: "zhipu",
    label: "智谱",
    kind: "embedding",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    authStyle: "openai",
    supportsModelList: false,
    defaultModel: "embedding-3",
    note: "新用户有免费额度，适合没有嵌入 key 的用户。",
  },
  {
    id: "dashscope",
    label: "通义千问（DashScope）",
    kind: "embedding",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    authStyle: "openai",
    supportsModelList: true,
    defaultModel: "text-embedding-v3",
  },
  {
    id: "siliconflow-embed",
    label: "硅基流动",
    kind: "embedding",
    baseUrl: "https://api.siliconflow.cn/v1",
    authStyle: "openai",
    supportsModelList: true,
    defaultModel: "BAAI/bge-m3",
  },
  {
    id: "ollama-embed",
    label: "本地 Ollama",
    kind: "embedding",
    baseUrl: "http://localhost:11434/v1",
    authStyle: "openai",
    supportsModelList: true,
    defaultModel: "nomic-embed-text",
  },
  {
    id: "custom-embed",
    label: "自定义",
    kind: "embedding",
    baseUrl: "",
    authStyle: "openai",
    supportsModelList: false,
  },
];

export function presetsFor(kind: ProviderKind): ProviderPreset[] {
  return kind === "chat" ? CHAT_PRESETS : EMBEDDING_PRESETS;
}

export function findPreset(kind: ProviderKind, id: string): ProviderPreset | undefined {
  return presetsFor(kind).find((p) => p.id === id);
}
