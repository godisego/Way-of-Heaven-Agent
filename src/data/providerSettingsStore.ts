/**
 * 供应商设置 localStorage 实现（复刻 userProfileStore 的模式）。
 *
 * 密钥只存本机 localStorage，随请求体传给本机服务端，不落盘 data/、不上云。
 * 留了切云端的钩子：将来要接 Supabase 加密存储，换掉 defaultApi 导出即可。
 */

import type { ProviderSettings } from "@/data/providerSettings";
import { EMPTY_SETTINGS } from "@/data/providerSettings";

const STORAGE_KEY = "way-of-heaven-agent:provider-settings:v1";

export interface ProviderSettingsApi {
  load(): Promise<ProviderSettings>;
  save(settings: ProviderSettings): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageProviderSettingsApi implements ProviderSettingsApi {
  async load(): Promise<ProviderSettings> {
    if (typeof window === "undefined") return { ...EMPTY_SETTINGS };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...EMPTY_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<ProviderSettings>;
      if (!parsed || typeof parsed !== "object") return { ...EMPTY_SETTINGS };
      // 防御：补齐可能缺失的 chat/embedding 子对象与 protocol 字段（旧数据兼容）
      const chat = { ...EMPTY_SETTINGS.chat, ...parsed.chat };
      const embedding = { ...EMPTY_SETTINGS.embedding, ...parsed.embedding };
      if (!chat.protocol) chat.protocol = chat.baseUrl.includes("/anthropic") ? "anthropic" : "openai";
      if (!embedding.protocol) embedding.protocol = "openai";
      return { chat, embedding, updatedAt: parsed.updatedAt ?? "" };
    } catch {
      return { ...EMPTY_SETTINGS };
    }
  }

  async save(settings: ProviderSettings): Promise<void> {
    if (typeof window === "undefined") return;
    const stamped: ProviderSettings = { ...settings, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

/** 当前默认 API（localStorage）。将来上云时换掉这一行即可。 */
export const providerSettingsApi: ProviderSettingsApi = new LocalStorageProviderSettingsApi();
