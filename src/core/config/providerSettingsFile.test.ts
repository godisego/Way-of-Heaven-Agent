import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ProviderSettings } from "@/data/providerSettings";
import {
  getPersistedProviderConfigOverride,
  readProviderSettings,
  redactProviderSettings,
  writeProviderSettings,
} from "./providerSettingsFile";

const settingsFixture = (): ProviderSettings => ({
  chat: {
    provider: "minimax",
    baseUrl: "https://chat.example/anthropic",
    apiKey: "chat-secret",
    model: "MiniMax-M3",
    protocol: "anthropic",
  },
  embedding: {
    provider: "zhipu",
    baseUrl: "https://embed.example/v1",
    apiKey: "embedding-secret",
    model: "embedding-3",
    protocol: "openai",
  },
  unified: false,
  updatedAt: "",
});

describe("providerSettingsFile", () => {
  let tempDir = "";

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "provider-settings-test-"));
    process.env.PROVIDER_SETTINGS_PATH = path.join(tempDir, "provider-settings.json");
  });

  afterEach(() => {
    delete process.env.PROVIDER_SETTINGS_PATH;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("原子写入私有文件并映射为 AppConfig override", () => {
    writeProviderSettings(settingsFixture());

    const stored = readProviderSettings();
    expect(stored?.chat.apiKey).toBe("chat-secret");
    expect(stored?.embedding.apiKey).toBe("embedding-secret");
    expect(fs.statSync(process.env.PROVIDER_SETTINGS_PATH!).mode & 0o777).toBe(0o600);
    expect(getPersistedProviderConfigOverride()).toMatchObject({
      chatApiKey: "chat-secret",
      chatModel: "MiniMax-M3",
      openAICompatApiKey: "embedding-secret",
      embeddingModel: "embedding-3",
    });
  });

  it("读取给浏览器的配置时只返回密钥存在标记", () => {
    const redacted = redactProviderSettings(writeProviderSettings(settingsFixture()));

    expect(redacted.chat.apiKey).toBe("");
    expect(redacted.chat.hasApiKey).toBe(true);
    expect(redacted.embedding.apiKey).toBe("");
    expect(redacted.embedding.hasApiKey).toBe(true);
  });

  it("保存脱敏表单时保留同一供应商的原密钥", () => {
    const original = writeProviderSettings(settingsFixture());
    const redacted = redactProviderSettings(original);
    redacted.chat.model = "MiniMax-M3-new";

    writeProviderSettings(redacted);

    expect(readProviderSettings()?.chat).toMatchObject({
      apiKey: "chat-secret",
      model: "MiniMax-M3-new",
    });
  });

  it("更换供应商时不复用旧供应商密钥", () => {
    const original = writeProviderSettings(settingsFixture());
    const redacted = redactProviderSettings(original);
    redacted.chat.provider = "openai-chat";

    writeProviderSettings(redacted);

    expect(readProviderSettings()?.chat.apiKey).toBe("");
    expect(getPersistedProviderConfigOverride().chatApiKey).toBeUndefined();
  });
});
