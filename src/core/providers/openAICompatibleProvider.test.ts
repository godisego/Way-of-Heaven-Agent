import { describe, it, expect, afterEach } from "vitest";
import { OpenAICompatibleProvider } from "./openAICompatibleProvider";
import type { ConfigOverride } from "@/core/config/appConfig";

// useMockEmbedding 是 private；通过类型断言访问其布尔结果（运行时 JS 无访问限制）
const callUseMock = (override: ConfigOverride | null): boolean =>
  (new OpenAICompatibleProvider(override) as unknown as { useMockEmbedding: () => boolean }).useMockEmbedding();

describe("OpenAICompatibleProvider.useMockEmbedding 配置优先级", () => {
  const origFlag = process.env.USE_MOCK_EMBEDDING;
  const origKey = process.env.OPENAI_COMPAT_API_KEY;

  afterEach(() => {
    if (origFlag === undefined) delete process.env.USE_MOCK_EMBEDDING;
    else process.env.USE_MOCK_EMBEDDING = origFlag;
    if (origKey === undefined) delete process.env.OPENAI_COMPAT_API_KEY;
    else process.env.OPENAI_COMPAT_API_KEY = origKey;
  });

  it("前端 override 配了完整 embedding → 用真模型，无视 .env 的 USE_MOCK_EMBEDDING=1（P1 修复核心）", () => {
    process.env.USE_MOCK_EMBEDDING = "1";
    const override: ConfigOverride = {
      openAICompatApiKey: "sk-real-from-frontend",
      openAICompatBaseUrl: "https://api.openai.com/v1",
      embeddingModel: "text-embedding-3-large",
    };
    expect(callUseMock(override)).toBe(false);
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
