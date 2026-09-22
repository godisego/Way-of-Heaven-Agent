---
name: transformer-mechanics
description: 模型原理：从 Token、向量、Attention 与 Q/K/V，到预训练、后训练、Prefill、Decode 和 KV Cache
---

# Transformer 与模型训练机制

> 位置：五层地图第 3 层。前置：[LLM 基础原理](/learn/llm-fundamentals)、[AI 技术地图](/learn/ai-technology-map)。本篇以常见的自回归、仅解码器文本 Transformer 为主，不代表所有 AI 模型的结构。

## 学习目标

- 解释 Token、Embedding、位置信息、Attention 和 FFN 各自做什么。
- 用直觉读懂 Q/K/V 与注意力公式，知道 causal mask 的作用。
- 区分预训练、SFT、RLHF/RLAIF 与当前这次推理。
- 解释 Prefill、Decode、KV Cache 与响应延迟的关系。
- 把模型内部机制与 RAG、记忆、工具等应用层功能分开。

## 一 · 先看完整过程

```
文字
 → Tokenizer：Token 与 ID
 → Token Embedding：每个 ID 对应一个向量
 → 位置信息参与计算
 → 多个 Transformer Block
     注意力：汇总不同位置的信息
     FFN：变换每个位置的特征
     残差连接与归一化：支持多层计算
 → 输出层：词表上每个候选 Token 的分数
 → 解码策略：选择下一个 Token
 → 继续，直到停止
```

训练阶段学习模型参数，推理阶段使用这些参数。**普通的一次 Prompt 调用不执行梯度更新；给模型一段资料不等于把它训练进参数。** 产品是否另行保存数据、后续用于训练，属于另一套数据与训练流程。[Hugging Face：How do Transformers work?](https://huggingface.co/learn/llm-course/chapter1/4)

## 二 · Token：先把文字变成编号

Token 是分词器使用的单位，可以是字、词的一部分、标点、字节片段或特殊符号。Tokenizer 按自己的词表与规则把文本变成 ID；同一段中文在不同模型下可能得到不同长度的序列。

```
文字：“请解释注意力”
  → 某个 Tokenizer 划分的若干片段
  → [id_1, id_2, ..., id_n]
```

这里故意不写“准确有几个 Token”：需要指定实际 Tokenizer 并运行，才能得到准确结果。字数与 Token 数不是固定比例。常见方法包括 BPE、WordPiece 和 Unigram。[Hugging Face：Tokenization algorithms](https://huggingface.co/docs/transformers/main/en/tokenizer_summary)

## 三 · Embedding：两种向量不要混淆

**模型内部的 Token Embedding**：用 Token ID 查一个可学习的向量表，给每个输入位置一个起点。经过后续层，这个位置的表示会结合上下文变化。

**用于检索的 Embedding**：把一句问题或一段文档编码成适合相似度比较的向量。它通常由专门选择、训练或适配的模型产生，服务于召回与排序。

| 维度 | Token Embedding | 检索 Embedding |
|------|-----------------|----------------|
| 输入单位 | Token ID | 问题、句子、段落等 |
| 主要用途 | 启动模型内部的计算 | 比较查询与候选内容的相关性 |
| 结果去向 | Transformer 内部层 | 向量索引、检索和排序 |
| 是否天然可互换 | 否 | 否 |

“都是向量”只说明数学表示相似，不说明训练目标、维度或语义空间相同。模型内部查表与整段文本的语义编码，是两种不同层次的工作。[Transformer 原始论文](https://arxiv.org/html/1706.03762v7)、[Sentence-BERT 原始论文](https://arxiv.org/abs/1908.10084)

## 四 · 位置信息：词相同，顺序可以改变意思

比较：“小明帮助小红”和“小红帮助小明”。如果只保留一袋词，系统就失去了谁帮助谁的顺序信息。

Transformer 需要让位置参与计算。早期设计可把位置向量加到输入表示上；RoPE 则通过旋转变换让位置影响 Q/K 的计算。不要把所有模型都想成“在词向量旁边再拼一个位置编号”。[RoFormer / RoPE 原始论文](https://arxiv.org/abs/2104.09864)

## 五 · Attention：当前表示应该从哪里取信息

直觉例子：“小明把苹果给了小红，因为她饿了。”人会结合“给了”“小红”“她”等线索判断指代。注意力提供了一种机制，让一个位置根据匹配程度汇总其他位置的信息。

这是教学直觉，**不能据此声称某个真实模型里有一个专门找“小红”的注意力头**，也不能把注意力权重直接当作完整的语法分析。

### Q、K、V 各做什么

将当前层的表示记作 X，使用训练得到的三个投影矩阵：

```
Q = X Wq    Query：这个位置要找什么信息
K = X Wk    Key：其他位置提供什么匹配线索
V = X Wv    Value：被汇总的信息内容

Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V
```

- `Q K^T`：计算各位置之间的匹配分数。
- `sqrt(d_k)`：按 Key 的维度缩放分数。
- `softmax`：把一行分数变成和为 1 的非负权重。
- `乘 V`：按这些权重汇总信息，得到新的表示。

多头注意力用不同的投影并行处理，再组合结果。它并不是让几个独立 Agent 开会。[Attention Is All You Need：第 3 节](https://arxiv.org/html/1706.03762v7)

### 只算一行的小练习

假设缩放后的三个分数是 `[0, 0, ln(2)]`，softmax 后得到 `[0.25, 0.25, 0.5]`。若 V 暂时简化成三个标量 `[2, 4, 8]`，汇总结果就是：

```
0.25 × 2 + 0.25 × 4 + 0.5 × 8 = 5.5
```

这只演示加权汇总，不代表真实句子的注意力值。权重 0.5 也不意味着“该词是答案原因的概率为 50%”。注意力分布有分析价值，但不能单独充当模型判断的因果解释。[Attention is not Explanation](https://arxiv.org/abs/1902.10186)

### Causal mask：生成时不能偷看未来

自回归解码器在位置 i 更新表示时，只能使用该位置及其之前允许看到的信息，不能看到后续位置。训练时即使整段文字已在批次里，也要用 causal mask 避免未来答案泄漏。

```
输入位置：  1  2  3  4
位置 1 可看：✓  ×  ×  ×
位置 2 可看：✓  ✓  ×  ×
位置 3 可看：✓  ✓  ✓  ×
位置 4 可看：✓  ✓  ✓  ✓
```

实际计算可在 softmax 前加入 mask：允许位置加 0，禁止位置加负无穷，使其权重为 0。双向编码器的可见性规则不同；“每个 Token 都能看所有其他 Token”不适用于这里的因果解码器。[Hugging Face：How caching works](https://huggingface.co/docs/transformers/en/cache_explanation)

## 六 · FFN、Residual、LayerNorm：不只有注意力

| 组件 | 直觉作用 | 需要避免的误解 |
|------|----------|----------------|
| Feed Forward Network（FFN） | 对每个位置做非线性特征变换 | 不是另一个跨位置搜索工具 |
| Residual（残差连接） | 将子层输出加回原来的表示，保留信息与梯度通路 | 不是保存完整聊天记录 |
| LayerNorm | 归一化一个位置的特征尺度，帮助稳定计算与训练 | 不会把句子变成“标准答案” |

一个直觉性的 Block 可以写成“归一化 → 注意力 → 残差相加 → 归一化 → FFN → 残差相加”。不同架构的归一化位置和 FFN 设计可能不同；不能把这个顺序当作所有 Transformer 的实现规范。LayerNorm 使用均值与方差，RMSNorm 是另一种归一化设计，不是同一个公式。[Layer Normalization](https://arxiv.org/abs/1607.06450)、[RMSNorm](https://arxiv.org/abs/1910.07467)

注意力负责位置间的信息交互，FFN 对已汇总的表示做变换，残差与归一化支持这些计算堆叠。多层联合产生能力，不能给每一层硬贴“语法层”“事实层”等固定标签。

## 七 · 从预训练到后训练

| 阶段或方法 | 在优化什么 | 是否更新参数 |
|------------|------------|--------------|
| Pretraining（预训练） | 在大规模数据上学习通用规律；自回归语言模型常用下一 Token 预测 | 是 |
| SFT（监督微调） | 根据指令与理想回答示例调整行为 | 是，可能仅训练部分参数 |
| RLHF | 利用人类偏好信号进行强化学习；典型流程训练奖励模型再优化策略 | 是 |
| RLAIF | 利用 AI 产生的反馈信号进行强化学习 | 是 |
| Inference（推理） | 用当前参数计算这次输入对应的输出 | 普通调用不更新参数 |

后训练是一个宽泛阶段，可能包含 SFT、偏好优化、强化学习等，不是每个模型都按同样顺序使用全部方法。SFT 学习示范；偏好数据比较不同输出的好坏，两者不能混称。[InstructGPT 论文](https://arxiv.org/abs/2203.02155)

RLAIF 改变的是反馈来源，不代表反馈绝对正确，也不表示“模型上线后每聊一句就自动训练自己”。人可以参与原则、任务与反馈标准的设计。[Constitutional AI 论文](https://arxiv.org/abs/2212.08073)

在实际项目里，先建立评测再决定是否训练。知识经常变化时可检索补充；需要稳定行为时可以比较 Prompt、约束输出和微调。详见 [模型训练与 AI 基础设施](/learn/model-training-infra)。

## 八 · 推理：Prefill、Decode 与 KV Cache

自回归生成通常可以分成两个阶段：

```
Prefill：处理输入上下文，算出需要的中间表示与 KV
  → 选择第一个输出 Token
Decode：使用已有 KV，处理新 Token，得到下一个输出
  → 重复，直到停止
```

Prefill 中已有输入的多个位置可以并行计算；标准 Decode 中后一个 Token 依赖前面已选出的 Token。输出层给出候选分数，解码策略再选择 Token；贪心、采样等策略会影响输出。[Hugging Face：Text generation](https://huggingface.co/docs/transformers/en/llm_tutorial)

**KV Cache** 保存已处理位置在各注意力层的 Key 和 Value，后续生成复用它们，避免反复计算过去位置的 K/V。它消耗内存，通常随序列变长而增长；它不是长期用户记忆，也不是模型参数更新。[Hugging Face：How caching works](https://huggingface.co/docs/transformers/en/cache_explanation)

跨请求复用相同前缀的 KV 是进一步的服务优化，称为前缀缓存。它主要节省重复前缀的处理，不能消除后续答案的生成工作。能否命中还取决于服务的缓存规则。[vLLM：Automatic Prefix Caching](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/)

把它放回产品指标：

- 首 Token 延迟：会受排队、网络、Prefill 与服务实现影响。
- 完整回答延迟：还受输出长度、Decode 速度、工具调用与重试影响。
- 上下文成本：资料越长不代表效果越好，应同时衡量信息价值、Token 和缓存。

## 九 · 误区检查

- Token 是分词器单位，不固定等于一个字或一个词。
- 模型内的 Token Embedding 不等于 RAG 用的段落检索向量。
- Attention 的高权重不是事实正确率，也不是完整的因果解释。
- 自回归解码器的注意力受到因果遮罩限制。
- Prompt、RAG 与普通记忆写入不会自动修改模型权重。
- KV Cache 用于计算复用；长期记忆还需要保存、检索和更新机制。

## 十 · 练习与参考答案

### 练习

1. 文档向量库里保存的向量和 LLM 输入 Token 的向量，为什么不能直接视为同一套东西？
2. 若注意力权重是 `[0.2, 0.3, 0.5]`，V 简化为 `[10, 0, 4]`，输出是多少？
3. 训练文本已经含有答案，为什么自回归模型仍需要 causal mask？
4. 本轮把用户偏好写进数据库，下一轮检索出来：这是 SFT、KV Cache 还是应用记忆？
5. 输入不变，输出从 50 个 Token 增加到 500 个 Token。前缀缓存为什么不能保证总延迟不变？

### 参考答案

1. 输入单位、训练目标与用途不同，也可能由不同模型产生。相同维度也不保证处于相同语义空间。
2. `0.2 × 10 + 0.3 × 0 + 0.5 × 4 = 4`。真实 V 是向量，按相同权重逐维汇总。
3. 防止预测当前位置之后的内容时偷看未来。训练目标必须符合生成时可得到的信息条件。
4. 是应用记忆。没有进行训练更新，也不是保存注意力计算中的 K/V。
5. 前缀缓存可能省去重复输入的处理，但新输出仍要生成。标准自回归 Decode 的工作量通常随输出长度增加。

> 下一步：[上下文与记忆工程](/learn/context-memory-engineering)，或深入 [模型训练与 AI 基础设施](/learn/model-training-infra)。回到 [五层学习地图](/learn/ai-learning-map)。
