import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mergeConfig } from "./appConfig";
import { parseSettingsOverride } from "./settingsMapping";

const originalSettingsPath = process.env.PROVIDER_SETTINGS_PATH;
const missingSettingsPath = path.join(os.tmpdir(), `missing-provider-settings-${randomUUID()}.json`);

beforeEach(() => {
  process.env.PROVIDER_SETTINGS_PATH = missingSettingsPath;
});

afterEach(() => {
  if (originalSettingsPath === undefined) delete process.env.PROVIDER_SETTINGS_PATH;
  else process.env.PROVIDER_SETTINGS_PATH = originalSettingsPath;
});

describe("mergeConfig", () => {
  it("无 override 时完全等于 env 配置", () => {
    const base = mergeConfig();
    expect(base.chatModel).toBe(process.env.CHAT_MODEL ?? "MiniMax-M3");
    expect(base.chatApiKey).toBe(process.env.CHAT_API_KEY ?? "");
  });

  it("override 覆盖指定字段，其余保持 env", () => {
    const base = mergeConfig();
    const merged = mergeConfig({ chatApiKey: "key-from-panel", chatModel: "custom-model" });
    expect(merged.chatApiKey).toBe("key-from-panel");
    expect(merged.chatModel).toBe("custom-model");
    // 未覆盖的字段保持不变
    expect(merged.chatBaseUrl).toBe(base.chatBaseUrl);
    expect(merged.dataDir).toBe(base.dataDir);
  });

  it("null override 等价于无 override", () => {
    expect(mergeConfig(null)).toEqual(mergeConfig());
  });
});

describe("parseSettingsOverride", () => {
  beforeEach(() => {
    process.env.CHAT_API_KEY = "";
    process.env.CHAT_MODEL = "MiniMax-M3";
    process.env.OPENAI_COMPAT_API_KEY = "";
  });

  afterEach(() => {
    delete process.env.CHAT_API_KEY;
    delete process.env.CHAT_MODEL;
    delete process.env.OPENAI_COMPAT_API_KEY;
  });

  it("非对象输入返回空覆盖", () => {
    expect(parseSettingsOverride(null)).toEqual({});
    expect(parseSettingsOverride("string")).toEqual({});
    expect(parseSettingsOverride(123)).toEqual({});
    expect(parseSettingsOverride(undefined)).toEqual({});
  });

  it("完整的 chat 配置 → 映射到 chatBaseUrl/Key/Model/Protocol（无 protocol 默认 openai）", () => {
    const override = parseSettingsOverride({
      chat: { provider: "minimax", baseUrl: "https://api.x.com", apiKey: "sk-1", model: "M3" },
    });
    expect(override).toEqual({
      chatBaseUrl: "https://api.x.com",
      chatApiKey: "sk-1",
      chatModel: "M3",
      chatProtocol: "openai",
    });
  });

  it("chat 显式 anthropic 协议 → chatProtocol=anthropic", () => {
    const override = parseSettingsOverride({
      chat: { provider: "minimax", baseUrl: "https://api.x.com/anthropic", apiKey: "sk-1", model: "M3", protocol: "anthropic" },
    });
    expect(override.chatProtocol).toBe("anthropic");
  });

  it("完整的 embedding 配置 → 映射到 openAICompat* 三字段", () => {
    const override = parseSettingsOverride({
      embedding: { provider: "openai-embed", baseUrl: "https://api.o.com/v1", apiKey: "sk-2", model: "text-embedding-3" },
    });
    expect(override).toEqual({
      openAICompatBaseUrl: "https://api.o.com/v1",
      openAICompatApiKey: "sk-2",
      embeddingModel: "text-embedding-3",
    });
  });

  it("部分填写（缺 apiKey）的字段被忽略，保持 env 默认", () => {
    const override = parseSettingsOverride({
      chat: { provider: "minimax", baseUrl: "https://x.com", apiKey: "", model: "M3" },
    });
    expect(override).toEqual({});
  });

  it("chat 与 embedding 同时完整 → 全部 7 字段覆盖（含 chatProtocol）", () => {
    const override = parseSettingsOverride({
      chat: { provider: "a", baseUrl: "https://c", apiKey: "k1", model: "cm", protocol: "openai" },
      embedding: { provider: "b", baseUrl: "https://e", apiKey: "k2", model: "em" },
    });
    expect(Object.keys(override)).toHaveLength(7);
    expect(override.chatApiKey).toBe("k1");
    expect(override.openAICompatApiKey).toBe("k2");
    expect(override.chatProtocol).toBe("openai");
  });

  it("多余字段被 zod 忽略，不报错", () => {
    const override = parseSettingsOverride({
      chat: { provider: "a", baseUrl: "c", apiKey: "k", model: "m" },
      malicious: { exec: "rm -rf /" },
    });
    expect(override.chatApiKey).toBe("k");
    expect((override as Record<string, unknown>).malicious).toBeUndefined();
  });
});
