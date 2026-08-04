# 智能体（Agent）入门 —— 跟着天道智能体看 Agent 的零件

> 这份文档假设你已经读完了 `rag-concepts-primer.md`。
> RAG 是在「资料里找一段交给 LLM」。
> Agent 是「让 LLM 自己决定要不要找、找什么、找几次」。
>
> 这个项目**目前还不是完整 Agent**，只是 RAG + 三贤角色化生成 + 几处 agent-flavored 的细节。
> 我们先讲清楚 Agent 是什么，再回头看天道智能体缺什么、怎么补。

---

## 0. 这份文档适合谁

- 完全没听过 Agent / Tool use / ReAct / Reflexion 的同学。
- 已经能跑通天道智能体的 RAG 流程，想理解它**离完整 Agent 还差什么**。
- 想在天道智能体上做改造，把它真正升级成"会自己思考、自己用工具"的系统。

读完你应该能：

- 区分"LLM 一次调用"、"RAG"、"Agent"三者的差别。
- 说出 Tool use / ReAct / Reflexion / Multi-agent 各自解决什么问题。
- 看完天道智能体代码后，识别出哪些是 agent-flavored 模式、哪些不是。
- 拿到 3~5 个具体可动手的 agent 升级点。

---

## 1. 核心区分：LLM 调用、RAG、Agent

把三者放在一张表上：

| | 一次性 LLM 调用 | RAG | Agent |
|---|---|---|---|
| **模型被叫几次** | 1 次 | 2 次（embedding + chat） | 多次，由 Agent 自主决定 |
| **能用什么工具？** | 只能靠 prompt 里的文字 | 只能检索向量库 | 可以调任意工具（检索、计算、写文件、调 API……） |
| **能"思考下一步"吗？** | 不能 | 不能 | **能**，每一步先规划再行动 |
| **典型失败时怎么办？** | 没法，直接返回 | 多调一次检索，或者改写 query | **自我反思**，可能换工具、改方案、查漏补缺 |
| **天道智能体当前版本是？** | ❌ 不是 | ✅ 是 | ❌ 还不是（只有一点点影子） |

**一句话**：
- LLM 调用是"问一次答一次"。
- RAG 是"先查资料再答一次"。
- Agent 是"在循环里反复『想→做→看结果→再想→再做』，直到把任务做完"。

### 类比

| 系统类型 | 比喻 |
|---|---|
| LLM 调用 | 问一个人答一个问题，他说啥就是啥 |
| RAG | 给这个人一份参考资料，让他答一个问题 |
| Agent | 给一个人工具箱（锤子、扳手、卷尺），让他自己决定用哪个、什么时候用、直到把活干完 |

---

## 2. Tool use (Function Calling) —— Agent 的"手脚"

**Agent 之所以能动起来，是因为它能调"工具"。**

工具是模型之外的、确定性的操作：

- `search_documents(query)` —— 检索向量库
- `get_page_text(file, page)` —— 读典籍某一页原文
- `calculate(expression)` —— 跑数学
- `search_web(q)` —— 调搜索引擎
- `write_file(path, content)` —— 写文件
- `send_email(to, body)` —— 发邮件

模型**不直接执行**这些函数，而是生成一段结构化输出（JSON）告诉框架"请帮我调这个函数，参数是这些"，**框架**真的去执行，然后把结果再喂回给模型。

### 关键点

- 模型"决定"调哪个，**框架负责执行**。这避免了模型信口开河"我帮你算完了" —— 它只能吐出意图。
- 这一套的契约（JSON Schema 函数描述 + 结构化输出）叫 **Function Calling** 或 **Tool Use**。OpenAI / Anthropic / Google 都支持。
- 没有 Tool use 的 Agent 只能嘴上说"我帮你查了" —— 没动手；有 Tool use 的 Agent 才真的能跑流程。

天道智能体现状：**没有 tool use**。检索是在 chat 入口处程序化调的，模型不知道也不能决定要不要查。详见第 9.1 节怎么加。

---

## 3. Planning —— Agent 怎么拆解任务

复杂任务不是一步做完的。Agent 需要先**规划**：把"分析我当前人生阶段该怎么走"拆成：

```
1. 判断问题需要哪些证据（典籍、问者档、排盘结果）
2. 在已经入藏的《存在与虚无》《周易》等资料中检索并核对原文
3. 结合问者档（八字、大运、背景）分析局势
4. 综合三贤视角写一份建议，思想或原文出处带可核验引用
```

经典实现方式：

- **一次性规划**：让模型先输出一个步骤列表，再按列表执行（便宜、好调试）。
- **动态规划**：每一步都根据上一步结果决定下一步做什么（更灵活、更像 Agent）。

天道智能体当前：**没有 planning**。一次 chat 一轮 prompt 一次回答，模型没有"先列计划"的机会。

---

## 4. ReAct (Reason + Act) —— "想一步做一步"循环

**ReAct** 是经典的 Agent 模式，由 Yao 等人在 2022 年提出。论文常用 `Thought / Action / Observation` 描述循环；工程产品不应把模型的私有思维链原样展示或保存，而应记录可审计的计划摘要、工具调用和结果摘要。例如：

```
Plan summary: 先核对关于“自由与选择”的典籍证据。
Action:       search_library({"query":"自由与选择"})
Observation:  返回 5 条候选；《存在与虚无》“第二章 自欺”相关性最高。

Plan summary: 问题还涉及时机，需要补充《周易》相关证据。
Action:       search_library({"query":"易经 时机 进退"})
Observation:  找到《周易》“乾卦”与“需卦”的候选段落。

Plan summary: 证据足够，进入三贤结构化生成与引用校验。
Action:       draft_mentor_answer({"evidenceIds":["ev_1","ev_2"]})
Final Answer: ……[《存在与虚无》, 第二章 自欺]……[《周易》, 需卦]
```

**关键观察**：

- 模型或编排器根据当前状态选择 **Action（动作）**，框架执行工具后把 **Observation（观察）** 交回下一步。
- 循环既可以由提示词引导，也可以由模型原生 tool use 与框架状态机共同约束。
- 真正应当可见、可调试的是结构化执行轨迹：计划摘要、工具名、参数、耗时、结果摘要、证据和停止原因；不是私有思维链。

天道智能体当前：没有 ReAct 或工具循环。`searchChunks` 由 API 固定执行一次，模型拿到的是问题与 Sources，不能决定是否继续检索或读取完整来源单元。

---


```agentloop
```

## 5. Reflexion —— "反思上一轮为什么失败"

ReAct 解决了"做什么"的问题。**Reflexion** 解决"做错了怎么办"。

### 天道智能体现状的 self-correct（伪 Reflexion）

```text
第一次回答 → 没引用 → 
强制重试 1 次（prompt 说"上一次没引用，请加上"）→
还失败 → 挂 warning
```

这只是**单步机械重试**，没有真正的反思。

### 真 Reflexion 该做这些

每次失败之后：

1. **记录为什么失败**（LLM 自己说："我上次引用错了页码"）
2. **累积到下次的"经验"**（把这条反思塞进 system prompt 或长期记忆）
3. **下次主动避免**（"上次犯的错：不要发明页码，只引用 Sources 里的"）

最小实现 schema：

```text
短期记忆: 本轮计划摘要、工具调用、Observation、证据与验证结果
长期记忆: 过去的反思（累积），例:
  - "F-001: 不要引用 Sources 里没有的页码"
  - "F-002: 用户问'未来'类问题时，严格拒答或说'暂未入藏'"
错误信号: 本轮 answer 通过校验吗？ retrieved scores 高吗？
```

天道智能体当前：**没有**长期记忆、没有真反思。详见第 9.2 节怎么补。

---

## 6. Memory —— 短期 vs 长期

Agent 必须记住两件事：

| 类型 | 内容 | 存在哪 | 典型实现 |
|---|---|---|---|
| **短期记忆** | 当前会话/任务的消息、计划摘要、工具结果与证据 | 当次 context window / 会话状态 | 编排器按需注入 prompt |
| **长期记忆** | 用户确认的稳定偏好、长期目标、版本化失败经验 | JSON / Supabase / 专用存储 | 当前 `data/app.json` 元数据层可作为本地起点 |

天道智能体当前：**只有短期（prompt）+ 文档元数据**，没有"上次你反省过什么"。这是升级成真 Reflexion 的最大缺口。

---

## 7. Multi-Agent —— "一群 Agent 协作"

复杂任务可以交给多个 Agent 分工：

- 一个 Agent 负责检索典籍
- 一个 Agent 负责校验引用
- 一个 Agent 负责生成三贤回答
- 一个 Agent 负责评审回答质量，不过就打回

经典框架：AutoGen、CrewAI、LangGraph。

代价：贵、慢、难调试。天道智能体第一阶段应继续由一个受控编排器调用一个模型生成三贤结构化结果；只有评测证明角色隔离确实不足时，再拆成多个独立 Agent。

---

## 8. RAG + Agent = 现代知识库标配

```
                ┌─────────────────────────┐
                │      Agent 主循环       │
                │  (ReAct / Reflexion / …)│
                └────────────┬────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   Tool: search_       Tool: get_page_     Tool: calculate(
        docs                 text                "...")
         │                   │                   │
         ▼                   ▼                   ▼
    [RAG 检索]          [典籍原文读取]       [本地计算]
         │
         ▼
    Embedding + Vector Store
```

**RAG 是 Agent 的一个工具**，不是 Agent 的对立面。
天道智能体现在是"RAG 套了个壳"。要变 Agent，只要把"在 chat 入口被动调检索"改成"让模型主动决定调检索"。

---

## 9. 天道智能体里"看着像 Agent 但还不是"的地方

回头看天道智能体的代码，有几个 agent-flavored 模式：

### 9.1 自纠重试（`answerWithCitations.ts:31-39`）

```ts
if (needsCitation(answer) && citations.length === 0) {
  answer = (await provider.generateAnswer({
    question: `${question}\n\n上一次回答没有有效引用。请重新回答……`
  })).text.trim();
  citations = validateCitations(answer, retrieved);
}
```

**像什么**：Self-correct
**缺什么**：不是真 Reflexion —— 没有把"为什么失败"记录下来、没有累积经验。

### 9.2 Provider 抽象（`llmProvider.ts`）

```ts
export interface LlmProvider {
  generateAnswer(args: { question: string; context: string }): Promise<{ text: string }>;
  embedTexts(args: { texts: string[] }): Promise<{ embeddings: number[][] }>;
}
```

**像什么**：依赖倒置（DIP）/ 可替换 Provider
**缺什么**：这其实是"工具注册表"的雏形。如果把 `generateAnswer / embedTexts` 改成更通用的 `runTool(name, args)`，再注册 `search_docs / read_page / calculate`，模型就能选工具，这就是 Agent 的起点。

### 9.3 文档状态机（`documentTypes.ts`）

```text
"uploaded" → "extracting" → "indexing" → "indexed"
                              └──────→ "failed"
```

**像什么**：状态机 + 异步任务管理
**用处**：Agent 在跑长任务时（上传/索引/检索）需要进度反馈，这给前端用。Agent 本身**不需要**这个；它是给**人看的**。

### 9.4 三贤角色化生成（`mentors.ts`）

```ts
system: buildMentorSystemPrompt(input.userProfile ?? null),
```

**像什么**：Multi-agent 的简化版 —— 三个角色在一个 system prompt 里协作
**缺什么**：不是真的多 Agent（没有独立思考、没有工具选择、没有分工），只是一个模型模拟三个角色对话。

---

## 10. 天道智能体的 Agent 升级动手路径

按难度递增，从最容易的开始改。

### 10.1 给 LLM 加一个"工具"—— search_documents / read_page

**目标**：让模型自己决定要不要检索、检索什么，而不是 chat 入口先检索。

**改动**：
- 新增独立 `ToolRegistry`，为 `search_library`、`read_source_unit`、`calculate_bazi` 等工具声明 schema、权限、超时和返回类型。
- 在 Anthropic/OpenAI provider 启用原生 tool use（Anthropic 已经有这个能力）。
- chat 入口交给受控 Orchestrator；模型只选择允许的 tool call，框架负责校验参数并执行。
- 框架把 Observation 与证据 ID 写入本轮状态，达到证据充分或步骤/时间/费用上限后停止。

**收益**：天道智能体第一次变成真 Agent。

### 10.2 把单步 self-correct 升级成真 Reflexion

**改动**：
- 新增 `ReflectionMemory` 抽象（本地可先存 JSON，云端使用带用户隔离的数据库）。
- `answerWithCitations.ts` 失败时由校验器记录结构化失败原因，例如 `invalid_citation` 或 `insufficient_evidence`。
- 把这条反思**累积**到长期记忆，下次回答前 system prompt 自动注入过去 N 条反思。
- 失败超过 K 次就 hint "你总是引用 Sources 里没的页码，这次严格只用 Sources"。

**收益**：跨会话学习，失败越来越少。

### 10.3 加轻量 ReAct 循环

**目标**：让编排器执行“计划摘要 → Action → Observation → 证据判断 → 再行动或生成”的受控循环。

**改动**：
- system prompt 与工具策略规定何时可调用 `search_library / read_source_unit`，但允许普通闲聊直接回答。
- 框架侧最多循环 N 步，记录结构化 `{planSummary, action, observationSummary, evidenceIds}`，并设置超时、费用预算与取消机制。

**收益**：模型能拆解复杂问题，而不是拿到一堆 Sources 就硬答。

### 10.4 加 eval —— Agent 也需要体检

**目标**：量化"做对/做错"，把"我又用直觉调了一个 prompt"变成"回归测试覆盖率上升了 X%"。

**改动**：
- 实现 `docs/verification-plan.md` 提到的 7 项程序测试。
- 准备 20~50 个 QA，人工标注"好/坏"，跑全量。
- 跟踪指标：引用命中率、首次无需重试率、平均步数、平均 token。
- 至少先做引用命中率和拒绝答错的指标，这两个最影响用户感受。

**收益**：改动有依据，不会退步。

### 10.5 加 Memory 层

**目标**：Agent 记得"上次你跟这个用户聊到过什么 / 我犯过哪些错"。

**改动**：
- JSON / Supabase 表存 `(memory_type, content, created_at, user_id, consent)`。
- 每次回答前 topK 召回相关 memory，塞进 prompt。
- 用户侧：用户可以查 / 删除 / 编辑 memory。

**收益**：长期会话质量上升。

---

## 11. 概念清单（自检）

学完应该能口头解释：

| 概念 | 一句话 |
|---|---|
| LLM 调用 | 模型接 prompt 出 response，一次结束 |
| RAG | 先检索再生成，知识可更新、可追溯 |
| Agent | 在循环里自己决定工具和步骤，直到任务完成 |
| Tool use / Function calling | 模型输出"调用哪个函数 + 参数"，框架去执行 |
| Planning | 把大任务拆成步骤 |
| ReAct | 依据当前状态行动，观察结果后再决定下一步，直到 Final；产品展示结构化摘要而非私有思维链 |
| Reflexion | 失败后自我归因，把经验累积到下次 |
| Memory | 短期（prompt） + 长期（向量库/库文件） |
| Multi-agent | 多个 Agent 分工协作 |
| Self-correct | 失败后重试（不一定真反思） |
| Function schema | 工具的"说明书"（名字、参数、说明） |

---

## 12. 学完这套您能往哪走

按接下来 1~3 个月可走的路径：

1. **天道智能体内**：
   - 完成 10.1（加 tool use）—— 看一次模型自己跑工具
   - 完成 10.4（加 eval）—— 拿到基线指标
   - 完成 10.2（真 Reflexion）—— 让它跨会话积累教训
2. **横向类比**：
   - 用 LangChain / LlamaIndex 写一个简化版 RAG，对比实现差异。
   - 用 OpenAI Agents SDK 或 Anthropic tool use 文档，看官方 Agent 抽象长什么样。
3. **纵向深挖**：
   - 读 ReAct 原论文（Yao et al., 2022）、Reflexion 论文（Shinn et al., 2023）。
   - 看 LangGraph / AutoGen / CrewAI 源码，理解工程化细节。

---

## 13. 推荐补充阅读

- OpenAI Function calling 官方文档
- Anthropic Tool use（tool use / computer use）官方文档
- Lilian Weng 的博客："LLM Powered Autonomous Agents"
- ReAct 论文、Reflexion 论文
- LangChain / LangGraph 的 Agent 教程（对比实现思路）
