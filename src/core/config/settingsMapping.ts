/**
 * 把前端传来的 ProviderSettings 校验并转成服务端的 ConfigOverride。
 *
 * 路由层统一调 parseSettingsOverride，避免每个路由重复校验逻辑。
 * 只取「已填完整」的字段覆盖 env；部分填写的字段忽略（保持 env 默认）。
 */
import { z } from "zod";
import type { ConfigOverride } from "./appConfig";
import { isProviderConfigComplete, type ProviderConfig } from "@/data/providerSettings";

const providerConfigSchema = z.object({
  provider: z.string(),
  baseUrl: z.string(),
  apiKey: z.string(),
  model: z.string(),
  protocol: z.enum(["anthropic", "openai"]).optional(),
});

const settingsSchema = z.object({
  chat: providerConfigSchema.optional(),
  embedding: providerConfigSchema.optional(),
  updatedAt: z.string().optional(),
});

/** 未知结构 → 校验 → ConfigOverride（仅保留填完整的字段） */
export function parseSettingsOverride(raw: unknown): ConfigOverride {
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return {};
  const override: ConfigOverride = {};
  const chat = parsed.data.chat as ProviderConfig | undefined;
  if (isProviderConfigComplete(chat)) {
    override.chatBaseUrl = chat.baseUrl;
    override.chatApiKey = chat.apiKey;
    override.chatModel = chat.model;
    // 聊天协议：来自前端，未填默认 openai
    override.chatProtocol = chat.protocol === "anthropic" ? "anthropic" : "openai";
  }
  const embedding = parsed.data.embedding as ProviderConfig | undefined;
  if (isProviderConfigComplete(embedding)) {
    override.openAICompatBaseUrl = embedding.baseUrl;
    override.openAICompatApiKey = embedding.apiKey;
    override.embeddingModel = embedding.model;
  }
  return override;
}
