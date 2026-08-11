import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  EMPTY_SETTINGS,
  type ProviderConfig,
  type ProviderSettings,
} from "@/data/providerSettings";
import { parseSettingsOverride } from "./settingsMapping";
import type { ConfigOverride } from "./appConfig";

const providerConfigSchema = z.object({
  provider: z.string().trim().min(1).max(128),
  baseUrl: z.string().trim().max(2048),
  apiKey: z.string().max(8192),
  hasApiKey: z.boolean().optional(),
  model: z.string().trim().max(512),
  protocol: z.enum(["anthropic", "openai"]),
});

const providerSettingsSchema = z.object({
  chat: providerConfigSchema,
  embedding: providerConfigSchema,
  unified: z.boolean(),
  updatedAt: z.string().optional(),
});

export function getProviderSettingsPath(): string {
  if (process.env.PROVIDER_SETTINGS_PATH?.trim()) {
    return path.resolve(process.env.PROVIDER_SETTINGS_PATH.trim());
  }
  const dataDir = path.resolve(process.env.DATA_DIR ?? "./data");
  return path.join(dataDir, "provider-settings.json");
}

/** 读取服务端配置。文件不存在或内容无效时返回 null，让调用方回退环境变量。 */
export function readProviderSettings(): ProviderSettings | null {
  const settingsPath = getProviderSettingsPath();
  if (!fs.existsSync(settingsPath)) return null;
  try {
    const parsedJson: unknown = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    const parsed = providerSettingsSchema.safeParse(parsedJson);
    if (!parsed.success) {
      console.warn(`[provider-settings] 配置文件格式无效，已忽略：${settingsPath}`);
      return null;
    }
    return normalizeSettings(parsed.data);
  } catch (error) {
    console.warn(
      `[provider-settings] 无法读取配置文件，已回退环境变量：${error instanceof Error ? error.message : error}`,
    );
    return null;
  }
}

/** 供 getAppConfig 使用：服务器文件中的完整项覆盖 env，不完整项不参与覆盖。 */
export function getPersistedProviderConfigOverride(): ConfigOverride {
  const settings = readProviderSettings();
  return settings ? parseSettingsOverride(settings) : {};
}

export function hasPersistedEmbeddingConfig(): boolean {
  const override = getPersistedProviderConfigOverride();
  return Boolean(
    override.openAICompatBaseUrl &&
      override.openAICompatApiKey &&
      override.embeddingModel,
  );
}

/**
 * 校验并原子写入配置。脱敏页面提交空 key 且 hasApiKey=true 时保留原密钥；
 * 用户换供应商或显式清空 key 时不会错误复用旧供应商密钥。
 */
export function writeProviderSettings(raw: unknown): ProviderSettings {
  const parsed = providerSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`供应商配置格式无效：${parsed.error.issues[0]?.message ?? "未知错误"}`);
  }

  const previous = readProviderSettings();
  const settings = normalizeSettings({
    ...parsed.data,
    chat: restoreRedactedKey(parsed.data.chat, previous?.chat),
    embedding: restoreRedactedKey(parsed.data.embedding, previous?.embedding),
    updatedAt: new Date().toISOString(),
  });
  const settingsPath = getProviderSettingsPath();
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  const tempPath = `${settingsPath}.tmp-${process.pid}-${randomUUID()}`;
  try {
    fs.writeFileSync(tempPath, `${JSON.stringify(settings, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    fs.renameSync(tempPath, settingsPath);
    fs.chmodSync(settingsPath, 0o600);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
  return settings;
}

export function deleteProviderSettings(): void {
  const settingsPath = getProviderSettingsPath();
  if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath);
}

/** 返回可展示给浏览器的副本，不包含任何密钥值。 */
export function redactProviderSettings(settings: ProviderSettings | null): ProviderSettings {
  if (!settings) return cloneEmptySettings();
  return {
    ...settings,
    chat: redactConfig(settings.chat),
    embedding: redactConfig(settings.embedding),
  };
}

function normalizeSettings(input: z.infer<typeof providerSettingsSchema>): ProviderSettings {
  return {
    chat: normalizeConfig(input.chat),
    embedding: normalizeConfig(input.embedding),
    unified: input.unified,
    updatedAt: input.updatedAt ?? "",
  };
}

function normalizeConfig(input: z.infer<typeof providerConfigSchema>): ProviderConfig {
  return {
    provider: input.provider.trim(),
    baseUrl: input.baseUrl.trim(),
    apiKey: input.apiKey.trim(),
    model: input.model.trim(),
    protocol: input.protocol,
  };
}

function restoreRedactedKey(
  incoming: z.infer<typeof providerConfigSchema>,
  previous?: ProviderConfig,
): z.infer<typeof providerConfigSchema> {
  if (incoming.apiKey.trim()) return incoming;
  if (incoming.hasApiKey && previous?.apiKey && incoming.provider === previous.provider) {
    return { ...incoming, apiKey: previous.apiKey };
  }
  return { ...incoming, apiKey: "" };
}

function redactConfig(config: ProviderConfig): ProviderConfig {
  return { ...config, apiKey: "", hasApiKey: Boolean(config.apiKey) };
}

function cloneEmptySettings(): ProviderSettings {
  return {
    ...EMPTY_SETTINGS,
    chat: { ...EMPTY_SETTINGS.chat },
    embedding: { ...EMPTY_SETTINGS.embedding },
  };
}
