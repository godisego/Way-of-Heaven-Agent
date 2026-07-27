# 技术选型全解 —— 我们用什么、为什么、放弃了什么

> 这份文档为学习而写：每项技术回答四个问题——**它是什么 / 我们怎么用 / 为什么选它 / 放弃了什么、为什么**，并给出学习线索。
> 配套阅读：`rag-concepts-primer.md`（RAG 概念）、`agent-beginner-walkthrough.md`（Agent 概念）、`agent-loop-design.md` 与 `mentor-libraries-and-bazi-design.md`（两份实施设计）。

## 0. 全景图：这个项目由六层组成

```text
┌─ 界面层    Next.js + React：茶寮对谈 / 问者档 / 藏书阁 / 学习模式
├─ Agent 层  （蓝图中）手写最小工具循环：模型自主决定检索与停止
├─ RAG 层    切块 → Embedding → 向量检索(分库过滤) → 引用校验
├─ 规则层    命理规则引擎：排盘 / 词条库 / 解释组合器 / 命理简报（无模型参与）
├─ 模型层    Anthropic 兼容对话接口 + OpenAI 兼容 Embedding 接口
└─ 数据层    本地 JSON（元数据+向量索引）→ 可选单向同步 Supabase
```

贯穿全项目的选型总原则只有三条：**本地优先**（隐私敏感数据不离开你的机器）、**确定性优先**（能用代码算准的绝不交给模型猜）、**学习优先**（能手写看懂的不引框架黑盒）。下面每一个"为什么不用 X"几乎都能归结到这三条。

---

## 1. 语言与应用框架

### TypeScript
**是什么**：带静态类型的 JavaScript。
**怎么用**：全仓库唯一语言——前端、API、排盘算法、规则引擎、测试。
**为什么**：一门语言打通全栈，学习心智负担减半；类型系统在排盘这种"查表+规则"密集的代码里是刚需（`WuXing`、`MentorId`、`MingliSelection` 这类联合类型让错误在编译期暴露）。
**放弃了什么**：Python 后端 + JS 前端的双语言架构——RAG 教程大多用 Python，但双语言意味着两套依赖、两个进程、跨进程通信，与"本地优先的单机应用"相悖；且 Node 生态里 embedding 调用、向量计算、PDF 解析都齐全。
**学习线索**：重点看 `src/core/` 里类型如何约束业务（如 `documentTypes.ts` 的状态机类型）。

### Next.js 15（App Router）+ React 19
**是什么**：React 全栈框架，前端页面与后端 API 同一个工程、同一个进程。
**怎么用**：页面在 `src/app/page.tsx`，后端在 `src/app/api/*/route.ts`（ingest/documents/search/chat 四个路由）。
**为什么**：单进程同仓——`npm run dev` 一条命令起全部；API Routes 让"浏览器不能直接干的事"（读写磁盘、调有密钥的模型接口）天然放在服务端，密钥不泄漏到前端。
**放弃了什么**：Vue/Svelte（生态与本项目已有代码不匹配，无关优劣）；Express/Fastify 独立后端（多一个服务要起要维护）；Electron 桌面壳（浏览器访问 localhost 已够用，将来要发桌面版再包）。
**学习线索**：对照 `src/app/api/chat/route.ts`（薄路由）与 `src/core/retrieval/answerWithCitations.ts`（厚逻辑）——「路由只做参数与错误处理，业务在 core」是这个仓库的分层纪律。

---

## 2. 模型接入层

### Anthropic /messages 兼容接口（默认 MiniMax-M3）
**是什么**：Anthropic 的对话 API 报文格式已成为事实标准之一，多家厂商提供兼容端点。
**怎么用**：`anthropicProvider.ts` 用原生 `fetch` 直接 POST `/v1/messages`，`CHAT_BASE_URL`/`CHAT_MODEL` 环境变量随时换模型。
**为什么**：**接口兼容层而非厂商 SDK** 意味着换模型只改 `.env`，不改代码；未来接原生 tool use 也在这一层做。
**放弃了什么**：官方 SDK 锁定（`@anthropic-ai/sdk` 等——功能全但把你绑在一家）；LiteLLM/One-API 网关（解决同样问题，但多起一个常驻服务，单机应用不值得）。
**学习线索**：`llmProvider.ts` 的接口定义 → `anthropicProvider.ts` 的实现，这是「依赖倒置」最小示例；`agent-loop-design.md` 第 5 节的 ToolTransport 是它的进阶版。

### OpenAI 兼容 /embeddings（text-embedding-3-large，3072 维）
**是什么**：把文本变成语义向量的接口；OpenAI 的 embeddings 报文格式同样是兼容标准。
**怎么用**：入库时批量向量化 chunk，提问时向量化问题，`USE_MOCK_EMBEDDING=1` 可切到本地哈希假向量做零成本联调。
**为什么**：兼容格式可替换（ggniao 等中转、或将来本地 embedding 服务）；mock 通道让「不花一分钱跑通全链路」成为可能——这对学习项目很重要。
**放弃了什么**：本地开源 embedding 模型（bge-m3 等，质量已可用，但要再管一个模型运行时；留作后续可选 Provider）；每家 SDK。
**学习线索**：`openAICompatibleProvider.ts`（真）与 `mockEmbeddingProvider.ts`（假）实现同一接口——测试替身（test double）思想的实物。

---

## 3. RAG 检索层（核心）

### 切块策略：固定窗口 1200 字 + 重叠 160 字，**绝不跨来源单元**
**是什么**：把长文切成检索粒度的小段。
**为什么这么切**：「不跨页/不跨章节」是本项目引用可核验的根基——每个 chunk 永远能指回「某书第 N 页/某章节」，这换来了产品命门：`[《书名》, 位置]` 可翻开原文。
**放弃了什么**：语义切块（按句义聚类，检索略优但来源边界模糊）；递归字符切块（LangChain 默认，同样问题）。
**学习线索**：`chunkPages.ts` 不到 50 行，是理解「chunk 为什么带 sourceFileName/pageNumber/chunkId」的入口。

### 本地 JSON 向量索引 + 余弦相似度
**是什么**：把所有向量存成一个 JSON 文件，检索时全量算余弦排序。
**为什么**：个人书库量级（几千~几万 chunk）下暴力检索毫秒级完成；文件可 `cat` 可 diff，出问题肉眼可查——**教学透明度最高的向量库**。
**放弃了什么**：FAISS/Chroma/Milvus/Qdrant（近似最近邻 ANN 索引，百万级向量才需要，代价是又一个服务/原生依赖）；Pinecone 等托管服务（数据出机器，违反本地优先）。**切换时机已写死**：数据量大到检索可感知变慢，切 Supabase pgvector（schema 已备好）。
**学习线索**：`localJsonVectorStore.ts` 的 `cosineSimilarity` 十几行——向量检索祛魅时刻：所谓语义搜索就是这点数学。

### 分库检索 = 元数据过滤（V1 实施中）
**是什么**：检索时按 chunk 的 `tradition` 标签过滤，三贤各查各的专库。
**为什么**：一次 embedding 三路过滤，零额外成本、零索引重建，就实现了"李不碰《周易》"的知识权属——这是**工程手段解决角色纪律**的典型：不指望提示词自觉，用过滤器和校验器硬约束。
**放弃了什么**：三套独立向量库（三倍存储与维护，共享文档还要存三份）。
**学习线索**：`mentor-libraries-and-bazi-design.md` 第 2-4 节。

### 引用校验工程：正则解析 + 整组作废 + self-correct
**是什么**：程序验证回答中每个 `[《书名》, 位置]` 是否真来自本轮检索；一条假引用整组作废并重试一次。
**为什么**：反幻觉不能只靠提示词。「一条假引用整组作废」是刻意的严规则——防止模型用真引用夹带假引用蒙混。V1 还将升级为按发言人校验（越库即废）。
**放弃了什么**：逐句语义蕴含校验（用模型判断"这句话是否被该片段支持"——更强但又贵又引入第二个模型的幻觉面；蓝图 Phase 4 以 Evidence Ledger + Verifier 形态再做）。
**学习线索**：`citationPolicy.ts` 全文 + `citationPolicy.test.ts`。

### 计划中的 Advanced RAG 四件套（roadmap Phase 1）
**BM25 关键词混合检索**（中文典籍的精确术语如"需卦""自欺"，纯向量召回不稳，关键词命中是刚需）、**最低相关性阈值**（低于线直接答"暂未入藏"）、**邻页扩展**（命中第 42 页则连带 41/43 供核对）、**rerank**（粗召回后精排序）。这四件是性价比最高的检索升级，优先级高于任何范式更换。

### 为什么不用 LangChain / LlamaIndex
它们是优秀的**生产加速器**，但会把本项目最有学习价值的部分（检索循环、prompt 组装、引用校验）藏进抽象层；依赖树庞大；且我们的引用校验、分库规则都是非标定制，用框架反而要绕。**结论：学习期手写，学完再读它们源码印证。**

### 为什么不用 LightRAG / GraphRAG / PathRAG（图谱式 RAG）
图谱式把文档抽取成实体关系图再检索，强项是海量文档的全局主题问题；弱项恰是我们的命门——**答案难以落回"第 42 页"**。加上索引期要烧大量 LLM 调用、个人书库量级用不上，故不选。**触发重估的条件已写死**：藏书数百卷 + 出现跨书主题类问题 + 评测显示召回不足，届时以 `search_graph` 第二工具形态加入。另：PIR-RAG（隐私检索）要解决的问题被"本地优先"直接消解——数据不出机器，无需密码学保护检索意图。

---

## 4. Agent 层（蓝图，`agent-loop-design.md`）

### 手写最小工具循环（Pi 哲学）
**是什么**：Agent 的本体 = 「感知→推理→行动」受控循环；我们的实现是 ToolRegistry + Orchestrator（约 200 行）+ 三个只读工具 + 事件流轨迹。
**为什么手写**：与 2026 年 Pi agent harness 的主张同源——内核小到一次读完，MCP/子代理/沙箱都是外置扩展。手写让你真正看懂「模型怎么选工具、何时停」；执行轨迹面板顺势成为学习模式教材。
**放弃了什么**：LangGraph/AutoGen/CrewAI（把循环藏进框架，学习价值归零；多代理须由评测驱动——蓝图原则）；OpenAI Agents SDK / Claude Agent SDK（厂商耦合；但它们的文档值得读，抽象设计是好教材）。
**学习线索**：`agent-loop-design.md` 全文，特别是停止条件表（6.3）——Agent 工程一半的功夫在"怎么停"。

---

## 5. 命理规则层（非 RAG、非 Agent 的第三种系统）

### lunar-javascript（历法与干支库）
**是什么**：成熟的农历/节气/干支开源库。
**怎么用**：四柱排盘（立春切年、节气切月）、大运起运的节气距离计算。
**为什么**：**节气是天文计算**（太阳黄经），自己写是深坑且必错；库久经验证。我们只在其上封装口径（晚子时流派、起运换算、真太阳时）。
**放弃了什么**：手写历法（错一个节气全盘皆错）；调命理网站 API（数据出机器+不可审计）。
**学习线索**：`baziCalculator.ts` 头部注释列了全部口径决策；`lunar-javascript.d.ts` 是「给无类型库补声明」的示例。

### 自研规则引擎（查表 + 生克规则，模型零参与）
**是什么**：十神推导、旺相休囚死、通根、强弱粗评、干支关系（盖头/截脚）、命理简报——全部是确定性代码。
**为什么**：**排盘结果必须可审计**。模型算十神会错、会编神煞；代码查表永远一致。模型的职责被严格限定在"解读既定结果"（命理简报的【使用规则】条款）。这是本项目最重要的架构决策：**符号系统管事实，语言模型管表达**。
**放弃了什么**：让模型直接排盘解盘（幻觉不可控，且每次答案不同——对照组实验你可以自己做：把生辰直接丢给任何大模型排盘，看它错多少）。
**学习线索**：`shiShenOfGan`（60 行读懂十神本质）→ `explainChart.ts` 的 `roughStrength`（规则如何叠加成结论）→ `chartBrief.ts`（事实如何打包给模型）。

### 手工知识图谱（mingliKb，71 词条互链）
**是什么**：天干/地支/十神/宫位/神煞词条库，词条间以 links 交叉引用。
**为什么手工而非 LLM 抽取**：命理术语量小而精（不到百条），手工编写准确率 100%、口径可控（通行主流），LLM 抽取（LightRAG 式）在这个量级纯属杀鸡用牛刀且引入错误。
**学习线索**：`mingliKb.ts` 的数据即文档；`explainChart.ts` 是"静态词条 × 动态盘面"的组合器模式。

---

## 6. 文档解析层

### pdfjs-dist
**是什么**：Mozilla 的 PDF 解析库（Firefox 内置阅读器同源）。
**怎么用**：按页提取文本层，页码即来源锚点。
**放弃了什么**：pdf-parse（不给分页粒度）；商业解析 API（数据出机器）。
**局限与计划**：扫描件无文字层读不出——roadmap 已列 OCR 兜底（tesseract.js 本地识别）；另计划 EPUB/DOCX 解析、网页抓取（readability 抽正文 + 本地快照存档，快照才可核验）。三者都是**入库适配器**：解析成「来源单元」后走完全相同的切块-索引管线，检索层零改动。

---

## 7. 数据层

### 本地 JSON 元数据库（data/app.json）
**为什么**：单用户 MVP 下，可读、零依赖、出问题直接打开看。**边界已知**：无事务、无并发锁——写入损坏风险真实存在，roadmap 已列原子写入/SQLite 升级。
**放弃了什么**：一上来就 SQLite/Postgres（多一层工具链，MVP 期学习噪音）；浏览器 localStorage 存业务数据（问者档暂存于此是已知妥协，Phase 3 会话持久化时一并迁移）。

### Supabase（可选云端：Postgres + pgvector + Storage）
**是什么**：开源的 BaaS，本项目用它做**单向同步的云端快照**。
**为什么**：将来要多端/分享时，pgvector 让向量检索直接在数据库里做（`match_chunks` RPC 已写好）；行级安全（RLS）是多用户隔离的正道。**当前边界**：service-role 只在服务端用，公网部署前必须补 Auth/RLS/限流（README 有明确警告）。
**放弃了什么**：Firebase（无 pgvector、锁定更深）；自建 Postgres（运维成本）；一开始就上云（隐私与学习优先，本地跑通再说）。

---

## 8. 工程与学习模式

**vitest**：测试框架，原生 TS 支持、快。所有规则引擎与校验逻辑都有关系式断言测试（不硬编码背出来的干支——测试策略本身也是教材：断言"晚子时 next-day 的日柱=次日凌晨的日柱"这种恒真关系，而不是记忆值）。
**zod**：运行时数据校验，当前预留——工具循环 M1 将用它校验模型传来的工具参数（模型输出不可信，边界必须验）。
**driver.js + 自研 tooltip**：学习模式的导览与词条悬浮。自研 tooltip 而非组件库：单一 DOM 节点全局复用，60 行搞定，引组件库为一个提示框不值。
**ESLint 9 + tsc --noEmit**：风格与类型双门禁，`npm run typecheck && npm run lint && npm test && npm run build` 是每次提交的完整体检。

---

## 9. 「何时改选」触发表

| 触发条件 | 升级动作 |
|---|---|
| 检索可感知变慢 / chunk 上十万 | 本地 JSON 向量索引 → Supabase pgvector（或 SQLite+sqlite-vec） |
| data/app.json 出现写坏 | JSON 元数据 → SQLite（事务） |
| 藏书数百卷 + 跨书主题问题 + 评测召回不足 | 加 `search_graph` 图谱检索作为第二工具 |
| 多用户/公网部署 | Supabase Auth + RLS + 限流 + 后台任务（roadmap Phase 6） |
| 评测证明单次生成三贤串味不可治 | 拆三次模型调用（蓝图 Phase 4，评测驱动） |
| 需要离线 embedding | 增加本地 embedding Provider（接口已就位） |

---

## 10. 建议学习路径（按层读代码）

1. **RAG 层**（配 `rag-beginner-walkthrough.md`）：`chunkPages.ts` → `localJsonVectorStore.ts` → `retrieveContext.ts` → `answerWithCitations.ts` → `citationPolicy.ts`
2. **规则层**：`baziCalculator.ts`（先读头注释）→ `shiShenOfGan` → `explainChart.ts` → `chartBrief.ts` → `mingliKb.ts`
3. **模型层**：`llmProvider.ts` → 两个 Provider 实现 → `mentors.ts` 的 prompt 组装
4. **Agent 层**（配 `agent-beginner-walkthrough.md`）：先读 `agent-loop-design.md`，实现落地后对照执行轨迹面板看真实循环
5. **对照实验**：开 `USE_MOCK_EMBEDDING=1` 看检索质量塌掉多少——一次实验胜过十页 embedding 原理
