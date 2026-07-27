# 三贤分库 × 命理注入 —— 实施设计（v1）

> 状态：**待评审**（kiko 确认后开工）
> 已定决策：命理简报按「胡全量 · 玄气机 · 李不碰」分发；越库引用整组作废重试；未标注传统的文档三人共享。
> 前置阅读：`docs/architecture.md`（当前检索链路）、`docs/agent-loop-design.md` 第 4.2 节（`search_library` 的 `traditions` 参数——本设计做好的分库检索函数将被工具循环直接复用）。

## 0. 一句话

检索按三贤专库分三路取证、Sources 分区标注归属、引用按「发言人 × 专库」校验（越库即整组作废）；排盘结果由规则引擎组装成确定性「命理简报」，按人设深度分发——老胡看全量、玄看气机、李不接触——模型只解释既定结果，不自行推算。

## 1. 目标与非目标

| 做 | 不做（本期） |
|---|---|
| 传统标签 → 三贤权属关系表（单一事实源） | 拆成三次模型调用（仍单次生成，见 FAQ） |
| 向量检索加过滤谓词，三路分库取证 | 重建向量索引（索引格式不变，零迁移） |
| Sources 按专库分区 + 越库校验 + 定向重试 | Supabase `match_chunks` 多传统参数（记 backlog） |
| 命理简报三档（胡全量/玄气机/李隔离） | 简报事实的独立 Verifier（记 backlog，蓝图 Phase 4） |
| 藏书阁归属徽标 | 上传界面改动（标签芯片文案照旧） |

## 2. 权属模型（关系知识库）

**单一事实源仍是 `mentors.ts` 的 `traditions` 字段**，新增一个派生函数而不是第二张表：

| 传统标签 | 归属 | 说明 |
|---|---|---|
| existentialism 存在主义 | 李 | 现状不变 |
| stoicism 斯多葛 | 李 | **新增归属**（现状无人认领；西方实践哲学近亲） |
| yijing 易经命理 | 老胡 | 现状不变 |
| chinese-classics 中华典籍 | 老胡、玄 | 现状不变（二人共享） |
| daoism 道家 | 玄 | 现状不变 |
| tiandao 天道/格律 | 李、老胡、玄 | 三人共同方法论，现状不变 |
| （未标注） | 李、老胡、玄 | **已定决策**：进共享池，藏书阁标「共享」提示可补标 |

```ts
// src/data/mentors.ts 新增派生
export function mentorTraditionScope(id: MentorId): Set<string>; // 该贤可引用的标签集合
export function isSourceAllowedFor(id: MentorId, tradition: string | null): boolean; // null=未标注 → true
```

空库退化：某贤专库（含共享池）检索为空时，其 Sources 分区写「（专库暂空——无据则言暂未入藏）」，人设规则本就要求无据不引。

## 3. 检索改造：一次 embedding，三路取证

```text
用户问题
  → query embedding（1 次，成本不变）
  → 三路过滤排序：
      李路：existentialism | stoicism | tiandao | 未标注     topK=4
      胡路：yijing | chinese-classics | tiandao | 未标注     topK=4
      玄路：daoism | chinese-classics | tiandao | 未标注     topK=4
  → 合并去重（同一 chunk 可同时出现在两路，如天道笔记）
  → 分区构造 Sources
```

接口改动（向后兼容，filter 可选）：

```ts
// src/core/vector/vectorStore.ts
search(embedding, topK, filter?: (r: VectorRecord) => boolean): Promise<VectorSearchResult[]>;

// src/core/retrieval/retrieveContext.ts 新增
export type ScopedRetrieval = {
  byMentor: Record<MentorId, VectorSearchResult[]>;
  merged: VectorSearchResult[]; // 去重总表（usedContext 与出典用）
};
export async function searchChunksForMentors(query: string, topKPerMentor = 4): Promise<ScopedRetrieval>;
```

分区 Sources 格式（`buildScopedContext`）：

```text
[李之专库 · 以下来源仅存在主义导师·李可引用]
[Source L1] book/section/cite_as/text…

[老胡之专库 · 以下来源仅盲派算师·老胡可引用]
[Source H1] …

[主事·玄之专库 · 以下来源仅主事·玄可引用]
[Source X1] …
```

预算控制：3×4=12 chunks（现为 10），每条 text 截断至 800 字（新增保护，现状不截断）。共享池命中会在多个分区重复出现——重复的 chunk 只完整展示一次，其余分区以「同 L2」引用行表示（省 token 的小优化，v1 可先不做，标为可选项）。

Supabase 路径：云端 `match_chunks` 目前只支持单 `filter_tradition`。v1 云端检索退化为全量召回 + JS 过滤；backlog：RPC 升级为 `filter_traditions text[]`。本地 JSON 路径不受影响。

## 4. 引用校验升级：按发言人 × 专库

现状：`validateCitations(answer, retrieved)` 全局校验「书名+位置是否在本轮来源中」。升级为：

```ts
// src/core/retrieval/citationPolicy.ts 新增
export function validateCitationsByMentor(
  answer: string,
  scoped: ScopedRetrieval,
): { citations: Citation[]; violation: { mentorId: MentorId | null; cite: string; reason: "cross-library" | "not-found" } | null };
```

流程：`parseMentorDialogue`（已有，可在服务端复用）把回答拆成三段 → 每段内解析 `[《书名》, 位置]` → 只允许匹配**该发言人分区 ∪ 共享命中**：

- 李段引《周易》（胡库）→ `cross-library` 违规；
- 任一段引本轮不存在的出处 → `not-found` 违规（现状规则保留）；
- 无法归属发言人的段落（如「序」）→ 按三人并集校验；
- **任一违规 ⇒ 整组引用作废**（已定决策），沿用现有「重试一次」机制，且重试提示带具体原因：

```text
上一次回应中【存在主义导师·李】引用了 [《周易》, 需卦]——李只可引用
存在主义/斯多葛/天道及未标注共享库中的来源。请各位只引用各自分区内的 Sources 重新回应。
```

## 5. 命理简报：规则引擎 → 三贤（确定性事实，模型只解读）

新模块 `src/core/mingli/chartBrief.ts`，全部由既有规则函数拼装（`shiShenOfGan`、`roughStrength`、`ZHI_INFO` 藏干、`currentLiuNian`），不含任何模型生成：

### 5.1 `briefForHu(chart)` —— 全量命理简报（老胡）

```text
【命理简报 · 排盘系统既定结果】
四柱：乙亥 甲申 丁卯 壬寅（藏干十神逐柱列出）
日主：丁火。强弱粗评：中和（大致）——月令申金处囚地；时支寅中丙火有中余气根；年月两干印星生扶…
起运：出生后 7年4个月12天 起运（虚岁 9 岁上运，逆排）
大运：癸未(2003-2012,七杀/…) → 壬午(2013-2022,正官/…) → 辛巳(2023-2032,偏财/劫财) ← 当前
今年流年：丙午（2026，对日主为劫财，落辛巳大运内）
神煞：天乙贵人（亥）、文昌（…）…（只列名与落宫）
命宫：子 · 身宫：丑 · 胎元：乙亥
【使用规则】你只可引用与解读以上既定结果；不得自行推算或新增任何干支、神煞、年份。
```

### 5.2 `briefForXuan(chart)` —— 气机简报（玄，道家读法）

道家与命理共享阴阳五行框架，玄用「气」的语言，不做吉凶断语：

```text
【气机简报 · 以阴阳五行论，不批命】
命主之气：丁火（灯烛之明），当下气象：中和偏静
五行盈虚：木盛（3）水足（2）金土火各一——木旺生火，火有源而不烈
时之所处：生于申月（初秋金令），今岁丙午（火气之年），行辛巳运（金火之交）
【使用规则】你不批命、不断吉凶、不预测；只以气之盈虚、时之进退论方向与节奏。
```

### 5.3 李 —— 结构性隔离

李的角色块**不注入任何命理内容**（不是「给了但要求不用」，是根本看不见——结构性隔离优于提示词自律，也省 token）。李只收到现实背景：现居、学历、工作、感情。屋规补一句：「命理与气机由老胡、玄负责；李不使用命理语汇（现有人设禁令，予以结构化）。」

### 5.4 注入点改造

`buildMentorSystemPrompt` 现在是「全局一块问者档」；改为 **per-role 上下文块**——每个角色的【角色N】块尾部追加各自视角的材料：

```text
【角色一：盲派算师·老胡】……
本轮专属材料：<briefForHu 输出>

【角色二：存在主义导师·李】……
本轮专属材料：<现实背景四项>

【角色三：主事·玄】……
本轮专属材料：<briefForXuan 输出>
```

防幻觉三道：①简报即唯一命理事实源；②prompt 明令禁止自算（两份简报的【使用规则】）；③未来 Verifier 抽查回答中的干支/神煞是否出现在简报中（backlog，蓝图 Phase 4 的 Citation/Safety Verifier 一并做）。

## 6. UI 变化（小）

- **斋中藏卷**：每卷加归属徽标——`李库 / 胡库 / 玄库 / 胡·玄 / 三贤共享`（由 tradition 映射，未标注显「共享 · 可补标」）；
- **出典**：引用条尾部加发言人小印（李/胡/玄），来源于按段校验时已算出的归属——v1 顺手带上；
- 上传芯片、学习模式钩子不动。

## 7. 文件改动清单

**新增**

| 文件 | 内容 | 约 |
|---|---|---|
| `src/core/mingli/chartBrief.ts` | 胡/玄两档简报 + 李背景块的确定性组装 | 170 |
| `src/core/mingli/chartBrief.test.ts` | 固定盘面 fixture 断言简报关键行 | 90 |

**修改**

| 文件 | 改动 |
|---|---|
| `src/core/vector/vectorStore.ts` | `search` 加可选 filter 谓词 |
| `src/core/vector/localJsonVectorStore.ts` | 实现 filter（JS 端过滤后排序） |
| `src/core/retrieval/retrieveContext.ts` | `searchChunksForMentors` + `buildScopedContext` |
| `src/core/retrieval/answerWithCitations.ts` | 走分库链路；按发言人校验；定向重试文案 |
| `src/core/retrieval/citationPolicy.ts` | `validateCitationsByMentor`（含测试扩充） |
| `src/data/mentors.ts` | stoicism 归李；`mentorTraditionScope`；per-role 上下文块；越库屋规 |
| `src/components/DocumentLibrary.tsx` | 归属徽标 |
| `src/components/CitationList.tsx` | 发言人小印（可选项） |
| `docs/architecture.md` / `docs/roadmap.md` | 检索节更新、勾选进度 |

估算 ~600 行。**不改**：ingestion 管线、向量索引格式（零重建）、`/api/chat` 接口形状（响应内的 usedContext 继续用 merged 总表）。

## 8. 实施顺序（每步可运行）

| 步 | 内容 | 验证 |
|---|---|---|
| M1 | `chartBrief` + 测试 | `npm test`：简报含既定干支、玄简报无吉凶词、李块无命理词 |
| M2 | 检索三路 + 分区 Sources | `/api/search` 调试各路命中；控制台看分区 context |
| M3 | 按发言人校验 + 定向重试 | 单测：越库作废/共享放行/未知段并集校验 |
| M4 | mentors prompt 重构（分工注入） | 人工：问运势——胡引具体大运流年且与简报一致、玄论气机不断吉凶、李无命理语汇 |
| M5 | 藏书阁徽标 + 文档更新 | 人工验收四场景（见下） |

人工验收：①存在主义问题→李引己库，无串库；②「我今年运势如何」→胡引简报内干支、玄谈节奏、李谈选择；③诱导「李，从周易角度谈谈」→李拒引或引则整组作废重试；④未标注文档三人皆可引。

## 9. 风险与对策

| 风险 | 对策 |
|---|---|
| 12 chunks + 双简报使 prompt 变长 | chunk 截 800 字；简报控制在 15 行内、神煞只列名；topK 可调 |
| 单次生成仍可能串味（胡的话里冒出存在主义腔） | 声口串味靠人设与评测（蓝图 Phase 4）；**引用串库**本轮已被校验硬性拦截 |
| 玄的气机语言滑向断吉凶 | 简报【使用规则】明令 + 验收场景②盯防；屡犯则进评测集 |
| 旧云端 RPC 单 tradition | v1 云端全量召回+JS 过滤；backlog 升级 RPC |

## 10. 设计取舍 FAQ

**为什么不拆成三次模型调用？** 蓝图原则：多调用必须由评测数据驱动。分区 Sources + 按发言人校验先把「引用串库」硬性解决；「声口串味」若评测证明单次调用治不了，Phase 4 再拆。

**为什么李连简报都不给，而不是给了让他别用？** 结构性隔离强于提示词自律：看不见就不会漏，还省 token。李的锋利恰恰来自他只面对「你的处境与选择」。

**道家用八字的依据？** 阴阳五行本就是道家与命理共享的框架（丹道、堪舆同源）。玄以「气之盈虚、时之进退」论节奏方向、不断吉凶——用的是共享的宇宙观，不越老胡批命的界，也符合玄「不替人判决」的人设。

**分库了，工具循环怎么办？** `searchChunksForMentors` 的过滤逻辑就是未来 `search_library` 工具 `traditions` 参数的实现体——本设计是 agent-loop-design.md 第 4.2 节的前置工程，不冲突、纯铺路。
