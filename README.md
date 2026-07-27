<div align="center">

# 天道智能体 · Way of Heaven Agent

**为学习 AI Agent 而造的开源实践场——零框架手写 RAG 与工具循环，装进一间典籍可溯的三贤茶寮。**

[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-087ea4?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/vitest-passing-6da55f)](docs/verification-plan.md)
[![Local First](https://img.shields.io/badge/data-local--first-8a5f38)](#九--数据与隐私)
[![License: MIT](https://img.shields.io/badge/License-MIT-a8473c)](LICENSE)

<img src="docs/assets/screenshot-chat.png" alt="三贤茶寮对谈界面" width="820" />

</div>

---

## 一 · 这是什么

这个项目为两件事而生，**重心是学 AI Agent**：把 RAG、引用校验、最小工具循环这些机制零框架亲手写一遍，再配一座「学习中心」把每个机制讲成课；其次是**学命理**——把八字排盘做成可点击的活教材，每个干支、十神、大运都能追问到底。承载这两件事的产品形态，是一间夜场茶寮：

你带着一个困惑落座，三位常驻「贤者」按固定次序回应你——不聊模板话，不做救世主，回答必须援引你**亲自上传**的典籍，且每条引用可以点开核对到 PDF 页码或章节原文；引用造假会被程序当场作废。

| | 席位 | 是谁 | 给你什么 |
| --- | --- | --- | --- |
| <img src="public/avatars/hu.png" width="56" /> | 右席 · 时 | **盲派算师·老胡** —— 市井江湖长辈，先开口 | 批象论势、时机窗口与进退宜忌，落到「明早能干什么」 |
| <img src="public/avatars/li.png" width="56" /> | 左席 · 醒 | **存在主义导师·李** —— 加缪式清醒对话者，第二位 | 拆自欺、交还自由，给一个可执行的小步 |
| <img src="public/avatars/xuan.png" width="56" /> | 主席 · 化 | **主事·玄** —— 道家掌柜，收束 | 化合两人，给方向与节奏，留白 |

三条铁律贯穿全部实现：**本地优先**（数据不出本机）、**确定性优先**（排盘与命理解释由代码推算，模型只解读）、**学习优先**（RAG 与 Agent 机制全部手写，项目本身即教材）。

## 二 · 核心功能

**最小 Agent 工具循环** — `mode:"agent"` 下由调度模型自主调用 `search_library` / `read_source_unit` / `ready_to_answer` 三个工具收集证据（zod 校验、次数与超时限制、证据台账去重），随后按三贤格式起草并过引用/声口双校验；停止条件、每步轨迹完整可查——刊头「**循迹**」开关一键切换，回答下方即是**执行轨迹面板（M4）**。设计见 [`docs/agent-loop-design.md`](docs/agent-loop-design.md)；验收 `npm run acceptance`。配套教学见学习中心 Agent 径第三课。

**三贤对谈（分库 RAG + 引用校验）** — 每位贤者只允许引用自己专库的典籍（李=存在主义/斯多葛，老胡=易经命理/中华典籍，玄=道家/中华典籍；未标注文档三人共享）。回答格式强制 `[《书名》, 位置]`，逐条与检索证据比对：查无此据或越库引用，**整组引用作废并定向重试**；另有确定性「声口校验」防止三个角色漂成同一种 AI 腔。

**学习中心（双学径课程，Agent 为重）** — 右下「学习」打开学习中心。**Agent 径五课**：RAG 之旅（十步走完摄取→校验全链）、可信链（反幻觉三道关与「整组作废」的博弈逻辑）、工具循环（受控执行 / 证据台账 / 六个停止条件 + curl 实操）、人设工程（三件套 / 铁律 / 材料隔离）、Agent 全景图（Tool use / Planning / Memory / Reflection / Multi-agent / Evals 六大件与本项目坐标）；**命理径三课**（认盘 / 干支十神 / 完整分析）。每课 3~5 分钟导览，逐步标注源码路径、带实操作业，进度存本机；另有全站术语悬浮、`/learn` 学习馆（走读文档站内直读 + 术语表），以及学习模式下每轮回答附带的**管线注解**（检索命中/分库分布/校验结果）。设计见 [`docs/learning-mode-design.md`](docs/learning-mode-design.md)。顶栏「看示例回复」可不调模型直接看一轮三贤对答范例。

**八字排盘（大师口径）** — 真太阳时（经度差 + 均时差）、起运精确到**几年几个月几天**、晚子时两派可选、大运小运流年神煞命宫身宫胎元俱全；干支按五行着色。方法与口径详见 [`docs/bazi-guide.md`](docs/bazi-guide.md)。

**命理规则引擎（71 词条 + 完整分析）** — 盘面任何元素可点击释义，词条交叉互链；「盘面总览」对你的盘做**八节完整分析**：日主月令、强弱记分、五行盛缺、喜忌方向、十神偏重与性格线索、当前大运流年、宫位。全部由查表与生克规则推出，可核验，模型零参与。每张卡可一键「问三贤」或「查典籍」。

**入阁藏书** — 上传 PDF / Markdown / TXT，按页或章节切分索引，归入思想传统标签；扫描件明确提示暂不支持而非假装成功。

## 三 · 快速开始

需要 Node.js 22 LTS。

```bash
npm ci
cp .env.example .env.local   # 按下表填写
npm run dev                  # http://localhost:3000
```

不配任何 API Key 也能跑通大半：排盘、命理释义、学习模式全可用；点「看示例回复」看对谈效果；配 `USE_MOCK_EMBEDDING=1` 还能验证上传与检索链路。

### 环境变量

| 变量 | 作用 | 示例 |
| --- | --- | --- |
| `CHAT_BASE_URL` | Anthropic `/messages` 兼容端点 | `https://api.minimaxi.com/anthropic` |
| `CHAT_API_KEY` | 聊天模型密钥 | `sk-…` |
| `CHAT_MODEL` | 模型名（需支持原生 tool use，可用 `npm run probe:tools` 探测） | `MiniMax-M3` |
| `OPENAI_COMPAT_BASE_URL` | OpenAI `/embeddings` 兼容端点 | `https://api.openai.com/v1` |
| `OPENAI_COMPAT_API_KEY` | Embedding 密钥 | `sk-…` |
| `OPENAI_COMPAT_EMBEDDING_MODEL` | Embedding 模型 | `text-embedding-3-large` |
| `USE_MOCK_EMBEDDING` | `1` = 本地词法 mock（免 Key 验证链路；换真模型后需重建索引） | `1` |
| `DATA_DIR` / `VECTOR_BACKEND` | 数据目录 / 向量后端 | `./data` / `local` |

### 使用流程

1. 建立**问者档**（生辰 → 自动排盘），点盘面任意元素学命理，「盘面总览」看完整分析。
2. **入阁藏书**：上传典籍或笔记，选思想传统标签，等待索引完成。
3. 把困惑**送上茶案**，读三贤回应；打开「出典」核对原文。
4. 释义卡「问三贤」可把带盘面语境的问题直接递入对谈。
5. 刊头开「**循迹**」再问一次：改走 Agent 工具循环，回答下方展开**执行轨迹面板**，逐步看它调了什么工具、收了哪些证据、为何停下。
6. 右下「学习」进双学径课程；[`/learn`](http://localhost:3000/learn) 学习馆有全部走读文档与术语表。

## 四 · 八字方法一览

| 事项 | 口径 | 依据 |
| --- | --- | --- |
| 历法干支 | `lunar-javascript` | 通行历法库 |
| 真太阳时 | 经度差 + 均时差（EOT），跨日换日柱 | `src/core/user/solarTime.ts` |
| 晚子时 | 默认当日（子平主流），可切次日 | `lateZiRule` |
| 起运 | 精确到年月日；默认 3 天=1 年折算，可切精确制 | `qiYunConvention` |
| 流年 | 立春为界 | `src/core/mingli/liuNian.ts` |
| 强弱/喜忌/十神偏重 | 查表 + 记分的确定性规则，卡内写明局限 | `src/core/mingli/explainChart.ts` |
| 排盘分发 | 老胡全量 / 玄气机 / 李完全隔离 | `src/core/mingli/chartBrief.ts` |

完整说明：[`docs/bazi-guide.md`](docs/bazi-guide.md)。

## 五 · 产品边界

不做恐吓式算命与必然性预测；命理内容是文化解释与自我观察参考，不是医学、法律或投资建议；模型不得自行推算干支与日期；无典籍证据时明说「暂未入藏」；不替你做最终人生决定。出生信息与私人典籍默认不离开本机。

## 六 · 技术栈与架构

Next.js 15 + React 19 + TypeScript 全栈；本地 JSON 元数据与向量索引；`pdfjs-dist` 按页提取；自研命理规则引擎；Anthropic 兼容聊天 + OpenAI 兼容 Embedding；vitest + zod；Supabase 为可选云端快照。**为什么这么选、为什么不选 LangChain/LightRAG/GraphRAG**，见 [`docs/tech-stack.md`](docs/tech-stack.md)。

<img src="docs/assets/architecture.svg" alt="整体架构：摄取管线、默认 RAG 链、循迹 Agent 循环、命理确定性引擎与本地存储" width="100%" />

四条泳道对应四套机制：**摄取**把典籍变成带出处坐标的向量记忆；**默认 RAG 链**每步代码写死、以双校验与定向重试收口；**循迹 Agent 循环**把「下一步做什么」交给调度模型（工具受控、证据入台账、六个停止条件、全程轨迹可视）；**命理引擎**纯确定性推算后按材料隔离三档注入。

### 文档地图

| 主题 | 文档 |
| --- | --- |
| 当前架构与数据流 | [`docs/architecture.md`](docs/architecture.md) |
| 目标 Agent 蓝图 / 工具循环设计 | [`docs/agent-blueprint.md`](docs/agent-blueprint.md) · [`docs/agent-loop-design.md`](docs/agent-loop-design.md) |
| 三贤分库 × 命理注入 | [`docs/mentor-libraries-and-bazi-design.md`](docs/mentor-libraries-and-bazi-design.md) |
| 排盘使用方法 | [`docs/bazi-guide.md`](docs/bazi-guide.md) |
| 视觉语言（新中式） | [`docs/design-language.md`](docs/design-language.md) |
| 学习模式 v2 设计（双学径） | [`docs/learning-mode-design.md`](docs/learning-mode-design.md) |
| RAG / Agent 入门走读 | [`docs/rag-concepts-primer.md`](docs/rag-concepts-primer.md) · [`docs/rag-beginner-walkthrough.md`](docs/rag-beginner-walkthrough.md) · [`docs/agent-beginner-walkthrough.md`](docs/agent-beginner-walkthrough.md) |
| 引用校验设计 | [`docs/rag-citation-design.md`](docs/rag-citation-design.md) |
| 路线图 / 验收计划 | [`docs/roadmap.md`](docs/roadmap.md) · [`docs/verification-plan.md`](docs/verification-plan.md) · [`docs/m5-acceptance.md`](docs/m5-acceptance.md) |
| 三贤声口范例 / 头像 | [`docs/tavern-demo.md`](docs/tavern-demo.md) · [`docs/avatar-guide.md`](docs/avatar-guide.md) · [`docs/avatar-prompts.md`](docs/avatar-prompts.md) |
| Supabase 同步 | [`docs/supabase-setup.md`](docs/supabase-setup.md) |

## 七 · 工程命令

```bash
npm run typecheck   # 类型检查
npm run lint        # 代码规范
npm test            # vitest 全量测试
npm run probe:tools # 探测聊天模型是否支持原生 tool use
npm run acceptance  # M5 验收：五场景打真实服务，硬判确定性不变量
npm run build       # 生产构建
npm run sync:supabase  # 本地快照单向推送云端（可选）
```

## 八 · 项目状态

**已完成**：最小 Agent 工具循环（M0–M3）+ **执行轨迹面板（M4）**与「循迹」开关、可信 RAG 主链路（分库检索 + 双重校验 + 定向重试 + 学习模式管线注解）、**M5 验收脚本**（`npm run acceptance`）、学习中心（Agent 径五课 + 命理径三课）与 `/learn` 学习馆（手写 Markdown 渲染 + 术语表）、完整排盘与命理规则引擎（含盘面完整分析）、三贤人设加固、新中式视觉语言 v5。
**进行中**：M5 人工验收执行（清单见 [`docs/m5-acceptance.md`](docs/m5-acceptance.md)，五场景全过后翻转默认模式为 agent）。
**未开始**：会话与长期记忆、BM25 混合检索、OCR/EPUB 摄取、系统化评测、多用户部署（Auth/RLS/限流）。详见 [`docs/roadmap.md`](docs/roadmap.md)。

## 九 · 数据与隐私

```text
data/
  app.json      文档与 chunk 元数据（Git 忽略）
  documents/    你上传的原始文件（Git 忽略）
  indexes/      本地向量索引（Git 忽略）
  samples/      可公开的演示材料
```

一切默认只写本机；`npm run sync:supabase` 是显式、单向的云端快照。**不要**把当前本地 API 直接开放为公网服务（尚无 Auth 与限流）。

## 十 · 贡献与联系

个人学习项目，欢迎 Issue 交流想法；提交 PR 前请先读 `docs/roadmap.md` 与相应设计文档，保持「本地优先 / 确定性优先 / 学习优先」三原则。

- 作者：**kiko**
- 邮箱：<lixingye@vigourverse.com>
- 许可：[MIT](LICENSE)。注意：你上传入库的典籍归各自版权方所有，默认只存本机、被 Git 忽略，**不要**把受版权保护的书随仓库提交。

<div align="center"><sub>以茶代酒 · 以问代卜</sub></div>
