/**
 * 供应商配置（前端面板填写，存 localStorage，随请求体传服务端）。
 *
 * 设计：
 * - 聊天与嵌入是两套独立供应商（用户可能聊天用 MiniMax、嵌入用 OpenAI）。
 * - provider 是预设 id（见 providerPresets.ts），baseUrl 预填但可改。
 * - apiKey 走 localStorage，仅在请求体里传给本机服务端，不落盘 data/、不上云。
 * - model 由「拉取模型」从供应商 /models 填充；拉取失败可手填。
 *
 * 类型与 store 分离：本文件只放类型与守卫（前后端共用），
 * localStorage 读写见 providerSettingsStore.ts。
 */

/** 单个供应商配置（聊天或嵌入通用形状） */
export type ProviderConfig = {
  /** 预设 id（见 providerPresets.ts），"custom" 表示自定义 */
  provider: string;
  /** API Base URL（选预设时自动填，可手改） */
  baseUrl: string;
  /** API Key（存 localStorage，仅传本机服务端） */
  apiKey: string;
  /** 模型名（拉取或手填） */
  model: string;
  /** 聊天协议：anthropic（/v1/messages）或 openai（/chat/completions）。仅聊天栏用，嵌入恒为 openai */
  protocol: "anthropic" | "openai";
};

/** 完整供应商设置：聊天 + 嵌入 + 时间戳 */
export type ProviderSettings = {
  chat: ProviderConfig;
  embedding: ProviderConfig;
  updatedAt: string;
};

export const EMPTY_PROVIDER_CONFIG: ProviderConfig = {
  provider: "custom",
  baseUrl: "",
  apiKey: "",
  model: "",
  protocol: "openai",
};

export const EMPTY_SETTINGS: ProviderSettings = {
  chat: { ...EMPTY_PROVIDER_CONFIG },
  embedding: { ...EMPTY_PROVIDER_CONFIG },
  updatedAt: "",
};

/** 某一项供应商配置是否填写完整（baseUrl + apiKey + model 齐全） */
export function isProviderConfigComplete(c: ProviderConfig | null | undefined): c is ProviderConfig {
  return Boolean(c && c.baseUrl.trim() && c.apiKey.trim() && c.model.trim());
}
