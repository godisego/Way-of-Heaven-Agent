# 错题本 + 快速问 AI — 设计文档

> 状态：实施设计
> 作者：kiko
> 日期：2026-08-20

## 0 · 背景与目标

用户反馈：学习馆 42 篇讲义 + 27 条术语，但缺两个闭环机制：

1. **没有知识检测**——学生读完不知道自己理解对没有，没有"做错题→看解析→回看讲义"的闭环。
2. **读到术语/概念卡住时没有即时求助通道**——只能开新窗口问 ChatGPT，离开学习场景。

参考 maoku.org 的设计思路：学习平台要有「练习→错题→解析→回到讲义」的闭环，以及「读到不懂的地方立即问 AI」的即时通道。

### 设计原则

- **后端先行**：数据结构 + API + embedding 链路先设计好，再接前端。
- **与现有系统共生**：复用 sessionStore 的本地存储模式、rateLimit 限流、chat API 的 provider 体系。
- **零新依赖**：不引入新 npm 包，不增加外部服务。
- **不破坏现有链路**：现有 /api/chat、/api/search、/api/sessions 零改动。

## 1 · 全链路影响分析

### 1.1 新增链路

```
[错题本]
  讲义自测题 → 学生答题 → 判对错 → 错题入 localStorage
                ↘ 错题回顾 → 回看讲义 → 重新答题

[快速问 AI]
  学习页面内术语/问题 → /api/learn-ask → 三贤简化回复
                           ↘ 复用 chat provider（非 /api/chat）
                           ↘ 复用 rateLimit（独立配额）
                           ↘ 回答附带"相关讲义"链接
```

### 1.2 与现有系统的关系

| 现有模块 | 影响 | 说明 |
|---------|------|------|
| `/api/chat` | **零改动** | 快速问 AI 用独立路由 `/api/learn-ask`，不碰现有 chat |
| `/api/search` | **零改动** | 快速问 AI 可选调 search 提供相关讲义，但不是必须 |
| `sessionStore` | **零改动** | 错题本用独立的 localStorage key，不碰会话数据 |
| `rateLimit` | **复用** | 快速问 AI 走自己的限流配置（10次/分钟，比 chat 更紧） |
| `learningProgress` | **扩展** | 错题本复用进度系统的 localStorage 模式 |
| `concepts` 术语表 | **复用** | 自测题从术语表 + 讲义自测题生成 |
| `miniMarkdown` | **复用** | 错题解析走同一个渲染器 |

### 1.3 冲突分析

| 潜在冲突 | 严重度 | 解决方案 |
|---------|--------|---------|
| 快速问 AI 烧 token | 中 | 独立限流 10次/分钟；回复限制 300 字 |
| 快速问 AI 需要 chat provider 配置 | 低 | 未配 key 时回退到"请先配置供应商"提示 |
| 错题数据存在 localStorage 被清 | 低 | 明确标注"本机存储"，和进度一样不绑用户 |
| 自测题数据维护成本 | 中 | 题库放 `src/data/quizQuestions.ts`，JSON 化、可扩展 |
| 快速问 AI 回答不准 | 中 | 提示词约束"基于学习馆讲义回答"+ 免责声明 |

## 2 · 数据结构

### 2.1 题库：`src/data/quizQuestions.ts`

```typescript
export type QuizQuestion = {
  /** 唯一 ID，格式：track-stage-number，如 "agent-1-q1" */
  id: string;
  /** 关联学径 */
  track: "agent" | "mingli";
  /** 关联阶段，如 "一 · 认地图" */
  stage: string;
  /** 关联讲义 slug（可选，用于"回看讲义"跳转） */
  docSlug?: string;
  /** 题目 */
  question: string;
  /** 选项 */
  options: string[];
  /** 正确选项索引（0-based） */
  correctIndex: number;
  /** 解析：为什么对、为什么错 */
  explanation: string;
  /** 难度 */
  level: "入门" | "进阶" | "工程";
};
```

### 2.2 错题本：`src/data/mistakeBook.ts`

```typescript
export type MistakeRecord = {
  questionId: string;
  /** 用户选了哪个（索引） */
  selectedIndex: number;
  /** 做错时间 */
  createdAt: string;
  /** 是否已重做正确（从错题本移除） */
  resolved: boolean;
};

// localStorage key: "tiandao.mistakes.v1"
// API: addMistake / getMistakes / resolveMistake / clearMistakes
```

### 2.3 快速问 AI 会话

不落盘——快速问 AI 是一次性问答，不创建会话。每次问完即返回，不留历史。
原因：避免和主对谈会话混淆；学习场景的"即时提问"不需要历史。

## 3 · API 设计

### 3.1 快速问 AI：`POST /api/learn-ask`

```typescript
// 请求
{
  question: string;       // 用户的问题
  context?: string;       // 可选：当前正在读的讲义 slug（给模型上下文）
}

// 响应
{
  answer: string;         // 模型回复（限 300 字）
  relatedDocs?: Array<{ slug: string; title: string }>;  // 相关讲义推荐
}
```

**实现要点**：
- 复用 `getDefaultProvider()` 获取 chat provider
- 专用 system prompt："你是天道茶寮学习馆的助教。用通俗简短的语言回答学生的问题（300字以内）。如果你不确定，说'这个我需要在讲义里查一下'。"
- 如果 `context`（讲义 slug）存在，在 prompt 里加上"学生正在读《{title}》，可能和这个问题相关"
- 复用 `checkRateLimit`，配额 10次/分钟
- 未配 chat provider 时返回友好提示
- **不经过 RAG 检索**——这是"快速问"不是"深度问"，不需要引用典籍

### 3.2 错题本

纯前端 localStorage，**不需要 API**——错题数据不上传服务器，和 learningProgress 一样。

## 4 · 前端组件

### 4.1 错题本组件

```
src/components/learning/QuizPanel.tsx      — 自测面板（答题+判分）
src/components/learning/MistakeBook.tsx    — 错题本面板（回顾+重做）
```

### 4.2 快速问 AI 组件

```
src/components/learning/QuickAsk.tsx       — 浮动按钮+弹出框
```

### 4.3 集成位置

- **错题本 + 自测**：学习馆首页底部新增"自测练习"卡片入口 + 学习馆页内面板
- **快速问 AI**：学习馆每个文档页右下角浮动按钮（和齿轮/学习开关并列但区分视觉）

## 5 · 保障措施

| 风险 | 保障 |
|------|------|
| 快速问 AI 回答有误 | 回答下方显示"AI 助教回答仅供参考，以讲义原文为准" |
| 快速问 AI 烧 token | 10次/分钟限流 + 回复限 300 字 + 不走 RAG |
| 题库太少不够用 | 首批 30 题（Agent 径 20 + 命理径 10），后续可扩展 |
| 错题数据丢失 | localStorage 和进度一样是本机的，清浏览器数据会清掉——UI 上标注"本机存储" |
| 未配 chat provider | 快速问 AI 提示"请先在右下齿轮配置聊天供应商" |

## 6 · 文档更新

需要更新的文档：
1. `docs/exercises.md` — 加"自测题"入口说明
2. `docs/learning-mode-design.md` — 加错题本和快速问 AI 的设计记录
3. `README.md` — 更新学习馆功能列表和数字
