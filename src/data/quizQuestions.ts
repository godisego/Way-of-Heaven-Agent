/**
 * 学习馆自测题库
 *
 * 每条题关联一个学径和可选的讲义 slug——答错时可直接跳回讲义。
 * 题目数量由页面动态统计；旧题 ID 保持稳定以兼容本机错题记录。
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
  {
    "id": "agent-map-layers",
    "track": "agent",
    "stage": "一 · AI 世界观",
    "docSlug": "ai-learning-map",
    "question": "阅读一个新 AI 产品时，首先应该怎样学习？",
    "options": [
      "先记住模型名和参数量",
      "放回功能链与五层地图，明确它解决哪一步的问题",
      "先换掉现有系统",
      "默认新产品优于旧产品"
    ],
    "correctIndex": 1,
    "explanation": "先判断任务、概念类型与系统位置，再核实来源和证据；新名字本身不是升级理由。",
    "level": "入门"
  },
  {
    "id": "agent-map-worldview",
    "track": "agent",
    "stage": "一 · AI 世界观",
    "docSlug": "ai-worldview",
    "question": "投诉分流中哪一步属于真正的行动？",
    "options": [
      "模型估计紧急程度",
      "把文本变成向量",
      "调用已授权工单 API 并确认写入",
      "阅读用户描述"
    ],
    "correctIndex": 2,
    "explanation": "预测提供估计，决策选择策略，工具或执行器才改变环境。三者不能混同。",
    "level": "入门"
  },
  {
    "id": "agent-0-q1",
    "track": "agent",
    "stage": "一 · AI 世界观",
    "docSlug": "ai-agent-panorama",
    "question": "LLM、RAG、Agent 应怎样区分？",
    "options": [
      "Agent 是最大的模型",
      "LLM 是模型；RAG 是检索增强生成架构；Agent 是基于目标与反馈执行动作的系统",
      "三者只是价格不同",
      "用了 RAG 就一定是多智能体"
    ],
    "correctIndex": 1,
    "explanation": "模型、应用架构与运行系统属于不同层次。RAG 可以包含多次检索，也可以作为 Agent 的一个能力，三者不是必然升级路线。",
    "level": "入门"
  },
  {
    "id": "agent-0-q2",
    "track": "agent",
    "stage": "一 · AI 世界观",
    "docSlug": "ai-agent-panorama",
    "question": "天道茶寮开启「循迹」后使用什么路径？",
    "options": [
      "只做纯文本生成",
      "关闭工具的固定 RAG",
      "Agent 工具循环；关闭循迹才走固定 RAG",
      "三个独立 Agent 同时运行"
    ],
    "correctIndex": 2,
    "explanation": "ChatPanel 默认开启 agentMode。循迹开启走工具循环，关闭走固定 RAG。三贤共享生成上下文，不等于多智能体。",
    "level": "入门"
  },
  {
    "id": "agent-map-taxonomy",
    "track": "agent",
    "stage": "二 · AI 技术树",
    "docSlug": "ai-technology-map",
    "question": "下面哪种归类更准确？",
    "options": [
      "NLP 是任务领域，Transformer 是架构，SFT 是训练方法",
      "NLP 是 Transformer 的子类",
      "RAG 是一种 token",
      "Agent 等于深度学习"
    ],
    "correctIndex": 0,
    "explanation": "技术树需要方法、架构、领域和应用等多个轴，不宜把这些概念塞成互斥的同级分支。",
    "level": "入门"
  },
  {
    "id": "agent-1-q3",
    "track": "agent",
    "stage": "二 · AI 技术树",
    "docSlug": "rag-concepts",
    "question": "RAG 主要改善什么，仍有什么边界？",
    "options": [
      "把所有幻觉彻底消除",
      "把外部知识提供给生成过程，但仍会检索错误或误用证据",
      "无需检索就能实时更新参数",
      "强制每题只检索一次"
    ],
    "correctIndex": 1,
    "explanation": "RAG 可提供训练后更新的资料和领域信息，但资料质量、权限、召回和生成忠实度都需要验证。",
    "level": "入门"
  },
  {
    "id": "agent-1-q7",
    "track": "agent",
    "stage": "二 · AI 技术树",
    "docSlug": "agent-walkthrough",
    "question": "Agent 与 RAG 的关系是什么？",
    "options": [
      "必须使用不同大小的模型",
      "RAG 提供知识，Agent 组织动态行动，两者可以组合",
      "RAG 只能查一次",
      "多轮检索就必然是多智能体"
    ],
    "correctIndex": 1,
    "explanation": "RAG 描述检索与生成怎样结合；Agent 描述运行时谁决定下一步。迭代 RAG 也可能由固定代码编排，需看控制权。",
    "level": "入门"
  },
  {
    "id": "agent-map-jev-type",
    "track": "agent",
    "stage": "二 · AI 技术树",
    "docSlug": "jev-decision-models",
    "question": "Jev 和 System One Model 应怎样定位？",
    "options": [
      "学界已统一认可的新一级学科",
      "完整的多智能体产品",
      "Jev 是 TypeSafe 的类型化决策模型，System One 是厂商提出的类别",
      "MCP 的升级版本"
    ],
    "correctIndex": 2,
    "explanation": "按任务与输出定位 Jev；LLM 同样能分类和选择动作，因此生成/决策不是互斥且穷尽的分类。",
    "level": "入门"
  },
  {
    "id": "agent-map-jev-confidence",
    "track": "agent",
    "stage": "二 · AI 技术树",
    "docSlug": "jev-decision-models",
    "question": "Jev 的 Choice confidence 为 0.9，能直接推出什么？",
    "options": [
      "本次一定正确",
      "所有业务样本正确率都是 90%",
      "自动获得执行权限",
      "这是概率分布的集中程度统计，业务可靠性还需验证"
    ],
    "correctIndex": 3,
    "explanation": "confidence 与选项概率不同，也不是单次正确性保证。用本领域标注集检查概率校准、漏报和阈值成本。",
    "level": "进阶"
  },
  {
    "id": "agent-1-q1",
    "track": "agent",
    "stage": "三 · 模型原理",
    "docSlug": "llm-fundamentals",
    "question": "怎样准确估算一段中文占用的 Token？",
    "options": [
      "每个汉字固定等于 1 个 Token",
      "用目标模型对应的 tokenizer 或接口用量测量",
      "中文永远比英文省 Token",
      "只数空格即可"
    ],
    "correctIndex": 1,
    "explanation": "Token 与字符没有固定换算关系，编码、模型词表和文本内容都会影响切分。预算需测量实际输入，并留出输出空间。",
    "level": "入门"
  },
  {
    "id": "agent-1-q2",
    "track": "agent",
    "stage": "三 · 模型原理",
    "docSlug": "llm-fundamentals",
    "question": "temperature 较低或为 0，可以保证什么？",
    "options": [
      "事实绝对正确",
      "通常减少采样随机性，但不保证事实正确或跨环境完全一致",
      "模型不会调用工具",
      "所有供应商行为都相同"
    ],
    "correctIndex": 1,
    "explanation": "低温影响采样，不是事实验证器；服务实现和数值计算等仍可造成差异。本项目不能仅凭提示词断言用了低温。",
    "level": "入门"
  },
  {
    "id": "agent-map-attention",
    "track": "agent",
    "stage": "三 · 模型原理",
    "docSlug": "transformer-mechanics",
    "question": "Q/K/V 的教学类比是什么？",
    "options": [
      "Q 和 K 用于匹配，权重作用于 V 中的信息",
      "Q 就是最终答案",
      "V 是用户权限",
      "K 是数据库所有文件"
    ],
    "correctIndex": 0,
    "explanation": "Q 与 K 的匹配产生权重，再聚合 V。Attention 权重不是证明模型推理正确的因果解释。",
    "level": "进阶"
  },
  {
    "id": "agent-map-causal",
    "track": "agent",
    "stage": "三 · 模型原理",
    "docSlug": "transformer-mechanics",
    "question": "自回归 decoder 的 causal mask 限制什么？",
    "options": [
      "禁止使用历史信息",
      "当前位置不能关注其后的 Token",
      "只允许读取英文",
      "禁止 KV cache"
    ],
    "correctIndex": 1,
    "explanation": "训练时可并行计算不同位置，但因果遮罩防止预测时偷看后面的 Token。",
    "level": "进阶"
  },
  {
    "id": "agent-map-embedding",
    "track": "agent",
    "stage": "三 · 模型原理",
    "docSlug": "transformer-mechanics",
    "question": "模型内部 Token embedding 与检索 embedding 是同一件事吗？",
    "options": [
      "所有向量都可以直接比较",
      "一个映射 Token 表示，一个面向检索表示文本，不能默认互换",
      "只有前者是数字",
      "换模型不需重建索引"
    ],
    "correctIndex": 1,
    "explanation": "表示的粒度、训练目标和空间可不同；向量维数相同也不代表同一语义空间。",
    "level": "进阶"
  },
  {
    "id": "agent-map-training",
    "track": "agent",
    "stage": "三 · 模型原理",
    "docSlug": "model-training-infra",
    "question": "通常一次提示词调用与模型训练的区别是什么？",
    "options": [
      "二者都会自动更新全部参数",
      "推理使用已有参数，训练通过优化更新参数",
      "RAG 每次都重新训练模型",
      "微调无法保存多个版本"
    ],
    "correctIndex": 1,
    "explanation": "当前上下文影响本次输出，不等于参数学习。训练与应用侧的检索、记忆分别承担不同职责。",
    "level": "入门"
  },
  {
    "id": "agent-1-q5",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "prompt-engineering",
    "question": "一份可维护的任务提示词应说明什么？",
    "options": [
      "只堆积赞美角色的形容词",
      "任务、边界、输出契约、必要示例与异常处理",
      "公开模型所有私有思考",
      "只要求永远给答案"
    ],
    "correctIndex": 1,
    "explanation": "Prompt 说明任务契约；运行代码仍需验证输出与执行权限。示例能展示期望行为，但不能代替评测。",
    "level": "入门"
  },
  {
    "id": "agent-1-q6",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "prompt-engineering",
    "question": "提示注入可能从哪里进入系统？",
    "options": [
      "只能通过修改训练数据",
      "用户输入、检索文档或工具返回中夹带的越权指令",
      "仅来自系统开发者的正常指令",
      "只有文本太长时发生"
    ],
    "correctIndex": 1,
    "explanation": "间接提示注入也会藏在外部资料里。应把资料和指令分开，并在工具层做最小权限、参数和授权校验，不能仅依赖关键词清洗。",
    "level": "入门"
  },
  {
    "id": "agent-map-context",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "context-memory-engineering",
    "question": "上下文工程比写 Prompt 多考虑什么？",
    "options": [
      "只把指令写更长",
      "选取、组织、压缩与隔离本次需要的信息",
      "把整库塞进每次请求",
      "让模型自动访问所有历史"
    ],
    "correctIndex": 1,
    "explanation": "Context 是实际送入本次调用的信息；上下文工程要考虑预算、时效、来源与权限。",
    "level": "进阶"
  },
  {
    "id": "agent-map-memory",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "context-memory-engineering",
    "question": "会话摘要与任务 checkpoint 有什么区别？",
    "options": [
      "摘要一定能准确恢复所有动作",
      "二者都是模型权重",
      "摘要压缩对话信息；checkpoint 保存执行状态与恢复位置",
      "有向量库就不需要两者"
    ],
    "correctIndex": 2,
    "explanation": "压缩文本可能丢信息，不能单靠摘要判断有副作用的工具是否已经执行。",
    "level": "工程"
  },
  {
    "id": "agent-2-q3",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "api-integration",
    "question": "HTTP 状态码 401 代表什么？",
    "options": [
      "资源不存在",
      "服务器内部错误",
      "未授权——需要认证（如 API Key 缺失或错误）",
      "请求格式不对"
    ],
    "correctIndex": 2,
    "explanation": "401 Unauthorized = 未授权，需要认证。常见于 API Key 缺失或错误。400=格式不对，403=权限不够，404=不存在，500=服务器错。参见 API 与系统集成第二章。",
    "level": "进阶"
  },
  {
    "id": "agent-2-q4",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "api-integration",
    "question": "MCP 主要统一什么？",
    "options": [
      "所有模型的训练过程",
      "宿主通过客户端与服务器交换工具和上下文能力的接口",
      "把所有服务自动变安全",
      "替代业务 API 和授权逻辑"
    ],
    "correctIndex": 1,
    "explanation": "MCP 有助于减少重复集成，仍需匹配版本、实现客户端、配置权限与验证工具结果；不等于写一次就无条件兼容所有产品。",
    "level": "进阶"
  },
  {
    "id": "agent-2-q1",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "vector-search-hands-on",
    "question": "本项目 Mock embedding 的用途是什么？",
    "options": [
      "证明语义检索质量",
      "用确定性的模拟向量跑通链路，语义效果仍需真实模型评测",
      "保证不同语言语义相同",
      "替代所有生产 embedding"
    ],
    "correctIndex": 1,
    "explanation": "哈希模拟向量用于无需服务的功能验证，不提供真实语义保证。真实 embedding 也需要在本领域的检索集上验证。",
    "level": "进阶"
  },
  {
    "id": "agent-2-q2",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "vector-search-hands-on",
    "question": "余弦相似度为 0.95 可以直接说明什么？",
    "options": [
      "答案有 95% 概率正确",
      "两个非零向量的方向很接近",
      "两段文字事实完全相同",
      "向量长度相等"
    ],
    "correctIndex": 1,
    "explanation": "余弦衡量方向，不是正确率或校准概率。语义含义依赖 embedding 模型，相关性还需领域样本验证。",
    "level": "进阶"
  },
  {
    "id": "agent-3-q1",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "citation-design",
    "question": "引用校验失败后，本项目怎样处理？",
    "options": [
      "通过校验就说明结论真实",
      "使无效引用组失效并有界重试，仍可能带软警告交付",
      "一定永久拒答",
      "引用格式不影响任何流程"
    ],
    "correctIndex": 1,
    "explanation": "RAG 与 Agent 路径的重试预算不同，失败后存在软警告返回。来源存在与来源支持结论也要分开评估，不能宣称必然安全兜底。",
    "level": "进阶"
  },
  {
    "id": "agent-4-q1",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "agent-loop",
    "question": "为什么 Agent 必须有步数上限？",
    "options": [
      "步数越多越准确",
      "限制重复行动、成本和延迟，并与超时等停止条件配合",
      "只为了页面好看",
      "限制模型词表"
    ],
    "correctIndex": 1,
    "explanation": "本项目默认 maxSteps 为 6，但这是可配置的工程预算，不是通用最佳值。停止时还需说明是否完成任务。",
    "level": "工程"
  },
  {
    "id": "agent-4-q2",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "agent-loop",
    "question": "Evidence Ledger（证据台账）解决了什么问题？",
    "options": [
      "让模型回答更快",
      "避免 TopK 文本直接拼进 prompt 的重复和串扰——先去重、过滤再交给模型",
      "存储用户数据",
      "给用户看执行轨迹"
    ],
    "correctIndex": 1,
    "explanation": "证据台账 = 独立记录每条结论可用哪些来源。不是 TopK 直接拼进 prompt，而是先去重、过滤、整理后再交模型，避免重复和串扰。参见工具循环设计。",
    "level": "工程"
  },
  {
    "id": "agent-map-protocols",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "agent-runtime-protocols",
    "question": "MCP、A2A、Skills 怎样区分？",
    "options": [
      "都是更大的语言模型",
      "分别侧重工具/上下文集成、Agent 间任务协作、任务知识与流程复用",
      "三者提供同一种权限保证",
      "用了 Skills 就已训练新模型"
    ],
    "correctIndex": 1,
    "explanation": "它们处于不同工程职责位置，可以组合；实现兼容性与权限边界仍须显式处理。",
    "level": "进阶"
  },
  {
    "id": "agent-map-retry",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "agent-runtime-protocols",
    "question": "写入成功但响应超时，最合适的恢复方式是什么？",
    "options": [
      "不断重复写入直到收到成功",
      "直接告诉用户失败",
      "使用幂等标识查询/确认结果，再决定是否重试",
      "换一个模型重做所有步骤"
    ],
    "correctIndex": 2,
    "explanation": "网络超时不能证明动作没发生。幂等、结果对账与持久状态用于避免重复副作用。",
    "level": "工程"
  },
  {
    "id": "agent-map-eval",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "agent-evaluation-observability",
    "question": "Trace 完整能证明业务任务成功吗？",
    "options": [
      "能，记录越多越正确",
      "能，只要 finalState 是 completed",
      "不能，还须按成功标准验证结果",
      "不能，所以不需要 Trace"
    ],
    "correctIndex": 2,
    "explanation": "可观测性解释过程，评测判断质量。两者配合，但一个不替代另一个。",
    "level": "工程"
  },
  {
    "id": "agent-map-judge",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "agent-evaluation-observability",
    "question": "LLM judge 打分时应怎样减少偏差？",
    "options": [
      "给更长的回答加分",
      "要求永远给确定分数",
      "提供明确量表和证据，盲评、交换顺序并用人工样本校准",
      "直接把分数当绝对真值"
    ],
    "correctIndex": 2,
    "explanation": "位置、冗长、自我偏好与证据不足会影响评分；评分器本身也需要评估。",
    "level": "工程"
  },
  {
    "id": "agent-map-cost",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "agent-evaluation-observability",
    "question": "100 次任务总成本 20 元，80 次成功，每成功任务成本是多少？",
    "options": [
      "0.20 元",
      "0.25 元",
      "0.80 元",
      "20 元"
    ],
    "correctIndex": 1,
    "explanation": "20 / 80 = 0.25；失败任务的成本也进入分子，不能只算成功调用的账单。",
    "level": "进阶"
  },
  {
    "id": "agent-5-q1",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "agent-trace-debugging",
    "question": "执行轨迹（Trace）里记录什么？",
    "options": [
      "模型的完整思维链（含内部推理）",
      "每一步的工具选择、参数、返回结果、耗时——不含模型私有思维链",
      "用户的个人信息",
      "API Key 和密钥"
    ],
    "correctIndex": 1,
    "explanation": "Trace 只记结构化的工具调用：选了什么工具、参数是什么、返回什么、耗时多少。不暴露模型私有思维链。参见执行轨迹调试手册。",
    "level": "工程"
  },
  {
    "id": "agent-8-q2",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "production-deployment",
    "question": "灰度发布（Canary Release）的目的是什么？",
    "options": [
      "让上线更快",
      "让部分用户先用新版本，发现问题只影响小范围，便于回滚",
      "让代码更好看",
      "减少服务器数量"
    ],
    "correctIndex": 1,
    "explanation": "灰度发布 = 先让一小部分用户用新版本，观察没问题再扩大范围。发现问题只影响小范围，可快速回滚。参见生产部署与运维第六章。",
    "level": "工程"
  },
  {
    "id": "agent-8-q1",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "ai-security-governance",
    "question": "AI 的六类风险中，'提示注入'属于哪一类？",
    "options": [
      "数据风险",
      "模型风险",
      "系统风险",
      "不算是风险"
    ],
    "correctIndex": 2,
    "explanation": "提示注入属于系统风险——攻击者操纵模型行为。六类风险：数据（泄露+PII）、模型（幻觉+有害内容）、系统（注入+拒绝服务）。参见 AI 安全与治理第一章。",
    "level": "工程"
  },
  {
    "id": "agent-7-q1",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "build-an-agent",
    "question": "通用、领域和科研智能体的分类应怎样理解？",
    "options": [
      "互斥的学术定理",
      "按任务与环境做的工程观察，同一系统可能同时属于多类",
      "只由参数量决定",
      "领域智能体都必须先建向量库"
    ],
    "correctIndex": 1,
    "explanation": "任务分类帮助识别需求，不规定唯一架构。通用任务也需要工具与控制，领域任务未必需要 RAG，科研模型也不自动等于科研 Agent。",
    "level": "进阶"
  },
  {
    "id": "agent-7-q2",
    "track": "agent",
    "stage": "四 · AI Engineering",
    "docSlug": "build-an-agent",
    "question": "chunk 切太大和切太小各有什么问题？",
    "options": [
      "切太大没问题，切太小有问题",
      "切太小没问题，切太大有问题",
      "切太大：检索带回无关文本浪费 token；切太小：语义不完整、检索不准",
      "chunk 大小不影响检索质量"
    ],
    "correctIndex": 2,
    "explanation": "切太大 → 命中后带回一堆无关文本、浪费上下文窗口；切太小 → 语义不完整、检索不准。天道茶寮用 1200 字符 + 160 重叠做平衡。参见造一个智能体第三章。",
    "level": "进阶"
  },
  {
    "id": "agent-1-q4",
    "track": "agent",
    "stage": "五 · AI 产品思维",
    "docSlug": "ai-product-scenarios",
    "question": "以下哪个问题最适合用 AI？",
    "options": [
      "计算 1234 × 5678",
      "判断一个数是不是偶数",
      "从 100 篇用户反馈里提取'不满意的原因'",
      "查今天比特币的实时价格"
    ],
    "correctIndex": 2,
    "explanation": "计算用计算器、判断偶数用 if-else、实时价格用 API——这些规则明确，不需要 AI。从大量文本提取信息需要理解自然语言，适合 AI。参见 AI 产品与业务场景第二章。",
    "level": "入门"
  },
  {
    "id": "agent-map-product",
    "track": "agent",
    "stage": "五 · AI 产品思维",
    "docSlug": "ai-product-scenarios",
    "question": "模型在演示中完成任务，下一步最该验证什么？",
    "options": [
      "立即扩大自动权限",
      "直接推出用户愿意付钱",
      "真实场景基线、集成约束、错误代价与采用/付费证据",
      "只需要换个产品名字"
    ],
    "correctIndex": 2,
    "explanation": "模型能力、系统可行性和用户价值需要分别取证。",
    "level": "入门"
  },
  {
    "id": "agent-map-roi",
    "track": "agent",
    "stage": "五 · AI 产品思维",
    "docSlug": "ai-solution-delivery",
    "question": "原流程每月 30,000 元，新方案含复核返工共 34,000 元，结论是什么？",
    "options": [
      "Token 便宜所以一定盈利",
      "每月净节约为 -4,000 元，需要重评范围或方案",
      "节省 4,000 元",
      "模型准确率高就忽略成本"
    ],
    "correctIndex": 1,
    "explanation": "收益应按完整流程计算，人力复核和误判代价会抵消模型调用费用的节约。",
    "level": "进阶"
  },
  {
    "id": "agent-map-metric",
    "track": "agent",
    "stage": "五 · AI 产品思维",
    "docSlug": "ai-solution-delivery",
    "question": "严重投诉占 1%，全部判普通也有 99% 准确率，说明什么？",
    "options": [
      "可以立即上线",
      "只需提高总体准确率",
      "总体准确率掩盖了严重类漏报，要看每类召回与错误代价",
      "不需要人工标签"
    ],
    "correctIndex": 2,
    "explanation": "指标要对应业务任务；类别不平衡时总体准确率可能毫无实用价值。",
    "level": "进阶"
  },
  {
    "id": "agent-map-handoff",
    "track": "agent",
    "stage": "五 · AI 产品思维",
    "docSlug": "ai-solution-delivery",
    "question": "Solution / FDE 的交付应包含什么？",
    "options": [
      "只有一个聊天演示",
      "只列模型榜单",
      "需求基线、接口与失败路径、验收集、运行手册和结果报告",
      "只报平均 Token 单价"
    ],
    "correctIndex": 2,
    "explanation": "可交付意味着在真实约束下运行、验收和持续维护，且能退回原流程。",
    "level": "工程"
  },
  {
    "id": "agent-app-q1",
    "track": "agent",
    "stage": "附录 · 基础知识",
    "docSlug": "sql-basics",
    "question": "SQL 中 WHERE 和 HAVING 的区别是什么？",
    "options": [
      "没有区别，可以互换",
      "WHERE 在分组前过滤行；HAVING 在分组后过滤组",
      "WHERE 只能用于 SELECT；HAVING 能用于所有语句",
      "WHERE 比 HAVING 快"
    ],
    "correctIndex": 1,
    "explanation": "WHERE 在 GROUP BY 之前过滤行，不能用聚合函数；HAVING 在 GROUP BY 之后过滤组，可以用聚合函数（如 HAVING COUNT(*) > 5）。参见 SQL 基础第五章。",
    "level": "入门"
  },
  {
    "id": "agent-app-q2",
    "track": "agent",
    "stage": "附录 · 基础知识",
    "docSlug": "python-basics",
    "question": "Python 中 `with open(...) as f` 相比 `f = open(...)` 的优势是什么？",
    "options": [
      "代码更短",
      "自动关闭文件，即使中途出异常也不会忘记关闭",
      "读取速度更快",
      "可以同时打开更多文件"
    ],
    "correctIndex": 1,
    "explanation": "with 语句是上下文管理器，退出 with 块时自动调用 f.close()——即使中间出异常也会关闭。不用 with 的话忘记 close 会导致文件描述符泄漏。参见 Python 基础第八章。",
    "level": "入门"
  },
  {
    "id": "mingli-0-q1",
    "track": "mingli",
    "stage": "零 · 入门预备",
    "docSlug": "bazi-overview",
    "question": "八字命理的核心数据是什么？",
    "options": [
      "出生时刻的年月日时四个干支组合——共八个字",
      "手相和面相",
      "姓名的笔画数",
      "风水方位"
    ],
    "correctIndex": 0,
    "explanation": "八字 = 出生时刻的年月日时各取一个干支，共四柱八字。这是整个命理系统的核心数据。参见命理大局观第一章。",
    "level": "入门"
  },
  {
    "id": "mingli-0-q2",
    "track": "mingli",
    "stage": "零 · 入门预备",
    "docSlug": "bazi-overview",
    "question": "八字命理能做什么？不能做什么？",
    "options": [
      "能预测具体事件（某年某月会发生什么）",
      "能替代医学和投资决策",
      "能描述初始偏向和观察框架，不能预测具体事件",
      "能断言好命坏命"
    ],
    "correctIndex": 2,
    "explanation": "八字描述'出厂参数'（哪些气偏旺偏弱）和观察框架，不预测具体事件、不替代专业决策、不断好命坏命。参见命理大局观第一章的'是/不是'表。",
    "level": "入门"
  },
  {
    "id": "mingli-1-q1",
    "track": "mingli",
    "stage": "一 · 先认盘",
    "docSlug": "bazi-chart-anatomy",
    "question": "盘面上的'日主'是什么？",
    "options": [
      "出生那天的年干",
      "出生那天的日柱天干——八字里的'我'，全盘以它论生克",
      "出生那个月的月支",
      "出生时辰的地支"
    ],
    "correctIndex": 1,
    "explanation": "日主 = 日柱的天干，是八字里的'我'。所有十神（印、食伤、官杀、财、比劫）都以日主为坐标推演。盘面上以朱色标注。参见八字盘面解剖。",
    "level": "入门"
  },
  {
    "id": "mingli-1-q2",
    "track": "mingli",
    "stage": "一 · 先认盘",
    "docSlug": "bazi-stems-branches",
    "question": "天干有几个？地支有几种？",
    "options": [
      "天干 8 个，地支 10 个",
      "天干 10 个，地支 12 个",
      "天干 12 个，地支 10 个",
      "天干 5 个，地支 8 个"
    ],
    "correctIndex": 1,
    "explanation": "天干 10 个：甲乙丙丁戊己庚辛壬癸。地支 12 个：子丑寅卯辰巳午未申酉戌亥。参见天干地支与藏干。",
    "level": "入门"
  },
  {
    "id": "mingli-2-q1",
    "track": "mingli",
    "stage": "二 · 读懂关系",
    "docSlug": "bazi-ten-gods-strength",
    "question": "十神中'印'代表什么关系？",
    "options": [
      "我生的（食伤）",
      "生我的（印）——母亲、长辈、庇护",
      "克我的（官杀）",
      "我克的（财）"
    ],
    "correctIndex": 1,
    "explanation": "十神以日主为坐标：生我=印（母亲/庇护），我生=食伤（才华/输出），克我=官杀（管束/事业），我克=财（欲望/控制），同我=比劫（竞争/兄弟）。参见十神与强弱。",
    "level": "进阶"
  },
  {
    "id": "mingli-2-q2",
    "track": "mingli",
    "stage": "二 · 读懂关系",
    "docSlug": "bazi-branch-relations",
    "question": "地支'六合'是指什么？",
    "options": [
      "六个地支排成一排",
      "两两地支之间的六对和谐关系（如子丑合、寅亥合）",
      "六个地支互相冲",
      "地支的六个方位"
    ],
    "correctIndex": 1,
    "explanation": "六合 = 六对地支的和谐关系：子丑合、寅亥合、卯戌合、辰酉合、巳申合、午未合。合代表和谐、联结。参见干支合冲刑害会。",
    "level": "进阶"
  },
  {
    "id": "mingli-3-q1",
    "track": "mingli",
    "stage": "三 · 加上时间",
    "docSlug": "bazi-luck-cycles",
    "question": "大运和流年的区别是什么？",
    "options": [
      "大运是月柱推的，流年是日柱推的",
      "大运管十年运势，流年管一年运势",
      "两者没有区别",
      "大运管一生，流年管一天"
    ],
    "correctIndex": 1,
    "explanation": "大运 = 十年一个阶段的运势（从月柱推），流年 = 每年的流年天干地支。大运管大势，流年管年度环境。参见起运、大运与流年。",
    "level": "进阶"
  },
  {
    "id": "mingli-5-q1",
    "track": "mingli",
    "stage": "五 · 核对口径",
    "docSlug": "bazi-guide",
    "question": "真太阳时需要校正什么？",
    "options": [
      "只校正出生年份",
      "经度差（每度 4 分钟）+ 均时差（EOT）",
      "只校正出生地海拔",
      "不需要校正"
    ],
    "correctIndex": 1,
    "explanation": "真太阳时 = 经度差（出生地与北京时间的经度差，每度 4 分钟）+ 均时差（EOT，地球椭圆轨道导致的时间偏差）。跨日时日柱可能因此换日。参见排盘操作与算法口径。",
    "level": "进阶"
  }
];

/** 保持错题本通过稳定 ID 查询当前题目。 */
export function getQuizById(id: string): QuizQuestion | undefined {
  return QUIZ_QUESTIONS.find((question) => question.id === id);
}

export function getQuizByTrack(track: "agent" | "mingli"): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((question) => question.track === track);
}

export function getQuizByStage(track: "agent" | "mingli", stage: string): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((question) => question.track === track && question.stage === stage);
}
