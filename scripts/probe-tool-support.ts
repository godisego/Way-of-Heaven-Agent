/**
 * M0 探测：聊天端点是否支持工具调用（tool use / function calling）。
 *
 * 按聊天协议自动分支：
 * - anthropic 协议（/v1/messages）→ 探测原生 tool_use
 * - openai 协议（/chat/completions）→ 探测 function calling
 *
 * 运行：npm run probe:tools（读取服务器统一配置，缺失时回退 .env.local）
 */

import { loadEnvConfig } from "@next/env";
import { getAppConfig } from "../src/core/config/appConfig";

type ProbeConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

async function main() {
  loadEnvConfig(process.cwd());
  const appConfig = getAppConfig();
  const config: ProbeConfig = {
    baseUrl: appConfig.chatBaseUrl.replace(/\/$/, ""),
    apiKey: appConfig.chatApiKey,
    model: appConfig.chatModel,
  };
  const protocol = appConfig.chatProtocol;
  const { baseUrl, apiKey, model } = config;
  if (!baseUrl || !apiKey || !model) {
    console.error("缺少聊天供应商配置（请检查网页供应商设置或 .env.local）");
    process.exit(2);
  }
  console.log(`端点：${baseUrl}  模型：${model}  协议：${protocol}`);
  if (protocol === "anthropic") return probeAnthropic(config);
  return probeOpenAI(config);
}

/** 探测 Anthropic 原生 tool use（/v1/messages） */
async function probeAnthropic({ baseUrl, apiKey, model }: ProbeConfig) {
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
    console.error("结论：请求被拒——检查端点是否接受 tools 参数。");
    process.exit(1);
  }
  const data = (await response.json()) as {
    stop_reason?: string;
    content?: Array<{ type?: string; name?: string; input?: unknown }>;
  };
  const toolUse = (data.content ?? []).find((b) => b.type === "tool_use");
  if (toolUse) {
    console.log(`✅ 支持 Anthropic 原生 tool use：模型调用了 ${toolUse.name}，参数 ${JSON.stringify(toolUse.input)}`);
    console.log(`   stop_reason=${data.stop_reason}。AnthropicToolTransport 可用。`);
  } else {
    console.log("❌ 未返回 tool_use 块。原始 content：");
    console.log(JSON.stringify(data.content, null, 2).slice(0, 1200));
    process.exit(1);
  }
}

/** 探测 OpenAI function calling（/chat/completions） */
async function probeOpenAI({ baseUrl, apiKey, model }: ProbeConfig) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      tools: [
        {
          type: "function",
          function: {
            name: "echo",
            description: "原样返回 text 参数。测试工具调用能力时必须调用它。",
            parameters: {
              type: "object",
              properties: { text: { type: "string" } },
              required: ["text"],
            },
          },
        },
      ],
      messages: [{ role: "user", content: "请调用 echo 工具，text 参数传「天道」。只调用工具。" }],
    }),
  });

  if (!response.ok) {
    console.error(`HTTP ${response.status}：${await response.text()}`);
    console.error("结论：请求被拒——检查端点是否接受 tools 参数。");
    process.exit(1);
  }
  const data = (await response.json()) as {
    choices?: Array<{
      finish_reason?: string;
      message?: { tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }> };
    }>;
  };
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.name) {
    console.log(`✅ 支持 OpenAI function calling：模型调用了 ${toolCall.function.name}，参数 ${toolCall.function.arguments}`);
    console.log(`   finish_reason=${data.choices?.[0]?.finish_reason}。OpenAIToolTransport 可用。`);
  } else {
    console.log("❌ 未返回 tool_calls。原始响应：");
    console.log(JSON.stringify(data, null, 2).slice(0, 1200));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("探测失败：", e instanceof Error ? e.message : e);
  process.exit(1);
});
