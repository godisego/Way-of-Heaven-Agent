---
name: vector-search-hands-on
description: 向量检索实战：embedding 选型、维度、mock vs real 对比、余弦相似度手算——从概念到能动手调参
---

# 向量检索实战

RAG 的核心是"检索"——从知识库里找到最相关的几段文本。但"相关"怎么量化？这篇从概念到动手，把向量检索拆到底。

> 速查：[Embedding](/learn/rag-concepts) · [余弦相似度](/learn/vector-search-hands-on) · [Chunking](/learn/rag-concepts) · [topK](/learn/rag-concepts)

## 一 · 检索的本质：把"相关"变成数学

传统搜索（如数据库 LIKE）是"字面匹配"——搜"天干地支"，只返回包含这四个字的文档。问题是：搜"甲乙丙丁"就找不到"天干"相关内容，即使语义一样。

**向量检索**解决这个问题：

```
文本 ──[embedding 模型]──→ 一串数字（向量）
                              │
                    语义相近的文本 → 向量距离近
                    语义无关的文本 → 向量距离远
```

"天干地支"和"甲乙丙丁"虽然字面不同，但语义相近——它们的向量距离会很近。

## 二 · Embedding 是怎么工作的

Embedding 模型的输入是一段文本，输出是一个固定长度的数字数组（向量）：

```
输入："天干地支是八字的基础"
输出：[0.0439, -0.0341, 0.0439, 0.0146, ...]  ← 256 维或 1536 维
```

**关键特性**：
- 维度固定（256/768/1536/3072，取决于模型）
- 语义相近的文本 → 向量夹角小（余弦接近 1）
- 无关的文本 → 向量夹角大（余弦接近 0）

## 三 · Mock vs Real Embedding

天道茶寮支持两种 embedding 模式：

| | Mock Embedding | Real Embedding |
|---|---|---|
| **原理** | SHA-512 hash + bigram → 256 维向量 | 真实 embedding 模型（如 text-embedding-3-large） |
| **配置** | 不需要 key，`USE_MOCK_EMBEDDING=1` | 需要 `OPENAI_COMPAT_API_KEY` |
| **维度** | 256 | 768~3072（取决于模型） |
| **语义理解** | ❌ 只匹配字面 bigram | ✅ 理解语义近义词 |
| **排序质量** | 低（"伤官见官"可能排在鬼谷子后面） | 高（命理内容排在哲学前面） |
| **速度** | 快（本地 hash） | 慢（网络请求） |
| **成本** | 免费 | 按 token 付费 |

**什么时候用 mock**：开发、测试、没有 embedding key 时。能跑通全链路但排序不准。

**什么时候用 real**：生产环境、需要语义检索质量时。配好后跑 `npm run reindex:embeddings` 重建索引。

## 四 · 余弦相似度手算

向量检索用**余弦相似度**（cosine similarity）衡量两个向量的接近程度：

```
cos(A, B) = (A · B) / (|A| × |B|)

A · B = A[0]*B[0] + A[1]*B[1] + ... + A[n]*B[n]   （点积）
|A|   = √(A[0]² + A[1]² + ... + A[n]²)             （向量长度）
```

手算例子（3 维简化）：

```
A = [1, 2, 3]
B = [2, 4, 6]    ← B = 2A，完全同向

A · B = 1×2 + 2×4 + 3×6 = 2+8+18 = 28
|A|   = √(1+4+9) = √14 ≈ 3.74
|B|   = √(4+16+36) = √56 ≈ 7.48

cos(A,B) = 28 / (3.74 × 7.48) = 28 / 27.99 ≈ 1.0

→ 余弦 = 1，完全同方向（语义最相关）
```

**直觉**：两个向量"方向"越接近，余弦越接近 1；垂直（无关）= 0；相反 = -1。

天道茶寮的 mock embedding 做了 L2 归一化（向量长度 = 1），所以余弦 = 点积，计算更快。

## 五 · topK：检索几条

**topK** = 检索后取前 K 条最相关的。天道茶寮默认 `topK=4`（每个贤者分库各取 4 条）。

topK 太小：可能漏掉相关段落。
topK 太大：拼到 prompt 里超出上下文窗口，且带进无关内容干扰生成。

**权衡公式**：topK × chunk 最大长度 ≤ 上下文窗口的 30%~50%。

天道茶寮的 chunk 最大 1200 字符，topK=4：4 × 1200 = 4800 字符 ≈ 6000~8000 tokens——远小于现代模型的上下文窗口，安全。

## 六 · 分库检索：三贤各查各的

天道茶寮不是全库搜——三贤各自有"专库权限"：

| 贤者 | 能查的 tradition | 不能查 |
|------|-----------------|--------|
| 老胡 | `yijing`（命理教材+易传）| 哲学类 |
| 玄 | `daoism`（道德经、庄子、列子）| 命理类、存在主义 |
| 李 | `existentialism`、`stoicism` | 命理类、道家 |

```
全库 266 chunks
    │
    ├→ 老胡分库：217 chunks（yijing 命理+易传）
    ├→ 玄分库：25 chunks（daoism 道家）
    └→ 李分库：16 chunks（existentialism + stoicism）
```

**为什么分库**：材料隔离。老胡不该用存在主义回答命理问题，李不该用八字术语回答哲学困惑。分库从检索源头限制了角色的信息边界。

→ 想深入：`src/core/retrieval/retrieveContext.ts` 的 `searchChunksForMentors`

## 七 · 动手实验

跑完 `npm run seed:all` 后，你可以用 `/api/search` 直接测检索：

```bash
# 搜全库（不限制 tradition）
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"伤官见官","topK":5}'

# 看返回的 score 排序——score 越高越相关
```

**观察实验**：
1. 搜"天干地支"——命理教材应该排前面
2. 搜"自由选择"——存在主义笔记应该排前面
3. 搜一个不存在的词"量子力学"——返回的 score 都很低，且内容不相关

如果 mock 模式下排序不准（命理内容排在哲学后面），配了 real embedding 后会大幅改善。

## 八 · 常见问题排查

| 症状 | 可能原因 | 解决 |
|------|---------|------|
| 搜索返回 0 条 | 索引为空 | `npm run seed:all` |
| score 都很低（<0.1） | mock embedding 不匹配 | 配 real embedding |
| 命理内容排哲学后面 | mock 的 bigram 不懂语义 | 配 real embedding |
| 搜索报错"维度不匹配" | 换了 embedding 模型没重建索引 | `npm run reindex:embeddings` |
| 回答里引用了不存在的书 | 不是检索问题，是模型幻觉 | 这是引用校验该拦的 |

## 九 · 自测

1. Mock embedding 和 real embedding 的核心区别是什么？
2. 余弦相似度 = 1、= 0、= -1 分别代表什么？
3. topK 为什么不能设太大？
4. 三贤分库检索解决了什么问题？
5. 换了 embedding 模型后必须做什么？不做会怎样？

> 边界：向量检索是 RAG 的核心但不是全部——chunking 策略、引用校验、prompt 质量同样重要。检索准不等于回答好。
