---
name: ai-agent-panorama
description: AI Agent 全景图：从 ChatGPT 到 RAG 到 Agent 到多智能体的完整演进线，把所有概念连成一条线
---

# AI Agent 全景图：从聊天到行动

这一篇不教你写代码，只做一件事：**把散落的概念连成一条线**。

读完这篇，你会知道——天道茶寮这个项目在整个 AI 版图里站在哪、为什么选择这条路线、下一步能往哪走。

> 速查：[RAG](/learn/rag-concepts) · [Agent](/learn/agent-walkthrough) · [向量](/learn/rag-concepts) · [幻觉](/learn/llm-fundamentals) · [工具循环](/learn/agent-loop)

## 一 · 先看整张地图

AI 发展到现在，从"能聊天"到"能做事"经历了四次跨越：

```
① 纯 LLM        ② RAG           ③ Agent           ④ 多智能体
ChatGPT          Perplexity       Manus             AutoGen
─────           ─────            ─────             ─────
问一次答一次      先查资料再答      自己决定查什么      多个角色协作
                 开卷考试          带工具箱干活       分工+讨论+汇总
                 ↑                ↑                 ↑
               天道·循迹关        天道·工具循环       天道·三贤（雏形）
```

天道茶寮**横跨②③④三个阶段**：
- 「循迹」关 = RAG 模式（②）
- 默认模式 = Agent 工具循环（③）
- 三贤分库 = 多智能体雏形（④）

一个项目，三个阶段都摸到了——这就是它作为"学习场"的价值。

## 二 · 每次"跨越"解决了什么问题

### ① 纯 LLM：聪明但无知

**代表作**：ChatGPT（2022）

大模型（LLM）读完了互联网上大部分文本，能生成流畅、有逻辑的回答。但它有两个致命缺陷：

| 缺陷 | 表现 | 类比 |
|------|------|------|
| **知识截止** | 不知道训练后的事、不知道你的私人笔记 | 让读完大学的人回答"你昨天日记写了啥" |
| **幻觉** | 自信地编造不存在的细节、页码、人名 | 闭卷回答"《存在主义》第几页写的自欺" |

→ 你在天道茶寮问老胡"我的盘怎么看"，模型不知道你的生辰——**不接你的数据就答不了**。

### ② RAG：给模型一份开卷资料

**代表作**：Perplexity、通义千问+文档、天道茶寮循迹模式

RAG（检索增强生成）= **提问前先从知识库里搜几段相关资料，拼到 prompt 里，让模型照着资料答**。

```
你的问题 ──→ [检索：从知识库找 topK 段落] ──→ 拼到 prompt ──→ LLM 生成回答
                    ↑
              你上传的 .md/.txt/.pdf
              被切块、embedding、入库
```

**解决了什么**：
- ✅ 知识截止 → 资料是你自己传的，随时更新
- ✅ 幻觉 → 回答必须基于检索到的段落，可核对
- ❌ 没解决 → 模型不能"自己决定搜什么"，搜不到就答不了

天道茶寮的「循迹」模式就是 RAG：固定检索一次 → 生成一次。简单、可控，但模型没有自主性。

→ 想深入：[RAG 概念入门](/learn/rag-concepts) · [RAG 代码走读](/learn/rag-walkthrough)

### ③ Agent：让模型自己决定做什么

**代表作**：Manus、Claude Code、WorkBuddy、天道茶寮默认模式

Agent = **模型在一个循环里自己决定：要不要查？查什么？查够了没？没够就继续查**。

```
你的问题 ──→ [Agent 循环]
               │
               ├→ 模型想：我需要查资料
               ├→ 调 search_library("天干地支")
               ├→ 看结果：不太够
               ├→ 模型想：再读一下原文
               ├→ 调 read_source_unit(书名, 章节)
               ├→ 看结果：够了
               ├→ 调 ready_to_answer()
               └→ 生成三贤回答
```

**解决了什么**：
- ✅ 模型自主决定检索策略
- ✅ 可以多轮搜索、换关键词、读原文细节
- ✅ 有停止条件（步数上限、证据够了、超时）
- ✅ 每一步留下执行轨迹（可审计）

天道茶寮默认模式就是 Agent：模型有三个工具（`search_library` / `read_source_unit` / `ready_to_answer`），最多循环 6 步。

→ 想深入：[Agent 基础概念](/learn/agent-walkthrough) · [工具循环设计](/learn/agent-loop)

### ④ 多智能体：让多个角色协作

**代表作**：LangGraph、CrewAI、天道茶寮三贤

多智能体 = **多个 Agent 各有角色和工具，互相协作或讨论**。

```
你的问题
    │
    ├→ 老胡（盲派算师）：查命理典籍 → 基于盘面给实战建议
    ├→ 玄（道家）：查道家典籍 → 谈气机节奏
    └→ 李（存在主义）：查哲学典籍 → 面对现实选择
         │
         └→ 三段回应合并交付给你
```

天道茶寮三贤的**当前实现**：一个模型在一次生成里扮演三个角色（不是三个独立 Agent 各自有自己的循环）。这是多智能体的**雏形**——分库检索做到了"材料隔离"，但共享一个推理过程。

**完整多智能体**（未来方向）：每个角色有自己的 LLM 调用、自己的工具循环、可以互相讨论——这就是 `agent-blueprint.md` 里画的目标架构。

→ 想深入：[Agent 目标架构蓝图](/learn/agent-blueprint)

## 三 · 关键概念串联

你在这个项目里会反复遇到这些概念，它们不是孤立的——每个概念都解决了上一层的问题：

| 概念 | 解决什么 | 在天道茶寮哪能看到 |
|------|---------|-------------------|
| **Token** | LLM 不是按字读文本，是按 token 切 | `npm run probe:tools` 输出 |
| **上下文窗口** | LLM 一次能读多少 token | 检索 topK 的 chunk 总长受此限制 |
| **Embedding** | 把文字变成向量，语义相近的向量近 | `src/core/providers/` |
| **向量检索** | 从知识库里找最相关的 topK 段 | `src/core/retrieval/retrieveContext.ts` |
| **Chunking** | 把长文档切成可检索的小段 | `src/core/ingestion/chunkPages.ts` |
| **来源锚定** | 每个 chunk 记住自己的书名页码 | 回答里的 `[《书名》, 章节]` |
| **幻觉** | 模型自信地编造不存在的出处 | 引用校验就是防这个 |
| **Function Calling** | 模型生成 JSON 告诉框架"帮我调这个函数" | `src/core/agent/tools.ts` |
| **工具循环** | 模型在循环里反复调工具直到完成任务 | `src/core/agent/orchestrator.ts` |
| **停止条件** | 防止 Agent 无限循环烧 token | 步数上限 6 + 超时 + 重复检测 |
| **证据台账** | 记录每条结论可追溯到哪个来源 | `EvidenceLedger` |
| **执行轨迹** | 每一步留痕，可审计 | 对谈界面的「执行轨迹面板」 |
| **声口校验** | 检查三贤各自说话风格是否跑偏 | `src/core/retrieval/voicePolicy.ts` |
| **材料隔离** | 老胡只查命理库、李只查哲学库 | `src/data/mentors.ts` 的 tradition 权限 |
| **Prompt Engineering** | 用系统提示词控制模型行为 | 三贤人设 prompt |
| **Mock Embedding** | 没 embedding key 时用 hash 代替 | `src/core/providers/mockEmbeddingProvider.ts` |

## 四 · 天道茶寮在版图里的位置

```
          少自主 ──────────────────────── 多自主
           │                                  │
  纯 LLM ── RAG ── 单 Agent ── 多 Agent ── 自主 Agent
 ChatGPT   Perplexity  天道默认    天道三贤    Manus/Devin
                        │              │
                     有工具循环      有角色分工
                     有执行轨迹      有材料隔离
                     有引用校验      有声口校验
```

天道茶寮的位置：**单 Agent → 多 Agent 的过渡带**。

它不是最前沿的（Manus 那种全自动 Agent 还很远），但它把从 RAG 到 Agent 的每一步都零框架手写了——**每个环节都能看懂、能改、能测试**。这是"学习场"该有的位置。

## 五 · 你的学习路线

| 阶段 | 读什么 | 目标 |
|------|--------|------|
| 零基础 | [LLM 基础速览](/learn/llm-fundamentals) + 本篇 | 知道 AI 能做什么不能做什么 |
| 认地图 | [RAG 概念入门](/learn/rag-concepts) + [Agent 基础概念](/learn/agent-walkthrough) | 理解 RAG 和 Agent 的区别 |
| 拆系统 | [系统架构](/learn/architecture) + [技术栈](/learn/tech-stack) | 知道每层代码在哪 |
| 建可信链 | [RAG 代码走读](/learn/rag-walkthrough) + [引用校验](/learn/citation-design) | 看懂从上传到回答的完整链路 |
| 让模型行动 | [工具循环设计](/learn/agent-loop) + [蓝图](/learn/agent-blueprint) | 理解 Agent 怎么自己决策 |
| 练手 | [作业练习册](/learn/exercises) | 亲手改一行代码，跑通一个流程 |

## 六 · 自测

1. 纯 LLM、RAG、Agent、多智能体——每一步跨越是解决了什么问题？
2. 天道茶寮的「循迹」和「默认」模式分别对应上面哪个阶段？
3. 三贤当前是"真多智能体"还是"一个模型扮演三个角色"？区别在哪？
4. 如果你要给一个完全不懂 AI 的朋友解释这个项目在做什么，你会怎么说？

> 边界：这篇是"地图"，不是"导航"——知道全景后，选一条路深入走，比走马观花看全部更有价值。
