---
name: web-api-basics
description: 项目开发先修：JavaScript、TypeScript、HTTP、JSON、异步与运行时校验
---

# Web 与 API 开发先修

> 按需先修，目录放在基础知识附录。前置：[五层学习地图](/learn/ai-learning-map)。阅读第四层源码或 API 集成前完成本课。资料核对：2026-09-27。

本项目使用 TypeScript、React 和 Next.js。SQL 与 Python 有各自用途，但不能代替读懂这里的请求和函数。**学完交付**：解释一个 API 调用，识别一次失败，并写出最小输入校验。

## 一 · 先看懂值、函数和模块

```ts
type Priority = "ordinary" | "serious";
type Ticket = { id: string; priority: Priority };

const tickets: Ticket[] = [
  { id: "demo-1", priority: "serious" },
];

export function seriousIds(items: Ticket[]): string[] {
  return items
    .filter((item) => item.priority === "serious")
    .map((item) => item.id);
}
```

`const` 声明变量；数组保存多个值；对象按字段存值；函数接收输入并返回结果；`filter` 筛选，`map` 转换。`export` 导出模块能力，另一个文件通过 `import` 使用。`Ticket` 和 `Priority` 描述开发时允许的类型，最终运行的仍是 JavaScript。基础类型可查 [TypeScript 手册](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)。

**类型标注不等于运行时校验。** 浏览器、文件和模型返回的数据不因 `as Ticket` 就变可靠；收到外部值后应按字段检查，或使用本项目的 Zod schema。

## 二 · HTTP 和 JSON 各管什么

HTTP 请求包含方法、URL、请求头和可选正文；响应有状态码、响应头和正文。JSON 是正文里一种数据格式，只承载对象、数组、字符串、数字、布尔和 null，不包含函数。

```text
POST /api/chat
Content-Type: application/json

{"question":"什么是 RAG？","mode":"rag"}
```

`GET` 常用于读取资源；`POST` 常用于提交处理或创建，不能简单等同“数据库新增”。`PUT` 通常表示替换目标资源，`PATCH` 表示部分修改。接口是否支持某方法要看实际路由。本项目 `/api/chat` 使用 POST；不要照通用 REST 表格推断所有文档写接口都已实现。

| 状态 | 调用方该理解什么 |
| --- | --- |
| 2xx | HTTP 层处理成功；仍需检查业务返回内容 |
| 400 | 请求参数有问题，修正后再调用 |
| 401 / 403 | 缺少身份凭证或没有权限 |
| 404 | 资源不存在，核对路径或对象标识 |
| 429 | 达到限制，按服务端约定退避 |
| 5xx | 服务端出错，记录请求标识并按安全策略处理 |

## 三 · 异步调用必须处理两种失败

以下在已启动项目的浏览器控制台中可运行；会向本地聊天接口提交一条示例问题并创建会话，不需要在浏览器填写模型密钥。

```js
async function askDemo() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "什么是 RAG？", mode: "rag" }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (typeof result.answerMarkdown !== "string") {
      throw new Error("响应缺少 answerMarkdown");
    }
    return result.answerMarkdown;
  } finally {
    clearTimeout(timer);
  }
}
askDemo().then(console.log).catch((error) => console.error(error.message));
```

`Promise` 表示稍后完成的结果；`await` 等待当前异步函数内的结果。网络失败可能直接抛错，而 HTTP 404 / 500 通常仍返回 Response，所以必须检查 `response.ok`。停止等待也不能证明服务端没有执行；提交工单、付款等写操作需要幂等键或查询结果的恢复路径，不能看到超时就盲目重试。[MDN Fetch 说明](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)

## 四 · 模型密钥留在服务端

浏览器调用本项目 API，服务端再调用模型。私钥不能写进前端代码、公开仓库或以 `NEXT_PUBLIC_` 开头的变量。服务端能拿到密钥不等于接口已鉴权；公网部署还需独立的身份和数据权限检查。

## 五 · 最小运行时校验

```ts
function readQuestion(input: unknown): string {
  if (typeof input !== "object" || input === null || !("question" in input)) {
    throw new Error("缺少问题对象");
  }
  const question = input.question;
  if (typeof question !== "string" || !question.trim()) {
    throw new Error("question 必须是非空字符串");
  }
  return question.trim();
}
```

这只是教学片段，不是完整 API 防护。实际接口还需要长度限制、错误状态码、鉴权和日志处理。

## 六 · 验收练习

1. 将 `tickets` 加入一张普通工单，预测 `seriousIds` 的返回值。
2. `fetch` 返回 HTTP 500，为什么 `catch` 未必自动执行？
3. 模型返回 `{"question":null}`，TypeScript 类型断言能使它通过校验吗？
4. 写接口请求超时，为什么不能立即重复执行？

**答案**：仍是 `["demo-1"]`；需要检查 HTTP 状态后主动抛错；类型断言不改变运行值，应拒绝 null；超时可能发生在写入成功后，应先按业务标识查询并使用幂等机制。四题能说明原因，再进入 [API 与系统集成](/learn/api-integration)。
