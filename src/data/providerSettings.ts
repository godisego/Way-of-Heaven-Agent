/**
 * 供应商配置（前端面板填写，由服务端持久化）。
 *
 * 设计：
 * - 聊天与嵌入是两套独立供应商（用户可能聊天用 MiniMax、嵌入用 OpenAI）。
 * - provider 是预设 id（见 providerPresets.ts），baseUrl 预填但可改。
 * - apiKey 由服务端存入本机私有配置文件；读取接口只返回 hasApiKey，不回传密钥。
 * - model 由「拉取模型」从供应商 /models 填充；拉取失败可手填。
 *
 * 类型与 store 分离：本文件只放类型与守卫（前后端共用），
 * 浏览器 API 客户端见 providerSettingsStore.ts，服务端文件读写见 core/config/providerSettingsFile.ts。
 */

/** 单个供应商配置（聊天或嵌入通用形状） */
export type ProviderConfig = {
  /** 预设 id（见 providerPresets.ts），"custom" 表示自定义 */
  provider: string;
  /** API Base URL（选预设时自动填，可手改） */
  baseUrl: string;
  /** API Key。服务端读取配置时会脱敏为空字符串。 */
  apiKey: string;
  /** 脱敏读取时表示服务端已有密钥；不会写入服务器配置文件。 */
  hasApiKey?: boolean;
  /** 模型名（拉取或手填） */
  model: string;
  /** 聊天协议：anthropic（/v1/messages）或 openai（/chat/completions）。仅聊天栏用，嵌入恒为 openai */
  protocol: "anthropic" | "openai";
};

/** 完整供应商设置：聊天 + 嵌入 + 时间戳。
 *  unified=true 时嵌入复用聊天配置（只填一次）。 */
export type ProviderSettings = {
  chat: ProviderConfig;
  embedding: ProviderConfig;
  /** 嵌入是否与聊天同一供应商（true=只填一次聊天，嵌入自动复用） */
  unified: boolean;
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
  unified: true,
  updatedAt: "",
};

/** 某一项供应商配置是否填写完整（baseUrl + apiKey + model 齐全） */
export function isProviderConfigComplete(c: ProviderConfig | null | undefined): c is ProviderConfig {
  return Boolean(c && c.baseUrl.trim() && (c.apiKey.trim() || c.hasApiKey) && c.model.trim());
}
