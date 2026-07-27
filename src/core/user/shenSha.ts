/**
 * 神煞查表 —— 子平八字主流派规则。
 *
 * 来源：传统命理口诀（"天乙贵人"、"文昌"、"驿马"、"桃花"、"华盖"、"将星"、"天德"、"月德"）。
 * 查表依据：日干、年干、年支、月支、日支、时支。
 *
 * 注：神煞只是参考，主流派"看格局不看神煞"，但 agent 在引用时加上神煞能给问者更具体的"参考维度"。
 */

const ZHI_ORDER = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
type Zhi = typeof ZHI_ORDER[number];
const isZhi = (s: string): s is Zhi => (ZHI_ORDER as readonly string[]).includes(s);

/** 天乙贵人（按日干查） */
const TIANYI_GUIREN: Record<string, Zhi[]> = {
  甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"],
  乙: ["子", "申"], 己: ["子", "申"],
  丙: ["亥", "酉"], 丁: ["亥", "酉"],
  壬: ["巳", "卯"], 癸: ["巳", "卯"],
  辛: ["寅", "午"],
};

/** 文昌（按日干查） */
const WENCHANG: Record<string, Zhi> = {
  甲: "巳", 乙: "午", 丙: "申", 丁: "酉", 戊: "申",
  己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "卯",
};

/**
 * 驿马 / 桃花 / 华盖 —— 同一三元局的支查同一地支
 * 申子辰 → 驿马寅 / 桃花酉 / 华盖辰
 * 寅午戌 → 驿马申 / 桃花卯 / 华盖戌
 * 巳酉丑 → 驿马亥 / 桃花午 / 华盖丑
 * 亥卯未 → 驿马巳 / 桃花子 / 华盖未
 */
const SANYUAN_MAP: Record<Zhi, { yiMa: Zhi; taoHua: Zhi; huaGai: Zhi; jiangXing: Zhi }> = {
  申: { yiMa: "寅", taoHua: "酉", huaGai: "辰", jiangXing: "子" },
  子: { yiMa: "寅", taoHua: "酉", huaGai: "辰", jiangXing: "子" },
  辰: { yiMa: "寅", taoHua: "酉", huaGai: "辰", jiangXing: "子" },
  寅: { yiMa: "申", taoHua: "卯", huaGai: "戌", jiangXing: "午" },
  午: { yiMa: "申", taoHua: "卯", huaGai: "戌", jiangXing: "午" },
  戌: { yiMa: "申", taoHua: "卯", huaGai: "戌", jiangXing: "午" },
  巳: { yiMa: "亥", taoHua: "午", huaGai: "丑", jiangXing: "酉" },
  酉: { yiMa: "亥", taoHua: "午", huaGai: "丑", jiangXing: "酉" },
  丑: { yiMa: "亥", taoHua: "午", huaGai: "丑", jiangXing: "酉" },
  亥: { yiMa: "巳", taoHua: "子", huaGai: "未", jiangXing: "卯" },
  卯: { yiMa: "巳", taoHua: "子", huaGai: "未", jiangXing: "卯" },
  未: { yiMa: "巳", taoHua: "子", huaGai: "未", jiangXing: "卯" },
};

/** 天德贵人（按月支查） */
const TIANDE: Record<Zhi, string> = {
  寅: "丁", 卯: "申", 辰: "壬", 巳: "辛",
  午: "亥", 未: "甲", 申: "癸", 酉: "丙",
  戌: "乙", 亥: "庚", 子: "辛", 丑: "己",
};

/** 月德贵人（按月支起，按"三合局年支"取） */
const YUEDE_YEAR_ZHI_GROUP: Record<Zhi, string> = {
  寅: "丙", 午: "丙", 戌: "丙",
  申: "壬", 子: "壬", 辰: "壬",
  亥: "甲", 卯: "甲", 未: "甲",
  巳: "庚", 酉: "庚", 丑: "庚",
};

export type ShenShaConfig = {
  dayMaster: string;
  yearGan: string;
  yearZhi: string;
  monthZhi: string;
  dayZhi: string;
  timeZhi: string;
};

export type ShenSha = {
  /** 天乙贵人（按日干查所有四柱地支命中） */
  tianYi: { positions: Zhi[]; branches: Zhi[] };
  /** 文昌 */
  wenChang: { position: Zhi; branch: Zhi } | null;
  /** 驿马（按年支） */
  yiMa: { position: Zhi; branch: Zhi } | null;
  /** 桃花 / 咸池（按年支） */
  taoHua: { position: Zhi; branch: Zhi } | null;
  /** 华盖（按年支） */
  huaGai: { position: Zhi; branch: Zhi } | null;
  /** 将星（按年支） */
  jiangXing: { position: Zhi; branch: Zhi } | null;
  /** 天德贵人（按月支） */
  tianDe: { gan: string; branch: Zhi } | null;
  /** 月德贵人（按月支） */
  yueDe: { gan: string } | null;
};

const PILLAR_BRANCHES: Array<{ key: "year" | "month" | "day" | "time"; zhi: string }> = [
  { key: "year", zhi: "" },
  { key: "month", zhi: "" },
  { key: "day", zhi: "" },
  { key: "time", zhi: "" },
];

function findBranchPosition(target: Zhi, branches: { year: string; month: string; day: string; time: string }): Zhi | null {
  if (branches.year === target) return "year" as unknown as Zhi;
  if (branches.month === target) return "month" as unknown as Zhi;
  if (branches.day === target) return "day" as unknown as Zhi;
  if (branches.time === target) return "time" as unknown as Zhi;
  return null;
}

function findAllBranchPositions(target: Zhi[], branches: { year: string; month: string; day: string; time: string }): Zhi[] {
  const result: Zhi[] = [];
  if (target.includes(branches.year as Zhi)) result.push("year" as unknown as Zhi);
  if (target.includes(branches.month as Zhi)) result.push("month" as unknown as Zhi);
  if (target.includes(branches.day as Zhi)) result.push("day" as unknown as Zhi);
  if (target.includes(branches.time as Zhi)) result.push("time" as unknown as Zhi);
  return result;
}

export function calculateShenSha(cfg: ShenShaConfig): ShenSha {
  const branches = { year: cfg.yearZhi, month: cfg.monthZhi, day: cfg.dayZhi, time: cfg.timeZhi };

  // 天乙贵人（按日干）
  const tianYiTargets = TIANYI_GUIREN[cfg.dayMaster] ?? [];
  const tianYiPositions = findAllBranchPositions(tianYiTargets, branches);
  const tianYiBranches = tianYiPositions.map((p) => branches[p as unknown as keyof typeof branches] as Zhi);

  // 文昌（按日干）
  const wenChangTarget = WENCHANG[cfg.dayMaster];
  const wenChangPos = wenChangTarget ? findBranchPosition(wenChangTarget, branches) : null;

  // 驿马/桃花/华盖/将星（按年支）
  const sanyuan = SANYUAN_MAP[branches.year as Zhi];
  const yiMaTarget = sanyuan?.yiMa ?? null;
  const taoHuaTarget = sanyuan?.taoHua ?? null;
  const huaGaiTarget = sanyuan?.huaGai ?? null;
  const jiangXingTarget = sanyuan?.jiangXing ?? null;

  const yiMaPos = yiMaTarget ? findBranchPosition(yiMaTarget, branches) : null;
  const taoHuaPos = taoHuaTarget ? findBranchPosition(taoHuaTarget, branches) : null;
  const huaGaiPos = huaGaiTarget ? findBranchPosition(huaGaiTarget, branches) : null;
  const jiangXingPos = jiangXingTarget ? findBranchPosition(jiangXingTarget, branches) : null;

  // 天德（按月支）
  const tianDeGan = TIANDE[branches.month as Zhi];
  const tianDeBranchPos = tianDeGan && isZhi(tianDeGan) ? findBranchPosition(tianDeGan as Zhi, branches) : null;

  // 月德（按月支起）
  const yueDeGan = YUEDE_YEAR_ZHI_GROUP[branches.month as Zhi];

  return {
    tianYi: { positions: tianYiPositions, branches: tianYiBranches },
    wenChang: wenChangTarget && wenChangPos
      ? { position: wenChangPos, branch: wenChangTarget }
      : null,
    yiMa: yiMaTarget && yiMaPos ? { position: yiMaPos, branch: yiMaTarget } : null,
    taoHua: taoHuaTarget && taoHuaPos ? { position: taoHuaPos, branch: taoHuaTarget } : null,
    huaGai: huaGaiTarget && huaGaiPos ? { position: huaGaiPos, branch: huaGaiTarget } : null,
    jiangXing: jiangXingTarget && jiangXingPos ? { position: jiangXingPos, branch: jiangXingTarget } : null,
    tianDe: tianDeGan
      ? { gan: tianDeGan, branch: tianDeBranchPos ?? ("year" as unknown as Zhi) }
      : null,
    yueDe: yueDeGan ? { gan: yueDeGan } : null,
  };
}
