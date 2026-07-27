# 最小工具循环 × 执行轨迹面板 —— 实施设计（Phase 2 v1）

> 状态：**待评审**（kiko 确认后开工）
> 前置阅读：`docs/agent-blueprint.md`（目标架构）、`docs/agent-beginner-walkthrough.md` 第 9~10 节
> 范围：只覆盖 Phase 2 的最小可行版本 + 学习模式的执行轨迹面板。记忆、多 Agent、流式输出、后台任务均不在本期。

## 0. 一句话

把 `/api/chat` 从「入口固定检索一次 → 生成一次」改成「模型在受控循环里自己决定调 `search_library` / `read_source_unit`，攒够证据再生成三贤回答」，并把每一步记录成结构化执行轨迹，直接显示在 UI 里当教材。

完工判据（对齐蓝图的"已经是 Agent"验收标准的 v1 子集）：

- 模型能在允许清单内自主选择至少两个工具；
- 工具结果影响下一步动作（第一次检索不满意时会改写查询或读原文）；
- 有步数上限、超时、重复检测和取消；
- 每个事实性引用可回溯到本轮 Evidence Ledger；
- 资料不足时稳定停止，不编造；
- 执行轨迹可审计，但不暴露私有思维链。

## 1. 目标与非目标

| 做 | 不做（本期） |
|---|---|
| ToolRegistry：schema、参数校验、超时、结果截断 | 写文件 / 联网 / 发消息等副作用工具 |
| `search_library`、`read_source_unit`、`ready_to_answer` 三个工具 | `get_user_profile`、`calculate_bazi` 工具化（见 FAQ） |
| 受控取证循环：步数上限、总超时、重复检测、取消 | 会话持久化、长期记忆、Reflexion |
| Evidence Ledger + 现有引用校验（两道关） | 逐句证据覆盖率 Verifier |
| 执行轨迹（结构化）返回并在 UI 展示 | 轨迹落盘持久化（Phase 3 与会话一起做） |
| 保留旧 RAG 链路作对照模式 | 移除或重构现有 `answerWithCitations` |
| 学习模式接入：词条、导览、面板 data-tip | 新走读长文（M5 后单独写） |

## 2. 总体数据流

```text
用户问题 (+问者档)
      │
      ▼
POST /api/chat { question, userProfile, mode }
      │
      ├─ mode = "rag"  ──► answerQuestion()          ← 现有链路，不动，当对照组
      │
      └─ mode = "agent" ──► runAgentLoop()           ← 新增 src/core/agent/
                              │
                    ┌─────────┴──────────┐
                    │   取证循环 (≤6步)   │  调度者 prompt（非三贤人设）
                    │  模型选工具 → 框架执行 → Observation 回填
                    └─────────┬──────────┘
              search_library / read_source_unit / ready_to_answer
                    │
                    ▼
             Evidence Ledger（ev_1, ev_2 …）
                    │
                    ▼
             三贤生成（复用 buildMentorSystemPrompt，context 改由 Ledger 构造）
                    │
                    ▼
             引用校验 citationPolicy（现有逻辑，第二道关）→ 失败重试一次
                    │
                    ▼
     { answerMarkdown, citations, usedContext, trace } ──► ChatPanel + TracePanel
```

要点：**取证与生成分离**。取证循环用一个简短的"调度者"system prompt（不是三贤人设），只负责决定查什么、读什么、何时停；三贤人设只在最后生成阶段出场。这也是一个教学点：编排提示词与角色提示词是两回事。

## 3. 状态机

沿用蓝图定义，v1 实际使用其中子集：

```text
received → planning → tool_call → observing ─┐
              ▲                              │（证据不足且未达上限）
              └──────────────────────────────┘
                         │
                  evidence_ready
                         │
                      drafting → verifying → completed
                         │
                         └────────────► insufficient | failed | cancelled
```

| 终态 | 触发条件 | 用户看到什么 |
|---|---|---|
| `completed` | 生成并通过（或警告标注）引用校验 | 三贤回答 + 引用 + 轨迹 |
| `insufficient` | `ready_to_answer(sufficient=false)`，或循环结束时 Ledger 为空 | 现有"暂未入藏"文案 + 模型说明缺什么 + 轨迹 |
| `failed` | 工具/模型连续失败、协议解析失败重试后仍失败 | 明确错误信息 + 已有轨迹 |
| `cancelled` | 请求 AbortSignal 触发 | 前端静默丢弃 |

## 4. 工具层

### 4.1 ToolRegistry（`src/core/agent/toolRegistry.ts`）

```ts
export type ToolDefinition<Args> = {
  name: string;
  /** 给模型看的说明，中文，说清"何时该用我" */
  description: string;
  /** 给模型的 JSON Schema（手写；仅 3 个工具，不引 zod-to-json-schema 依赖） */
  inputJsonSchema: Record<string, unknown>;
  /** 运行时校验（zod 已在依赖里） */
  argsSchema: z.ZodType<Args>;
  /** 单次执行超时 */
  timeoutMs: number;
  /** 单轮最多调用次数（防刷） */
  maxCallsPerRun: number;
  execute(args: Args, ctx: ToolContext): Promise<ToolResult>;
};

export type ToolResult = {
  /** 回给模型的 Observation 文本（已截断、已脱敏） */
  observationForModel: string;
  /** 程序生成的一行摘要，进轨迹（不含模型文本） */
  observationSummary: string;
  /** 本次新增的证据（可为空） */
  evidence: EvidenceItem[];
};
```

框架职责（模型永远不直接执行）：zod 校验失败 → 把错误文本作为 Observation 回给模型（它有一次修正参数的机会，计入步数）；超时 → `Promise.race`，记 error 进轨迹；结果截断 → 上限见各工具。

### 4.2 v1 工具清单

**`search_library`** —— 检索私人典籍库

| | |
|---|---|
| 输入 | `{ query: string(≤200字), topK?: 1..8 =5, tradition?: string }` |
| 实现 | 复用 `retrieveContext.searchChunks()`（embedding + 本地向量库）；`tradition` 过滤：先取 `topK*3` 再按 `VectorRecord.tradition` 过滤（`localJsonVectorStore.search` 暂不支持谓词，记为已知取舍） |
| 回给模型 | 每条：`ev_N`、书名、章节、分数（两位小数）、text 前 300 字 |
| 证据 | 命中即入 Ledger（按 chunkId 去重） |
| 约束 | timeout 15s；每轮最多 4 次 |

**`read_source_unit`** —— 读某来源单元完整原文

| | |
|---|---|
| 输入 | `{ documentId: string, pageNumber: number }` |
| 实现 | 复用 `documentRepository.getPageByDocumentAndNumber()`（与 `/api/documents` 预览同源） |
| 回给模型 | 原文，上限 6000 字，截断时标注「（已截断）」 |
| 证据 | 整页入 Ledger（`unit` 类型，与 chunk 证据同格式） |
| 约束 | timeout 5s；每轮最多 3 次；`documentId` 必须来自本轮已出现的检索结果（防模型瞎猜 ID，也是提示注入面收窄） |

**`ready_to_answer`** —— 显式收尾（教学上很关键：让"停"成为看得见的决定）

| | |
|---|---|
| 输入 | `{ sufficient: boolean, missing?: string(≤100字) }` |
| 行为 | `sufficient=true` → `evidence_ready`，进入三贤生成；`false` → `insufficient` 终态，`missing` 展示给用户（如"库中暂无关于大运流年的典籍"） |

### 4.3 明确不做的工具与原因

- `get_user_profile`：问者档现在整体注入三贤 system prompt，取证循环拿不到也不需要（查询决策极少依赖生辰）。**取证循环刻意不接触出生信息**——这既是简化也是隐私边界，写进调度者 prompt。
- `calculate_bazi` / `get_current_luck_cycle`：排盘已在问者档保存时确定性算好并随 profile 注入。等出现"模型需要临时算另一个年份"的真实用例再工具化（蓝图 Phase 2 后半）。

## 5. 模型协议：原生 tool use 优先，JSON 协议兜底

| | 方案 A：Anthropic 原生 tool use | 方案 B：JSON 行动协议（prompt 约定） |
|---|---|---|
| 做法 | `/v1/messages` 带 `tools` 参数，读 `tool_use` block，回 `tool_result` | system prompt 约定模型只输出 `{"action":…,"args":…}`，框架解析 |
| 优点 | 业界标准契约，值得学；参数结构化可靠 | 端点零依赖；机制全透明，教学直观 |
| 风险 | MiniMax `/anthropic` 端点对 `tools` 的支持需实测 | 模型 JSON 纪律不稳，需容错解析+重试 |

**设计决策**：抽一层 `ToolTransport` 接口把协议隔离，Orchestrator 不感知差异：

```ts
export interface ToolTransport {
  /** 发送对话+工具清单，返回：要么一次工具调用请求，要么收尾信号 */
  step(input: {
    system: string;
    turns: TransportTurn[];       // user 问题 + 历次 tool 调用与结果
    tools: ToolDefinition<unknown>[];
    signal: AbortSignal;
  }): Promise<
    | { kind: "tool_call"; name: string; args: unknown; planSummary: string }
    | { kind: "no_tool"; text: string }   // 视为异常收尾，见 6.3
  >;
}
```

M0 用一个 30 秒探测脚本（`scripts/probe-tool-support.ts`）实测端点：支持 → 实现 `AnthropicToolTransport`（主推）；不支持 → 实现 `JsonProtocolTransport`。两者都很薄（~150 行），后续甚至可以都留着，学习模式里对比两种机制。

`planSummary` 的来源：要求模型在每次工具调用前输出 ≤40 字的一句话计划（原生协议下取 `tool_use` 同返回的 text block；JSON 协议下是 `plan` 字段）。**轨迹只存这一句**，不存任何长推理文本——对齐蓝图"不暴露私有思维链"。

## 6. Orchestrator（`src/core/agent/orchestrator.ts`）

### 6.1 入口签名

```ts
export async function runAgentLoop(input: {
  question: string;
  userProfile: UserProfile | null;   // 只进三贤生成，不进取证循环
  signal?: AbortSignal;
  transport?: ToolTransport;         // 测试时注入 ScriptedTransport
  limits?: Partial<AgentLimits>;
}): Promise<AgentAnswer>;            // = RagAnswer + { trace: AgentTrace }
```

### 6.2 循环伪代码

```ts
const ledger = new EvidenceLedger();          // ev_N ↔ VectorSearchResult 形状
const trace = new TraceRecorder(question);
const seen = new Set<string>();               // 重复调用检测：hash(name + JSON(args))

while (trace.steps < limits.maxSteps) {
  checkAbort(); checkWallClock();             // cancelled / timeout 终态
  const decision = await transport.step({ system: GATHERING_PROMPT, turns, tools, signal });

  if (decision.kind === "no_tool") break;     // 6.3：异常收尾，带着已有证据去生成
  if (decision.name === "ready_to_answer") { /* sufficient? 生成 : insufficient */ }

  const key = hashCall(decision);
  if (seen.has(key)) { trace.stop("repeated_call"); break; }
  seen.add(key);

  const result = await registry.run(decision.name, decision.args, ctx);  // 校验+超时+截断
  ledger.add(result.evidence);
  trace.record({ planSummary: decision.planSummary, tool: decision, result });
  turns.push(toolResultTurn(decision, result.observationForModel));
}

// 生成阶段：ledger 为空 → insufficient；否则 buildContext(ledger.records())
// + buildMentorSystemPrompt/buildMentorUserPrompt（含问者档）→ 三贤回答
// → validateCitations(answer, ledger.records())，失败按现逻辑重试一次
```

### 6.3 停止条件一览

| 条件 | 默认值 | 触发后 |
|---|---|---|
| 最大步数（工具调用次数） | 6 | 带现有证据进入生成；Ledger 空则 insufficient |
| 单工具超时 | search 15s / read 5s | 记 error，Observation 告知模型，继续循环 |
| 单次模型调用超时 | 45s | 重试 1 次，再失败 → failed |
| 总墙钟预算 | 90s | 同最大步数处理 |
| 重复调用（同工具同参数） | 第 2 次即停 | 同最大步数处理，stopReason=repeated_call |
| `ready_to_answer(sufficient=false)` | — | insufficient，透出 missing |
| 模型不调工具直接输出文本 | — | **丢弃该文本**（防止取证阶段偷跑答案），带现有证据进入正式生成 |
| 用户取消（AbortSignal） | — | cancelled |

限额全部收敛在一个 `AgentLimits` 对象，可用环境变量覆盖（如 `AGENT_MAX_STEPS`），方便学习模式里做"把步数上限改成 1 看看会怎样"这类实验。

### 6.4 Evidence Ledger（`src/core/agent/evidenceLedger.ts`）

- `add()` 按 chunkId/pageId 去重，顺序分配 `ev_1, ev_2 …`；
- 记录形状与 `VectorSearchResult` 对齐（书名/章节/页码/text/score），因此 `buildContext()` 与 `validateCitations()` **原样复用**——引用校验从"对本轮 top10"升级为"对全循环证据台账"，语义正好更对；
- 每条证据带 `addedAtStep`，轨迹面板可以画出"这条引用来自第几步、哪个工具"。

## 7. 执行轨迹（`src/core/agent/types.ts`）

```ts
export type AgentTrace = {
  runId: string;
  mode: "agent";
  startedAt: string;
  durationMs: number;
  stopReason: "ready" | "max_steps" | "timeout" | "repeated_call"
            | "insufficient" | "no_tool" | "cancelled" | "failed";
  finalState: "completed" | "insufficient" | "failed" | "cancelled";
  steps: TraceStep[];
  totals: { toolCalls: number; evidenceCount: number; modelCalls: number };
};

export type TraceStep = {
  index: number;
  phase: "plan" | "tool" | "draft" | "verify";
  planSummary?: string;              // 模型的一句话计划（≤40字）
  toolName?: string;
  toolArgs?: Record<string, unknown>; // 已截断；不含任何密钥/生辰
  observationSummary?: string;        // 程序生成，如「命中5条，最高0.82《存在与虚无》第二章 自欺」
  evidenceIds?: string[];
  durationMs: number;
  error?: string;
};
```

记什么 / 不记什么（对齐蓝图可观测性一节）：

| 记 | 不记 |
|---|---|
| 计划摘要（模型一句话） | 模型任何长推理文本 |
| 工具名、参数、耗时、错误 | API Key、完整出生信息 |
| 程序生成的观察摘要、证据 ID、分数 | 典籍原文全文（轨迹里只留书名+章节） |
| 停止原因、各阶段耗时 | —— |

v1 轨迹随响应返回、只活在前端内存；持久化等 Phase 3 会话一起做。

## 8. API 变化（`src/app/api/chat/route.ts`）

```jsonc
// 请求（新增 mode，缺省 "agent"；旧客户端不传也向后兼容）
{ "question": "…", "userProfile": { }, "mode": "agent" | "rag" }

// 响应（agent 模式新增 trace；rag 模式字段与现在完全一致）
{ "answerMarkdown": "…", "citations": [], "usedContext": [], "trace": { } }
```

- route 里按 mode 分发到 `runAgentLoop()` 或现有 `answerQuestion()`；
- 把 `request.signal` 传进循环（Next.js route handler 原生支持）；
- 保留 rag 模式的意义：出问题时的回退保险 + 学习模式里"同一问题、两种链路"的对照实验。

## 9. 前端：TracePanel 与学习模式接入

### 9.1 TracePanel（`src/components/TracePanel.tsx`）

- 挂在每条 assistant 回合（`AssistantRound`）末尾的折叠区：`执行轨迹 · N 步 · X.Xs · 停止原因`；
- 展开后是步骤时间线，每步一行：相位徽标（计划/工具/观察/证据）+ 计划摘要 + 工具名(参数摘要) + 观察摘要 + 新增 `ev_N` 徽标；点击 `ev_N` 滚动到对应引用（复用 CitationList 的来源打开能力）;
- `insufficient` / 截断 / 超时等异常状态用明显但不刺眼的标注；
- 样式并入 `globals.css` 现有茶寮视觉（朱批感），不新开 css 文件。

### 9.2 学习模式联动

- 学习模式开启时：TracePanel **默认展开**，且每个元素带 `data-tip`（复用现有全局 tooltip 机制，零新框架）；
- `concepts.ts` 新增词条（各标 `where` 指向新文件）：`Tool use`（更新现有词条为"已接入"）、`ToolRegistry`、`Orchestrator`、`Observation`、`Evidence Ledger`、`停止条件`、`ReAct`、`调度者 prompt`；
- `tour.ts` 新增 2 步：提交问题后指向轨迹面板（"这就是 ReAct 循环的一步"）、指向 ev 徽标（"引用可以回溯到取证步骤"）；
- ChatPanel 输入区加一个小小的 `Agent / RAG` 模式切换（学习模式下带 data-tip 解释两者差别）。

## 10. 测试计划

### 10.1 单元测试（无需任何 API Key —— 本身就是教学点）

`ScriptedTransport implements ToolTransport`：按脚本吐出预设决策序列，让循环行为完全确定。

| 用例 | 断言 |
|---|---|
| 检索→读原文→ready(true) 的顺畅路径 | 状态流转、Ledger 2 条、trace 步数=3、completed |
| 连续 7 次工具调用 | 第 6 步后停，stopReason=max_steps |
| 同参数重复检索 | 第 2 次即停，stopReason=repeated_call |
| ready_to_answer(sufficient=false) | insufficient，missing 透出 |
| 工具参数不合法（zod 拒绝） | 错误作为 Observation 回给模型，计步，循环未崩 |
| 工具超时 | error 进轨迹，循环继续 |
| 取证阶段模型直接输出长文 | 文本被丢弃，进入生成阶段 |
| Ledger 为空走到生成 | 返回现有"暂未入藏"文案 |
| 引用校验 | 复用现有 `citationPolicy.test.ts`，输入源换成 Ledger 记录 |

### 10.2 手工端到端验收（对齐 `verification-plan.md` Agent 阶段 1~5）

1. "怎么理解自欺？给出处" → 轨迹显示 ≥1 次 `search_library`，引用可打开原文；
2. 追问一个首轮检索必然不足的问题 → 能看到改写查询或 `read_source_unit` 的第二步；
3. "我明年一定暴富吗" → `insufficient` 或拒绝必然性预测，无编造引用；
4. 断网/错 Key → failed 终态信息明确；
5. RAG/Agent 切换对照：同一问题两种模式，轨迹面板差异肉眼可见。

## 11. 文件改动清单

**新增（估算 ~1100 行，全部无新依赖，zod 已在 package.json）**

| 文件 | 内容 | 约 | 对应学习点 |
|---|---|---|---|
| `src/core/agent/types.ts` | Trace/Evidence/Limits 类型 | 90 | 可观测性数据建模 |
| `src/core/agent/toolRegistry.ts` | 注册表+校验+超时+截断 | 130 | Function schema、防御性执行 |
| `src/core/agent/tools/searchLibrary.ts` | 检索工具 | 80 | RAG 变成 Agent 的一个工具 |
| `src/core/agent/tools/readSourceUnit.ts` | 读原文工具 | 70 | 检索命中后核对上下文 |
| `src/core/agent/tools/readyToAnswer.ts` | 收尾工具 | 30 | 停止条件显式化 |
| `src/core/agent/transport.ts` | ToolTransport + Anthropic 实现（+JSON 兜底） | 160 | 原生 tool use 报文 |
| `src/core/agent/evidenceLedger.ts` | 证据台账 | 60 | Evidence Ledger |
| `src/core/agent/orchestrator.ts` | 受控循环 | 200 | ReAct、状态机 |
| `src/core/agent/orchestrator.test.ts` | ScriptedTransport 单测 | 220 | 不用 API 也能测 Agent |
| `src/components/TracePanel.tsx` | 轨迹面板 | 150 | 执行轨迹产品化 |
| `scripts/probe-tool-support.ts` | M0 端点探测 | 50 | 端点能力实测 |

**修改**

| 文件 | 改动 |
|---|---|
| `src/app/api/chat/route.ts` | mode 分发、signal 透传、trace 返回 |
| `src/components/ChatPanel.tsx` | 模式切换、trace 传入 TracePanel |
| `src/data/concepts.ts` | +8 词条 |
| `src/data/tour.ts` | +2 步 |
| `src/app/globals.css` | TracePanel 样式 |
| `docs/roadmap.md` | Phase 2 勾选进度（M5） |
| `docs/agent-beginner-walkthrough.md` / `README.md` | 现状描述更新（M5） |

## 12. 实施顺序（每个里程碑完成即可运行）

| 里程碑 | 内容 | 完成后你能看到什么 |
|---|---|---|
| **M0** | 跑 `probe-tool-support.ts` 探测 MiniMax `/anthropic` 端点是否支持 `tools` | 终端一行结论，决定方案 A/B（需要真实 CHAT_API_KEY，在你本机跑） |
| **M1** | ToolRegistry + 三个工具 + 单测 | `npm test` 绿；还没有循环 |
| **M2** | Orchestrator + ScriptedTransport 全套单测 | 不花一分钱 token，循环行为全部可断言 |
| **M3** | 真实 Transport + `/api/chat?mode=agent` | curl 一次，JSON 里第一次出现真实 trace——项目成为 Agent 的时刻 |
| **M4** | TracePanel + 学习模式词条/导览/模式开关 | UI 里亲眼看模型每一步决策 |
| **M5** | 手工验收 5 场景 + 文档更新 + roadmap 勾选 | Phase 2 v1 收口 |

## 13. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| MiniMax `/anthropic` 不支持 `tools` | 方案 A 不可行 | M0 先探测；JSON 兜底 Transport 设计已就位 |
| 延迟上升（最坏 6 取证 + 1 生成 + 1 重试 = 8 次调用） | 体验变慢 | 步数默认保守；调度者 prompt 要求"够用即收"；轨迹面板让等待可解释；流式属后续 |
| Token 成本上升 | 费用 | topK/步数上限；trace.totals 里记 modelCalls，成本可见化 |
| 模型 JSON/工具纪律差、死循环 | 循环失控 | zod 拒绝回喂、重复检测、步数/墙钟双上限 |
| 取证阶段偷跑最终答案 | 泄漏未校验内容 | 该文本一律丢弃，仅正式生成产物可见 |
| 典籍内容提示注入（"忽略以上指令"） | 越权工具调用 | v1 面已收窄（只读工具 + documentId 白名单）；注入测试样例进 M5 验收，完整隔离在 Phase 1 backlog |

## 14. 设计取舍 FAQ

**为什么不用 LangChain / LangGraph？** 学习目标优先：手写 ~1100 行能看清每个零件，框架会把最有价值的部分黑盒化。零新增依赖也符合本仓库"本地优先、依赖极简"的既有风格。学完 v1 后再去读 LangGraph 源码，会知道它在替你做什么。

**为什么三贤仍是一次生成？** 蓝图明确：多 Agent 必须由评测数据驱动，而不是为了形式上"像 Agent"。v1 先把取证循环做稳，三贤结构化输出与拆分是 Phase 4。

**为什么问者档不进取证循环？** 查询决策几乎不依赖生辰；出生信息是敏感数据，少经过一个环节就少一分泄漏面。三贤生成阶段照旧完整可见。

**为什么保留 RAG 模式？** 一是回退保险，二是它是最好的对照教材：同一问题切换两种模式，轨迹面板的差异就是"RAG 与 Agent 的边界"这堂课本身。

**`ready_to_answer` 是不是多余？让模型不调工具就算结束不行吗？** 行为上可以，但显式收尾工具让"停"变成轨迹里看得见的一步（含 sufficient 判断和缺口说明），这正是蓝图"判断证据是否足够"的落点，教学价值大于那 30 行代码。

---

**评审时请重点看三处**：① 第 5 节协议决策（M0 探测脚本需要你本机跑，30 秒出结果）；② 6.3 停止条件默认值是否符合直觉；③ 第 9 节模式开关交互（Agent 默认开、可切回 RAG 对照）。其余按表施工。
