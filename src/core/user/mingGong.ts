/**
 * 胎元 / 命宫 / 身宫：节气月支口径，子=0…亥=11。
 * 命宫：子起正月逆查行，生月支上起生时，顺查至卯。
 * 身宫：子起正月顺查行，生月支上起生时，逆推至酉。
 * “逆推”指宫位逆行，时辰标签仍按子丑寅…前进，不能把两者同时倒转。
 * 宫干按出生年干五虎遁；wuXing 是宫支五行，不是纳音。
 * 推导、来源与区别见 docs/bazi-palace-rules.md。
 */
const ZHI_ORDER = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const GAN_ORDER = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
type Zhi = typeof ZHI_ORDER[number];
type Gan = typeof GAN_ORDER[number];

const ZHI_WUXING: Record<Zhi, "金" | "木" | "水" | "火" | "土"> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};
export type PalaceResult = { gan: Gan; zhi: Zhi; ganZhi: string; wuXing: typeof ZHI_WUXING[Zhi] };
const mod = (n: number, base: number) => ((n % base) + base) % base;

function indexOf(value: string, order: readonly string[]): number {
  const index = order.indexOf(value);
  if (index < 0) throw new Error(`无效干支：${value}`);
  return index;
}

/** 胎元：月柱天干进一位 + 地支进三位。例：壬午 → 癸酉 */
export function calculateTaiYuan(monthGan: string, monthZhi: string): string {
  return GAN_ORDER[(indexOf(monthGan, GAN_ORDER) + 1) % 10]
    + ZHI_ORDER[(indexOf(monthZhi, ZHI_ORDER) + 3) % 12];
}

function palaceOf(yearGan: string, zhiIndex: number): PalaceResult {
  // 甲己丙寅、乙庚戊寅、丙辛庚寅、丁壬壬寅、戊癸甲寅；从寅顺排至宫支。
  const yinGanIndex = (indexOf(yearGan, GAN_ORDER) % 5 * 2 + 2) % 10;
  const zhi = ZHI_ORDER[mod(zhiIndex, 12)];
  const gan = GAN_ORDER[(yinGanIndex + mod(zhiIndex - 2, 12)) % 10];
  return { gan, zhi, ganZhi: gan + zhi, wuXing: ZHI_WUXING[zhi] };
}

export function calculateMingGong(yearGan: string, monthZhi: string, timeZhi: string): PalaceResult {
  const month = indexOf(monthZhi, ZHI_ORDER);
  const time = indexOf(timeZhi, ZHI_ORDER);
  return palaceOf(yearGan, mod(5 - month - time, 12));
}

export function calculateShenGong(yearGan: string, monthZhi: string, timeZhi: string): PalaceResult {
  const month = indexOf(monthZhi, ZHI_ORDER);
  const time = indexOf(timeZhi, ZHI_ORDER);
  return palaceOf(yearGan, mod(month + time + 1, 12));
}
