/** 只读环境自检：检查 Key、模型、向量后端、本地索引，并实跑一次 embedding 探活，
 *  比对「索引构建模型」与「当前查询模型」是否一致——不一致是 RAG 链路最隐蔽的故障
 *  （全员 0 分或伪相似度）。不打印任何密钥值。
 *  探活/比对逻辑与 /api/probe 共享 src/core/diagnostics/probe.ts，避免漂移。 */
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { getAppConfig } from "../src/core/config/appConfig";
import { probeEmbedding, summarizeIndex, compareEmbeddingWithIndex } from "../src/core/diagnostics/probe";

function isConfigured(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  return !/^(your_|replace_|change[-_]?me|<|\[)/i.test(value.trim());
}

function status(ok: boolean, label: string, detail: string) {
  console.log(`${ok ? "✅" : "❌"} ${label}：${detail}`);
}

async function main() {
  loadEnvConfig(process.cwd());
  const config = getAppConfig();
  const mockFlagOn = process.env.USE_MOCK_EMBEDDING === "1";
  const realKeyConfigured = isConfigured(config.openAICompatApiKey);
  let failed = false;
  const warnings: string[] = [];

  console.log("天道智能体环境自检");
  console.log("ℹ️ 本检查只读 .env / 环境变量；前端齿轮面板的配置存于浏览器 localStorage，不在此范围内。");
  console.log("   若你在前端配了不同的 Key，运行时（聊天/检索/上传）以前端为准，doctor 看不到。\n");

  const chatReady = isConfigured(config.chatBaseUrl) && isConfigured(config.chatApiKey) && isConfigured(config.chatModel);
  status(chatReady, "聊天链路", chatReady ? `${config.chatModel}，Endpoint 已配置` : "CHAT_BASE_URL / CHAT_API_KEY / CHAT_MODEL 未完整配置");
  if (!chatReady) failed = true;

  // P1 陷阱告警：USE_MOCK_EMBEDDING=1 会强制走 mock，是「配了 Key 却搜不准」的常见根源。
  if (mockFlagOn) {
    if (realKeyConfigured) {
      warnings.push(
        "USE_MOCK_EMBEDDING=1 已开启，且配了真实 OPENAI_COMPAT_API_KEY——embedding 被强制走 mock（bigram hash），检索停在词法水平。若想用真模型，请在 .env 去掉 USE_MOCK_EMBEDDING 后运行 npm run reindex:embeddings。",
      );
    } else {
      warnings.push(
        "USE_MOCK_EMBEDDING=1 已开启。无真 Key 时这与自动回退 mock 等价；但配真 Key 后请务必去掉此 flag，否则会强制走 mock 而非真模型（这正是 P1 陷阱）。注意：前端齿轮面板配的 embedding Key 会优先生效（绕过此 flag）。",
      );
    }
  }

  const embeddingConfigured =
    isConfigured(config.openAICompatBaseUrl) && realKeyConfigured && isConfigured(config.embeddingModel);
  const effectivelyMock = mockFlagOn || !realKeyConfigured;
  if (effectivelyMock) {
    status(true, "Embedding 链路", "当前为本地 Mock 模式（bigram hash），不需要 Embedding Key");
  } else {
    status(embeddingConfigured, "Embedding 链路", embeddingConfigured ? `${config.embeddingModel}，Endpoint 已配置` : "OPENAI_COMPAT_BASE_URL / OPENAI_COMPAT_API_KEY / OPENAI_COMPAT_EMBEDDING_MODEL 未完整配置");
    if (!embeddingConfigured) failed = true;
  }

  const supabaseReady = config.vectorBackend !== "supabase" || (isConfigured(config.supabaseUrl) && isConfigured(config.supabaseServiceRoleKey));
  status(supabaseReady, "向量后端", config.vectorBackend === "supabase" ? (supabaseReady ? "Supabase 已配置" : "Supabase URL 或 service role key 缺失") : "local JSON");
  if (!supabaseReady) failed = true;

  const summary = summarizeIndex();
  console.log(
    `📦 本地索引：${summary.count} 条，${summary.documents} 份文档，维度 ${summary.dim || "未知"}，模型 ${summary.model ?? "未盖戳（旧索引）"}`,
  );
  console.log(`📁 数据目录：${config.dataDir}`);
  if (summary.unstamped > 0) {
    warnings.push(`索引中有 ${summary.unstamped} 条记录未盖戳 embeddingModel（旧索引残留 / 多次 seed 累积），会削弱模型级比对。建议运行 npm run reindex:embeddings 统一重建。`);
  }

  // 探活：实跑一次 embedTexts（CLI 无 override → 走 .env），与索引比对。
  if (!summary.empty) {
    const probe = await probeEmbedding(null);
    if (probe.error) {
      status(false, "Embedding 探活", `失败：${probe.error}`);
      failed = true;
    } else {
      const viaMockTag = probe.viaMock || probe.fellBackToMock ? "（已回退 mock）" : "";
      console.log(`\n🔍 Embedding 探活：${viaMockTag}模型 ${probe.model ?? "?"}，维度 ${probe.dim}`);
      const match = compareEmbeddingWithIndex(probe, summary);
      if (match.dimensionOk) {
        status(true, "维度一致性", `索引与查询均为 ${summary.dim || probe.dim} 维`);
      } else {
        status(false, "维度一致性", `索引 ${summary.dim} 维 ≠ 查询 ${probe.dim} 维——检索会全员 0 分，三贤统一答「暂未入藏」。请运行 npm run reindex:embeddings 重建索引。`);
        failed = true;
      }
      if (summary.model) {
        if (match.modelOk) {
          status(true, "模型一致性", `索引与查询均为「${summary.model}」`);
        } else {
          status(false, "模型一致性", `索引由「${summary.model}」构建，当前查询用「${probe.model ?? "?"}」——维度相同也会失真。请运行 npm run reindex:embeddings 重建索引。`);
          failed = true;
        }
      } else {
        warnings.push("索引未盖戳 embeddingModel（旧索引），无法做模型级比对，维度已校验通过。建议 reindex 一次以补盖戳。");
      }
      if (probe.viaMock || probe.fellBackToMock) {
        warnings.push(`Embedding 链路运行时回退了 mock（模型=${probe.model}）。请检查 OPENAI_COMPAT_* 配置 / 余额 / 网络；若确实打算用 mock，可在 .env 显式 USE_MOCK_EMBEDDING=1 确认。`);
      }
    }
  }

  if (warnings.length) {
    console.log("\n⚠️ 提示：");
    for (const w of warnings) console.log(`  - ${w}`);
  }

  const verdict = failed
    ? "配置仍有缺项，请先修复上面的 ❌ 项。"
    : warnings.length
      ? "基础配置可用；请留意上面的 ⚠️ 提示。"
      : "基础配置可用，可以启动开发服务或执行验收。";
  console.log(`\n结论：${verdict}`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error("自检失败：", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
