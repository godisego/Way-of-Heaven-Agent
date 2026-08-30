# RAG 来源与引用设计

## 目标

三贤引用典籍时，必须给出人可以打开核对的位置：

```text
自由意味着选择，也意味着承担选择的责任。[《存在主义笔记》, 自由与选择]
```

PDF 使用真实页码：

```text
无为不是消极不动，而是不以私欲强行扭曲事物。[《道德经》, 第42页]
```

## 来源单元

- PDF：每一页是一个来源单元，位置为“第 N 页”。
- Markdown：每个标题及其正文是一个来源单元，优先引用标题。
- TXT：每个段落单元有连续序号，位置为“第 N 节”。
- chunk 永远不跨来源单元。

每个 chunk 保存：

- `documentId`
- `sourceFileName`
- `bookTitle`
- `pageNumber`
- `sectionTitle`
- `chunkId`

## 传给模型的格式

```text
[Source 1]
book: 存在主义笔记
section: 自欺
tradition: existentialism
cite_as: [《存在主义笔记》, 自欺]
text: ...
```

模型只能复制 `cite_as` 中已经给出的书名与来源位置。

## 引用校验

程序会：

1. 解析所有 `[《书名》, 来源位置]`。
2. 校验书名是否来自本轮 retrieved context。
3. 校验来源位置是否对应本轮 source。
4. 只要出现一条无法验证的引用，就拒绝整组引用并触发重试。
5. 只把纯粹的资料不足回应视为免引用；“资料不足，但我断言……”仍需引用。
6. 重试后仍失败时明确显示警告。

当前校验能证明“位置真实存在于本轮来源”，还不能证明每一句结论都被该片段蕴含。**证据台账（Evidence Ledger）已实现**：见 [`src/core/agent/evidenceLedger.ts`](../src/core/agent/evidenceLedger.ts)，Agent 循环中每个证据绑定 Evidence ID 进入台账，执行轨迹面板可查（详见 [agent-loop-design.md](agent-loop-design.md)）。逐结论的覆盖率校验（Verifier）仍是后续方向。

## 资料不足

检索结果为空或低于相关性阈值时，系统应在调用生成模型前直接返回资料不足。Agent 模式下也必须把 `insufficient` 作为正常终态，而不是无限检索或依赖模型猜测。

## 后续增强

- 向量 + 关键词混合检索
- 最低相关性阈值与 rerank
- 邻页/邻章节扩展
- 逐结论证据覆盖率校验（Verifier；台账本体已建成）
- PDF 页面渲染与原文高亮
- Prompt Injection 隔离与恶意文档测试
