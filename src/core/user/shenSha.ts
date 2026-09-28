/**
 * 神煞查表 —— 本项目采用的传统规则口径。
 *
 * 来源：传统命理口诀（"天乙贵人"、"文昌"、"驿马"、"桃花"、"华盖"、"将星"、"天德"、"月德"）。
 * 查表依据：日干、年支、月支及四柱明干与地支；不将藏干当作明干命中。
 *
 * 注：驿马、桃花、华盖、将星沿用按年支起的口径；其他流派可能兼看日支。
 * 神煞仅为传统解释辅助，不表示已验证的现实预测能力。
 */

const ZHI_ORDER = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export type Zhi = typeof ZHI_ORDER[number];
export type Gan = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";
export type PillarPosition = "year" | "month" | "day" | "time";
const PILLAR_POSITIONS: PillarPosition[] = ["year", "month", "day", "time"];

export type ShenShaTarget = { kind: "gan"; value: Gan } | { kind: "zhi"; value: Zhi };
export type ShenShaHit<T extends ShenShaTarget = ShenShaTarget> = {
  target: T;
  positions: PillarPosition[];
};
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

/**
 * 天德贵人（按月支查目标，四柱明干或地支见之才命中）。
 * 口诀依据：《御定星厯考原》卷三「天德」：
 * https://zh.wikisource.org/zh/御定星厯考原_(四庫全書本)/卷3
 * 原文的坤、乾、艮、巽为卦名；本项目采用其对应申、亥、寅、巳的八字查表口径，
 * 不把这个地支转换伪称为原书逐字记载。规则依据和现实预测效力是两件事。
 */
const TIANDE: Record<Zhi, ShenShaTarget> = {
  寅: { kind: "gan", value: "丁" }, 卯: { kind: "zhi", value: "申" },
  辰: { kind: "gan", value: "壬" }, 巳: { kind: "gan", value: "辛" },
  午: { kind: "zhi", value: "亥" }, 未: { kind: "gan", value: "甲" },
  申: { kind: "gan", value: "癸" }, 酉: { kind: "zhi", value: "寅" },
  戌: { kind: "gan", value: "丙" }, 亥: { kind: "gan", value: "乙" },
  子: { kind: "zhi", value: "巳" }, 丑: { kind: "gan", value: "庚" },
};

/** 月德贵人（按月支所在三合局取阳干，四柱明干见之；同上卷「月德」）。 */
const YUEDE_MONTH_ZHI_GROUP: Record<Zhi, Gan> = {
  寅: "丙", 午: "丙", 戌: "丙",
  申: "壬", 子: "壬", 辰: "壬",
  亥: "甲", 卯: "甲", 未: "甲",
  巳: "庚", 酉: "庚", 丑: "庚",
};

export type ShenShaConfig = {
  dayMaster: string;
  yearGan: string;
  monthGan: string;
  timeGan: string;
  yearZhi: string;
  monthZhi: string;
  dayZhi: string;
  timeZhi: string;
};

export type ShenSha = {
  /** 天乙贵人（按日干查所有四柱地支命中） */
  tianYi: { positions: PillarPosition[]; branches: Zhi[] };
  /** 文昌 */
  wenChang: { position: PillarPosition; branch: Zhi } | null;
  /** 驿马（按年支） */
  yiMa: { position: PillarPosition; branch: Zhi } | null;
  /** 桃花 / 咸池（按年支） */
  taoHua: { position: PillarPosition; branch: Zhi } | null;
  /** 华盖（按年支） */
  huaGai: { position: PillarPosition; branch: Zhi } | null;
  /** 将星（按年支） */
  jiangXing: { position: PillarPosition; branch: Zhi } | null;
  /** 天德贵人：目标是干或支，positions 是四柱实际命中位置。 */
  tianDe: ShenShaHit | null;
  /** 月德贵人：目标始终为天干，positions 是四柱明干实际命中位置。 */
  yueDe: ShenShaHit<{ kind: "gan"; value: Gan }> | null;
};

type PillarValues = Record<PillarPosition, string>;

function findAllPositions(targets: readonly string[], pillars: PillarValues): PillarPosition[] {
  return PILLAR_POSITIONS.filter((position) => targets.includes(pillars[position]));
}

function findBranchPosition(target: Zhi, branches: PillarValues): PillarPosition | null {
  return findAllPositions([target], branches)[0] ?? null;
}

function findTargetHit<T extends ShenShaTarget>(
  target: T | undefined,
  stems: PillarValues,
  branches: PillarValues,
): ShenShaHit<T> | null {
  if (!target) return null;
  const positions = findAllPositions([target.value], target.kind === "gan" ? stems : branches);
  return positions.length ? { target, positions } : null;
}

export function calculateShenSha(cfg: ShenShaConfig): ShenSha {
  const branches = { year: cfg.yearZhi, month: cfg.monthZhi, day: cfg.dayZhi, time: cfg.timeZhi };
  const stems = { year: cfg.yearGan, month: cfg.monthGan, day: cfg.dayMaster, time: cfg.timeGan };

  // 天乙贵人（按日干）
  const tianYiTargets = TIANYI_GUIREN[cfg.dayMaster] ?? [];
  const tianYiPositions = findAllPositions(tianYiTargets, branches);
  const tianYiBranches = tianYiPositions.map((p) => branches[p]).filter(isZhi);

  // 文昌（按日干）
  const wenChangTarget = WENCHANG[cfg.dayMaster];
  const wenChangPos = wenChangTarget ? findBranchPosition(wenChangTarget, branches) : null;

  // 驿马/桃花/华盖/将星（按年支，不擅自扩展到日支起）
  const sanyuan = isZhi(branches.year) ? SANYUAN_MAP[branches.year] : undefined;
  const yiMaTarget = sanyuan?.yiMa ?? null;
  const taoHuaTarget = sanyuan?.taoHua ?? null;
  const huaGaiTarget = sanyuan?.huaGai ?? null;
  const jiangXingTarget = sanyuan?.jiangXing ?? null;

  const yiMaPos = yiMaTarget ? findBranchPosition(yiMaTarget, branches) : null;
  const taoHuaPos = taoHuaTarget ? findBranchPosition(taoHuaTarget, branches) : null;
  const huaGaiPos = huaGaiTarget ? findBranchPosition(huaGaiTarget, branches) : null;
  const jiangXingPos = jiangXingTarget ? findBranchPosition(jiangXingTarget, branches) : null;

  // 查表得到的是候选目标；只有四柱实际命中，才返回天德/月德。
  const tianDeTarget = isZhi(branches.month) ? TIANDE[branches.month] : undefined;
  const yueDeGan = isZhi(branches.month) ? YUEDE_MONTH_ZHI_GROUP[branches.month] : undefined;

  return {
    tianYi: { positions: tianYiPositions, branches: tianYiBranches },
    wenChang: wenChangTarget && wenChangPos
      ? { position: wenChangPos, branch: wenChangTarget }
      : null,
    yiMa: yiMaTarget && yiMaPos ? { position: yiMaPos, branch: yiMaTarget } : null,
    taoHua: taoHuaTarget && taoHuaPos ? { position: taoHuaPos, branch: taoHuaTarget } : null,
    huaGai: huaGaiTarget && huaGaiPos ? { position: huaGaiPos, branch: huaGaiTarget } : null,
    jiangXing: jiangXingTarget && jiangXingPos ? { position: jiangXingPos, branch: jiangXingTarget } : null,
    tianDe: findTargetHit(tianDeTarget, stems, branches),
    yueDe: findTargetHit(yueDeGan ? { kind: "gan", value: yueDeGan } : undefined, stems, branches),
  };
}
