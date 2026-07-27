/**
 * 真太阳时校正 = 经度校正 + 均时差（Equation of Time）。
 *
 * 1) 经度校正（分钟）= (出生地经度 - 120) × 4
 *    北京时间以东经 120° 为基准，每偏 1° 差 4 分钟。
 * 2) 均时差 EOT（分钟）：地球公转轨道偏心与黄赤交角造成的
 *    「钟表太阳」与「真实太阳」之差，一年内约在 -14 ~ +16 分钟间摆动。
 *    采用常用近似公式（误差 < 1 分钟）：
 *      B = 2π × (N - 81) / 364   （N 为一年中的第几天）
 *      EOT = 9.87·sin(2B) − 7.53·cos(B) − 1.5·sin(B)
 *
 * 真太阳时 = 北京时间 + 经度校正 + EOT。
 *
 * 命理上使用真太阳时的意义：时柱按「太阳真实位置」定。
 * 出生时刻卡在时辰边界（奇数整点前后）时，校正与否可能差一个时柱。
 */

export type SolarTimeResult = {
  /** 校正前北京时间 HH:MM */
  originalTime: string;
  /** 校正后真太阳时 HH:MM */
  correctedTime: string;
  /** 总时差（分钟，四舍五入）= 经度校正 + 均时差 */
  deltaMinutes: number;
  /** 经度校正分量（分钟，1 位小数） */
  longitudeDeltaMinutes: number;
  /** 均时差分量（分钟，1 位小数） */
  eotMinutes: number;
  /** 是否跨日（校正后日期 ±1） */
  dayShift: -1 | 0 | 1;
};

/** 一年中的第几天（1 起算），按公历平/闰年 */
function dayOfYear(y: number, m: number, d: number): number {
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return cum[m - 1] + d + (leap && m > 2 ? 1 : 0);
}

/** 均时差（分钟，正=真太阳快于钟表） */
export function equationOfTime(y: number, m: number, d: number): number {
  const n = dayOfYear(y, m, d);
  const b = (2 * Math.PI * (n - 81)) / 364;
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  return Math.round(eot * 10) / 10;
}

export function correctSolarTime(
  birthDate: string,
  birthTime: string,
  longitude: number,
): SolarTimeResult {
  const [y, mo, d] = birthDate.split("-").map(Number);
  const [hh, mm] = birthTime.split(":").map(Number);
  const totalMin = hh * 60 + mm;

  const lonDelta = Math.round((longitude - 120) * 4 * 10) / 10;
  const eot = equationOfTime(y, mo, d);
  const delta = Math.round(lonDelta + eot);

  let correctedMin = totalMin + delta;
  let dayShift: -1 | 0 | 1 = 0;
  if (correctedMin < 0) {
    correctedMin += 24 * 60;
    dayShift = -1;
  } else if (correctedMin >= 24 * 60) {
    correctedMin -= 24 * 60;
    dayShift = 1;
  }
  const ch = Math.floor(correctedMin / 60);
  const cm = correctedMin % 60;
  return {
    originalTime: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
    correctedTime: `${String(ch).padStart(2, "0")}:${String(cm).padStart(2, "0")}`,
    deltaMinutes: delta,
    longitudeDeltaMinutes: lonDelta,
    eotMinutes: eot,
    dayShift,
  };
}

/** 真太阳时校正后得到新的 birthDate / birthTime */
export function applyCorrection(
  birthDate: string,
  birthTime: string,
  longitude: number,
): { birthDate: string; birthTime: string; result: SolarTimeResult } {
  const result = correctSolarTime(birthDate, birthTime, longitude);
  if (result.dayShift === 0) {
    return { birthDate, birthTime: result.correctedTime, result };
  }
  // 跨日：日期 +/- 1
  const d = new Date(birthDate + "T00:00:00");
  d.setDate(d.getDate() + result.dayShift);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return {
    birthDate: `${y}-${m}-${day}`,
    birthTime: result.correctedTime,
    result,
  };
}
