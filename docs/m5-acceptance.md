---
name: m5-acceptance
description: M5 验收：五场景清单、自动脚本用法与翻转默认模式的条件
---

# M5 · 验收清单

工具循环（M0–M3）与轨迹面板（M4）就绪后，用本清单验收；本项目已完成验收并将 `/api/chat` 的默认模式翻转为 agent。

## 一 · 前置

1. `.env.local` 配好 `CHAT_*`（可先运行 `npm run doctor`，再运行 `npm run probe:tools`）；embedding 用真 Key 或 `USE_MOCK_EMBEDDING=1`。
2. 执行 `npm run seed:sample` 收入示例存在主义笔记（或在界面上传 `data/samples/存在主义笔记.md` 并选择「存在主义」），再启动 `npm run dev`。
3. 建议另传一份道家或易经材料，分库场景更有区分度。

如果从 Mock 切到真实 Embedding，填写 `OPENAI_COMPAT_BASE_URL`、`OPENAI_COMPAT_API_KEY`、`OPENAI_COMPAT_EMBEDDING_MODEL`，将 `USE_MOCK_EMBEDDING` 改为 `0`，然后先运行 `npm run reindex:embeddings`，再启动验收。重建失败时旧索引不会被替换。

## 二 · 自动部分

```bash
npm run acceptance        # 默认打 http://localhost:3000
BASE_URL=... npm run acceptance
```

脚本跑五个场景，硬判确定性不变量：三段齐且次序胡→李→玄、李段零命理语汇、无声口警告、引用非空/为空是否符合场景预期、agent 轨迹形状（步数/工具次数/停止原因合法）。任何 ✗ 即失败退出。

## 三 · 人工复核（脚本会打 ☐ 提示）

| 场景 | 看什么 |
| --- | --- |
| S1 分库直答 | 李的引用点开出典后与原文对得上、且真的贴题 |
| S2 命理分工 | 老胡确实用了你的盘（提到大运/节气/窗口），玄只谈气机与节奏 |
| S3 诱导越库 | 李面对「请引《周易》」的姿态：拒绝得体，不越库、不硬凑 |
| S4 库外拒答 | 「暂未入藏」说得自然，三人仍各自成段、各有声口 |
| S5 循迹 | 打开界面「循迹」重放同题：轨迹面板每步可读，计划一句话与工具选择合理 |

## 四 · 通过后：翻转默认

已完成：`/api/chat` 默认走 `runAgentLoop`，`mode:"rag"` 时走固定链路；前端「循迹」默认开启，关闭后显式发送 `mode:"rag"`。

## 五 · 记录

| 日期 | 执行人 | 自动 | 人工 | 结论 |
| --- | --- | --- | --- | --- |
| ____ | ____ | __/__ | __/5 | 通过 / 待改 |
