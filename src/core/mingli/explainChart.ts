/**
 * 命理解释组合器（规则引擎 · 规则层）
 *
 * 输入：具体排盘结果 + 用户点击的元素；
 * 输出：确定性拼装的解释卡（ExplainCard）——词条本义 + 「在你盘中」的角色。
 *
 * 一切结论由查表与生克规则推出，可核验；模型不参与这一层。
 * 强弱判断为简化粗评，卡片内明确标注局限。
 */

import type { BaziResult, BaziPillar, DaYun, WuXing } from "@/core/user/baziCalculator";
import { shiShenOfGan } from "@/core/user/baziCalculator";
import { GAN_INFO, ZHI_INFO, getEntry, type MingliEntry } from "./mingliKb";
import { liuNianGanZhi, liuNianYearOf } from "./liuNian";

export type PillarKey = "year" | "month" | "day" | "time";

export type MingliSelection =
  | { kind: "pillar"; which: PillarKey }
  | { kind: "gan"; char: string; from?: PillarKey }
  | { kind: "zhi"; char: string; from?: PillarKey }
  | { kind: "shishen"; name: string }
  | { kind: "dayun"; step: DaYun }
  | { kind: "liunian"; year: number }
  | { kind: "qiyun" }
  | { kind: "overview" }
  | { kind: "entry"; id: string };

export type ExplainLink = { id: string; label: string };

export type ExplainCard = {
  title: string;
  subtitle?: string;
  /** 分节正文（heading 可空） */
  sections: Array<{ heading?: string; body: string }>;
  /** 可点击跳转的关联词条 */
  links: ExplainLink[];
  /** 「问三贤」预填的问题 */
  askText: string;
  /** 「查典籍」检索词 */
  searchText: string;
};

const PILLAR_LABEL: Record<PillarKey, string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  time: "时柱",
};

const PILLAR_GONG_ID: Record<PillarKey, string> = {
  year: "gong-year",
  month: "gong-month",
  day: "gong-day",
  time: "gong-time",
};

function wxSheng(a: WuXing, b: WuXing): boolean {
  return (
    (a === "木" && b === "火") ||
    (a === "火" && b === "土") ||
    (a === "土" && b === "金") ||
    (a === "金" && b === "水") ||
    (a === "水" && b === "木")
  );
}
function wxKe(a: WuXing, b: WuXing): boolean {
  return (
    (a === "木" && b === "土") ||
    (a === "土" && b === "水") ||
    (a === "水" && b === "火") ||
    (a === "火" && b === "金") ||
    (a === "金" && b === "木")
  );
}

function linkOf(id: string): ExplainLink | null {
  const e = getEntry(id);
  return e ? { id, label: e.term } : null;
}

function links(...ids: string[]): ExplainLink[] {
  const seen = new Set<string>();
  const out: ExplainLink[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const l = linkOf(id);
    if (l) out.push(l);
  }
  return out;
}

/** 干支一柱内部关系（通行称谓） */
export function ganZhiRelation(gan: string, zhi: string): string {
  const g = GAN_INFO[gan];
  const z = ZHI_INFO[zhi];
  if (!g || !z) return "";
  const cang = z.cangGan;
  const tongGen = cang.some((c) => GAN_INFO[c]?.wuXing === g.wuXing);
  const rootNote = tongGen
    ? cang[0] && GAN_INFO[cang[0]]?.wuXing === g.wuXing
      ? "天干在本支通本气之根，坐得稳"
      : "天干在本支藏干中有中余气之根"
    : "天干在本支无根（虚浮，靠他柱接应）";
  if (g.wuXing === z.wuXing) return `干支同气（五行皆${g.wuXing}），上下一体，力量专一。${rootNote}。`;
  if (wxSheng(z.wuXing, g.wuXing)) return `地支${z.wuXing}生天干${g.wuXing}——坐下得生，如树得沃土。${rootNote}。`;
  if (wxSheng(g.wuXing, z.wuXing)) return `天干${g.wuXing}生地支${z.wuXing}——气往下泄，付出多于得到。${rootNote}。`;
  if (wxKe(g.wuXing, z.wuXing)) return `天干${g.wuXing}克地支${z.wuXing}——俗称「盖头」，上压其下，支中之气难伸。${rootNote}。`;
  if (wxKe(z.wuXing, g.wuXing)) return `地支${z.wuXing}克天干${g.wuXing}——俗称「截脚」，坐下之气暗损天干。${rootNote}。`;
  return rootNote;
}

function pillarOf(chart: BaziResult, which: PillarKey): BaziPillar {
  return chart.bazi[which];
}

/** 旧档兼容：xunKong 在历史数据中可能是「戌亥」字符串而非数组 */
function xunKongList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") return Array.from(raw.trim()).filter((ch) => ch.trim());
  return [];
}

/** 日主在某支的通根描述（供强弱粗评） */
function rootIn(chart: BaziResult, which: PillarKey): "本气" | "中余气" | null {
  const dmWx = chart.dayMasterWuXing;
  const cang = pillarOf(chart, which).hideGan;
  if (!cang.length) return null;
  if (GAN_INFO[cang[0]]?.wuXing === dmWx) return "本气";
  if (cang.slice(1).some((c) => GAN_INFO[c]?.wuXing === dmWx)) return "中余气";
  return null;
}

/** 旺相休囚死：日主 vs 月令 */
export function yueLingState(chart: BaziResult): { state: string; note: string; score: number } {
  const dm = chart.dayMasterWuXing;
  const yl = pillarOf(chart, "month").zhiWuXing;
  if (dm === yl) return { state: "旺（得令）", note: "月令与日主同气，当令而旺", score: 2 };
  if (wxSheng(yl, dm)) return { state: "相", note: "月令生日主，得月气之生", score: 1 };
  if (wxSheng(dm, yl)) return { state: "休", note: "日主生月令，气有所泄", score: -1 };
  if (wxKe(dm, yl)) return { state: "囚", note: "日主克月令，克之亦耗力", score: -1 };
  return { state: "死（失令）", note: "月令克日主，最不得月气", score: -2 };
}

/** 简化强弱粗评（明确标注局限） */
export function roughStrength(chart: BaziResult): {
  verdict: "偏强" | "偏弱" | "中和（大致）";
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  const yl = yueLingState(chart);
  score += yl.score;
  reasons.push(`月令：${yl.state}（${yl.note}）`);

  const rootPillars: PillarKey[] = ["year", "month", "day", "time"];
  for (const p of rootPillars) {
    const r = rootIn(chart, p);
    if (r === "本气") {
      score += 2;
      reasons.push(`${PILLAR_LABEL[p]}地支通本气根（+力）`);
    } else if (r === "中余气") {
      score += 1;
      reasons.push(`${PILLAR_LABEL[p]}地支有中余气根（+小力）`);
    }
  }

  const helpers = new Set(["比肩", "劫财", "正印", "偏印"]);
  const otherPillars: PillarKey[] = ["year", "month", "time"];
  for (const p of otherPillars) {
    const ss = pillarOf(chart, p).shiShenGan;
    if (helpers.has(ss)) {
      score += 1;
      reasons.push(`${PILLAR_LABEL[p]}天干${pillarOf(chart, p).gan}为${ss}，生扶日主`);
    } else {
      score -= 1;
      reasons.push(`${PILLAR_LABEL[p]}天干${pillarOf(chart, p).gan}为${ss}，克泄耗日主`);
    }
  }

  const verdict = score >= 3 ? "偏强" : score <= -3 ? "偏弱" : "中和（大致）";
  return { verdict, score, reasons };
}

// ── 各类选择的解释卡 ─────────────────────────────────────

function explainEntry(id: string): ExplainCard {
  const e: MingliEntry | null = getEntry(id);
  if (!e) {
    return {
      title: "暂无词条",
      sections: [{ body: "这个概念的词条还没有收录。可以直接问三贤，或上传相关典籍后检索。" }],
      links: [],
      askText: "请给我讲讲这个命理概念。",
      searchText: id,
    };
  }
  return {
    title: e.term,
    subtitle: categoryLabel(e.category),
    sections: [
      { body: e.brief },
      { heading: "细说", body: e.detail },
    ],
    links: links(...e.links),
    askText: `请结合我的八字，讲讲「${e.term}」在我盘中的意义。`,
    searchText: e.term.replace(/（.*?）/g, ""),
  };
}

function categoryLabel(c: MingliEntry["category"]): string {
  switch (c) {
    case "concept": return "基础概念";
    case "tiangan": return "十天干";
    case "dizhi": return "十二地支";
    case "shishen": return "十神";
    case "wuxing": return "五行";
    case "gongwei": return "四柱宫位";
    case "shensha": return "神煞";
  }
}

function explainGan(chart: BaziResult, char: string, from?: PillarKey): ExplainCard {
  const info = GAN_INFO[char];
  const entry = getEntry(`gan-${char}`);
  const sections: ExplainCard["sections"] = [];
  if (entry) {
    sections.push({ body: entry.brief });
    sections.push({ heading: "本义", body: entry.detail });
  }
  const isDayMaster = char === chart.dayMaster && from === "day";
  if (isDayMaster) {
    sections.push({
      heading: "在你盘中",
      body: `这是你的日主（日元）——整张盘的「我」。全盘其他干支与${char}的生克关系构成十神。你的日主五行属${info?.wuXing ?? "?"}，强弱判断见「盘面总览」。`,
    });
  } else {
    const ss = shiShenOfGan(chart.dayMaster, char);
    const where = from ? `位于${PILLAR_LABEL[from]}天干，` : "";
    sections.push({
      heading: "在你盘中",
      body: `${where}相对你的日主${chart.dayMaster}，${char}是你的「${ss}」——十神视角下，它承载的就是${ss}的事象。点击下方「${ss}」词条看具体含义。`,
    });
  }
  return {
    title: `${char} · 天干`,
    subtitle: info ? `${info.yinYang}${info.wuXing} · ${info.image}` : undefined,
    sections,
    links: links(
      `gan-${char}`,
      "tiangan",
      info ? `wx-${info.wuXing}` : "",
      ...(isDayMaster ? ["riyuan", "qiangruo"] : [`ss-${shiShenOfGan(chart.dayMaster, char)}`]),
    ),
    askText: isDayMaster
      ? `我的日主是${char}，请三位从各自视角讲讲${char}日主的人如何用好自己的天性。`
      : `我盘中${from ? PILLAR_LABEL[from] : ""}天干是${char}（${shiShenOfGan(chart.dayMaster, char)}），请讲讲它对我的影响。`,
    searchText: `${char} 天干`,
  };
}

function explainZhi(chart: BaziResult, char: string, from?: PillarKey): ExplainCard {
  const info = ZHI_INFO[char];
  const entry = getEntry(`zhi-${char}`);
  const sections: ExplainCard["sections"] = [];
  if (entry) {
    sections.push({ body: entry.brief });
    sections.push({ heading: "本义", body: entry.detail });
  }
  if (info) {
    const ssList = info.cangGan
      .map((g, i) => `${g}（${i === 0 ? "本气" : i === 1 ? "中气" : "余气"}，${shiShenOfGan(chart.dayMaster, g)}）`)
      .join("、");
    const where = from ? `位于${PILLAR_LABEL[from]}地支。` : "";
    sections.push({
      heading: "在你盘中",
      body: `${where}${char}中藏干：${ssList}——地支的作用主要通过藏干体现，这些十神埋在「地下」，比天干含蓄但更持久。${from === "month" ? `${char}同时是你的月令，是全盘强弱的第一标尺。` : ""}${from === "day" ? `${char}紧贴日主，也是你的夫妻宫。` : ""}`,
    });
  }
  return {
    title: `${char} · 地支`,
    subtitle: info ? `${info.yinYang}${info.wuXing} · ${info.month} · ${info.image}` : undefined,
    sections,
    links: links(
      `zhi-${char}`,
      "dizhi",
      "canggan",
      info ? `wx-${info.wuXing}` : "",
      ...(from === "month" ? ["yueling"] : []),
      ...(info ? info.cangGan.map((g) => `gan-${g}`) : []),
    ),
    askText: `我盘中${from ? PILLAR_LABEL[from] : ""}地支是${char}，请讲讲它藏着什么、对我意味着什么。`,
    searchText: `${char} 地支`,
  };
}

function explainPillar(chart: BaziResult, which: PillarKey): ExplainCard {
  const p = pillarOf(chart, which);
  const gong = getEntry(PILLAR_GONG_ID[which]);
  const sections: ExplainCard["sections"] = [];

  if (gong) sections.push({ heading: "这一柱管什么", body: `${gong.brief} ${gong.detail}` });

  const ganSs = which === "day" ? "日主（我）" : `${p.shiShenGan}`;
  sections.push({
    heading: `天干 ${p.gan}`,
    body: `${GAN_INFO[p.gan]?.yinYang ?? ""}${GAN_INFO[p.gan]?.wuXing ?? ""}，${GAN_INFO[p.gan]?.image ?? ""}。${which === "day" ? "它就是你自己（日主）。" : `相对日主为「${ganSs}」。`}`,
  });

  const cangDesc = p.hideGan
    .map((g, i) => `${g}${i === 0 ? "（本气）" : ""} → ${p.zhiShiShen[i] ?? shiShenOfGan(chart.dayMaster, g)}`)
    .join("；");
  sections.push({
    heading: `地支 ${p.zhi}`,
    body: `${ZHI_INFO[p.zhi]?.yinYang ?? ""}${ZHI_INFO[p.zhi]?.wuXing ?? ""}，${ZHI_INFO[p.zhi]?.image ?? ""}。藏干：${cangDesc}。${which === "day" ? "日支为夫妻宫，与日主的互动看亲密关系底色。" : ""}`,
  });

  sections.push({ heading: "干支关系", body: ganZhiRelation(p.gan, p.zhi) });

  const extra: string[] = [`纳音：${p.naYin}（古法音五行，作参考）`];
  const xk = xunKongList(p.xunKong);
  if (xk.length) extra.push(`本柱旬空：${xk.join("、")}（此二支若在盘中出现，事象偏虚）`);
  sections.push({ heading: "补充", body: extra.join("。") + "。" });

  return {
    title: `${PILLAR_LABEL[which]} · ${p.ganZhi}`,
    subtitle: gong?.term,
    sections,
    links: links(
      PILLAR_GONG_ID[which],
      `gan-${p.gan}`,
      `zhi-${p.zhi}`,
      "canggan",
      "nayin",
      "xunkong",
      ...(which === "day" ? ["riyuan"] : []),
      ...(which === "month" ? ["yueling"] : []),
    ),
    askText: `请三位讲讲我的${PILLAR_LABEL[which]}${p.ganZhi}：这一柱透露了什么？`,
    searchText: `${p.ganZhi} ${PILLAR_LABEL[which]}`,
  };
}

function explainShiShen(chart: BaziResult, name: string): ExplainCard {
  const entry = getEntry(`ss-${name}`);
  const sections: ExplainCard["sections"] = [];
  if (entry) {
    sections.push({ body: entry.brief });
    sections.push({ heading: "细说", body: entry.detail });
  }
  // 在盘中出现的位置（天干 + 藏干）
  const spots: string[] = [];
  (Object.keys(PILLAR_LABEL) as PillarKey[]).forEach((k) => {
    const p = pillarOf(chart, k);
    if (k !== "day" && p.shiShenGan === name) spots.push(`${PILLAR_LABEL[k]}天干${p.gan}`);
    p.hideGan.forEach((g, i) => {
      const ss = p.zhiShiShen[i] ?? shiShenOfGan(chart.dayMaster, g);
      if (ss === name) spots.push(`${PILLAR_LABEL[k]}${p.zhi}中藏干${g}`);
    });
  });
  sections.push({
    heading: "在你盘中",
    body: spots.length
      ? `你的${name}出现在：${spots.join("、")}。天干所透者明而易见，藏干所藏者暗而待发。`
      : `你的原局四柱中没有明透或暗藏的${name}——不代表与此无缘，大运流年干支仍会带来${name}之气。`,
  });
  return {
    title: `${name} · 十神`,
    subtitle: entry?.brief,
    sections,
    links: links(`ss-${name}`, "shishen", "riyuan"),
    askText: `请结合我的盘，讲讲「${name}」这颗星对我的意义与用法。`,
    searchText: name,
  };
}

function explainDaYun(chart: BaziResult, step: DaYun): ExplainCard {
  const gan = step.ganZhi[0];
  const zhi = step.ganZhi[1];
  const ganSs = shiShenOfGan(chart.dayMaster, gan);
  const zhiInfo = ZHI_INFO[zhi];
  const zhiMainSs = zhiInfo ? shiShenOfGan(chart.dayMaster, zhiInfo.cangGan[0]) : "?";
  const endYear = step.startYear + 9;
  return {
    title: `大运 ${step.ganZhi}`,
    subtitle: `${step.startYear}-${endYear} 年 · 虚岁 ${step.startAge}-${step.startAge + 9}`,
    sections: [
      {
        body: `大运是十年一换的「行进季节」。这步运天干${gan}对你的日主${chart.dayMaster}为「${ganSs}」，地支${zhi}本气藏干${zhiInfo?.cangGan[0] ?? "?"}为「${zhiMainSs}」。`,
      },
      {
        heading: "怎么读",
        body: `常见读法：前五年侧重天干${gan}（${ganSs}主事），后五年侧重地支${zhi}（${zhiMainSs}主事）。更细的吉凶要看这步干支与你原局四柱的生克合冲——这属于进阶内容，可以直接丢给三贤讨论。`,
      },
      { heading: "干支关系", body: ganZhiRelation(gan, zhi) },
    ],
    links: links("dayun", `gan-${gan}`, `zhi-${zhi}`, `ss-${ganSs}`, "liunian", "qiyun"),
    askText: `我${step.startYear}年起走${step.ganZhi}大运（${ganSs}/${zhiMainSs}），请三位讲讲这十年的主题与注意事项。`,
    searchText: `大运 ${step.ganZhi}`,
  };
}

function explainLiuNian(chart: BaziResult, year: number): ExplainCard {
  const gz = liuNianGanZhi(year);
  const gan = gz[0];
  const zhi = gz[1];
  const ganSs = shiShenOfGan(chart.dayMaster, gan);
  const zhiInfo = ZHI_INFO[zhi];
  const zhiMainSs = zhiInfo ? shiShenOfGan(chart.dayMaster, zhiInfo.cangGan[0]) : "?";
  const dy = chart.daYun.find((d, i) => {
    const next = chart.daYun[i + 1];
    return year >= d.startYear && (!next || year < next.startYear);
  });
  return {
    title: `流年 ${gz}（${year}）`,
    subtitle: dy ? `落在 ${dy.ganZhi} 大运之内` : "尚未上大运（参看小运）",
    sections: [
      {
        body: `流年是当年的「天气」，以立春为界。${year} 年干支${gz}：天干${gan}对你的日主为「${ganSs}」，地支${zhi}（太岁）本气为「${zhiMainSs}」——这一年外境的主题色。`,
      },
      {
        heading: "怎么读",
        body: `流年要和大运、原局一起看：${dy ? `今年你走${dy.ganZhi}大运，流年${gz}叠在这步运上；` : "你还未上大运，幼年以小运参看；"}流年支与你四柱地支若逢冲合刑害，往往是当年起伏的触发点。具体到事，建议把这一年丢给三贤结合你的处境细谈。`,
      },
    ],
    links: links("liunian", "dayun", `gan-${gan}`, `zhi-${zhi}`, `ss-${ganSs}`),
    askText: `${year}年流年${gz}（对我日主为${ganSs}），叠在${dy ? `${dy.ganZhi}大运` : "未上运阶段"}，请三位讲讲这一年该注意什么。`,
    searchText: `流年 ${gz}`,
  };
}

function explainQiYun(chart: BaziResult): ExplainCard {
  const entry = getEntry("qiyun");
  return {
    title: "起运 · 你的上运时间",
    subtitle: chart.qiYun.display,
    sections: [
      {
        body: `你的排盘：${chart.qiYun.display}，即虚岁 ${chart.qiYun.startAge} 岁进入第一步大运（${chart.daYun[0]?.ganZhi ?? "?"}）。大运方向：${chart.isForward ? "顺排" : "逆排"}。`,
      },
      { heading: "原理", body: entry?.detail ?? "" },
      {
        heading: "为什么大师会说「几岁几个月上运」",
        body: `因为起运是按出生到节气的距离折算的连续数值，不是整岁。本系统当前口径：${chart.qiYun.convention === "exact" ? "精确到分钟（sect=2）" : "按天折算（3天=1年，传统通行）"}。`,
      },
    ],
    links: links("qiyun", "dayun", "yueling"),
    askText: `我${chart.qiYun.display}（虚岁${chart.qiYun.startAge}岁上运，${chart.isForward ? "顺" : "逆"}排），请讲讲起运前后的人生节奏差异。`,
    searchText: "起运",
  };
}

// ── 完整分析辅助（全部确定性：查表 + 记分） ──────────────

const SS_GROUP: Record<string, "比劫" | "印星" | "食伤" | "财星" | "官杀"> = {
  比肩: "比劫", 劫财: "比劫",
  正印: "印星", 偏印: "印星",
  食神: "食伤", 伤官: "食伤",
  正财: "财星", 偏财: "财星",
  正官: "官杀", 七杀: "官杀", 偏官: "官杀",
};

const SS_GROUP_TRAIT: Record<string, string> = {
  比劫: "比劫之气重——主见强、重同侪，敢扛也易与人争，宜学「留三分」",
  印星: "印气重——好学重思虑、恋庇护与名声，想得多时行动易慢半拍",
  食伤: "食伤旺——表达与创造欲强，才华外露也易口舌，宜给它一个出口",
  财星: "财星旺——务实重经营、目标感强，忙起来易耗身忘己",
  官杀: "官杀旺——自律与责任压身，扛得住事也易紧绷，宜张弛有度",
};

/** 十神偏重统计：天干透出计 2；地支藏干本气计 2、中余气计 1 */
function shiShenProfile(chart: BaziResult): {
  ranking: Array<{ group: string; score: number }>;
  transparent: string[];
} {
  const score: Record<string, number> = { 比劫: 0, 印星: 0, 食伤: 0, 财星: 0, 官杀: 0 };
  const transparent: string[] = [];
  const pillars: PillarKey[] = ["year", "month", "day", "time"];
  for (const which of pillars) {
    const p = pillarOf(chart, which);
    if (which !== "day") {
      const g = SS_GROUP[p.shiShenGan];
      if (g) {
        score[g] += 2;
        transparent.push(`${PILLAR_LABEL[which]}${p.gan}（${p.shiShenGan}）`);
      }
    }
    p.zhiShiShen.forEach((ss, i) => {
      const g = SS_GROUP[ss];
      if (g) score[g] += i === 0 ? 2 : 1;
    });
  }
  const ranking = Object.entries(score)
    .map(([group, sc]) => ({ group, score: sc }))
    .sort((a, b) => b.score - a.score);
  return { ranking, transparent };
}

/** 喜忌方向粗判：由强弱推「宜生扶 / 宜克泄」的大方向，不定具体用神 */
function xiJiRough(verdict: string): { like: string; avoid: string } {
  if (verdict === "偏弱") {
    return { like: "生我助我之气（印星、比劫）", avoid: "克泄耗叠加过重（财、官杀、食伤齐上）" };
  }
  if (verdict === "偏强") {
    return { like: "泄我用我之气（食伤吐秀、财星引动、官杀约束）", avoid: "再叠印比帮扶，气壅而不流" };
  }
  return { like: "大致中和——顺势而行，随大运流年之气调配", avoid: "某一行骤然过重时留意失衡" };
}

function explainOverview(chart: BaziResult): ExplainCard {
  const s = roughStrength(chart);
  const yl = yueLingState(chart);
  const wx = chart.wuXingCount;
  const missing = (Object.keys(wx) as WuXing[]).filter((k) => wx[k] === 0);
  const most = (Object.entries(wx) as Array<[WuXing, number]>).sort((a, b) => b[1] - a[1])[0];
  const pillars = `${chart.bazi.year.ganZhi} ${chart.bazi.month.ganZhi} ${chart.bazi.day.ganZhi} ${chart.bazi.time.ganZhi}`;
  const xj = xiJiRough(s.verdict);
  const ssp = shiShenProfile(chart);
  const [top1, top2] = ssp.ranking;

  // 当前运程（流年以立春为界；未上运时按小运提示）
  const nowYear = liuNianYearOf(new Date());
  const nowGz = liuNianGanZhi(nowYear);
  const nowGanSs = shiShenOfGan(chart.dayMaster, nowGz[0]);
  const dy = chart.daYun.find((d, i) => {
    const next = chart.daYun[i + 1];
    return nowYear >= d.startYear && (!next || nowYear < next.startYear);
  });
  const dyText = dy
    ? `当前大运 ${dy.ganZhi}（${dy.startYear} 年起，天干对日主为「${shiShenOfGan(chart.dayMaster, dy.ganZhi[0])}」）`
    : `尚未上大运（${chart.qiYun.display}，幼年以小运参看）`;

  return {
    title: "盘面总览 · 完整分析",
    subtitle: `四柱：${pillars}`,
    sections: [
      {
        heading: "读盘四步",
        body: "①认日主（日干是「我」）②看月令定强弱基调 ③数根与生扶 ④看十神布局落在哪一宫。年→月→日→时也是早年→晚年的时间轴。下面按这条路，把你的盘完整走一遍。",
      },
      {
        heading: "一 · 日主与月令",
        body: `日主${chart.dayMaster}（${chart.dayMasterWuXing}），生于${pillarOf(chart, "month").zhi}月——月令处「${yl.state}」：${yl.note}。`,
      },
      {
        heading: "二 · 强弱（简化粗评）",
        body: `粗评：${s.verdict}（记分 ${s.score >= 0 ? "+" : ""}${s.score}）。依据：${s.reasons.join("；")}。⚠️ 简化估算，未计合冲刑害与调候，实际以通盘为准。`,
      },
      {
        heading: "三 · 五行分布",
        body: `金${wx.金} 木${wx.木} 水${wx.水} 火${wx.火} 土${wx.土}（计本气）。最盛为${most[0]}${missing.length ? `；缺${missing.join("、")}——「缺」不等于「凶」，要看缺的是不是你需要的那种气` : "；五行俱全，气路较通"}。`,
      },
      {
        heading: "四 · 喜忌方向（粗判）",
        body: `由强弱推大方向——宜：${xj.like}；忌：${xj.avoid}。⚠️ 真正的用神取舍须通盘（含调候与格局），此处只给方向感。`,
      },
      {
        heading: "五 · 十神偏重与性格线索",
        body: `盘中偏重：${top1.group}（${top1.score} 分），次为${top2.group}（${top2.score} 分）${ssp.transparent.length ? `；天干透出 ${ssp.transparent.join("、")}` : ""}。${SS_GROUP_TRAIT[top1.group]}；${SS_GROUP_TRAIT[top2.group]}。（性格线索是倾向，不是判词）`,
      },
      {
        heading: "六 · 当前运程",
        body: `${dyText}；今年流年 ${nowGz}（${nowYear} 年，天干对日主为「${nowGanSs}」）。${chart.qiYun.display}，大运${chart.isForward ? "顺" : "逆"}排、每十年一换；流年以立春为界，与大运、原局叠加起作用。`,
      },
      {
        heading: "七 · 宫位一览",
        body: `命宫${chart.mingGong.ganZhi}（${chart.mingGong.wuXing}）主一身格局之向；身宫${chart.shenGong.ganZhi}（${chart.shenGong.wuXing}）主后天着力处；胎元${chart.taiYuan.ganZhi}（纳音${chart.taiYuan.naYin}）。点各柱可看宫位分说。`,
      },
      {
        heading: "提醒",
        body: "以上各节全部由确定性规则推出（查表 + 生克记分），是简化模型下的整体走读，供自我观察与向三贤发问；不是命运判词。",
      },
    ],
    links: links("riyuan", "qiangruo", "yueling", "wuxing-gk", "shishen", "dayun", "liunian", "gong-year", "gong-month", "gong-day", "gong-time"),
    askText: `请三位完整看一次我的盘：四柱 ${pillars}，日主${chart.dayMaster}（${chart.dayMasterWuXing}），月令${yl.state}，粗评${s.verdict}，十神偏${top1.group}，${dyText}。局、势、道各是什么？我的下一步呢？`,
    searchText: "八字 强弱 喜忌 十神",
  };
}

/** 总入口：把用户点击翻译成解释卡 */
export function explainSelection(chart: BaziResult, sel: MingliSelection): ExplainCard {
  switch (sel.kind) {
    case "pillar": return explainPillar(chart, sel.which);
    case "gan": return explainGan(chart, sel.char, sel.from);
    case "zhi": return explainZhi(chart, sel.char, sel.from);
    case "shishen": return explainShiShen(chart, sel.name);
    case "dayun": return explainDaYun(chart, sel.step);
    case "liunian": return explainLiuNian(chart, sel.year);
    case "qiyun": return explainQiYun(chart);
    case "overview": return explainOverview(chart);
    case "entry": return explainEntry(sel.id);
  }
}
