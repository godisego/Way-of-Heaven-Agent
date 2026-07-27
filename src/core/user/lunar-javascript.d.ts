declare module "lunar-javascript" {
  // ── Solar（阳历） ──────────────────────────────────────
  export class Solar {
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): Solar;
    getLunar(): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
  }

  // ── Lunar（农历） ──────────────────────────────────────
  export class Lunar {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getYearInGanZhi(): string;
    getMonthInGanZhi(): string;
    getDayInGanZhi(): string;
    getTimeInGanZhi(): string;
    getYearShengXiao(): string;
    getYearShengXiaoByLiChun(): string;
    getYearShengXiaoExact(): string;
    getYearGanIndexByLiChun(): number;
    getYearGanIndexExact(): number;
    getYearZhiIndexExact(): number;
    getYearInGanZhiByLiChun(): string;
    getYearInGanZhiExact(): string;
    getMonthInGanZhiExact(): string;
    getYearNaYin(): string;
    getYearWuXing(): string;
    getYearGan(): string;
    getYearGanExact(): string;
    getYearZhi(): string;
    getYearZhiExact(): string;
    getMonthGan(): string;
    getMonthGanExact(): string;
    getMonthZhi(): string;
    getMonthZhiExact(): string;
    getDayGan(): string;
    getDayGanExact(): string;
    getDayZhi(): string;
    getDayZhiExact(): string;
    getTimeGan(): string;
    getTimeGanExact(): string;
    getTimeZhi(): string;
    getTimeZhiExact(): string;
    getTimeInGanZhiExact(): string;
    getEightChar(): EightChar;
    getJieQiTable(): Record<string, { _p: { year: number; month: number; day: number; hour: number; minute: number; second: number } }>;
  }

  // ── EightChar（四柱八字） ─────────────────────────────
  // 注：getYearGan / getMonthGan / getDayGan / getTimeGan 默认按立春 / 节气切
  export class EightChar {
    getYear(): number;
    getYearGan(): string;
    getYearZhi(): string;
    getYearHideGan(): string[];
    getYearWuXing(): string;
    getYearNaYin(): string;
    getYearShiShenGan(): string;
    getYearShiShenZhi(): string[];
    getYearDiShi(): string;
    getYearXun(): string;
    /** ⚠️ 实际返回两字符字符串（如「戌亥」），非数组 */
    getYearXunKong(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getMonthHideGan(): string[];
    getMonthWuXing(): string;
    getMonthNaYin(): string;
    getMonthShiShenGan(): string;
    getMonthShiShenZhi(): string[];
    getMonthDiShi(): string;
    getMonthXun(): string;
    /** ⚠️ 实际返回两字符字符串（如「戌亥」），非数组 */
    getMonthXunKong(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getDayHideGan(): string[];
    getDayWuXing(): string;
    getDayNaYin(): string;
    getDayShiShenGan(): string;
    getDayShiShenZhi(): string[];
    getDayDiShi(): string;
    getDayXun(): string;
    /** ⚠️ 实际返回两字符字符串（如「戌亥」），非数组 */
    getDayXunKong(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getTimeHideGan(): string[];
    getTimeWuXing(): string;
    getTimeNaYin(): string;
    getTimeShiShenGan(): string;
    getTimeShiShenZhi(): string[];
    getTimeDiShi(): string;
    getTimeXun(): string;
    /** ⚠️ 实际返回两字符字符串（如「戌亥」），非数组 */
    getTimeXunKong(): string;
    getTaiYuan(): string;
    getTaiYuanNaYin(): string;
    getMingGong(): string;
    getShenGong(): string;
    /** 晚子时日柱流派：1=算次日，2=算当天（库默认） */
    setSect(sect: 1 | 2): void;
    /** gender: 1=男 0=女；sect 为起运数流派：1=按天折算（默认），2=精确到分钟 */
    getYun(gender: 0 | 1, sect?: 1 | 2): Yun;
  }

  // ── Yun（大运） ────────────────────────────────────────
  export class Yun {
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getStartHour(): number;
    isForward(): boolean;
    getDaYun(): DaYun[];
  }

  export class DaYun {
    getStartYear(): number;
    getStartAge(): number;
    getGanZhi(): string;
  }
}
