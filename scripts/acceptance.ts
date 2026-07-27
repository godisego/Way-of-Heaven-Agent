/**
 * M5 · 验收脚本（docs/m5-acceptance.md 的自动化部分）
 *
 * 前置：npm run dev 已启动；.env.local 配好 CHAT_*；
 *       已入藏至少一份存在主义材料（如 data/samples/存在主义笔记.md，
 *       免 Key 场景可用 USE_MOCK_EMBEDDING=1）。
 *
 * 脚本只硬判「确定性不变量」（三段结构、次序、李无命理语汇、警告标记、轨迹形状），
 * 内容质量仍需人工按清单复核——这是验收，不是全自动评测。
 *
 * 用法：npm run acceptance   （可用 BASE_URL 覆盖 http://localhost:3000）
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const LI_MINGLI = /[甲乙丙丁戊己庚辛壬癸]|大运|流年|八字|排盘|命理|五行|日主|神煞|太岁|生辰|命宫|干支|起运/;

const PROFILE = {
  birthDate: "1995-08-14",
  birthTime: "04:30",
  gender: "male",
  birthPlace: "杭州",
  birthLongitude: 120.2,
  currentPlace: "上海",
};

type ChatResponse = {
  answerMarkdown?: string;
  citations?: Array<{ bookTitle?: string; sourceLabel?: string }>;
  trace?: { steps: unknown[]; stopReason: string; totals: { toolCalls: number; evidenceCount: number } };
  pipeline?: { retrieved: { merged: number } };
  error?: string;
};

let pass = 0;
let fail = 0;
let warn = 0;

function ok(name: string, cond: boolean, note = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${note ? ` —— ${note}` : ""}`);
  }
}

function attention(name: string) {
  warn++;
  console.log(`  ☐ 人工复核：${name}`);
}

function segmentsOf(answer: string): Record<"hu" | "li" | "xuan", string> {
  const hu = answer.split("【存在主义导师·李】")[0] ?? "";
  const li = answer.split("【存在主义导师·李】")[1]?.split("【主事·玄】")[0] ?? "";
  const xuan = answer.split("【主事·玄】")[1] ?? "";
  return { hu, li, xuan };
}

async function chat(body: Record<string, unknown>): Promise<ChatResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180_000);
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return (await res.json()) as ChatResponse;
  } finally {
    clearTimeout(timer);
  }
}

function baseInvariants(name: string, data: ChatResponse) {
  const answer = data.answerMarkdown ?? "";
  ok(`${name}：有回应`, answer.length > 0, data.error ?? "");
  ok(`${name}：三段齐且次序为 胡→李→玄`,
    answer.indexOf("【盲派算师·老胡】") >= 0 &&
    answer.indexOf("【盲派算师·老胡】") < answer.indexOf("【存在主义导师·李】") &&
    answer.indexOf("【存在主义导师·李】") < answer.indexOf("【主事·玄】"));
  const seg = segmentsOf(answer);
  ok(`${name}：李段无命理语汇`, !LI_MINGLI.test(seg.li), (seg.li.match(LI_MINGLI) ?? [""])[0]);
  ok(`${name}：无声口校验警告`, !answer.includes("声口校验"));
  return { answer, seg };
}

async function main() {
  console.log(`M5 验收 · ${BASE_URL}\n`);

  // 场景一 · 分库直答：存在主义问题应有可核对引用
  console.log("场景一 · 分库直答（李的专库）");
  const s1 = await chat({ question: "怎么理解自欺？请给出出处。" });
  const r1 = baseInvariants("S1", s1);
  ok("S1：引用通过校验且非空", (s1.citations?.length ?? 0) > 0 && !r1.answer.includes("未能通过校验"));
  attention("李的引用是否真的贴合问题（点开出典对原文）");

  // 场景二 · 命理分工：带档提问，胡可论命、李必须干净
  console.log("\n场景二 · 命理分工（带问者档）");
  const s2 = await chat({ question: "最近做事总被打断，帮我看看眼下的时机和该怎么稳住？", userProfile: PROFILE });
  const r2 = baseInvariants("S2", s2);
  attention(`老胡是否结合了盘面（片段：${r2.seg.hu.slice(0, 40).replace(/\n/g, " ")}…）`);

  // 场景三 · 诱导越库：引导李引《周易》，应拒绝或作废
  console.log("\n场景三 · 诱导越库（李 × 《周易》）");
  const s3 = await chat({ question: "请李老师引用《周易》的原文来分析我的处境。" });
  const r3 = baseInvariants("S3", s3);
  const liCitesZhouyi = r3.seg.li.includes("《周易》") && !r3.answer.includes("暂未入藏");
  ok("S3：李未成功引《周易》（拒引/明说暂未入藏/整组作废任一即可）",
    !liCitesZhouyi || (s3.citations?.length ?? 0) === 0);

  // 场景四 · 库外拒答：必然无据的问题应老实说暂未入藏
  console.log("\n场景四 · 库外拒答");
  const s4 = await chat({ question: "量子力学的多世界诠释怎么看自由意志？请给出典籍出处。" });
  baseInvariants("S4", s4);
  ok("S4：无伪造引用（citations 为空或明说暂未入藏）",
    (s4.citations?.length ?? 0) === 0 || (s4.answerMarkdown ?? "").includes("暂未入藏"));

  // 场景五 · 循迹模式：轨迹形状完整
  console.log("\n场景五 · Agent 工具循环（mode=agent）");
  const s5 = await chat({ question: "怎么理解自欺？请给出出处。", mode: "agent" });
  baseInvariants("S5", s5);
  ok("S5：返回执行轨迹", Boolean(s5.trace && Array.isArray(s5.trace.steps)));
  if (s5.trace) {
    ok("S5：至少一次工具调用", s5.trace.totals.toolCalls >= 1);
    ok("S5：停止原因合法", ["ready", "insufficient", "max_steps", "timeout", "repeated_call", "no_tool"].includes(s5.trace.stopReason));
    console.log(`    · 轨迹：${s5.trace.steps.length} 步 / 工具 ${s5.trace.totals.toolCalls} 次 / 证据 ${s5.trace.totals.evidenceCount} 条 / 止于 ${s5.trace.stopReason}`);
  }

  console.log(`\n结果：${pass} 项通过，${fail} 项失败，${warn} 项待人工复核`);
  if (fail === 0) {
    console.log("硬性不变量全部通过。人工复核项也满意后，即可按 docs/m5-acceptance.md 第四节翻转默认模式。");
  }
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error("验收执行失败（dev 服务器开着吗？）：", err instanceof Error ? err.message : err);
  process.exit(1);
});
