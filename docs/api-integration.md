---
name: api-integration
description: API 与系统集成——HTTP/REST/JSON/鉴权/Webhook/MCP/插件，用天道茶寮做实例
---

# API 与系统集成

AI 不能停在网页 Demo 里——得接进产品。这篇讲清楚怎么把 AI 能力变成 API，怎么把外部能力接进 AI。

> **前置**：读 [LLM 基础原理](/learn/llm-fundamentals) 里的 Function Calling 部分。

## 一 · 为什么智能体需要 API

智能体不是孤岛——它需要和外部世界打交道：

```
用户："帮我查一下今天的运势"
         │
    智能体需要：
    ├─ 查日历 → 今天是什么日子？ → 调日历 API
    ├─ 排盘 → 用户的八字是什么？ → 调排盘 API
    ├─ 查典籍 → 相关命理内容 → 调向量检索 API
    ├─ 生成回答 → LLM API
    └─ 发通知 → 推送结果 → 调消息 API
```

每一步都是一个 API 调用。智能体 = 调度多个 API 的"指挥官"。

## 二 · HTTP 基础

HTTP = 网上两台电脑对话的协议。你就理解成"寄信"：

```
客户端（浏览器）          服务端（服务器）
     │                         │
     │ ──寄信（Request）──→     │
     │                         │
     │   ←──回信（Response）──  │
     │                         │
```

### 一封信里有什么

```
POST /api/chat HTTP/1.1          ← 方法 + 路径 + 版本
Host: localhost:3000              ← 寄到哪
Content-Type: application/json    ← 信封类型
Authorization: Bearer sk-xxx      ← 门禁卡
                                  ← 空行（信封和信纸的分隔）
{                                  ← 信纸（Body）
  "question": "天干地支是什么"
}
```

### 回信里有什么

```
HTTP/1.1 200 OK                   ← 状态码
Content-Type: application/json    ← 回信类型
                                  ← 空行
{
  "answerMarkdown": "天干地支是...",
  "citations": [...]
}
```

## 三 · REST API

REST = 一种 URL 设计风格。核心思想：**用 URL 表示资源，用 HTTP 方法表示操作**。

### 四个基本方法

| 方法 | 语义 | 天道茶寮实例 |
|------|------|-------------|
| `GET` | 查 | `GET /api/documents` → 查所有文档 |
| `POST` | 增 | `POST /api/chat` → 发一个问题 |
| `PUT` | 改 | `PUT /api/documents/xxx` → 更新文档 |
| `DELETE` | 删 | `DELETE /api/documents/xxx` → 删除文档 |

### URL 设计规则

```
✅ 好的设计：
GET  /api/documents          → 查所有文档
GET  /api/documents/123      → 查某个文档
POST /api/documents          → 新建文档
PUT  /api/documents/123      → 更新文档
DELETE /api/documents/123    → 删除文档

❌ 坏的设计：
POST /api/getDocuments       → GET 语义用了 POST
POST /api/deleteDocument/123 → DELETE 语义用了 POST
POST /api/updateDocument     → PUT 语义用了 POST
```

### 状态码

| 码 | 含义 | 你要做什么 |
|----|------|-----------|
| 200 | 成功 | 正常处理 |
| 400 | 请求格式错 | 检查你的参数 |
| 401 | 没鉴权 | 检查 API Key |
| 403 | 没权限 | 你没权操作这个资源 |
| 404 | 找不到 | URL 写错了或资源不存在 |
| 500 | 服务器错 | 看服务器日志 |
| 503 | 服务不可用 | 服务器过载或维护中 |

## 四 · JSON

JSON = 网上最常用的数据格式。就是 JavaScript 对象的字符串版：

```json
{
  "question": "天干地支是什么",
  "mode": "rag",
  "settings": {
    "chat": {
      "provider": "minimax",
      "model": "MiniMax-M3"
    }
  }
}
```

### JSON vs 其他格式

| 格式 | 优点 | 缺点 | 什么时候用 |
|------|------|------|-----------|
| JSON | 轻量、可读、全平台支持 | 无注释 | API 通信（主流） |
| XML | 支持注释和属性 | 冗长 | 老系统、SOAP |
| YAML | 支持注释、可读性好 | 解析器少 | 配置文件 |
| CSV | 简单 | 无层级 | 表格数据 |

## 五 · 鉴权

API 不能谁都能调——得有"门禁卡"。

### 三种常见鉴权

**1. API Key（最简单）**

```
GET /api/documents
Authorization: Bearer sk-xxxxxxxx
```

天道茶寮的聊天 API 就是这样：用户在齿轮里配 API Key，每次请求带上。

**2. Bearer Token**

```
POST /api/chat
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

和 API Key 类似，但 Token 有过期时间，需要刷新。

**3. 签名（HMAC）**

```
POST /api/chat
X-Api-Key: your_key
X-Api-Sign: hmac_sha256(secret, timestamp + body)
X-Timestamp: 1693000000
```

最安全——每次请求用密钥签名，别人截获了也不能重放。

### 天道茶寮的鉴权

```
用户配置 API Key
  │
  ├─ 前端 → POST /api/chat（带 settings 里的 key）
  ├─ 后端 → 用 key 调 LLM API
  └─ LLM 返回 → 后端返回给前端
```

**安全细节**：Key 存在 `data/provider-settings.json`（权限 0600），不回传页面。

## 六 · Webhook

Webhook = "事件发生时，服务器主动通知你"。

```
普通 API：
  你 → 服务器："有新消息吗？" → 服务器："没有"
  你 → 服务器："有新消息吗？" → 服务器："没有"
  你 → 服务器："有新消息吗？" → 服务器："有！"
  （轮询，浪费资源）

Webhook：
  你 → 服务器："我的地址是 xxx，有消息通知我"
  ...
  服务器 → 你："有新消息了！" （主动推送）
  （事件驱动，高效）
```

### 智能体里的 Webhook

```
场景：Agent 完成长任务后通知用户

1. 用户提交任务 → Agent 异步处理
2. 用户不用一直等 → 去做别的
3. Agent 处理完 → POST 到用户的 Webhook 地址
4. 用户的系统收到通知 → 展示结果
```

## 七 · MCP（Model Context Protocol）

MCP = Anthropic 2024 年发布的开放协议，让 AI 模型能连接外部资源。

### MCP 解决什么问题

```
没有 MCP 之前：
  每个 AI 平台自定义工具格式
  ├─ OpenAI：function calling 格式 A
  ├─ Anthropic：tool use 格式 B
  ├─ Google：function calling 格式 C
  └─ 开发者：每个平台写一遍

有了 MCP 之后：
  工具按 MCP 协议写一次
  ├─ OpenAI 能用
  ├─ Anthropic 能用
  ├─ 任何支持 MCP 的客户端都能用
  └─ 开发者：写一次
```

### MCP 的三个角色

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  MCP Host     │         │  MCP Server   │         │  数据源       │
│  (AI 客户端)  │ ←─MCP─→ │  (工具提供方)  │ ←─API─→ │  (数据库等)   │
│  Claude etc  │         │  天道排盘工具   │         │  命理数据     │
└──────────────┘         └──────────────┘         └──────────────┘
```

### 和天道茶寮的对比

| | 天道茶寮工具 | MCP 工具 |
|---|---|---|
| 协议 | 自定义 JSON Schema | MCP 标准协议 |
| 执行 | 直接在 Next.js 里跑 | 独立进程，通过协议通信 |
| 可复用 | 只在本项目内 | 任何 MCP 客户端都能用 |
| 适合 | 项目内工具 | 跨平台共享工具 |

## 八 · 插件与技能封装

"插件""技能""工具"在智能体领域经常混用——核心都是"让模型能调用外部能力"。

### 封装一个工具的步骤

```typescript
// 天道茶寮的 search_library 工具
const searchLibraryTool = {
  // 1. 名字（模型调用时用）
  name: "search_library",

  // 2. 描述（模型靠它判断要不要调这个工具）
  description:
    "搜索典籍库，返回相关段落。当需要查典籍内容时调用。",

  // 3. 参数 schema（模型生成的参数会校验）
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "搜索关键词或问题",
      },
    },
    required: ["query"],
  },

  // 4. 执行函数（框架调用，不是模型调用）
  execute: async (params: { query: string }) => {
    const results = await searchChunks(params.query);
    return results.map(r => ({
      book: r.bookTitle,
      section: r.sectionTitle,
      text: r.text,
    }));
  },
};
```

### 工具 vs HTTP 接口 vs 代码节点

| 类型 | 适合场景 | 例子 |
|------|---------|------|
| **工具（Function）** | 简单、同步、快 | 搜索库、读文件、算数 |
| **HTTP 接口** | 调外部服务、异步 | 调天气 API、发邮件 |
| **代码节点** | 复杂逻辑、数据处理 | 数据清洗、格式转换 |

## 九 · 天道茶寮的 API 架构

```
浏览器
  │
  ├─ POST /api/chat      → 问三贤一个问题
  ├─ POST /api/search    → 搜索典籍库
  ├─ POST /api/upload    → 上传文档入库
  ├─ POST /api/health    → 健康检查
  ├─ GET  /api/documents → 查所有文档
  └─ GET  /api/documents/[id] → 查某个文档
         │
    Next.js API Routes
         │
    ┌────┼────────────┬──────────────┐
    │    │            │              │
  向量库  文档库       LLM API        排盘引擎
 (local) (local)    (外部服务)      (确定性)
```

### 每个环节怎么集成

| 环节 | 集成方式 | 代码位置 |
|------|---------|---------|
| 前端 → 后端 | Next.js API Routes | `src/app/api/` |
| 后端 → LLM | HTTP + Bearer Key | `src/core/providers/` |
| 后端 → 向量库 | 本地 JSON 文件读写 | `src/core/vector/` |
| 后端 → 排盘 | 确定性函数调用 | `src/core/mingli/` |

## 十 · 自测

1. GET 和 POST 的语义区别是什么？
2. 400、401、403、404、500 分别代表什么？
3. API Key 鉴权和 Bearer Token 鉴权的区别？
4. Webhook 解决了什么问题？和轮询比有什么优势？
5. MCP 解决了什么问题？如果没有 MCP，开发者要多做多少工作？
6. 封装一个工具需要哪四个字段？为什么 `description` 很重要？

> **下一步**：了解 API 怎么集成后，看 [工具循环设计](/learn/agent-loop) 看模型怎么在循环里调这些工具。
