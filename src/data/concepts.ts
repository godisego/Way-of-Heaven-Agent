/**
 * 学习模式 —— 术语表
 *
 * 数据对应五层 AI 地图与项目源码；扩展知识注明当前实现边界。
 * 每条 explanation 既要让人懂，也告诉它在天道智能体哪个文件能看到。
 *
 * 当用户在前端把术语悬停时,会出现这段说明。
 */

export type Concept = {
  /** 词条本身 */
  term: string;
  /** 多行短说明(hover 出来)。首行总览,后续行可选 */
  explanation: string;
  /** 在本仓库的对应位置(可选) */
  where?: string;
};

export const CONCEPTS: Record<string, Concept> = {
  技术树: {
    term: "AI 技术树",
    explanation: "区分方法、网络架构、任务领域、模型与应用模式。NLP 是领域，Transformer 是架构，RAG 是应用模式；不是互斥的同级分支。",
    where: "docs/ai-technology-map.md",
  },
  Token: {
    term: "Token / Tokenizer",
    explanation: "Token 是模型使用的离散符号单位，Tokenizer 负责文本与 ID 转换。汉字、单词与 Token 无固定比例，要按目标模型测量。",
    where: "docs/llm-fundamentals.md",
  },
  Transformer: {
    term: "Transformer",
    explanation: "由注意力、前馈网络、残差与归一化等组成的网络架构。自回归 decoder 的因果遮罩限制偷看后续 Token。",
    where: "docs/transformer-mechanics.md",
  },
  QKV: {
    term: "Q / K / V",
    explanation: "Query 与 Key 用于计算匹配权重，再用权重汇总 Value。注意力是表示更新机制，权重不能直接作为推理正确的证明。",
    where: "docs/transformer-mechanics.md",
  },
  训练与推理: {
    term: "训练 / 推理",
    explanation: "训练用数据与目标优化参数；常规推理使用已有参数处理当前输入。提示词、RAG 或会话摘要通常不更新模型权重。",
    where: "docs/model-training-infra.md",
  },
  KVCache: {
    term: "KV cache",
    explanation: "复用已经计算的 Key / Value，减少自回归解码的重复计算。它不是长期记忆，也不是无限上下文。",
    where: "docs/transformer-mechanics.md",
  },
  ContextEngineering: {
    term: "Context Engineering",
    explanation: "为一次模型调用选择、组织、压缩和隔离需要的信息。包括指令、用户输入、证据、历史、工具定义与返回结果。",
    where: "docs/context-memory-engineering.md",
  },
  Memory: {
    term: "Memory / State",
    explanation: "记忆保存可复用信息；状态描述任务当前位置。当前项目有会话历史和滚动摘要，但没有通用长期记忆治理或执行 checkpoint。",
    where: "docs/context-memory-engineering.md",
  },
  Workflow: {
    term: "Workflow",
    explanation: "由代码规定步骤和分支的编排。可以包含模型与 Agent 节点；与 Agent 的区别在于控制权，而非先进程度。",
    where: "docs/agent-runtime-protocols.md",
  },
  Harness: {
    term: "Agent Harness / Runtime",
    explanation: "把模型、工具、上下文、状态和执行边界组织起来的运行设施。更换模型不等于同时获得持久恢复、审批与权限控制。",
    where: "docs/agent-runtime-protocols.md",
  },
  MCP: {
    term: "MCP",
    explanation: "Model Context Protocol，宿主经客户端对接服务器工具与上下文能力的协议。不是模型、长期记忆或安全保证；本项目尚未实现 MCP 接入。",
    where: "docs/agent-runtime-protocols.md",
  },
  A2A: {
    term: "A2A",
    explanation: "Agent2Agent，围绕 Agent 间能力发现与任务协作的协议。不是每个 Agent 的必选项；本项目尚未实现 A2A。",
    where: "docs/agent-runtime-protocols.md",
  },
  Skills: {
    term: "Agent Skills",
    explanation: "按需加载的任务说明、资源和可选脚本，用来复用工作方法。它不等于训练新模型，也不能自动获得工具权限。",
    where: "docs/agent-runtime-protocols.md",
  },
  Observability: {
    term: "Observability",
    explanation: "通过日志、指标与轨迹观察系统怎样运行，定位失败和延迟。当前已有 Agent trace，尚非完整的分布式追踪与成本平台。",
    where: "docs/agent-evaluation-observability.md",
  },
  Jev: {
    term: "Jev / System One Model",
    explanation: "Jev 是 TypeSafe 的类型化概率决策模型。System One Model 是厂商提出的类别；类型正确不等于业务判断正确。当前项目未接入 Jev。",
    where: "docs/jev-decision-models.md",
  },
  概率校准: {
    term: "概率校准",
    explanation: "在代表性样本集合上，检查预测概率与实际发生频率是否匹配。不能凭一个 confidence 值保证单次判断正确。",
    where: "docs/classification-probability-basics.md",
  },
  ROI: {
    term: "ROI / 用户价值",
    explanation: "按统一时间与成本口径衡量可兑现收益，计入模型、工具、人工复核、返工与维护。能做出演示不等于用户愿意付费。",
    where: "docs/ai-solution-delivery.md",
  },
  PDF: {
    term: "PDF",
    explanation: "PDF 是资料来源格式之一。本项目也支持 Markdown / TXT；扫描 PDF 尚无 OCR 时不能提取文字。",
    where: "src/core/ingestion/pdfPageExtractor.ts",
  },
  入库: {
    term: "入库",
    explanation:
      "把资料加载进知识库的流程。\nPDF 按页、Markdown / TXT 按章节解析，再切 chunk、生成 embedding 并写入索引。",
    where: "src/core/ingestion/ingestionPipeline.ts",
  },
  Embedding: {
    term: "Embedding",
    explanation:
      "把一段文字变成数值向量，用于相似度检索等任务。\n相关性取决于模型、输入和领域，需要用样本验证。\n本项目可调用兼容接口，mock 模式使用哈希向量，只用于功能联调。",
    where: "src/core/providers/openAICompatibleProvider.ts",
  },
  embedding: {
    term: "embedding",
    explanation:
      "同上,小写版本。Embedding = 把文本变成向量(数值表示)。",
    where: "src/core/providers/openAICompatibleProvider.ts",
  },
  向量: {
    term: "向量",
    explanation: "一组有序数字，用来表示输入。\n维度依赖具体 embedding 模型与配置；同维度不保证处于同一个可比较的语义空间。",
    where: "src/core/vector/localJsonVectorStore.ts",
  },
  向量库: {
    term: "向量库",
    explanation:
      "存储『文本 + 向量』并支持相似度检索。\n天道智能体的本地 MVP 使用 JSON 索引，云端可切换到 Supabase pgvector。",
    where: "src/core/vector/localJsonVectorStore.ts",
  },
  余弦相似度: {
    term: "余弦相似度",
    explanation: "衡量两个非零向量的方向接近程度，范围 [-1, 1]。\n它不是语义正确率；0.95 不代表答案有 95% 概率正确。零向量需单独处理。",
    where: "src/core/vector/localJsonVectorStore.ts",
  },
  Chunking: {
    term: "Chunking",
    explanation:
      "把长文本切成小段。\n天道智能体使用『固定窗口 1200 字符 + 重叠 160 字符』；PDF 不跨页，Markdown/TXT 不跨章节单元，便于准确追溯来源。",
    where: "src/core/ingestion/chunkPages.ts",
  },
  chunk: {
    term: "chunk",
    explanation:
      "切出来的一小段文字。天道智能体的每个 chunk 都带 sourceFileName / pageNumber / sectionTitle / chunkId，供检索与引用校验。",
    where: "src/core/ingestion/chunkPages.ts",
  },
  来源锚定: {
    term: "来源锚定",
    explanation:
      "每个 chunk 记住自己的书名与位置。\nPDF 使用『第 N 页』，Markdown/TXT 使用章节标题或『第 N 节』，回答中的出处可以映射回原文。",
    where: "src/core/documents/documentTypes.ts",
  },
  RAG: {
    term: "RAG",
    explanation: "Retrieval-Augmented Generation，检索增强生成。\n是一种把检索到的外部资料提供给生成模型的应用架构模式，不是新模型；可以多次检索，也可以成为 Agent 的工具。",
    where: "docs/rag-concepts-primer.md",
  },
  topK: {
    term: "topK",
    explanation:
      "检索时取回最相近的 K 条（天道智能体当前默认 10）。\n太小召回不够，太大则噪声和模型成本都会增加。",
    where: "src/core/retrieval/answerWithCitations.ts",
  },
  引用: {
    term: "引用",
    explanation:
      "回答里的 [《书名》, 来源位置] 标记，例如 [《存在主义笔记》, 自欺]。\n天道智能体会校验书名和位置是否来自本轮检索结果。",
    where: "src/core/retrieval/citationPolicy.ts",
  },
  幻觉: {
    term: "幻觉",
    explanation: "生成了缺乏依据或与事实不符的内容。\nRAG、提示词和校验能减少部分错误，但不能保证消除。引用位置合法也不保证原文支持结论。",
    where: "docs/agent-evaluation-observability.md",
  },
  grounded: {
    term: "grounded",
    explanation:
      "要求回答建立在给定资料上，并能核对来源支持关系。\n本项目用提示词、来源台账和程序规则约束；来源位置合法不自动证明结论被原文支持。",
    where: "src/core/providers/anthropicProvider.ts",
  },
  状态机: {
    term: "状态机",
    explanation:
      "文档处理各阶段:uploaded → extracting → indexing → indexed,失败则 failed。\n前端轮询这字段展示进度。",
    where: "src/core/documents/documentTypes.ts",
  },
  self_correct: {
    term: "self-correct",
    explanation: "用校验反馈触发有界重试。\n本项目 RAG 路径最多重试一次，Agent 起草校验最多再试两轮；仍可能带软警告返回。它不等于已经实现长期反思学习。",
    where: "src/core/retrieval/answerWithCitations.ts",
  },
  Agent: {
    term: "Agent",
    explanation: "基于目标和环境反馈，在受控循环中选择动作的运行系统。\n学习馆主要讨论 LLM Agent，LLM 是其中的推理与语言模块。本项目默认开启「循迹」走工具循环，关闭后走固定 RAG。",
    where: "src/core/agent/orchestrator.ts",
  },
  Tool: {
    term: "Tool use",
    explanation:
      "让 LLM 在允许清单内选择外部函数。\n本项目提供 search_library / read_source_unit / ready_to_answer 三个工具，注册表负责校验、限次与超时。",
    where: "src/core/agent/tools.ts",
  },
  资料不足: {
    term: "资料不足",
    explanation: "没有足够支持本题的证据时，应说明缺少什么，不能编造来源。\n这是产品约束，需要用测试和人工评审核对，不能仅凭 Prompt 宣称必然遵守。",
    where: "src/core/retrieval/citationPolicy.ts",
  },
  工具循环: {
    term: "工具循环",
    explanation:
      "把『下一步做什么』交给模型：它自主决定调用哪个工具，代码执行并设边界，循环直到证据够用或触发刹车。\nReAct 范式：想 → 调工具 → 看观察 → 再想。",
    where: "src/core/agent/orchestrator.ts",
  },
  证据台账: {
    term: "证据台账",
    explanation:
      "工具带回的证据统一登记去重、编号 ev_N。\n起草上下文从台账拼出，引用必须能对回台账条目。",
    where: "src/core/agent/evidenceLedger.ts",
  },
  停止条件: {
    term: "停止条件",
    explanation:
      "用步数、耗时、重复调用、模型收束与取消等条件限制执行。\n本项目总耗时预算在取证循环检查，并非含起草与重试的端到端硬时限；达到预算也不等于任务完成。",
    where: "src/core/agent/orchestrator.ts",
  },
  执行轨迹: {
    term: "执行轨迹",
    explanation:
      "Agent 每步的结构化记录：工具、参数、观察摘要、证据编号与停止原因。\n开「循迹」提问后，回答下方即可展开轨迹面板。",
    where: "src/components/TracePanel.tsx",
  },
  分库检索: {
    term: "分库检索",
    explanation:
      "按思想传统标签和角色允许范围筛选、分配证据。\n这是角色材料路由，不能代替按用户或租户实现的访问控制；空库行为也需实际验证。",
    where: "src/core/retrieval/retrieveContext.ts",
  },
  声口校验: {
    term: "声口校验",
    explanation:
      "确定性规则盯『人』：专属自称越位、李出现命理语汇、AI 自指皆违规。\n正则 + 规则表，零模型参与。",
    where: "src/core/retrieval/voicePolicy.ts",
  },
  人设三件套: {
    term: "人设三件套",
    explanation:
      "neverSay 负面清单、styleSample 声口样例、contrast 角色分界线。\n用可检查的禁区和示例表达风格目标，再通过评测确认效果。",
    where: "src/data/mentors.ts",
  },
  材料隔离: {
    term: "材料隔离",
    explanation:
      "排盘简报按角色生成不同版本：胡全量、玄只取气机语言、李不注入简报。\n当前角色共享一次生成上下文，因此这不是进程或模型调用层面的隐私隔离。",
    where: "src/core/mingli/chartBrief.ts",
  },
  多智能体: {
    term: "Multi-agent",
    explanation:
      "多个具有各自职责和执行逻辑的 Agent 协作，可能通过消息或共享状态交换信息。\n本项目三贤是一次生成中的角色分工，不等于三个独立运行的 Agent。",
  },
  评测: {
    term: "Evals",
    explanation: "Evals：用代表任务与可判定标准评估结果和行为，并回归历史失败。\n区分任务成功、证据、权限、成本与延迟；模型自评分不能直接当客观真值。",
    where: "docs/agent-evaluation-observability.md",
  },
  日主: {
    term: "日主",
    explanation:
      "日柱天干，八字里的『我』，全盘以它论生克。\n盘面上以朱色标注。",
    where: "src/core/mingli/explainChart.ts",
  },
  十神: {
    term: "十神",
    explanation:
      "传统规则中其他天干相对日主的生克关系名：生我=印、我生=食伤、克我=官杀、我克=财、同我=比劫。\n我生且同阴阳为食神，异阴阳为伤官；关系换算不等于人生预测已经验证。",
    where: "src/core/mingli/mingliKb.ts",
  },
  真太阳时: {
    term: "真太阳时",
    explanation:
      "本项目以北京时间为输入，加相对东经 120° 的经度差（每度 4 分钟）和近似均时差 EOT。\n跨日和晚子时需结合所选日界口径；不自动处理海外时区或历史夏令时。",
    where: "src/core/user/solarTime.ts",
  },
  起运: {
    term: "起运",
    explanation:
      "按传统规则把出生到所选相邻节的时间间隔折算成起运年龄，顺逆方向影响取前一节或后一节。\n本项目显示年、月、日，可选按天或按分钟折算；输出更细不代表预测更准确。",
    where: "src/core/user/baziCalculator.ts",
  },
};

/** 不区分大小写查找 */
export function findConcept(text: string): Concept | undefined {
  return (
    CONCEPTS[text] ??
    Object.values(CONCEPTS).find((c) => c.term.toLowerCase() === text.toLowerCase())
  );
}

/** 学习馆术语表的展示顺序（Agent 为重，命理随后）。键必须存在于 CONCEPTS。 */
const AGENT_GLOSSARY_KEYS = [
  "技术树", "Token", "Transformer", "QKV", "训练与推理", "KVCache", "ContextEngineering", "Memory", "Workflow", "Harness", "MCP", "A2A", "Skills", "Observability", "Jev", "概率校准", "ROI",
  "RAG", "Embedding", "向量", "向量库", "余弦相似度", "topK", "Chunking", "来源锚定",
  "分库检索", "引用", "幻觉", "grounded", "声口校验", "self_correct",
  "Agent", "Tool", "工具循环", "证据台账", "停止条件", "执行轨迹",
  "人设三件套", "材料隔离", "多智能体", "评测", "入库", "状态机", "资料不足",
] as const;

const MINGLI_GLOSSARY_KEYS = ["日主", "十神", "真太阳时", "起运"] as const;

function pickConcepts(keys: readonly string[]): Concept[] {
  return keys
    .map((k) => CONCEPTS[k])
    .filter((c): c is Concept => Boolean(c));
}

export const GLOSSARY = {
  agent: pickConcepts(AGENT_GLOSSARY_KEYS),
  mingli: pickConcepts(MINGLI_GLOSSARY_KEYS),
};
