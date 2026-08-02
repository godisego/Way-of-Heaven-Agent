/**
 * 八字排盘模块 —— 封装 lunar-javascript（1.7.7）。
 *
 * 严格按子平八字主流派（传统派）：
 *  1. 年柱：立春切年（getYearGanByLiChun / getYearZhiByLiChun）
 *  2. 月柱：节气切月（getMonthGanExact / getMonthZhiExact）
 *  3. 日柱：库内置
 *  4. 时柱：库内置。晚子时（23:00-24:00）流派可选：
 *     默认「日柱算当天」（ec.setSect(2)，库默认）；可选「日柱算次日」（setSect(1)）。
 *  5. 大运：ec.getYun(gender, sect)。第二参是**起运数流派**（1=按天，2=精确到分），
 *     顺逆方向由库内部按「阳年男/阴年女顺排、阴年男/阳年女逆排」自动判定（yun.isForward()）。
 *  6. 起运数：完整取 年/月/天 三段（yun.getStartYear/Month/Day），
 *     不再只取「年」段。3天=1年 与 1天=4个月 是同一规则的两种说法，不是两个流派。
 *  7. 神煞：天乙贵人 / 文昌 / 驿马 / 桃花 / 华盖 / 将星 / 天德 / 月德
 *  8. 胎元 / 命宫 / 身宫：派生计算
 *
 * ⚠️ 排盘结果用于「人格参考 / 命理讨论」，不替代专业命理师判断。
 */

import { Solar, Lunar, type EightChar, type Yun, type DaYun as LDaYun } from "lunar-javascript";
import {
  calculateShenSha,
  type ShenSha,
  type ShenShaConfig,
} from "./shenSha";
import { calculateMingGong, calculateShenGong, calculateTaiYuan } from "./mingGong";
import { applyCorrection, type SolarTimeResult } from "./solarTime";

export type WuXing = "金" | "木" | "水" | "火" | "土";
export type Gender = "male" | "female";
export type YinYang = "阳" | "阴";

const GAN_ORDER = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const ZHI_ORDER = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
type Gan = typeof GAN_ORDER[number];
type Zhi = typeof ZHI_ORDER[number];

const GAN_WUXING: Record<string, WuXing> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
const ZHI_WUXING: Record<string, WuXing> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};
const GAN_YINYANG: Record<string, YinYang> = {
  甲: "阳", 丙: "阳", 戊: "阳", 庚: "阳", 壬: "阳",
  乙: "阴", 丁: "阴", 己: "阴", 辛: "阴", 癸: "阴",
};

function ganWuXing(gan: string): WuXing {
  return GAN_WUXING[gan] ?? "土";
}
function zhiWuXing(zhi: string): WuXing {
  return ZHI_WUXING[zhi] ?? "土";
}

/** 五行相克（a 克 b） */
function wuXingKe(a: WuXing, b: WuXing): boolean {
  return (
    (a === "木" && b === "土") ||
    (a === "土" && b === "水") ||
    (a === "水" && b === "火") ||
    (a === "火" && b === "金") ||
    (a === "金" && b === "木")
  );
}
/** 五行相生（a 生 b） */
function wuXingSheng(a: WuXing, b: WuXing): boolean {
  return (
    (a === "木" && b === "火") ||
    (a === "火" && b === "土") ||
    (a === "土" && b === "金") ||
    (a === "金" && b === "水") ||
    (a === "水" && b === "木")
  );
}

/**
 * 十神查表（以日干为"我"）：
 *  - 同我同阴/阳 → 比肩
 *  - 同我异阴/阳 → 劫财
 *  - 我生同阴/阳 → 伤官；我生异 → 食神
 *  - 我克同阴/阳 → 偏财；我克异 → 正财
 *  - 克我同阴/阳 → 七杀；克我异 → 正官
 *  - 生我同阴/阳 → 偏印；生我异 → 正印
 */
export function shiShenOfGan(dayGan: string, otherGan: string): string {
  if (dayGan === otherGan) return "比肩";
  const dayWx = GAN_WUXING[dayGan];
  const otherWx = GAN_WUXING[otherGan];
  if (!dayWx || !otherWx) return "未知";
  const sameYy = GAN_YINYANG[dayGan] === GAN_YINYANG[otherGan];
  if (dayWx === otherWx) return sameYy ? "比肩" : "劫财";
  if (wuXingSheng(dayWx, otherWx)) return sameYy ? "伤官" : "食神";
  if (wuXingKe(dayWx, otherWx)) return sameYy ? "偏财" : "正财";
  if (wuXingKe(otherWx, dayWx)) return sameYy ? "七杀" : "正官";
  if (wuXingSheng(otherWx, dayWx)) return sameYy ? "偏印" : "正印";
  return "未知";
}

/** 一柱 */
export type BaziPillar = {
  gan: string;
  zhi: string;
  ganZhi: string;
  naYin: string;
  /** lunar.js 本柱五行（天干+地支两个单字），如 "金火" */
  wuXing: string;
  /** 天干五行（单字） */
  ganWuXing: WuXing;
  /** 地支五行（单字） */
  zhiWuXing: WuXing;
  /** 天干十神（相对日主） */
  shiShenGan: string;
  /** 藏干 */
  hideGan: string[];
  /** 藏干对应的十神（与 hideGan 一一对应） */
  zhiShiShen: string[];
  /** 旬空（地支空亡） */
  xunKong: string[];
};

export type DaYun = {
  /** 起运公历年 */
  startYear: number;
  /** 起运年龄 */
  startAge: number;
  /** 大运干支 */
  ganZhi: string;
};

/** 按公历年份找到实际正在运行的大运，而不是固定取第一步大运。 */
export function findDaYunForYear(
  daYun: DaYun[],
  year = new Date().getFullYear(),
): DaYun | null {
  return (
    daYun.find((item, index) => {
      const next = daYun[index + 1];
      return year >= item.startYear && (!next || year < next.startYear);
    }) ?? null
  );
}

/** 起运数计算流派：traditional=按天数折算（3天=1年）；exact=精确到分钟（lunar sect=2） */
export type QiYunConvention = "traditional" | "exact";

/** 晚子时（23:00-24:00 出生）日柱归属流派 */
export type LateZiRule = "current-day" | "next-day";

export type BaziResult = {
  solar: {
    /** 原始北京时间 */
    birthDate: string;
    birthTime: string;
    /** 真太阳时校正后的日期（无经度时同 birthDate） */
    correctedDate: string;
    /** 真太阳时校正后的时间 */
    correctedTime: string;
    /** 出生经度（东经，度） */
    longitude: number | null;
    /** 经度时差（分钟） */
    deltaMinutes: number;
    /** 是否跨日（-1/0/+1） */
    dayShift: -1 | 0 | 1;
  };
  bazi: {
    year: BaziPillar;
    month: BaziPillar;
    day: BaziPillar;
    time: BaziPillar;
  };
  dayMaster: string;
  dayMasterWuXing: WuXing;
  shengXiao: string;
  wuXingCount: Record<WuXing, number>;
  daYun: DaYun[];
  qiYun: {
    /** 出生后 X 年 */
    years: number;
    /** 又 X 个月 */
    months: number;
    /** 又 X 天 */
    days: number;
    /** 人话展示，如「出生后 3年4个月22天 起运」 */
    display: string;
    /** 起运虚岁（与第一步大运一致） */
    startAge: number;
    /** 计算流派 */
    convention: QiYunConvention;
  };
  /** 大运方向：true=顺排，false=逆排 */
  isForward: boolean;
  /** 小运（阳男阴女顺、阴男阳女逆，从时柱起） */
  xiaoYun: XiaoYun;
  /** 胎元 */
  taiYuan: { ganZhi: string; naYin: string };
  /** 命宫 */
  mingGong: { ganZhi: string; wuXing: WuXing };
  /** 身宫 */
  shenGong: { ganZhi: string; wuXing: WuXing };
  /** 神煞（按日干 / 年干 查） */
  shenSha: ShenSha;
  /** 一句话总结 */
  summary: string;
};

/**
 * lunar-javascript 的 getXunKong() 返回两字符字符串（如「戌亥」）。
 * 统一归一化为单字数组 ["戌","亥"]；兼容历史数据中可能存在的数组形态。
 */
function normalizeXunKong(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") return Array.from(raw.trim()).filter((ch) => ch.trim());
  return [];
}

function buildPillar(
  gan: string,
  zhi: string,
  naYin: string,
  wuXing: string,
  shiShenGan: string,
  hideGan: string[],
  xunKong: string[],
  dayGanForShiShen: string,
): BaziPillar {
  const zhiShiShen = hideGan.map((g) => shiShenOfGan(dayGanForShiShen, g));
  return {
    gan,
    zhi,
    ganZhi: gan + zhi,
    naYin,
    wuXing,
    ganWuXing: ganWuXing(gan),
    zhiWuXing: zhiWuXing(zhi),
    shiShenGan,
    hideGan,
    zhiShiShen,
    xunKong,
  };
}

function pillarFromExact(ec: EightChar, kind: "year" | "month" | "day" | "time", dayGanForShiShen: string): BaziPillar {
  // 注：EightChar 的 getYearGan / getMonthGan / getDayGan / getTimeGan
  // 默认已按立春 / 节气切（库内部处理）。
  // ⚠️ 必须用 ec.getXxx() 直接调用，不能先解构再调——库内部用 `this._p.lunar` 强依赖 this 绑定。
  let gan = "", zhi = "", naYin = "", wuXing = "", shiShenGan = "";
  let hideGan: string[] = [];
  let xunKong: string[] = [];
  if (kind === "year") {
    gan = ec.getYearGan();
    zhi = ec.getYearZhi();
    naYin = ec.getYearNaYin();
    wuXing = ec.getYearWuXing();
    shiShenGan = ec.getYearShiShenGan();
    hideGan = ec.getYearHideGan();
    xunKong = normalizeXunKong(ec.getYearXunKong());
  } else if (kind === "month") {
    gan = ec.getMonthGan();
    zhi = ec.getMonthZhi();
    naYin = ec.getMonthNaYin();
    wuXing = ec.getMonthWuXing();
    shiShenGan = ec.getMonthShiShenGan();
    hideGan = ec.getMonthHideGan();
    xunKong = normalizeXunKong(ec.getMonthXunKong());
  } else if (kind === "day") {
    gan = ec.getDayGan();
    zhi = ec.getDayZhi();
    naYin = ec.getDayNaYin();
    wuXing = ec.getDayWuXing();
    shiShenGan = ec.getDayShiShenGan();
    hideGan = ec.getDayHideGan();
    xunKong = normalizeXunKong(ec.getDayXunKong());
  } else {
    gan = ec.getTimeGan();
    zhi = ec.getTimeZhi();
    naYin = ec.getTimeNaYin();
    wuXing = ec.getTimeWuXing();
    shiShenGan = ec.getTimeShiShenGan();
    hideGan = ec.getTimeHideGan();
    xunKong = normalizeXunKong(ec.getTimeXunKong());
  }
  return buildPillar(gan, zhi, naYin, wuXing, shiShenGan, hideGan, xunKong, dayGanForShiShen);
}

/** 小运推算：阳男阴女从时柱起顺、阴男阳女从时柱起逆，每年一步。 */
export type XiaoYun = {
  direction: "顺排" | "逆排";
  /** 起柱（时柱） */
  startGanZhi: string;
  /** 1~10 虚岁的小运干支 */
  steps: Array<{ age: number; ganZhi: string }>;
};

function calculateXiaoYun(
  timeGanZhi: string,
  isYangYear: boolean,
  gender: Gender,
): XiaoYun {
  const isForward =
    (isYangYear && gender === "male") ||
    (!isYangYear && gender === "female");
  const startGan = timeGanZhi[0];
  const startZhi = timeGanZhi[1];
  const startGanIdx = GAN_ORDER.indexOf(startGan as Gan);
  const startZhiIdx = ZHI_ORDER.indexOf(startZhi as Zhi);
  const direction: 1 | -1 = isForward ? 1 : -1;
  const steps: Array<{ age: number; ganZhi: string }> = [];
  for (let i = 0; i < 10; i++) {
    const offset = i * direction;
    const gan = GAN_ORDER[((startGanIdx + offset) % 10 + 10) % 10];
    const zhi = ZHI_ORDER[((startZhiIdx + offset) % 12 + 12) % 12];
    steps.push({ age: i + 1, ganZhi: gan + zhi });
  }
  return {
    direction: isForward ? "顺排" : "逆排",
    startGanZhi: timeGanZhi,
    steps,
  };
}

export function calculateBazi(opts: {
  birthDate: string;
  birthTime: string;
  gender: Gender;
  /** 起运数计算流派，默认 traditional（按天折算）；exact 精确到分钟 */
  qiYunConvention?: QiYunConvention;
  /** 晚子时日柱归属，默认 current-day（算当天，库默认流派） */
  lateZiRule?: LateZiRule;
  /** 出生经度（东经度数）。提供则做真太阳时校正。 */
  birthLongitude?: number;
}): BaziResult {
  // ── 真太阳时校正（如果有经度）──
  let actualDate = opts.birthDate;
  let actualTime = opts.birthTime;
  let solarTime: SolarTimeResult | null = null;
  if (opts.birthLongitude !== undefined && opts.birthLongitude !== null) {
    const corrected = applyCorrection(opts.birthDate, opts.birthTime, opts.birthLongitude);
    actualDate = corrected.birthDate;
    actualTime = corrected.birthTime;
    solarTime = corrected.result;
  }

  const [y, m, d] = actualDate.split("-").map(Number);
  const [hh, mm] = actualTime.split(":").map(Number);

  const solar = Solar.fromYmdHms(y, m, d, hh, mm, 0);
  const lunar: Lunar = solar.getLunar();
  const ec: EightChar = lunar.getEightChar();
  // 晚子时流派显式化：2=日柱算当天（默认），1=日柱算次日
  ec.setSect(opts.lateZiRule === "next-day" ? 1 : 2);

  // ── 严格按子平主流派：年柱用立春、月柱用节气 ──
  // 先取日柱（地支十神算相对日主）
  const dayPillarFirst = pillarFromExact(ec, "day", "甲");
  const dayGan = dayPillarFirst.gan;
  const yearPillar = pillarFromExact(ec, "year", dayGan);
  const monthPillar = pillarFromExact(ec, "month", dayGan);
  const dayPillar = pillarFromExact(ec, "day", dayGan);
  const timePillar = pillarFromExact(ec, "time", dayGan);

  // ── 大运与起运 ──
  // getYun(gender, sect)：gender 1=男 0=女；sect 是**起运数流派**（1=按天折算，2=精确到分）。
  // 顺逆方向由库内部按「阳年男/阴年女顺、阴年男/阳年女逆」自动判定，不由参数控制。
  const convention: QiYunConvention = opts.qiYunConvention ?? "traditional";
  const genderCode = opts.gender === "male" ? 1 : 0;
  const sectCode = convention === "exact" ? 2 : 1;

  const yun: Yun = ec.getYun(genderCode, sectCode);
  const isForward = yun.isForward();
  // 小运方向沿用同一规则，需要年干阴阳（立春切年）
  const yearGanIndexByLiChun = lunar.getYearGanIndexByLiChun();
  const isYangYear = yearGanIndexByLiChun % 2 === 0;

  const daYunRaw: LDaYun[] = yun.getDaYun();
  const daYun: DaYun[] = [];
  for (const d of daYunRaw) {
    const gz = d.getGanZhi();
    if (!gz) continue; // 占位
    daYun.push({
      startYear: d.getStartYear(),
      startAge: d.getStartAge(),
      ganZhi: gz,
    });
    if (daYun.length >= 8) break;
  }

  // ── 起运数：完整取 年/月/天（此前只取了「年」段，是 bug）──
  const qiYunYears = yun.getStartYear();
  const qiYunMonths = yun.getStartMonth();
  const qiYunDays = yun.getStartDay();
  const qiYunParts: string[] = [];
  if (qiYunYears > 0) qiYunParts.push(`${qiYunYears}年`);
  if (qiYunMonths > 0) qiYunParts.push(`${qiYunMonths}个月`);
  if (qiYunDays > 0) qiYunParts.push(`${qiYunDays}天`);
  const qiYunDisplay = `出生后 ${qiYunParts.length ? qiYunParts.join("") : "不足1天"} 起运`;
  const qiYunStartAge = daYun[0]?.startAge ?? qiYunYears + 1;

  // ── 五行统计（每柱天干 + 地支 各计 1，共 8 项）──
  const wuXingCount: Record<WuXing, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  [yearPillar, monthPillar, dayPillar, timePillar].forEach((p) => {
    wuXingCount[p.ganWuXing]++;
    wuXingCount[p.zhiWuXing]++;
  });

  // ── 胎元 / 命宫 / 身宫 ──
  const monthGan = monthPillar.gan;
  const monthZhi = monthPillar.zhi;
  const timeZhi = timePillar.zhi;

  const taiYuanGanZhi = calculateTaiYuan(monthGan, monthZhi);
  const mingGongResult = calculateMingGong(monthZhi, timeZhi);
  const shenGongResult = calculateShenGong(monthZhi, timeZhi);

  // ── 神煞 ──
  const shenShaConfig: ShenShaConfig = {
    dayMaster: dayPillar.gan,
    yearGan: yearPillar.gan,
    yearZhi: yearPillar.zhi,
    monthZhi: monthPillar.zhi,
    dayZhi: dayPillar.zhi,
    timeZhi: timePillar.zhi,
  };
  const shenSha = calculateShenSha(shenShaConfig);

  // ── 派生字段 ──
  const dayMaster = dayPillar.gan;
  const dayMasterWuXing = ganWuXing(dayMaster);
  const shengXiao = lunar.getYearShengXiaoByLiChun();

  // 胎元纳音：lunar-javascript 提供
  const taiYuanNaYin = ec.getTaiYuanNaYin();

  // ── 小运 ──
  const xiaoYun = calculateXiaoYun(timePillar.ganZhi, isYangYear, opts.gender);

  const summary =
    `日主${dayMaster}（${dayMasterWuXing}），生于${yearPillar.ganZhi}年（${shengXiao}，立春切年），` +
    `月支${monthZhi}（节气切月）。四柱 ${yearPillar.ganZhi} ${monthPillar.ganZhi} ${dayPillar.ganZhi} ${timePillar.ganZhi}。` +
    `${qiYunDisplay}（虚岁 ${qiYunStartAge} 岁上运），大运${isForward ? "顺" : "逆"}排：${daYun.slice(0, 3).map((d) => d.ganZhi).join("、")}…。` +
    `小运${xiaoYun.direction}：1 岁 ${xiaoYun.steps[0].ganZhi}、2 岁 ${xiaoYun.steps[1].ganZhi}…`;

  return {
    solar: {
      birthDate: opts.birthDate,
      birthTime: opts.birthTime,
      correctedDate: actualDate,
      correctedTime: actualTime,
      longitude: opts.birthLongitude ?? null,
      deltaMinutes: solarTime?.deltaMinutes ?? 0,
      dayShift: solarTime?.dayShift ?? 0,
    },
    bazi: { year: yearPillar, month: monthPillar, day: dayPillar, time: timePillar },
    dayMaster,
    dayMasterWuXing,
    shengXiao,
    wuXingCount,
    daYun,
    qiYun: {
      years: qiYunYears,
      months: qiYunMonths,
      days: qiYunDays,
      display: qiYunDisplay,
      startAge: qiYunStartAge,
      convention,
    },
    isForward,
    xiaoYun,
    taiYuan: { ganZhi: taiYuanGanZhi, naYin: taiYuanNaYin },
    mingGong: mingGongResult,
    shenGong: shenGongResult,
    shenSha,
    summary,
  };
}
