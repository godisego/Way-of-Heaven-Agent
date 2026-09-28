/**
 * Agent 径课程 —— 教具是这套系统本身。
 * 内容与实现严格同源：凡引用口径处标注源码路径；改实现必须同步改课文。
 */

import type { Lesson } from "./index";

export const AGENT_LESSONS: Lesson[] = [
  {
    id: "agent-1",
    no: "一",
    title: "RAG 之旅：资料如何变成记忆",
    minutes: 4,
    steps: () => [
      {
        popover: {
          title: "Agent 径 · 第一课 RAG 之旅",
          description:
            "RAG（检索增强生成）= 先查资料、再作答，让模型「开卷考试」。\n完整链条：上传 → 解析 → 切分 → 向量化 → 入库 → 检索 → 拼上下文 → 生成 → 校验。\n本课走完整条链，每一步都指给你看它在界面上的位置和源码里的名字。",
        },
      },
      {
        element: "[data-tour-id='uploader-card']",
        popover: {
          title: "① 摄取：先切「来源单元」",
          description:
            "上传的 PDF 按页提取（pdfjs-dist）、md/txt 按标题或段落切成「来源单元」。\n单元编号（第几页/第几节）就是日后引用的出处坐标——先定坐标再切块，才能做到「每条引用可核对」。\n源码：src/core/ingestion/。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='uploader-card']",
        popover: {
          title: "② 切分（chunking）的两难",
          description:
            "chunk 是检索的最小粒度。切太大：命中后带回一堆无关文字，稀释上下文；切太小：语义残缺，检不准。\n本项目在来源单元边界内切分——宁可块稍大，也不打破「出处完整性」。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='library-card']",
        popover: {
          title: "③ 状态机与去重",
          description:
            "每份文档走状态机：uploaded → extracting → indexing → indexed；失败记 failed（含原因），可重传。\n内容按 SHA-256 去重——同一本书传两次不会重复建索引。全部状态持久化在本地 data/app.json，刷新不丢。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='library-card']",
        popover: {
          title: "④ 向量化（embedding）",
          description:
            "索引 = 把每个 chunk 交给 embedding 模型，变成一根高维向量（维度取决于具体模型）；向量相似度可用于候选召回，但是否相关仍要评测。\n环境变量 USE_MOCK_EMBEDDING=1 会换成词法 mock——管道全真、语义打折，专供免 Key 学习。⚠️ 换模型必须重建索引：不同模型的向量空间互不相通。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='chat-input']",
        popover: {
          title: "⑤ 检索：RAG 的命门",
          description:
            "你的问题也被同一个模型向量化，然后与库里全部 chunk 算余弦相似度，取最相近的 topK 条。\n检索质量影响回答上限；即使命中正确材料，仍需核对生成是否得到材料支持。\n源码：src/core/retrieval/retrieveContext.ts。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='chat-input']",
        popover: {
          title: "⑥ 三贤分库：来源范围",
          description:
            "本项目多一步：一次大召回（topK×6）后，按文档的「思想传统」标签把证据分成三份——\n李只拿存在主义/斯多葛，老胡拿易经/中华典籍，玄拿道家/中华典籍；未标注的三人共享。\n专库为空时要求说明缺少材料。思想传统标签限制角色引用范围，不是用户权限控制。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='chat-submit']",
        popover: {
          title: "⑦ 拼上下文 → 生成",
          description:
            "命中的 chunk 按固定格式拼进 prompt：每条带 cite_as（书名 + 位置），并标注「仅某某可引用」。\n随人设铁律一起发给模型，按所选在席角色生成对谈。注意：生成到这里只是初稿——RAG 的下半场是校验（下一课）。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='messages']",
        popover: {
          title: "⑧ 校验后才是答案",
          description:
            "回答按所选【角色】拆段，每条 [《书名》, 位置] 与本轮证据逐一比对；「出典」区能点开原文。\n引用对不上 = 整组作废。这一刀怎么切、为什么这么切，第二课细讲。",
          side: "left",
        },
      },
      {
        popover: {
          title: "心法",
          description:
            "检索、生成和验证共同影响回答质量；不存在本项目已证明的可信度乘法公式。\n实操作业：.env.local 里加 USE_MOCK_EMBEDDING=1，上传 data/samples/存在主义笔记.md，问「怎么理解自欺？请给出出处」，把出典点开对一次原文。\n深读：docs/rag-beginner-walkthrough.md。",
        },
      },
    ],
  },
  {
    id: "agent-2",
    no: "二",
    title: "可信链：反幻觉的三道关",
    minutes: 4,
    steps: () => [
      {
        popover: {
          title: "Agent 径 · 第二课 可信链",
          description:
            "模型可能生成流畅但不真实的内容；资料不足时既可能拒答，也可能编造，需要验证。\n本系统立了三道关：①提示词禁令（软）②程序化校验（硬）③定向重试（自纠）。任何一道都会漏，叠起来才稳。",
        },
      },
      {
        element: "[data-tour-id='messages']",
        popover: {
          title: "第一道 · 提示词禁令",
          description:
            "system prompt 写明：只准引用本轮 Sources 的 cite_as；查无则说「暂未入藏」；禁止凭训练记忆报书名页码。\n这是软约束——模型可能违反，所以它只配当第一道。\n源码：src/data/mentors.ts（buildMentorSystemPrompt）。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='messages']",
        popover: {
          title: "第二道 · 程序化校验（引用）",
          description:
            "代码解析每条 [《书名》, 位置]，在检索证据里精确匹配书名与位置；再按发言人查库权——李引《周易》？越库，违规。\n关键设计：一条假引用 = 整组引用作废。避免有效引用给其余无效引用造成背书；这是输出策略，不是在对模型重新训练。\n源码：src/core/retrieval/citationPolicy.ts。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='messages']",
        popover: {
          title: "第二道半 · 声口校验（人）",
          description:
            "另一组确定性规则盯「人」不盯「书」：老夫/贫道是专属自称，出现在别人嘴里=违规；李的段落出现任何干支、大运字样=违规（他被设定为不碰命理）；出现「作为AI」=破功。\n纯正则与规则表，零模型参与——硬规则拦人设漂移，这是第四课的伏笔。\n源码：src/core/retrieval/voicePolicy.ts。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='chat-submit']",
        popover: {
          title: "第三道 · 定向重试（RAG 一次）",
          description:
            "两类违规合并成一张「问题清单」，逐条列给模型，要求整体重写——这是一次带反馈的自我修正（self-correct）。\n固定 RAG 最多重试一次，Agent 生成最多重试两次；循环预算和生成重试分别计数。重试后仍不合格：引用清空 + 界面警告，宁可素答，不可假引。\n源码：src/core/retrieval/answerWithCitations.ts。",
          side: "left",
        },
      },
      {
        popover: {
          title: "实操 · 试着骗它",
          description:
            "问一个你的书库里必然没有的问题（比如「量子力学怎么看自由意志？请给出处」）——\n合格表现：三贤照常回应，但明说「暂未入藏」，出典区为空。\n若它报出了像模像样的书名页码——恭喜你亲手抓到一次幻觉（然后请提 issue）。",
        },
      },
      {
        element: "[data-tour-id='messages']",
        popover: {
          title: "最后一道关是你",
          description:
            "每条引用都能点开看原文片段。机器校验的是「出处存在且对得上」，判断「引得好不好」仍是人的事。\n可信链的终点不是系统自称可信，而是你随时可以核对。",
          side: "left",
        },
      },
      {
        popover: {
          title: "小结",
          description:
            "三道关各管一层：提示词管「意图」，校验管「来源坐标与规则」，重试管「纠错」，出典管「监督」。\n深读：docs/rag-citation-design.md。下一课：Agent 如何自己决定查什么——工具循环。",
        },
      },
    ],
  },
  {
    id: "agent-4",
    no: "四",
    title: "人设工程：三个角色为何不串味",
    minutes: 3,
    steps: () => [
      {
        popover: {
          title: "Agent 径 · 第四课 人设工程",
          description:
            "让同一个模型在一次生成里演好三个角色，是提示词工程里最容易翻车的事——多角色天然会漂成同一种「AI 客服腔」。\n本系统的答案：软硬两层。软的是提示词设计，硬的是确定性校验（第二课见过）。",
        },
      },
      {
        element: "[data-tour-id='tavern-gallery']",
        popover: {
          title: "人设三件套",
          description:
            "每位角色除了性格描述，还带三件套：\n· neverSay 负面清单——「绝不说的词」比形容词管用（李永远不说「老夫」，老胡永远不掉哲学书袋）；\n· styleSample 声口微样本——30~60 字的示范段，模型模仿样本远胜模仿描述；\n· contrast 分界线——一句话说清「我与另两位的区别」。\n源码：src/data/mentors.ts（MentorProfile）。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='tavern-gallery']",
        popover: {
          title: "铁律与自查",
          description:
            "system prompt 里另有铁律：只生成在席角色，默认全席顺序为老胡→李→玄、互换署名必须违和、各用专属自称、李禁命理语汇、禁 AI 自指；交稿前还要过一遍「自查清单」。\n把「格式要求」写成「违和判据」，模型才知道错在哪。",
          side: "left",
        },
      },
      {
        popover: {
          title: "材料分发：角色使用范围",
          description:
            "排盘简报按角色标注使用范围：老胡全量、玄取气机、李不使用。\n默认角色共享一次模型上下文，不能保证模型看不到其他角色的材料；这是提示词与输出规则分工，不是隐私隔离。\n源码：src/core/mingli/chartBrief.ts。",
        },
      },
      {
        element: "[data-tour-id='messages']",
        popover: {
          title: "实操 · 指认声口",
          description:
            "读任意一轮回答，找出三个标记：老胡的节气/棋局土喻与「留三分」，李的逼问句与意象（石头、深渊），玄的短句留白与「且去，莫急」。\n三个都能指认，说明人设立住了；指认不出，就是该调三件套的时候。",
          side: "left",
        },
      },
      {
        popover: {
          title: "小结",
          description:
            "人设工程 = 三件套（示范）+ 铁律（判据）+ 材料隔离（输入端）+ 声口校验（输出端兜底）。\n资料最小化有帮助，但角色标签不能替代访问控制；共享上下文也不能作为不泄露的保证。",
        },
      },
    ],
  },
  {
    id: "agent-3",
    no: "三",
    title: "工具循环：Agent 的一次真实决策",
    minutes: 5,
    steps: () => [
      {
        popover: {
          title: "Agent 径 · 第三课 工具循环",
          description:
            "前两课的 RAG 是一条「流水线」——每一步都是代码写死的。Agent 的分水岭在这里：\n把「下一步做什么」交给模型自己决定，代码只负责提供工具、执行调用、设置边界。\n这就是 ReAct 模式：Reason（想）→ Act（调工具）→ Observe（看结果）→ 再想，循环往复直到够用。",
        },
      },
      {
        popover: {
          title: "三个工具，各有说明书",
          description:
            "本项目给收集阶段的模型三个工具：\n· search_library(query, topK, tradition?)——按语义检索藏书，可限定思想传统；\n· read_source_unit(documentId, pageNumber)——精读某文档的一整页，且只能读检索结果里出现过的文档（文档范围检查，不能代替多用户鉴权）；\n· ready_to_answer(sufficient, missing?)——模型自报「证据够了 / 还缺什么」。\n工具描述里都写清「何时该用我」——工具设计的一半功夫在文案。\n源码：src/core/agent/tools.ts。",
        },
      },
      {
        popover: {
          title: "受控执行：模型永远不直接动手",
          description:
            "模型只输出「调用哪个工具 + 什么参数」，真正执行的是注册表：\n· zod 逐字段校验参数——不合法就把错误文本喂回去，给它一次改正机会（计入步数）；\n· 单工具调用次数上限（search 4 次、read 3 次）与超时；\n· 任何执行失败都变成「错误观察」返还模型，而不是让程序崩掉。\n源码：src/core/agent/toolRegistry.ts。",
        },
      },
      {
        popover: {
          title: "证据台账：ev_1、ev_2……",
          description:
            "每条检索/精读结果都登记进台账，按 chunk 去重、编号 ev_N；\n模型看到的观察文本只有编号 + 书名 + 位置 + 300 字预览——省 token，也防止它私藏未登记的「证据」。\n最后起草时，上下文从台账拼出，引用必须能对回台账条目。\n源码：src/core/agent/evidenceLedger.ts。",
        },
      },
      {
        popover: {
          title: "六个刹车：停机比循环更重要",
          description:
            "没有刹车的 Agent 循环会烧钱失控。本项目六个停止条件：\n最多 6 次注册表调用 / 单次调度模型请求 45s / 取证循环边界检查 90s 预算 / 同参数重复调用 / 模型主动 ready_to_answer / 模型不调工具（裸文本一律丢弃）。\n90 秒不是整轮回答的硬截止，后续生成另计；工具等待超时也不保证底层工作已取消。\n源码：src/core/agent/orchestrator.ts。",
        },
      },
      {
        popover: {
          title: "两顶帽子：侦探与作者分开",
          description:
            "收集阶段用「调度者」提示词（只准找证据、不准写答案）；证据齐了再换三贤提示词起草，之后照样过引用与声口双校验。\n为什么分开？混在一起时模型会边找边写，引用极易漂移——先侦探后作者，是多步生成的通用招。",
        },
      },
      {
        popover: {
          title: "实操 · 亲手跑一次",
          description:
            "最直接的方式：刊头开启「循迹」再提问——回答下方会出现执行轨迹面板，每步的工具、参数、观察与证据尽在其中。\n命令行党也可以（需已配 CHAT_* 并有入藏文档）：\ncurl -s -X POST http://localhost:3000/api/chat -H \"content-type: application/json\" -d \'{\"question\":\"怎么理解自欺？请给出出处。\",\"mode\":\"agent\"}\'\n返回 JSON 的 trace 字段就是面板背后的原始记录。",
        },
      },
      {
        popover: {
          title: "小结",
          description:
            "最小可用的 Agent 循环 = 工具注册表 + 证据台账 + 停止条件 + 双阶段提示词，全部手写、无框架。\n执行轨迹面板（M4）已上线：开「循迹」提问，本课讲的每一步都能在回答下方看到实物。\n深读：docs/agent-loop-design.md。",
        },
      },
    ],
  },
  {
    id: "agent-5",
    no: "五",
    title: "Agent 全景图：六个设计问题",
    minutes: 4,
    steps: () => [
      {
        popover: {
          title: "Agent 径 · 第五课 全景图",
          description:
            "从六个设计问题审视 Agent：工具、规划、记忆、反馈修正、多智能体和评测。它们不是完整性清单，多智能体和反思并非每个任务必需。\n本课把每一件放到这个项目的坐标上——已有的讲实现，没有的讲「为什么暂时不要」。学 Agent 的正确姿势，是对每一件都问一句：这个系统为什么有 / 没有它？",
        },
      },
      {
        popover: {
          title: "① Tool use —— 已实现",
          description:
            "第三课的循环。要点一句话：工具清单就是 Agent 的能力边界——它能做什么，等于你给了它什么工具、以及每个工具的说明书写得多清楚。\n工具越少越好管：本项目只给三个，每个都有次数与超时的笼子。",
        },
      },
      {
        popover: {
          title: "② Planning —— 隐式实现",
          description:
            "本项目没有显式计划器：调度者提示词里的「先检索、证据不足再精读、够了就收」就是隐式规划。\n什么时候需要真规划（任务分解 → 排序 → 逐步执行 → 动态调整）？任务多步且步骤间有依赖时——比如「读完三本书写对比综述」。单一目标的检索任务，隐式规划更便宜也更稳。",
        },
      },
      {
        popover: {
          title: "③ Reflection —— 有反馈修正",
          description:
            "引用/声口校验失败 → 把问题清单喂回模型，按路径限次重试：这是「有反馈的自我修正」。\n跨尝试保留并使用反馈记忆，与单次生成重试不同；反馈既可来自程序也可来自模型。本项目没有实现完整的跨任务反思记忆。\n工程取舍：能用程序判的错，绝不劳驾模型自省。",
        },
      },
      {
        popover: {
          title: "④ Memory —— 会话上下文已实现",
          description:
            "当前会话会带最近消息，较长历史用滚动摘要压缩并保存；刷新可恢复会话，摘要失败有规则回退。\n这不等于可跨所有会话检索的长期记忆。摘要可能失真，历史回答也不是本轮典籍证据。源码：src/core/conversation/contextBuilder.ts。",
        },
      },
      {
        popover: {
          title: "⑤ Multi-agent —— 刻意没做",
          description:
            "三贤是「一次生成里的三个角色」，不是三个独立 Agent 协作——真 multi-agent 要各自独立上下文 + 消息传递 + 协调机制。\n为什么不拆？独立调用会增加协调与调用开销，具体成本需测量；当前任务没有证明拆分能带来收益。\n这是本项目最想教的一课：工程判断比概念堆砌重要——multi-agent 是手段，不是荣誉。",
        },
      },
      {
        popover: {
          title: "⑥ Evals —— 有了验收起点",
          description:
            "没有评测，改提示词就全凭手感：这次像是好了？下次谁知道。\n项目已有 M5 五场景验收脚本与确定性单测；本轮课程校对没有重新执行真实服务验收，这是起点；系统化评测还需扩成固定问题集 + 可判定指标 + 每次改动回归。\n评测不是收尾工作，而是把「玩具」变「工程」的分界线。",
        },
      },
      {
        popover: {
          title: "收束 · 你的坐标",
          description:
            "本项目 = Tool use ✓ + 隐式 Planning ✓ + 半个 Reflection ✓ + Memory ✗ + Multi-agent ✗（刻意）+ Evals △（最小验收已有，体系待补）。\n每补一件，都先问「这个产品需要吗」。\n深读：docs/agent-blueprint.md（目标架构与验收标准）、docs/agent-beginner-walkthrough.md。",
        },
      },
    ],
  },
  {
    id: "agent-6",
    no: "六",
    title: "轨迹调试：从一次失败找到根因",
    minutes: 4,
    steps: () => [
      {
        popover: {
          title: "Agent 径 · 第六课 轨迹调试",
          description:
            "Agent 出错时，别先问「模型为什么这么笨」。先把运行切成请求、调度、执行、观察、证据台账、答案校验六层，找到第一处异常。\n后面的坏答案，经常只是前面一次坏检索的回声。",
        },
      },
      {
        element: "[data-tour-id='agent-toggle']",
        popover: {
          title: "先打开循迹",
          description:
            "循迹模式让调度模型自主调用工具，并把每一步结构化记录下来。轨迹不是模型的私密思维过程，而是可审计的动作：工具、参数、观察、证据编号与停止原因。",
          side: "bottom",
        },
      },
      {
        element: "[data-tour-id='trace-panel']",
        popover: {
          title: "读一步：动作 → 观察 → 增量",
          description:
            "先看调用了哪个工具，再看 query/topK/tradition 等参数；接着看工具返回证据、空结果还是错误；最后看新增了哪些 ev_N。\n工具选对但参数错，与工具根本选错，是两类修法。",
          side: "left",
        },
      },
      {
        popover: {
          title: "找第一处错误，不同时改三层",
          description:
            "找不到资料：先查 query 与 embedding；出处漂移：查台账元数据；重复搜索：查观察文案与重复调用刹车；跨库引用：查 tradition 与 citationPolicy；角色串味：查材料隔离与 voicePolicy。\n每次只改一个变量，再用同题回归。",
        },
      },
      {
        popover: {
          title: "停止原因也是指标",
          description:
            "正常停止可能是 ready_to_answer；异常停止可能是最大步数、总超时、重复调用或错误。\n如果大量任务都撞到同一种刹车，问题通常不在某一道题，而在工具说明、观察结构或预算设计。",
        },
      },
      {
        popover: {
          title: "从一次失败变成评测",
          description:
            "把真实失败固定下来：问题 + 知识库快照 + 期望工具路径 + 可判定不变量。以后每次改 prompt 或工具都重跑。\n深读：docs/agent-trace-debugging.md、docs/verification-plan.md、docs/m5-acceptance.md。",
        },
      },
    ],
  },
];
