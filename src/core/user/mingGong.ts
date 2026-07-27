/**
 * 胎元 / 命宫 / 身宫计算。
 *
 * - 胎元：月柱天干进一位 + 地支进三位。
 * - 命宫：按月支 + 时支查表（子上起正月，顺数到时支）。
 * - 身宫：按月支 + 时支查表（与命宫同表不同起算）。
 */

import { Solar } from "lunar-javascript";

const ZHI_ORDER = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const GAN_ORDER = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
type Zhi = typeof ZHI_ORDER[number];

const ZHI_WUXING: Record<Zhi, "金" | "木" | "水" | "火" | "土"> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};

/** 胎元：月柱天干进一位 + 地支进三位。例：壬午 → 癸酉 */
export function calculateTaiYuan(monthGan: string, monthZhi: string): string {
  const ganIdx = GAN_ORDER.indexOf(monthGan as typeof GAN_ORDER[number]);
  const zhiIdx = ZHI_ORDER.indexOf(monthZhi as Zhi);
  const nextGan = GAN_ORDER[(ganIdx + 1) % 10];
  const nextZhi = ZHI_ORDER[(zhiIdx + 3) % 12];
  return nextGan + nextZhi;
}

/**
 * 命宫 / 身宫查表（行=月支，列=时支，值=该地支）。
 * 来源：传统命理"子上起正月"算法。
 */
const MINGGONG_TABLE: Record<Zhi, Record<Zhi, Zhi>> = {
  寅: { 子: "丑", 丑: "子", 寅: "亥", 卯: "戌", 辰: "酉", 巳: "申", 午: "未", 未: "午", 申: "巳", 酉: "辰", 戌: "卯", 亥: "寅" },
  卯: { 子: "子", 丑: "亥", 寅: "戌", 卯: "酉", 辰: "申", 巳: "未", 午: "午", 未: "巳", 申: "辰", 酉: "卯", 戌: "寅", 亥: "丑" },
  辰: { 子: "亥", 丑: "戌", 寅: "酉", 卯: "申", 辰: "未", 巳: "午", 午: "巳", 未: "辰", 申: "卯", 酉: "寅", 戌: "丑", 亥: "子" },
  巳: { 子: "戌", 丑: "酉", 寅: "申", 卯: "未", 辰: "午", 巳: "巳", 午: "辰", 未: "卯", 申: "寅", 酉: "丑", 戌: "子", 亥: "亥" },
  午: { 子: "酉", 丑: "申", 寅: "未", 卯: "午", 辰: "巳", 巳: "辰", 午: "卯", 未: "寅", 申: "丑", 酉: "子", 戌: "亥", 亥: "戌" },
  未: { 子: "申", 丑: "未", 寅: "午", 卯: "巳", 辰: "辰", 巳: "卯", 午: "寅", 未: "丑", 申: "子", 酉: "亥", 戌: "戌", 亥: "酉" },
  申: { 子: "未", 丑: "午", 寅: "巳", 卯: "辰", 辰: "卯", 巳: "寅", 午: "丑", 未: "子", 申: "亥", 酉: "戌", 戌: "酉", 亥: "申" },
  酉: { 子: "午", 丑: "巳", 寅: "辰", 卯: "卯", 辰: "寅", 巳: "丑", 午: "子", 未: "亥", 申: "戌", 酉: "酉", 戌: "申", 亥: "未" },
  戌: { 子: "巳", 丑: "辰", 寅: "卯", 卯: "寅", 辰: "丑", 巳: "子", 午: "亥", 未: "戌", 申: "酉", 酉: "申", 戌: "未", 亥: "午" },
  亥: { 子: "辰", 丑: "卯", 寅: "寅", 卯: "丑", 辰: "子", 巳: "亥", 午: "戌", 未: "酉", 申: "申", 酉: "未", 戌: "午", 亥: "巳" },
  子: { 子: "卯", 丑: "寅", 寅: "丑", 卯: "子", 辰: "亥", 巳: "戌", 午: "酉", 未: "申", 申: "未", 酉: "午", 戌: "巳", 亥: "辰" },
  丑: { 子: "寅", 丑: "丑", 寅: "子", 卯: "亥", 辰: "戌", 巳: "酉", 午: "申", 未: "未", 申: "午", 酉: "巳", 戌: "辰", 亥: "卯" },
};

/**
 * 身宫：永远在生月后第 5 个月。
 * 算法：身宫地支 = 月支顺数 5 位。
 * 例：寅月（1月）→ 身宫在申（6月）。午月（5月）→ 身宫在亥（10月）。
 */
const SHENGONG_OFFSET = 5;

export function calculateMingGong(monthZhi: string, timeZhi: string) {
  const zhi = MINGGONG_TABLE[monthZhi as Zhi]?.[timeZhi as Zhi] ?? "子";
  return { ganZhi: zhi, wuXing: ZHI_WUXING[zhi] };
}

export function calculateShenGong(monthZhi: string, _timeZhi: string) {
  const idx = ZHI_ORDER.indexOf(monthZhi as Zhi);
  const shenIdx = (idx + SHENGONG_OFFSET) % 12;
  const shenZhi = ZHI_ORDER[shenIdx];
  return { ganZhi: shenZhi, wuXing: ZHI_WUXING[shenZhi] };
}
