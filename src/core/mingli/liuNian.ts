/**
 * 流年干支计算（确定性）。
 *
 * 公式：公元年份 Y 的干支 = 天干[(Y-4) mod 10] + 地支[(Y-4) mod 12]
 * （公元 4 年为甲子年）。
 *
 * ⚠️ 流年以立春为界：立春（约每年 2 月 3-5 日）之前仍属上一年干支。
 * 本模块用「2 月 4 日」作近似界（误差最多 1 天，UI 有说明文案）；
 * 排盘四柱本身仍由 lunar-javascript 按精确节气计算，不受此近似影响。
 */

const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

/** 某公历年的流年干支（立春后口径） */
export function liuNianGanZhi(year: number): string {
  const g = GAN[(((year - 4) % 10) + 10) % 10];
  const z = ZHI[(((year - 4) % 12) + 12) % 12];
  return g + z;
}

/** 给定日期所处的流年年份（近似立春界：2 月 4 日前属上一年） */
export function liuNianYearOf(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 1 || (m === 2 && d < 4)) return y - 1;
  return y;
}

/** 当前流年：{ year, ganZhi } */
export function currentLiuNian(now: Date = new Date()): { year: number; ganZhi: string } {
  const year = liuNianYearOf(now);
  return { year, ganZhi: liuNianGanZhi(year) };
}
