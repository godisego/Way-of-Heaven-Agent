/**
 * 命理简报（规则引擎 → 三贤）—— mentor-libraries-and-bazi-design.md 第 5 节的实现。
 *
 * 三档分发（已定决策）：
 *  - briefForHu   老胡 · 全量命理事实清单（十神/强弱/大运流年/神煞/三宫）
 *  - briefForXuan 玄   · 气机简报（道家读法：五行盈虚、时之进退，不批命不断吉凶）
 *  - briefForLi   李   · 结构性隔离：只有现实背景，无任何命理内容
 *
 * 全部内容由既有确定性规则拼装（shiShenOfGan / roughStrength / 藏干表 / 流年公式），
 * 不含模型生成；模型只被允许「解读既定结果」，两份简报的【使用规则】即约束条款。
 * now 参数用于测试的可复现性（流年随日期变化）。
 */

import type { BaziResult } from "@/core/user/baziCalculator";
import { shiShenOfGan, findDaYunForYear, type DaYun } from "@/core/user/baziCalculator";
import type { ShenSha } from "@/core/user/shenSha";
import { GAN_INFO, ZHI_INFO } from "./mingliKb";
import { roughStrength } from "./explainChart";
import { currentLiuNian } from "./liuNian";

const PILLAR_CN: Record<"year" | "month" | "day" | "time", string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  time: "时柱",
};

function pillarLine(chart: BaziResult, key: "year" | "month" | "day" | "time"): string {
  const p = chart.bazi[key];
  const ganPart = key === "day" ? "日主（我）" : p.shiShenGan;
  const cang = p.hideGan
    .map((g, i) => `${g}→${p.zhiShiShen[i] ?? shiShenOfGan(chart.dayMaster, g)}`)
    .join("、");
  return `${PILLAR_CN[key]} ${p.ganZhi}：天干${p.gan}为${ganPart}；地支${p.zhi}藏 ${cang}`;
}

/** 神煞行（字段可能缺失——旧档或测试夹具，安全降级） */
function shenShaText(shenSha: BaziResult["shenSha"] | undefined | null): string {
  if (!shenSha) return "（未计算）";
  const ss = shenSha as Partial<ShenSha>;
  const cn: Record<string, string> = { year: "年柱", month: "月柱", day: "日柱", time: "时柱" };
  const parts: string[] = [];
  if (ss.tianYi?.branches?.length) parts.push(`天乙贵人（${ss.tianYi.branches.join("、")}）`);
  if (ss.wenChang) parts.push(`文昌（${ss.wenChang.branch}·${cn[String(ss.wenChang.position)] ?? ""}）`);
  if (ss.yiMa) parts.push(`驿马（${ss.yiMa.branch}·${cn[String(ss.yiMa.position)] ?? ""}）`);
  if (ss.taoHua) parts.push(`桃花（${ss.taoHua.branch}·${cn[String(ss.taoHua.position)] ?? ""}）`);
  if (ss.huaGai) parts.push(`华盖（${ss.huaGai.branch}·${cn[String(ss.huaGai.position)] ?? ""}）`);
  if (ss.jiangXing) parts.push(`将星（${ss.jiangXing.branch}·${cn[String(ss.jiangXing.position)] ?? ""}）`);
  if (ss.tianDe) parts.push(`天德（${ss.tianDe.gan}）`);
  if (ss.yueDe) parts.push(`月德（${ss.yueDe.gan}）`);
  return parts.length ? parts.join("、") : "无明显神煞";
}

/** 大运一步的十神注记：干十神/支本气十神 */
function daYunShiShen(chart: BaziResult, step: DaYun): string {
  const gan = step.ganZhi[0];
  const zhi = step.ganZhi[1];
  const gs = shiShenOfGan(chart.dayMaster, gan);
  const mainCang = ZHI_INFO[zhi]?.cangGan[0];
  const zs = mainCang ? shiShenOfGan(chart.dayMaster, mainCang) : "?";
  return `${gs}/${zs}`;
}

/** 老胡 · 全量命理简报 */
export function briefForHu(chart: BaziResult, now: Date = new Date()): string {
  const s = roughStrength(chart);
  const ln = currentLiuNian(now);
  const cur = findDaYunForYear(chart.daYun, ln.year);
  const lnShiShen = shiShenOfGan(chart.dayMaster, ln.ganZhi[0]);

  const daYunLine = chart.daYun
    .slice(0, 5)
    .map((d) => `${cur && d.startYear === cur.startYear ? "▶" : ""}${d.ganZhi}（${d.startYear}起，${daYunShiShen(chart, d)}）`)
    .join(" → ");

  const qiYunLine =
    typeof chart.qiYun?.display === "string"
      ? `${chart.qiYun.display}（虚岁 ${chart.qiYun.startAge} 岁上运，${chart.isForward ? "顺" : "逆"}排）`
      : `虚岁 ${chart.daYun[0]?.startAge ?? "?"} 岁上运（${chart.isForward ? "顺" : "逆"}排）`;

  return [
    "【命理简报 · 排盘系统既定结果】",
    pillarLine(chart, "year"),
    pillarLine(chart, "month"),
    pillarLine(chart, "day"),
    pillarLine(chart, "time"),
    `日主：${chart.dayMaster}（${chart.dayMasterWuXing}）。强弱粗评：${s.verdict}——${s.reasons.slice(0, 3).join("；")}。`,
    `五行分布：金${chart.wuXingCount.金} 木${chart.wuXingCount.木} 水${chart.wuXingCount.水} 火${chart.wuXingCount.火} 土${chart.wuXingCount.土}（本气计数）。`,
    `起运：${qiYunLine}。`,
    `大运：${daYunLine}。`,
    `今年流年：${ln.ganZhi}（${ln.year} 年，对日主为${lnShiShen}${cur ? `，落 ${cur.ganZhi} 大运内` : "，尚未上大运"}）。`,
    `神煞：${shenShaText(chart.shenSha)}。`,
    `命宫 ${chart.mingGong.ganZhi} · 身宫 ${chart.shenGong.ganZhi} · 胎元 ${chart.taiYuan.ganZhi}。`,
    "【使用规则】以上为排盘系统的确定性既定结果。你只可引用与解读这些内容，不得自行推算或新增任何干支、神煞、日期；吉凶只谈倾向、窗口与宜忌，禁绝对化断语与恐吓；批完须落到人事建议。",
  ].join("\n");
}

/** 玄 · 气机简报（道家读法） */
export function briefForXuan(chart: BaziResult, now: Date = new Date()): string {
  const s = roughStrength(chart);
  const qiXiang =
    s.verdict === "偏强" ? "气盛而张，宜导不宜再助" : s.verdict === "偏弱" ? "气敛而收，宜养不宜强张" : "气象中平，随时损益";

  const wx = chart.wuXingCount;
  const entries = (Object.keys(wx) as Array<keyof typeof wx>).map((k) => ({ k, v: wx[k] }));
  const abundant = entries.filter((e) => e.v >= 3).map((e) => `${e.k}盛（${e.v}）`);
  const missing = entries.filter((e) => e.v === 0).map((e) => String(e.k));
  const dist = entries.map((e) => `${e.k}${e.v}`).join(" ");
  const yingXu = `${dist}${abundant.length ? `——${abundant.join("、")}` : ""}${missing.length ? `；缺${missing.join("、")}之气` : ""}`;

  const monthZhi = chart.bazi.month.zhi;
  const monthInfo = ZHI_INFO[monthZhi];
  const ln = currentLiuNian(now);
  const cur = findDaYunForYear(chart.daYun, ln.year);
  const lnQi = `${GAN_INFO[ln.ganZhi[0]]?.wuXing ?? ""}${ZHI_INFO[ln.ganZhi[1]]?.wuXing ?? ""}`;
  const curQi = cur ? `${GAN_INFO[cur.ganZhi[0]]?.wuXing ?? ""}${ZHI_INFO[cur.ganZhi[1]]?.wuXing ?? ""}` : "";

  return [
    "【气机简报 · 以阴阳五行论，不批命】",
    `命主之气：${chart.dayMaster}${chart.dayMasterWuXing}（${GAN_INFO[chart.dayMaster]?.image ?? ""}）。当下气象：${qiXiang}。`,
    `五行盈虚：${yingXu}。`,
    `时之所处：生于${monthInfo?.month ?? monthZhi}（月令${monthZhi}·${monthInfo?.wuXing ?? ""}气当令）；今岁${ln.ganZhi}（${lnQi}之年）${cur ? `；现行${cur.ganZhi}运（${curQi}之气）` : ""}。`,
    "【使用规则】你不批命、不断吉凶、不预测祸福，也不使用十神与神煞语汇；只以气之盈虚、时之进退论方向与节奏，建议落到姿态（宜紧宜松、宜显宜藏、先安内或先开路）。",
  ].join("\n");
}

/** 李 · 结构性隔离：只有现实背景，无任何命理内容 */
export function briefForLi(profile: {
  currentPlace?: string;
  education?: string;
  work?: string;
  relationship?: string;
}): string {
  const facts: string[] = [];
  if (profile.currentPlace) facts.push(`现居：${profile.currentPlace}`);
  if (profile.education) facts.push(`学历：${profile.education}`);
  if (profile.work) facts.push(`工作：${profile.work}`);
  if (profile.relationship) facts.push(`感情：${profile.relationship}`);
  return [
    "【现实背景】",
    facts.length ? facts.join("；") + "。" : "问者未留下背景信息。",
    "【使用规则】命理与气机由老胡、玄负责；你不使用任何命理语汇（干支、五行、大运、流年、排盘等一概不提），只面对问者的现实处境、选择与责任。",
  ].join("\n");
}
