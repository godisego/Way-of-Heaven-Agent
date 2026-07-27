/**
 * 学习模式 —— 术语表
 *
 * 数据从 docs/rag-concepts-primer.md 抽取。
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
  PDF: {
    term: "PDF",
    explanation:
      "PDF 是我们资料源的文件格式。\n本项目只接 PDF 文本(扫描件没 OCR 暂时读不出来)。",
    where: "src/core/ingestion/pdfPageExtractor.ts",
  },
  入库: {
    term: "入库",
    explanation:
      "把 PDF 加载进知识库的整个流程。\n含:按页解析 → 切 chunk → embedding → 写向量库。",
    where: "src/core/ingestion/ingestionPipeline.ts",
  },
  Embedding: {
    term: "Embedding",
    explanation:
      "把一段文字变成一串数字（向量）。\n语义相近的文本向量距离近，不相关的远。\n天道智能体可调用 OpenAI 兼容 Embedding 接口，mock 模式则使用本地哈希向量。",
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
    explanation:
      "一组有序的数字,代表一个文本。\n这里 embedding 输出 1536 / 3072 维。",
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
    explanation:
      "衡量两个向量『方向』接近程度的指标。\n值域 [-1, 1];1 = 完全同方向,0 = 正交(无关),-1 = 相反。\n0 向量要短路返回 0,否则除零 NaN。",
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
    explanation:
      "Retrieval-Augmented Generation,检索增强生成。\n开卷考试:每次回答先从资料库捞相关段,再喂给 LLM。",
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
    explanation:
      "LLM 编造细节(页码、数字、文件名)。\n三层防线:prompt 禁止、程序校验引用、self-correct 重试。",
  },
  grounded: {
    term: "grounded",
    explanation:
      "让 LLM 回答必须建立在给定资料上，不能凭记忆编造。\n天道智能体用 system prompt、来源台账和程序校验共同约束。",
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
    explanation:
      "LLM 第一次回答没有有效引用时，天道智能体会自动重试一次。\n这只是机械自纠；完整 Reflexion 还应记录失败原因并在后续任务中复用经验。",
    where: "src/core/retrieval/answerWithCitations.ts",
  },
  Agent: {
    term: "Agent",
    explanation:
      "Agent 会在受控循环里决定下一步动作、调用工具并检查结果。\n本项目已实现最小工具循环（开「循迹」体验），目标架构见 docs/agent-blueprint.md。",
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
    explanation:
      "如果检索不到证据,系统必须答『资料中没有足够信息回答这个问题』,\n不允许瞎编。这条规则优先于引用校验。",
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
      "Agent 循环的刹车，本项目六个：步数上限 / 单次调用超时 / 总超时 / 重复调用 / 模型自报收束 / 不调工具。\n先设计怎么停，再设计怎么跑。",
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
      "带权限的检索：一次大召回后按思想传统标签把证据分给三位。\n谁的专库是空的，谁就必须说「暂未入藏」。",
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
      "neverSay 负面清单、styleSample 声口微样本、contrast 分界线。\n样本示范远胜形容词描述。",
    where: "src/data/mentors.ts",
  },
  材料隔离: {
    term: "材料隔离",
    explanation:
      "输入端防人设漂移：排盘简报三档分发——胡全量、玄只拿气机语言、李完全隔离。\n拿不到的信息永远不会说漏。",
    where: "src/core/mingli/chartBrief.ts",
  },
  多智能体: {
    term: "Multi-agent",
    explanation:
      "多个各有独立上下文的 Agent 经消息协作。\n三贤是一次生成的三个角色而非 multi-agent——成本与必要性权衡后的刻意选择。",
  },
  评测: {
    term: "Evals",
    explanation:
      "固定问题集 + 可判定的通过标准，每次改动回归。\n没有评测，改提示词全凭手感——玩具与工程的分界线。",
    where: "docs/m5-acceptance.md",
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
      "任一天干与日主的生克关系名：生我=印、我生=食伤、克我=官杀、我克=财、同我=比劫，各分阴阳。",
    where: "src/core/mingli/mingliKb.ts",
  },
  真太阳时: {
    term: "真太阳时",
    explanation:
      "经度差（每度 4 分钟）+ 均时差（EOT）的出生时刻校正；跨日时日柱随之换日。",
    where: "src/core/user/solarTime.ts",
  },
  起运: {
    term: "起运",
    explanation:
      "按出生到相邻节气的距离折算的上运时间，本系统精确到『几年几个月几天』。\n默认 3 天=1 年折算，可切精确制。",
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
