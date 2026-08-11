/**
 * 供应商设置客户端：通过同源 API 读写服务器配置文件。
 *
 * 首次升级时，如果服务器尚无配置而浏览器有旧版 localStorage 配置，
 * 会自动迁移一次并删除旧副本，避免密钥继续散落在浏览器存储中。
 */
import type { ProviderSettings } from "@/data/providerSettings";
import { EMPTY_SETTINGS } from "@/data/providerSettings";

const LEGACY_STORAGE_KEY = "way-of-heaven-agent:provider-settings:v1";

type SettingsResponse = {
  settings?: ProviderSettings;
  exists?: boolean;
  error?: string;
};

export interface ProviderSettingsApi {
  load(): Promise<ProviderSettings>;
  save(settings: ProviderSettings): Promise<ProviderSettings>;
  clear(): Promise<void>;
}

class ServerProviderSettingsApi implements ProviderSettingsApi {
  async load(): Promise<ProviderSettings> {
    const response = await fetch("/api/settings", { method: "GET", cache: "no-store" });
    const data = (await response.json()) as SettingsResponse;
    if (!response.ok) throw new Error(data.error ?? "读取供应商配置失败");

    const serverSettings = normalize(data.settings);
    if (data.exists || typeof window === "undefined") return serverSettings;

    const legacy = readLegacySettings();
    if (!legacy) return serverSettings;
    const migrated = await this.save(legacy);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return migrated;
  }

  async save(settings: ProviderSettings): Promise<ProviderSettings> {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings }),
    });
    const data = (await response.json()) as SettingsResponse;
    if (!response.ok) throw new Error(data.error ?? "保存供应商配置失败");
    if (typeof window !== "undefined") window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return normalize(data.settings);
  }

  async clear(): Promise<void> {
    const response = await fetch("/api/settings", { method: "DELETE" });
    const data = (await response.json()) as SettingsResponse;
    if (!response.ok) throw new Error(data.error ?? "清除供应商配置失败");
    if (typeof window !== "undefined") window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}

function readLegacySettings(): ProviderSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw) as Partial<ProviderSettings>);
  } catch {
    return null;
  }
}

function normalize(raw?: Partial<ProviderSettings>): ProviderSettings {
  if (!raw || typeof raw !== "object") return cloneEmptySettings();
  const chat = { ...EMPTY_SETTINGS.chat, ...raw.chat };
  const embedding = { ...EMPTY_SETTINGS.embedding, ...raw.embedding };
  if (!chat.protocol) chat.protocol = chat.baseUrl.includes("/anthropic") ? "anthropic" : "openai";
  if (!embedding.protocol) embedding.protocol = "openai";
  return {
    chat,
    embedding,
    unified: raw.unified !== false,
    updatedAt: raw.updatedAt ?? "",
  };
}

function cloneEmptySettings(): ProviderSettings {
  return {
    ...EMPTY_SETTINGS,
    chat: { ...EMPTY_SETTINGS.chat },
    embedding: { ...EMPTY_SETTINGS.embedding },
  };
}

export const providerSettingsApi: ProviderSettingsApi = new ServerProviderSettingsApi();
