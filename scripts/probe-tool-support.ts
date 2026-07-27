/**
 * M0 探测：CHAT_BASE_URL 端点是否支持 Anthropic 原生 tool use。
 *
 * 运行：npm run probe:tools   （读取 .env.local，约 5 秒出结论）
 * 支持   → AnthropicToolTransport 可直接用（agent-loop-design.md 方案 A）
 * 不支持 → 需要补 JSON 协议 Transport（方案 B），循环本体不受影响
 */

import fs from "node:fs";
import path from "node:path";

// 手动加载 .env.local（tsx 不会自动加载）
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const baseUrl = (process.env.CHAT_BASE_URL ?? "").replace(/\/$/, "");
const apiKey = process.env.CHAT_API_KEY ?? "";
const model = process.env.CHAT_MODEL ?? "";

async function main() {
  if (!baseUrl || !apiKey || !model) {
    console.error("缺少 CHAT_BASE_URL / CHAT_API_KEY / CHAT_MODEL（检查 .env.local）");
    process.exit(2);
  }
  console.log(`端点：${baseUrl}  模型：${model}`);
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      tools: [
        {
          name: "echo",
          description: "原样返回 text 参数。测试工具调用能力时必须调用它。",
          input_schema: {
            type: "object",
            properties: { text: { type: "string" } },
            required: ["text"],
          },
        },
      ],
      messages: [{ role: "user", content: "请调用 echo 工具，text 参数传「天道」。只调用工具。" }],
    }),
  });

  if (!response.ok) {
    console.error(`HTTP ${response.status}：${await response.text()}`);
    console.error("结论：请求被拒——检查端点是否接受 tools 参数（可能需要方案 B：JSON 协议 Transport）。");
    process.exit(1);
  }
  const data = (await response.json()) as {
    stop_reason?: string;
    content?: Array<{ type?: string; name?: string; input?: unknown }>;
  };
  const toolUse = (data.content ?? []).find((b) => b.type === "tool_use");
  if (toolUse) {
    console.log(`✅ 支持原生 tool use：模型调用了 ${toolUse.name}，参数 ${JSON.stringify(toolUse.input)}`);
    console.log(`   stop_reason=${data.stop_reason}。AnthropicToolTransport（方案 A）可用。`);
  } else {
    console.log("❌ 未返回 tool_use 块。原始 content：");
    console.log(JSON.stringify(data.content, null, 2).slice(0, 1200));
    console.log("结论：端点可能不支持 tools——需要方案 B（JSON 协议 Transport），告诉 Claude 补上。");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("探测失败：", e instanceof Error ? e.message : e);
  process.exit(1);
});
