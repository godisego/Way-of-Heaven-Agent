/**
 * 学习馆自测题库
 *
 * 每条题关联一个学径和可选的讲义 slug——答错时可直接跳回讲义。
 * 当前 31 题：Agent 径 23 题 + 命理径 8 题（页面计数为动态统计，无需随题目增删改文案）。
 *
 * 扩展规则：新增题目只需 push 到 QUIZ_QUESTIONS 数组，前端自动渲染。
 */

export type QuizQuestion = {
  /** 唯一 ID，格式：track-stage-number */
  id: string;
  /** 关联学径 */
  track: "agent" | "mingli";
  /** 关联阶段 */
  stage: string;
  /** 关联讲义 slug（用于"回看讲义"跳转） */
  docSlug?: string;
  /** 题目 */
  question: string;
  /** 选项 */
  options: string[];
  /** 正确选项索引（0-based） */
  correctIndex: number;
  /** 解析 */
  explanation: string;
  /** 难度 */
  level: "入门" | "进阶" | "工程";
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // ── Agent 径 · 零 · 全景 ──
  {
    id: "agent-0-q1",
    track: "agent",
    stage: "零 · 全景",
    docSlug: "ai-agent-panorama",
    question: "纯 LLM、RAG、Agent 三者最核心的区别是什么？",
    options: [
      "模型大小不同：Agent 最大，纯 LLM 最小",
      "纯 LLM 问一次答一次；RAG 先查资料再答；Agent 自己决定查什么、查几次",
      "纯 LLM 最便宜，RAG 中等，Agent 最贵",
      "三者没有本质区别，只是营销词不同",
    ],
    correctIndex: 1,
    explanation:
      "核心区别在于'自主决策'：纯 LLM 是被动回答，RAG 是固定查一次再答，Agent 是模型自己决定要不要查、查什么、查几次。参见 AI Agent 全景图第一章。",
    level: "入门",
  },
  {
    id: "agent-0-q2",
    track: "agent",
    stage: "零 · 全景",
    docSlug: "ai-agent-panorama",
    question: "天道茶寮的「循迹」模式对应 AI 发展的哪个阶段？",
    options: ["① 纯 LLM", "② RAG", "③ Agent", "④ 多智能体"],
    correctIndex: 1,
    explanation:
      "循迹 = RAG 模式（②），先查资料再答一次。默认模式才走 Agent 工具循环（③）。三贤分库是多智能体雏形（④）。参见全景图第一章。",
    level: "入门",
  },

  // ── Agent 径 · 一 · 认地图 ──
  {
    id: "agent-1-q1",
    track: "agent",
    stage: "一 · 认地图",
    docSlug: "llm-fundamentals",
    question: "一个中文字大约等于几个 token？",
    options: ["0.5 个", "1~2 个", "5~10 个", "一个字就是一个 token"],
    correctIndex: 1,
    explanation:
      "中文一个字大约 1~2 个 token（英文更省）。token 是模型处理文本的最小单位，不是字符。参见 LLM 基础原理第二章。",
    level: "入门",
  },
  {
    id: "agent-1-q2",
    track: "agent",
    stage: "一 · 认地图",
    docSlug: "llm-fundamentals",
    question: "温度（temperature）= 0 时模型会怎样？",
    options: [
      "完全随机选择下一个 token",
      "每次都选概率最高的 token，回答最稳定",
      "模型会拒绝回答",
      "温度和回答没有关系",
    ],
    correctIndex: 1,
    explanation:
      "温度 = 0 时模型总是选概率最高的 token，回答最稳定、最可预测。天道茶寮用低温度防止幻觉。参见 LLM 基础原理第四章。",
    level: "入门",
  },
  {
    id: "agent-1-q3",
    track: "agent",
    stage: "一 · 认地图",
    docSlug: "rag-concepts",
    question: "RAG 解决的核心问题是哪两个？",
    options: [
      "模型太大和太慢",
      "知识截止和幻觉——让模型'开卷考试'而不是'闭卷瞎编'",
      "API 太贵和延迟太高",
      "中文支持和英文支持不一样",
    ],
    correctIndex: 1,
    explanation:
      "RAG = 检索增强生成。它通过'先查资料再答'解决两个问题：知识截止（模型不知道的事）和幻觉（模型编造不存在的内容）。参见 RAG 概念入门第一章。",
    level: "入门",
  },
  {
    id: "agent-1-q4",
    track: "agent",
    stage: "一 · 认地图",
    docSlug: "ai-product-scenarios",
    question: "以下哪个问题最适合用 AI？",
    options: [
      "计算 1234 × 5678",
      "判断一个数是不是偶数",
      "从 100 篇用户反馈里提取'不满意的原因'",
      "查今天比特币的实时价格",
    ],
    correctIndex: 2,
    explanation:
      "计算用计算器、判断偶数用 if-else、实时价格用 API——这些规则明确，不需要 AI。从大量文本提取信息需要理解自然语言，适合 AI。参见 AI 产品与业务场景第二章。",
    level: "入门",
  },
  {
    id: "agent-1-q5",
    track: "agent",
    stage: "一 · 认地图",
    docSlug: "prompt-engineering",
    question: "系统提示词的四个关键要素是什么？",
    options: [
      "语气、长度、格式、风格",
      "身份（你是谁）、能力边界（能做/不能做）、输出格式、兜底规则",
      "语言、温度、模型、版本",
      "输入、处理、输出、反馈",
    ],
    correctIndex: 1,
    explanation:
      "好 prompt 的四要素：身份（你是谁）+ 能力边界（能做/不能做）+ 输出格式 + 兜底规则（没资料时怎么办）。三贤人设就是这四要素的实战。参见 Prompt Engineering 第一章。",
    level: "入门",
  },
  {
    id: "agent-1-q6",
    track: "agent",
    stage: "一 · 认地图",
    docSlug: "prompt-engineering",
    question: "什么是'提示注入'（Prompt Injection）？",
    options: [
      "往模型训练数据里投毒",
      "攻击者在输入里写'忽略前面的指令'来操纵模型行为",
      "给模型太多 prompt 导致超内存",
      "把两个 prompt 合并成一个",
    ],
    correctIndex: 1,
    explanation:
      "提示注入 = 攻击者在用户输入里夹带恶意指令，试图覆盖系统提示词。防护要三层：输入清洗 + prompt 加固 + 输出校验。参见 Prompt Engineering 第六章。",
    level: "入门",
  },
  {
    id: "agent-1-q7",
    track: "agent",
    stage: "一 · 认地图",
    docSlug: "agent-walkthrough",
    question: "Agent 和 RAG 的关键区别是什么？",
    options: [
      "Agent 用大模型，RAG 用小模型",
      "RAG 固定查一次再答；Agent 模型自己决定查什么、查几次、什么时候停",
      "Agent 只能查文本，RAG 什么都能查",
      "RAG 比 Agent 更先进",
    ],
    correctIndex: 1,
    explanation:
      "Agent = 模型在循环里反复'想→做→看结果→再想'，自己决定调什么工具、查几次。RAG 是固定查一次再答。参见 Agent 基础概念第一章。",
    level: "入门",
  },

  // ── Agent 径 · 二 · 拆系统 ──
  {
    id: "agent-2-q1",
    track: "agent",
    stage: "二 · 拆系统",
    docSlug: "vector-search-hands-on",
    question: "Mock embedding 和 real embedding 的核心区别是什么？",
    options: [
      "Mock 不花钱，real 要花钱——这是唯一区别",
      "Mock 用哈希模拟向量，不懂语义；real 用模型理解语义，检索更准",
      "Mock 更快，real 更慢",
      "Mock 只能用于测试，real 只能用于生产",
    ],
    correctIndex: 1,
    explanation:
      "Mock embedding 用 SHA-512 哈希模拟向量，只能匹配字面相同的词。Real embedding 用模型理解语义，能匹配'意思相近但字面不同'的内容。参见向量检索实战第三章。",
    level: "进阶",
  },
  {
    id: "agent-2-q2",
    track: "agent",
    stage: "二 · 拆系统",
    docSlug: "vector-search-hands-on",
    question: "余弦相似度 = 0.95 意味着什么？",
    options: [
      "两个向量完全不相关",
      "两个向量方向非常接近，语义高度相似",
      "两个向量完全相反",
      "两个向量长度相等",
    ],
    correctIndex: 1,
    explanation:
      "余弦相似度范围 [-1, 1]：1 = 完全同方向（语义一样），0 = 正交（无关），-1 = 相反。0.95 说明语义高度相似。参见向量检索实战第四章。",
    level: "进阶",
  },
  {
    id: "agent-2-q3",
    track: "agent",
    stage: "二 · 拆系统",
    docSlug: "api-integration",
    question: "HTTP 状态码 401 代表什么？",
    options: [
      "资源不存在",
      "服务器内部错误",
      "未授权——需要认证（如 API Key 缺失或错误）",
      "请求格式不对",
    ],
    correctIndex: 2,
    explanation:
      "401 Unauthorized = 未授权，需要认证。常见于 API Key 缺失或错误。400=格式不对，403=权限不够，404=不存在，500=服务器错。参见 API 与系统集成第二章。",
    level: "进阶",
  },
  {
    id: "agent-2-q4",
    track: "agent",
    stage: "二 · 拆系统",
    docSlug: "api-integration",
    question: "MCP（Model Context Protocol）解决什么问题？",
    options: [
      "让模型运行得更快",
      "统一工具接入标准——不用每个平台各写一套工具适配",
      "压缩模型参数量",
      "替代 HTTP 协议",
    ],
    correctIndex: 1,
    explanation:
      "MCP = Anthropic 提的统一工具接入协议。以前接 OpenAI 工具和接 Claude 工具各写一套，MCP 统一了接入方式。参见 API 与系统集成第七章。",
    level: "进阶",
  },

  // ── Agent 径 · 三 · 建可信链 ──
  {
    id: "agent-3-q1",
    track: "agent",
    stage: "三 · 建可信链",
    docSlug: "citation-design",
    question: "引用校验失败时天道茶寮会怎么处理？",
    options: [
      "直接把错误回答返回给用户",
      "整组引用作废并定向重试一次",
      "永久封禁用户",
      "关闭整个服务",
    ],
    correctIndex: 1,
    explanation:
      "引用校验失败 = 模型编造了不存在的出处。处理方式：整组引用作废 + 定向重试一次。再不行就返回安全兜底。参见引用校验设计。",
    level: "进阶",
  },

  // ── Agent 径 · 四 · 让模型行动 ──
  {
    id: "agent-4-q1",
    track: "agent",
    stage: "四 · 让模型行动",
    docSlug: "agent-loop",
    question: "天道茶寮 Agent 循环的步数上限是多少？",
    options: ["3 步", "6 步", "10 步", "没有上限"],
    correctIndex: 1,
    explanation:
      "MAX_STEPS = 6。太大会反复搜索烧 token，太小可能没搜够就停。6 步是经验值。参见工具循环设计和作业练习册第 3 题。",
    level: "工程",
  },
  {
    id: "agent-4-q2",
    track: "agent",
    stage: "四 · 让模型行动",
    docSlug: "agent-loop",
    question: "Evidence Ledger（证据台账）解决了什么问题？",
    options: [
      "让模型回答更快",
      "避免 TopK 文本直接拼进 prompt 的重复和串扰——先去重、过滤再交给模型",
      "存储用户数据",
      "给用户看执行轨迹",
    ],
    correctIndex: 1,
    explanation:
      "证据台账 = 独立记录每条结论可用哪些来源。不是 TopK 直接拼进 prompt，而是先去重、过滤、整理后再交模型，避免重复和串扰。参见工具循环设计。",
    level: "工程",
  },

  // ── Agent 径 · 五 · 调试与评测 ──
  {
    id: "agent-5-q1",
    track: "agent",
    stage: "五 · 调试与评测",
    docSlug: "agent-trace-debugging",
    question: "执行轨迹（Trace）里记录什么？",
    options: [
      "模型的完整思维链（含内部推理）",
      "每一步的工具选择、参数、返回结果、耗时——不含模型私有思维链",
      "用户的个人信息",
      "API Key 和密钥",
    ],
    correctIndex: 1,
    explanation:
      "Trace 只记结构化的工具调用：选了什么工具、参数是什么、返回什么、耗时多少。不暴露模型私有思维链。参见执行轨迹调试手册。",
    level: "工程",
  },

  // ── Agent 径 · 七 · 造一个 ──
  {
    id: "agent-7-q1",
    track: "agent",
    stage: "七 · 造一个",
    docSlug: "build-an-agent",
    question: "通用智能体、企业智能体、AI4S 三类的重心分别在哪？",
    options: [
      "通用=模型大；企业=数据多；AI4S=算力强",
      "通用=角色 prompt+广泛知识；企业=RAG+知识库+工具+校验；AI4S=工具链+数据管道+可复现",
      "三者没有区别",
      "通用最简单，AI4S 最难",
    ],
    correctIndex: 1,
    explanation:
      "三类重心不同：通用智能体靠 prompt 和广泛知识；企业智能体重在 RAG 链路和知识库；AI4S 重在工具链和数据管道。天道茶寮属于企业智能体。参见造一个智能体第一章。",
    level: "进阶",
  },
  {
    id: "agent-7-q2",
    track: "agent",
    stage: "七 · 造一个",
    docSlug: "build-an-agent",
    question: "chunk 切太大和切太小各有什么问题？",
    options: [
      "切太大没问题，切太小有问题",
      "切太小没问题，切太大有问题",
      "切太大：检索带回无关文本浪费 token；切太小：语义不完整、检索不准",
      "chunk 大小不影响检索质量",
    ],
    correctIndex: 2,
    explanation:
      "切太大 → 命中后带回一堆无关文本、浪费上下文窗口；切太小 → 语义不完整、检索不准。天道茶寮用 1200 字符 + 160 重叠做平衡。参见造一个智能体第三章。",
    level: "进阶",
  },

  // ── Agent 径 · 八 · 上线与治理 ──
  {
    id: "agent-8-q1",
    track: "agent",
    stage: "八 · 上线与治理",
    docSlug: "ai-security-governance",
    question: "AI 的六类风险中，'提示注入'属于哪一类？",
    options: ["数据风险", "模型风险", "系统风险", "不算是风险"],
    correctIndex: 2,
    explanation:
      "提示注入属于系统风险——攻击者操纵模型行为。六类风险：数据（泄露+PII）、模型（幻觉+有害内容）、系统（注入+拒绝服务）。参见 AI 安全与治理第一章。",
    level: "工程",
  },
  {
    id: "agent-8-q2",
    track: "agent",
    stage: "八 · 上线与治理",
    docSlug: "production-deployment",
    question: "灰度发布（Canary Release）的目的是什么？",
    options: [
      "让上线更快",
      "让部分用户先用新版本，发现问题只影响小范围，便于回滚",
      "让代码更好看",
      "减少服务器数量",
    ],
    correctIndex: 1,
    explanation:
      "灰度发布 = 先让一小部分用户用新版本，观察没问题再扩大范围。发现问题只影响小范围，可快速回滚。参见生产部署与运维第六章。",
    level: "工程",
  },

  // ── Agent 径 · 附录 ──
  {
    id: "agent-app-q1",
    track: "agent",
    stage: "附录 · 基础知识",
    docSlug: "sql-basics",
    question: "SQL 中 WHERE 和 HAVING 的区别是什么？",
    options: [
      "没有区别，可以互换",
      "WHERE 在分组前过滤行；HAVING 在分组后过滤组",
      "WHERE 只能用于 SELECT；HAVING 能用于所有语句",
      "WHERE 比 HAVING 快",
    ],
    correctIndex: 1,
    explanation:
      "WHERE 在 GROUP BY 之前过滤行，不能用聚合函数；HAVING 在 GROUP BY 之后过滤组，可以用聚合函数（如 HAVING COUNT(*) > 5）。参见 SQL 基础第五章。",
    level: "入门",
  },
  {
    id: "agent-app-q2",
    track: "agent",
    stage: "附录 · 基础知识",
    docSlug: "python-basics",
    question: "Python 中 `with open(...) as f` 相比 `f = open(...)` 的优势是什么？",
    options: [
      "代码更短",
      "自动关闭文件，即使中途出异常也不会忘记关闭",
      "读取速度更快",
      "可以同时打开更多文件",
    ],
    correctIndex: 1,
    explanation:
      "with 语句是上下文管理器，退出 with 块时自动调用 f.close()——即使中间出异常也会关闭。不用 with 的话忘记 close 会导致文件描述符泄漏。参见 Python 基础第八章。",
    level: "入门",
  },

  // ── 命理径 · 零 · 入门预备 ──
  {
    id: "mingli-0-q1",
    track: "mingli",
    stage: "零 · 入门预备",
    docSlug: "bazi-overview",
    question: "八字命理的核心数据是什么？",
    options: [
      "出生时刻的年月日时四个干支组合——共八个字",
      "手相和面相",
      "姓名的笔画数",
      "风水方位",
    ],
    correctIndex: 0,
    explanation:
      "八字 = 出生时刻的年月日时各取一个干支，共四柱八字。这是整个命理系统的核心数据。参见命理大局观第一章。",
    level: "入门",
  },
  {
    id: "mingli-0-q2",
    track: "mingli",
    stage: "零 · 入门预备",
    docSlug: "bazi-overview",
    question: "八字命理能做什么？不能做什么？",
    options: [
      "能预测具体事件（某年某月会发生什么）",
      "能替代医学和投资决策",
      "能描述初始偏向和观察框架，不能预测具体事件",
      "能断言好命坏命",
    ],
    correctIndex: 2,
    explanation:
      "八字描述'出厂参数'（哪些气偏旺偏弱）和观察框架，不预测具体事件、不替代专业决策、不断好命坏命。参见命理大局观第一章的'是/不是'表。",
    level: "入门",
  },

  // ── 命理径 · 一 · 先认盘 ──
  {
    id: "mingli-1-q1",
    track: "mingli",
    stage: "一 · 先认盘",
    docSlug: "bazi-chart-anatomy",
    question: "盘面上的'日主'是什么？",
    options: [
      "出生那天的年干",
      "出生那天的日柱天干——八字里的'我'，全盘以它论生克",
      "出生那个月的月支",
      "出生时辰的地支",
    ],
    correctIndex: 1,
    explanation:
      "日主 = 日柱的天干，是八字里的'我'。所有十神（印、食伤、官杀、财、比劫）都以日主为坐标推演。盘面上以朱色标注。参见八字盘面解剖。",
    level: "入门",
  },
  {
    id: "mingli-1-q2",
    track: "mingli",
    stage: "一 · 先认盘",
    docSlug: "bazi-stems-branches",
    question: "天干有几个？地支有几种？",
    options: [
      "天干 8 个，地支 10 个",
      "天干 10 个，地支 12 个",
      "天干 12 个，地支 10 个",
      "天干 5 个，地支 8 个",
    ],
    correctIndex: 1,
    explanation:
      "天干 10 个：甲乙丙丁戊己庚辛壬癸。地支 12 个：子丑寅卯辰巳午未申酉戌亥。参见天干地支与藏干。",
    level: "入门",
  },

  // ── 命理径 · 二 · 读懂关系 ──
  {
    id: "mingli-2-q1",
    track: "mingli",
    stage: "二 · 读懂关系",
    docSlug: "bazi-ten-gods-strength",
    question: "十神中'印'代表什么关系？",
    options: [
      "我生的（食伤）",
      "生我的（印）——母亲、长辈、庇护",
      "克我的（官杀）",
      "我克的（财）",
    ],
    correctIndex: 1,
    explanation:
      "十神以日主为坐标：生我=印（母亲/庇护），我生=食伤（才华/输出），克我=官杀（管束/事业），我克=财（欲望/控制），同我=比劫（竞争/兄弟）。参见十神与强弱。",
    level: "进阶",
  },
  {
    id: "mingli-2-q2",
    track: "mingli",
    stage: "二 · 读懂关系",
    docSlug: "bazi-branch-relations",
    question: "地支'六合'是指什么？",
    options: [
      "六个地支排成一排",
      "两两地支之间的六对和谐关系（如子丑合、寅亥合）",
      "六个地支互相冲",
      "地支的六个方位",
    ],
    correctIndex: 1,
    explanation:
      "六合 = 六对地支的和谐关系：子丑合、寅亥合、卯戌合、辰酉合、巳申合、午未合。合代表和谐、联结。参见干支合冲刑害会。",
    level: "进阶",
  },

  // ── 命理径 · 三 · 加上时间 ──
  {
    id: "mingli-3-q1",
    track: "mingli",
    stage: "三 · 加上时间",
    docSlug: "bazi-luck-cycles",
    question: "大运和流年的区别是什么？",
    options: [
      "大运是月柱推的，流年是日柱推的",
      "大运管十年运势，流年管一年运势",
      "两者没有区别",
      "大运管一生，流年管一天",
    ],
    correctIndex: 1,
    explanation:
      "大运 = 十年一个阶段的运势（从月柱推），流年 = 每年的流年天干地支。大运管大势，流年管年度环境。参见起运、大运与流年。",
    level: "进阶",
  },

  // ── 命理径 · 五 · 核对口径 ──
  {
    id: "mingli-5-q1",
    track: "mingli",
    stage: "五 · 核对口径",
    docSlug: "bazi-guide",
    question: "真太阳时需要校正什么？",
    options: [
      "只校正出生年份",
      "经度差（每度 4 分钟）+ 均时差（EOT）",
      "只校正出生地海拔",
      "不需要校正",
    ],
    correctIndex: 1,
    explanation:
      "真太阳时 = 经度差（出生地与北京时间的经度差，每度 4 分钟）+ 均时差（EOT，地球椭圆轨道导致的时间偏差）。跨日时日柱可能因此换日。参见排盘操作与算法口径。",
    level: "进阶",
  },
];

/** 按学径过滤题目 */
export function getQuizByTrack(track: "agent" | "mingli"): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((q) => q.track === track);
}

/** 按阶段过滤题目 */
export function getQuizByStage(track: "agent" | "mingli", stage: string): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((q) => q.track === track && q.stage === stage);
}

/** 按 ID 查单题 */
export function getQuizById(id: string): QuizQuestion | undefined {
  return QUIZ_QUESTIONS.find((q) => q.id === id);
}
