# RAG / 智能体知识库 新手导引 —— 跟着天道智能体读

这份文档不是抽象讲 RAG，而是**对照本仓库的代码**，把每个知识点钉到具体的文件、行号和函数上。
读法建议：在 IDE 里打开对应的文件，顺着每一节的指引读一遍代码，再回来看总结。

> 项目业务目标：把用户上传的典籍、笔记、书摘变成"问困惑 → 三贤带引用回答"的知识库。
> 它的关键设计决策（按页切 chunk、强制引用、校验引用、三贤 system prompt）是 RAG 最小可用版 + 角色化生成的结合。

---

## 学习路径（请按顺序读）

这是项目三份配套文档，建议按以下顺序：

1. **`docs/rag-concepts-primer.md`** —— RAG 纯概念铺垫。**给「只听过 RAG 这个词、没动手过」的同学**。不读代码，只讲 LLM / embedding / 向量检索 / chunking / grounded generation 是什么。**强烈建议先读这一份**，否则下面的代码走读会比较跳。
2. **`docs/rag-beginner-walkthrough.md`（本文件）** —— **代码层面的 RAG 走读**。每个知识点钉到具体文件、行号、函数。
3. **`docs/agent-beginner-walkthrough.md`** —— 智能体专题。**本项目目前还不是完整 Agent，只有几处 agent-flavored 模式**。这份文档先讲 Agent 是什么（tool use / planning / ReAct / Reflexion / memory / multi-agent），再对照天道智能体看缺什么、怎么补。读完您会知道天道智能体的"RAG"和"Agent"分别能做到什么、还差什么。

---

---

## 0. 一张总览图（先记住，后面每一节都会回来看）

```
┌─────────────────────────── 离线：入库（Ingestion）──────────────────────────┐
│                                                                             │
│  PDF / md / txt ─► 按页解析 ─► 文本（按页） ─► 切 chunk（带 overlap） ─►  │
│                │                                  │              │          │
│                ▼                                  ▼              ▼          │
│           documents 表                    document_pages / chunks 表  向量库 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────── 在线：问答（Q&A）─────────────────────────────────┐
│                                                                             │
│  用户问题 ─► Embedding ─► 向量检索（topK） ─► 拼成 Sources ─► LLM 生成答案  │
│                                                       │                │    │
│                                                       │   正则解析引用 │    │
│                                                       │              ▼    │
│                                                       │     校验引用合法性 │
│                                                       │              │    │
│                                                       ▼              ▼    │
│                                                必要时强制重试     最终回答   │
└─────────────────────────────────────────────────────────────────────────────┘
```

把这两段连起来，就是 RAG（R **R** etrieval-**A** ugmented **G** eneration）。
"增强" 二字就在 `retrieveContext.ts` 的 `buildContext`：LLM 看到的 prompt 里多塞了一份来自向量库的原文。

---

## 1. 项目结构：代码怎么分层的

```
src/
├── app/                # Next.js 路由（纯 HTTP/UI）
│   ├── page.tsx        # 单页 UI（问者档 + 入阁藏书 + 三贤对谈）
│   └── api/
│       ├── ingest/     # 入库接口
│       ├── documents/  # 文档列表接口
│       └── chat/       # 问答接口（三贤对谈）
├── components/         # React UI 组件
└── core/               # ★ 业务核心：不依赖 Next.js，纯 Node 可跑
    ├── config/         # 读 .env，统一配置
    ├── db/             # "数据库"（其实是 JSON 文件）
    ├── documents/      # 文档元数据 + 类型 + Repository
    ├── ingestion/      # 解析/切分/索引 pipeline
    ├── vector/         # 向量存储 + 余弦相似度
    ├── providers/      # Embedding / LLM 抽象
    └── retrieval/      # 检索 + 引用校验 + 最终回答生成
```

**记住这一条**：`core/` 是业务逻辑，`app/` 只是把它包成 HTTP。
这个分层就是工程上"可测试 / 可替换 / 不绑死框架"的最小样板 —— 后面 Provider 抽象那一节会再用到这个分层。

---

## 2. Ingestion Pipeline（离线入库）：每个环节对应一个 RAG 知识点

入口：`src/app/api/ingest/route.ts` → `ingestDocumentBuffer()` in `src/core/ingestion/ingestionPipeline.ts`。

### 2.1 文档状态机 —— `DocumentStatus`

文件：`src/core/documents/documentTypes.ts:1`

```
"uploaded" → "extracting" → "indexing" → "indexed"
                              └──────→ "failed"
```

- **为什么要有状态机？** 解析、embedding 都是异步 + 耗时的，前端需要轮询进度，失败要可恢复。
- 看 `ingestionPipeline.ts:89-119`：`updateDocumentStatus(id, "extracting")` → ... → `"indexing"` → `"indexed"`。每一段失败都被 `try/catch` 接住并写 `"failed"` + `errorMessage`，文档就永远留在库里可以排查。

### 2.2 文件去重 —— sha256

`ingestionPipeline.ts:52-54`

```ts
const fileHash = sha256(input.buffer);
const existing = findDocumentByHash(fileHash);
if (existing) return existing;
```

**知识点**：生产知识库通常需要"幂等入库"。同一个文件传 100 次，库里只能有 1 条。用内容哈希做主键就行，别用文件名 —— 用户会把 `读书笔记.md` 改 5 次名重传。

### 2.3 按页解析 —— `pdfjs-dist` + 页号锚定

`src/core/ingestion/pdfPageExtractor.ts`

```ts
for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  ...
}
```

**关键设计选择：页面级别保留**。每个 `DocumentPageRow` 自带 `pageNumber`（`documentTypes.ts:28`）。

为什么这么做？
- 后面给 LLM 的引用必须带页码 —— 没有页码锚定就追溯不到原文。
- 替代方案：文档级 / 段落级。前者粒度太粗（几百页典籍一塞给 LLM 直接超上下文）；后者页码对应关系就丢了。
- **生产里更复杂的方案**：版面分析（layout-aware）按"节 / 表 / 图"切。本项目刻意简化，只到"页"。

**踩坑提醒**：`pdfPageExtractor.ts:15-18` 显式设置了 `workerSrc`，指向 `node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs`。
在 Next.js dev 模式下，worker 路径解析经常出问题，这是 pdfjs 在 Node 端跑必须修的第一坑。

### 2.4 Chunking：固定窗口 + overlap —— `chunkPages.ts`

```ts
const TARGET_CHARS = 1200;     // 每个 chunk 目标长度
const OVERLAP_CHARS = 160;     // 相邻 chunk 重叠
```

**这是 RAG 的第一道手艺**。为什么必须切？

1. **Embedding 模型有输入上限**（典型 512/8192 token）。
2. **LLM 的上下文窗口有限**，塞整本 200 页典籍不可能。
3. **检索粒度**：用户问"天道中文化属性是什么"时，你只想给他那一段，不是整本。

为什么 1200 字符？
- 经验值。粗略对应 200~400 个英文 token / 几百个汉字 token，能装下一两段论述，又不会太长。
- 生产里你会按业务调：哲学长文（长句、论证）要更大，诗摘（短句）可以更小。

为什么 160 字符 overlap？
- 防止一句关键的话正好被切在两个 chunk 的边界上，两个 chunk 都"看起来不相关"。
- Overlap 是工程上的妥协：太小 → 漏；太大 → embedding 算力浪费、检索时重复召回。

**进阶题**（想深入可以研究）：为什么这里没用"按语义切"或"按段落切"？
- 答案写在代码注释和 docs/roadmap.md：按固定字符切是 MVP，够用。语义切要重，等真出问题再换。

### 2.5 Embedding：文本 → 向量

`src/core/providers/openAICompatibleProvider.ts:28-43` + `mockEmbeddingProvider.ts`

```ts
const response = await fetch(`${baseUrl}/embeddings`, {
  method: "POST",
  headers: { authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({ model, input: texts }),
});
```

**知识点**：
- Embedding 是把文本映射到一个固定维度的稠密向量（典型 1536 / 3072 / 64）。
- 语义相近的文本在向量空间里"距离近"。
- **批量调用**很重要：看到 `BATCH_SIZE = 32` in `indexChunks.ts:7`。单条调用会被网络往返拖死。

**这个项目的特殊设计**：`MockEmbeddingProvider`（第 5 节会再回来）用 SHA-512 哈希伪装向量。
生产上要换成真模型（text-embedding-3-large / bge / m3e 等）。

### 2.6 写入向量库 —— `localJsonVectorStore.ts`

```ts
private readAll(): VectorRecord[] {
  if (!fs.existsSync(this.indexPath)) return [];
  const raw = fs.readFileSync(this.indexPath, "utf8");
  if (!raw.trim()) return [];
  return JSON.parse(raw) as VectorRecord[];
}
```

**知识点**：
- MVP 把向量库写成一个 JSON 文件（`data/indexes/chunks.json`）。
- 生产换 LanceDB / Milvus / pgvector 时，这一层只是 `VectorStore` interface 的另一种实现（`vectorStore.ts:20-23`），**业务代码不需要改**。
- **事故提醒**：这个项目历史上把 `data/app.json` 写成了 `.ts` 源码，`JSON.parse` 直接炸 —— 任何"用文件当库"的设计都必须在读取处防御。生产向量库几乎都是真二进制数据库，所以不会出这种错。

---

## 3. Retrieval（在线检索）

入口：`src/app/api/chat/route.ts` → `answerQuestion()` in `src/core/retrieval/answerWithCitations.ts`。

### 3.1 把问题变成向量 —— `retrieveContext.ts:5-10`

```ts
const provider = getDefaultProvider();
const embedding = await provider.embedTexts({ texts: [query] });
const [queryEmbedding] = embedding.embeddings;
return getVectorStore().search(queryEmbedding, topK);
```

**对称性**：同一个 provider 把问题和 chunk 都向量化到同一个空间。检索就是"找邻居"。

### 3.2 余弦相似度 —— `vectorStore.ts:25-37`

```ts
return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
```

这是 NLP / 推荐系统里最常见的相似度度量。两个要点：
- **零向量要短路返回 0**，否则除零 NaN，排序会乱（`vectorStore.ts:35`）。
- **向量长度必须一致**，否则直接 0 分（`vectorStore.ts:26`）。生产里这意味着**同一个 embedding 模型在入库和检索时不能换**；要换就重索引整库。

### 3.3 topK 与"召回天花板"

`answerWithCitations.ts:17` 用的是 `topK = 10`。

- K 太小 → 召回不够，真相关 chunk 没被捞上来，LLM 没有资料可引用 → 幻觉。
- K 太大 → 噪声多，prompt 超长，LLM 被无关内容干扰。
- 经验值 4~10 起步，按业务调。
- 生产里常加一道"重排（rerank）"，把 topK=50 → rerank 选 5；本项目省了。

---

## 4. Prompt 组装与 Grounded Generation（把检索结果喂给 LLM）

### 4.1 buildContext —— `retrieveContext.ts:12-19`

```ts
return results.map((result, index) => {
  const book = result.bookTitle ?? result.sourceFileName;
  const section = result.sectionTitle ?? `第${result.pageNumber}节`;
  return `[Source ${index + 1}]\nbook: ${book}\nsection: ${section}\ncite_as: [《${book}》, ${section}]\ntext: ${result.text}`;
}).join("\n\n");
```

**为什么 Source 要带 `book / section / cite_as`？**
- `cite_as` 给模型一条可直接复制的合法引用，减少格式漂移。
- PDF 的 section 是 `第N页`；Markdown/TXT 优先使用章节标题，没有标题时回退为 `第N节`。
- `chunkId` 保留在程序内部的检索结果中，用于去重与回传引用卡片，不必暴露给模型。

### 4.2 系统 Prompt 强制 grounded —— `anthropicProvider.ts:29`

```ts
system: buildMentorSystemPrompt(input.userProfile ?? null),
```

`buildMentorSystemPrompt` 来自 `src/data/mentors.ts`，它告诉模型：
- 你是三贤茶寮本尊，每次必须按老胡 → 李 → 玄顺序输出。
- 只能基于 Sources 回答，不许编造页码、文件名或观点。
- 引述典籍格式为 [《书名》, 章节]，无据则说"暂未入藏"。

**这是反幻觉最便宜的一道防线**：在 system prompt 里直接告诉模型"你只能引用 Sources 里的内容，不许瞎编"。

光靠这条不够 —— 模型会**格式正确但内容虚构**（俗称"格式化幻觉"），所以才需要第 5 节的程序校验。

---

## 5. 引用校验：RAG 反幻觉的核心机制

`src/core/retrieval/citationPolicy.ts`

### 5.1 正则解析模型输出 —— `parseCitations`

```ts
const citationRegex = /\[《([^》]+)》\s*[,，]\s*([^\]]+)\]/g;
```

抓出形如 `[《存在与虚无》, 第二章 自欺]` 或 `[《周易》, 第42页]` 的引用。
- `《》` 明确书名边界，避免把普通方括号误当引用。
- 中英文逗号都接受。
- 来源位置既支持章节标题，也支持 `第N页 / 第N节`。

### 5.2 validateCitations —— 程序层验真

```ts
const match = retrieved.find((result) => {
  const book = result.bookTitle ?? result.sourceFileName;
  return book === citation.bookTitle && sectionMatches(result, citation.section);
});
if (!match) return [];
if (!valid.some((item) => item.chunkId === match.chunkId)) valid.push(...);
```

**核心思想**：LLM 写的书名和来源位置，必须能在本次**实际喂给它的检索结果**里找到。任意一条找不到，就让整组引用失败，避免“夹带一条真引用”绕过校验。

这条逻辑是 RAG 工程化最值钱的一行。绝大多数 demo RAG 都死在"模型编页码"上，加了它，你的知识库才有可信度。

### 5.3 needsCitation + 重试 —— `answerWithCitations.ts:31-39`

```ts
if (needsCitation(answer) && citations.length === 0) {
  answer = (await provider.generateAnswer({
    question: `${question}\n\n上一次回应引用的出处无法核对。请重新回应，凡是引述思想或原文之处，都必须使用 [《书名》, 章节] 的格式，且书名与章节只能取自本轮 Sources 中给出的 cite_as。`,
    context,
  })).text.trim();
  citations = validateCitations(answer, retrieved);
}
```

**知识点：Self-Correction**。LLM 第一次回答没引用 → 再问一次并提示“上一轮出处无法核对”，让它重答。
这是“调用 + 检查 + 再调用”的固定重试，还不是 Agent 自主循环或 Reflexion。

`needsCitation` 还排除了"资料中没有足够信息"这种正常拒答 —— 别把拒答当成幻觉去重试。

### 5.4 最后兜底

```ts
if (needsCitation(answer) && citations.length === 0) {
  answer = `${answer}\n\n⚠️ 系统未能验证回答中的文件页码引用。请打开检索结果人工核验。`;
}
```

初次生成和一次重试都失败 → 在回答末尾挂一个 warning，把“出处未通过校验”的事实告诉用户。
**这个 fallback 是产品态度问题**：**永远不要让模型"自信地胡说"。**

---

## 6. Provider 抽象：依赖倒置与可替换性

`src/core/providers/llmProvider.ts`（interface） → `openAICompatibleProvider.ts` / `anthropicProvider.ts` / `mockEmbeddingProvider.ts`（实现）

`answerWithCitations.ts` 里所有地方只调 `getDefaultProvider().embedTexts(...)` 或 `.generateAnswer(...)`，从来不直接 `fetch`。

**知识点**：
- **依赖倒置原则（DIP）**：高层业务（retrieveContext / answerWithCitations）不依赖底层实现（具体哪家模型），而是依赖 interface（LLMProvider）。
- 换模型只需要改 `getDefaultProvider` 的返回值，业务代码零修改。
- 这就是为什么本项目能同时支持 Anthropic / OpenAI 兼容两种协议，而且 mock embedding 能在 `.env` 里一键切。

**`MockEmbeddingProvider` 的意义**：
- 完全不打外网，本地跑通链路。
- 用 SHA-512 哈希伪造向量 → 检索质量几乎为 0，但**所有流程和代码路径都被走通**。
- **生产意识**：能用 mock 把外部依赖屏蔽掉，是写可测试系统的基础。

---

## 7. 元数据抽取：Schema-first 设计

`ingestionPipeline.ts:38-48`

```ts
function inferBookMetadata(fileName: string): Pick<DocumentRow, "bookTitle" | "tradition"> {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[《》]/g, "").trim();
  const lower = base.toLowerCase();
  let tradition: string | null = null;
  if (/易经|周易|yijing|i-?ching|卦|八字|命理|盲派/.test(base)) tradition = "yijing";
  else if (/存在|虚无|萨特|加缪|海德格尔|尼采|existential/.test(base)) tradition = "existentialism";
  else if (/天道|遥远的救世主|丁元英|文化属性|格律/.test(base)) tradition = "tiandao";
  else if (/道德经|庄子|列子|老子|daoism|laozi|zhuangzi/.test(base)) tradition = "daoism";
  ...
}
```

**知识点**：
- 上传阶段就从文件名抽"思想传统"（易经 / 存在主义 / 道家 / 天道格律等），存进 `documents` 表。
- 后续可以按"存在主义归李，易经命理归老胡，道家归玄"过滤检索（`documentTypes.ts:11` 的 `tradition` 字段就是给这个用的）。
- **真正的生产做法**：LLM 抽取或文件元数据读取。本项目是 MVP，正则 + 关键词凑合。

---

## 8. 持久化：本地 JSON 元数据存储

`src/core/db/jsonDb.ts`

```ts
export function getDb(): JsonDb {
  if (store) return store;
  ensureDataDirs();
  store = new JsonDb(getAppConfig().metadataPath);
  store.persist();
  return store;
}
```

元数据明确写入 `data/app.json`，向量索引写入 `data/indexes/chunks.json`，代码和配置都不再伪装成 SQLite。

**为什么当前本地版使用 JSON？**
- 零依赖，克隆即跑。
- 数据全在 `data/app.json` 里，出问题肉眼可读、可改。
- **代价**：并发不安全，数据量大了慢。这是**MVP 取舍**，不是工程推荐。

产品化时推荐两条升级路径（对应 `docs/roadmap.md`）：
1. 单机部署可换成真正的 SQLite；多用户云端优先使用带鉴权与 RLS 的 PostgreSQL / Supabase。
2. 向量检索可换成 pgvector 或其他专用向量库，并保留仓储接口隔离业务层。

---

## 9. 前端一条完整的请求链（把上面串起来）

上传：`components/DocumentUploader.tsx` → POST `/api/ingest` → `ingestDocumentBuffer` → 状态变 `indexed`。

问答：`components/ChatPanel.tsx` → POST `/api/chat` → `answerQuestion` →
- `searchChunks` 拿到 topK（顺便 `score <= 0` 直接拒答，`answerWithCitations.ts:18`）
- `buildContext` 拼 Sources
- LLM 生成（三贤 system prompt）
- `validateCitations` 验真
- 必要时 self-correct 重试一次
- 实在不行挂 warning

UI 拿到 `answerMarkdown + citations + usedContext` 三件套：
- `answerMarkdown`：渲染三贤对话
- `citations`：侧栏列引用
- `usedContext`：`SourcePreview` 组件点击引用时弹出原文（`components/SourcePreview.tsx`），让你**人眼核验**

"人眼核验"这一步是 RAG 工程上**永远不能省**的最后一环。

---

## 10. 学完这个项目你应当掌握的概念清单

| 概念 | 在本项目的位置 |
|---|---|
| RAG 三段式：解析 → 检索 → 生成 | `ingestionPipeline.ts` / `retrieveContext.ts` / `answerWithCitations.ts` |
| 文档解析与页码锚定 | `pdfPageExtractor.ts`，`DocumentPageRow.pageNumber` |
| 固定窗口 + overlap chunking | `chunkPages.ts:5-6,16-38` |
| Embedding & 批量调用 | `openAICompatibleProvider.ts:28-43`，`indexChunks.ts:7` |
| 余弦相似度 | `vectorStore.ts:25-37` |
| topK 召回 | `answerWithCitations.ts:17` |
| Prompt 组装（Sources） | `retrieveContext.ts:12-19` |
| System prompt 反幻觉 | `mentors.ts` `buildMentorSystemPrompt` |
| 程序层引用校验 | `citationPolicy.ts:21-39` |
| Self-correct 重试 | `answerWithCitations.ts:31-39` |
| 拒答与兜底 | `answerWithCitations.ts:18-23, 41-43` |
| 依赖倒置 / Provider 抽象 | `llmProvider.ts` interface，`getDefaultProvider()` |
| Mock 屏蔽外部依赖 | `mockEmbeddingProvider.ts` |
| 文件哈希去重 | `ingestionPipeline.ts:52-54` |
| 文档状态机 | `DocumentStatus`，`ingestionPipeline.ts` 状态切换 |
| 元数据抽取（思想传统） | `ingestionPipeline.ts:38-48` |
| MVP 存储取舍 | `JsonDb` in `src/core/db/jsonDb.ts` |

---

## 11. 推荐的"动手加深"路径

按这个顺序读 + 改，每一项大概 30~60 分钟：

1. **改 chunking 参数**：`TARGET_CHARS` 调到 300 或 3000，重新入库，看检索结果差异。
2. **换 Embedding 模型**：把 `.env.local` 里的 `OPENAI_COMPAT_EMBEDDING_MODEL` 换成你们用的真模型，重新入库。
3. **加 rerank**：`searchChunks` 拿 topK=50 → 调一个 rerank 模型 → 取 top5 喂给 LLM。文档长度会短、精度会高。
4. **完善 self-correct**：先记录 `invalid_citation / insufficient_evidence` 等结构化失败原因，再用固定评测集比较一次重试与改写查询的收益；这仍不等于完整 Reflexion。
5. **升级元数据存储**：单机可选真正的 SQLite，云端可选 PostgreSQL / Supabase；通过 Repository 接口迁移，避免业务代码绑定数据库驱动。
6. **加 hybrid search**：BM25 + 向量检索融合。生产 RAG 几乎必备，本项目没有。
7. **扩充 eval**：当前已有引用、文本抽取和大运选择的单元测试；再准备 20～50 个标注 QA，统计检索 Recall@K、有效引用率和资料不足识别率。

每一项做完你会发现：这个项目真的是 RAG 的**最小骨架**，所有真正生产化的复杂度都在它"省掉的"那些地方。
