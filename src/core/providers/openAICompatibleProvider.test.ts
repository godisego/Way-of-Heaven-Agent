import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { OpenAICompatibleProvider } from "./openAICompatibleProvider";
import type { ConfigOverride } from "@/core/config/appConfig";
import { writeProviderSettings } from "@/core/config/providerSettingsFile";

// useMockEmbedding 是 private；通过类型断言访问其布尔结果（运行时 JS 无访问限制）
const callUseMock = (override: ConfigOverride | null): boolean =>
  (new OpenAICompatibleProvider(override) as unknown as { useMockEmbedding: () => boolean }).useMockEmbedding();

describe("OpenAICompatibleProvider.useMockEmbedding 配置优先级", () => {
  const origFlag = process.env.USE_MOCK_EMBEDDING;
  const origKey = process.env.OPENAI_COMPAT_API_KEY;
  const origSettingsPath = process.env.PROVIDER_SETTINGS_PATH;
  let tempDir = "";

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "embedding-config-test-"));
    process.env.PROVIDER_SETTINGS_PATH = path.join(tempDir, "provider-settings.json");
  });

  afterEach(() => {
    if (origFlag === undefined) delete process.env.USE_MOCK_EMBEDDING;
    else process.env.USE_MOCK_EMBEDDING = origFlag;
    if (origKey === undefined) delete process.env.OPENAI_COMPAT_API_KEY;
    else process.env.OPENAI_COMPAT_API_KEY = origKey;
    if (origSettingsPath === undefined) delete process.env.PROVIDER_SETTINGS_PATH;
    else process.env.PROVIDER_SETTINGS_PATH = origSettingsPath;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("显式 override 配了完整 embedding → 用真模型，无视 .env 的 USE_MOCK_EMBEDDING=1", () => {
    process.env.USE_MOCK_EMBEDDING = "1";
    const override: ConfigOverride = {
      openAICompatApiKey: "sk-real-from-frontend",
      openAICompatBaseUrl: "https://api.openai.com/v1",
      embeddingModel: "text-embedding-3-large",
    };
    expect(callUseMock(override)).toBe(false);
  });

  it("服务器配置配了完整 embedding → CLI 也用真模型，无视旧 mock flag", () => {
    process.env.USE_MOCK_EMBEDDING = "1";
    writeProviderSettings({
      chat: { provider: "custom-chat", baseUrl: "", apiKey: "", model: "", protocol: "openai" },
      embedding: {
        provider: "zhipu",
        baseUrl: "https://embed.example/v1",
        apiKey: "server-key",
        model: "embedding-3",
        protocol: "openai",
      },
      unified: false,
      updatedAt: "",
    });

    expect(callUseMock(null)).toBe(false);
  });

  it("无 override + USE_MOCK_EMBEDDING=1 → mock（CLI 脚本场景，向后兼容）", () => {
    process.env.USE_MOCK_EMBEDDING = "1";
    expect(callUseMock(null)).toBe(true);
  });

  it("无 override + 无 flag + 无 env key → mock（自动回退，不配 Key 也能跑）", () => {
    delete process.env.USE_MOCK_EMBEDDING;
    delete process.env.OPENAI_COMPAT_API_KEY;
    expect(callUseMock(null)).toBe(true);
  });
});
