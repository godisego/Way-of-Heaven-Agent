import { describe, expect, it } from "vitest";
import { Solar } from "lunar-javascript";
import { calculateBazi, findDaYunForYear, shiShenOfGan, type DaYun } from "./baziCalculator";
import { correctSolarTime, equationOfTime } from "./solarTime";

describe("十神规则与教材回归", () => {
  it("我生同阴阳为食神，异阴阳为伤官", () => {
    expect(shiShenOfGan("甲", "丙")).toBe("食神");
    expect(shiShenOfGan("甲", "丁")).toBe("伤官");
    expect(shiShenOfGan("乙", "丁")).toBe("食神");
    expect(shiShenOfGan("乙", "丙")).toBe("伤官");
  });

  it("十日主乘十天干的 100 种映射均与 lunar 独立查表一致", () => {
    const covered = new Set<string>();
    // 连续十天遍历十日干；每一天的十二时辰遍历十种时干。
    for (let day = 10; day < 20; day++) {
      for (let hour = 0; hour < 24; hour += 2) {
        const ec = Solar.fromYmdHms(2000, 6, day, hour, 0, 0).getLunar().getEightChar();
        const pair = ec.getDayGan() + ec.getTimeGan();
        covered.add(pair);
        expect(shiShenOfGan(ec.getDayGan(), ec.getTimeGan()), pair).toBe(ec.getTimeShiShenGan());
      }
    }
    expect(covered.size).toBe(100);
  });

  it.each(["current-day", "next-day"] as const)("%s：外显与藏干沿用同一日主且与依赖结果一致", (lateZiRule) => {
    for (let day = 10; day < 20; day++) {
      const r = calculateBazi({ birthDate: `2000-06-${day}`, birthTime: "23:30", gender: "male", lateZiRule });
      const ec = Solar.fromYmdHms(2000, 6, day, 23, 30, 0).getLunar().getEightChar();
      ec.setSect(lateZiRule === "next-day" ? 1 : 2);
      const hidden = [ec.getYearShiShenZhi(), ec.getMonthShiShenZhi(), ec.getDayShiShenZhi(), ec.getTimeShiShenZhi()];
      const pillars = [r.bazi.year, r.bazi.month, r.bazi.day, r.bazi.time];
      pillars.forEach((pillar, index) => {
        expect(pillar.zhiShiShen).toEqual(hidden[index]);
        expect(pillar.zhiShiShen).toEqual(pillar.hideGan.map((gan) => shiShenOfGan(r.dayMaster, gan)));
        if (index !== 2) expect(pillar.shiShenGan).toBe(shiShenOfGan(r.dayMaster, pillar.gan));
      });
    }
  });

  it("统一毕业案例可复算，透丙与寅藏丙都为食神", () => {
    const r = calculateBazi({ birthDate: "1985-02-14", birthTime: "04:00", gender: "male", lateZiRule: "current-day", qiYunConvention: "traditional" });
    expect([r.bazi.year, r.bazi.month, r.bazi.day, r.bazi.time].map((p) => p.ganZhi)).toEqual(["乙丑", "戊寅", "甲申", "丙寅"]);
    expect(r.bazi.time.shiShenGan).toBe("食神");
    expect(r.bazi.month.zhiShiShen).toEqual(["比肩", "食神", "偏财"]);
    expect(r.isForward).toBe(false);
    expect(r.qiYun).toMatchObject({ years: 3, months: 3, days: 20, startAge: 4 });
    expect(findDaYunForYear(r.daYun, 2026)?.ganZhi).toBe("甲戌");
  });
});

describe("findDaYunForYear", () => {
  const daYun: DaYun[] = [
    { startYear: 1998, startAge: 9, ganZhi: "乙亥" },
    { startYear: 2008, startAge: 19, ganZhi: "甲戌" },
    { startYear: 2018, startAge: 29, ganZhi: "癸酉" },
    { startYear: 2028, startAge: 39, ganZhi: "壬申" },
  ];

  it("按当前年份选择所在的大运区间", () => {
    expect(findDaYunForYear(daYun, 2026)?.ganZhi).toBe("癸酉");
  });

  it("起运前返回 null", () => {
    expect(findDaYunForYear(daYun, 1990)).toBeNull();
  });
});

describe("大运顺逆（阳年男/阴年女顺排，阴年男/阳年女逆排）", () => {
  // 1990 庚午年（阳年）；1991 辛未年（阴年）。日期取年中，远离立春边界。
  it("阳年男顺排", () => {
    const r = calculateBazi({ birthDate: "1990-06-15", birthTime: "10:00", gender: "male" });
    expect(r.isForward).toBe(true);
  });
  it("阳年女逆排", () => {
    const r = calculateBazi({ birthDate: "1990-06-15", birthTime: "10:00", gender: "female" });
    expect(r.isForward).toBe(false);
  });
  it("阴年男逆排", () => {
    const r = calculateBazi({ birthDate: "1991-06-15", birthTime: "10:00", gender: "male" });
    expect(r.isForward).toBe(false);
  });
  it("阴年女顺排", () => {
    const r = calculateBazi({ birthDate: "1991-06-15", birthTime: "10:00", gender: "female" });
    expect(r.isForward).toBe(true);
  });
  it("小运方向与大运方向一致", () => {
    const r = calculateBazi({ birthDate: "1990-06-15", birthTime: "10:00", gender: "male" });
    expect(r.xiaoYun.direction).toBe(r.isForward ? "顺排" : "逆排");
  });
});

describe("起运数（修复：完整取 年/月/天，不再只取年段）", () => {
  const r = calculateBazi({ birthDate: "1995-08-14", birthTime: "04:30", gender: "male" });

  it("年月日分量均为非负整数", () => {
    for (const v of [r.qiYun.years, r.qiYun.months, r.qiYun.days]) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
    expect(r.qiYun.months).toBeLessThan(12);
    expect(r.qiYun.days).toBeLessThan(32);
  });

  it("display 为人话格式", () => {
    expect(r.qiYun.display).toMatch(/^出生后 .+ 起运$/);
  });

  it("起运虚岁与第一步大运一致", () => {
    expect(r.qiYun.startAge).toBe(r.daYun[0].startAge);
  });

  it("大运每步间隔 10 年", () => {
    for (let i = 1; i < r.daYun.length; i++) {
      expect(r.daYun[i].startYear - r.daYun[i - 1].startYear).toBe(10);
      expect(r.daYun[i].startAge - r.daYun[i - 1].startAge).toBe(10);
    }
  });

  it("exact 流派可计算且方向一致", () => {
    const e = calculateBazi({
      birthDate: "1995-08-14",
      birthTime: "04:30",
      gender: "male",
      qiYunConvention: "exact",
    });
    expect(e.qiYun.convention).toBe("exact");
    expect(e.isForward).toBe(r.isForward);
    expect(e.daYun.length).toBeGreaterThan(0);
  });
});

describe("晚子时流派（23:00-24:00 出生的日柱归属）", () => {
  const opts = { birthTime: "23:30", gender: "male" as const };

  it("current-day：日柱与当天白天相同", () => {
    const lateZi = calculateBazi({ birthDate: "1995-08-14", ...opts, lateZiRule: "current-day" });
    const sameDayNoon = calculateBazi({ birthDate: "1995-08-14", birthTime: "12:00", gender: "male" });
    expect(lateZi.bazi.day.ganZhi).toBe(sameDayNoon.bazi.day.ganZhi);
  });

  it("next-day：日柱与次日凌晨相同", () => {
    const lateZi = calculateBazi({ birthDate: "1995-08-14", ...opts, lateZiRule: "next-day" });
    const nextDayEarly = calculateBazi({ birthDate: "1995-08-15", birthTime: "00:30", gender: "male" });
    expect(lateZi.bazi.day.ganZhi).toBe(nextDayEarly.bazi.day.ganZhi);
  });

  it("两种流派的时柱地支都是子", () => {
    const a = calculateBazi({ birthDate: "1995-08-14", ...opts, lateZiRule: "current-day" });
    const b = calculateBazi({ birthDate: "1995-08-14", ...opts, lateZiRule: "next-day" });
    expect(a.bazi.time.zhi).toBe("子");
    expect(b.bazi.time.zhi).toBe("子");
  });
});

describe("旬空归一化（lunar 返回字符串「戌亥」，须转单字数组）", () => {
  const r = calculateBazi({ birthDate: "1995-08-14", birthTime: "04:30", gender: "male" });

  it("四柱旬空均为单字数组（每旬空两支）", () => {
    for (const key of ["year", "month", "day", "time"] as const) {
      const xk = r.bazi[key].xunKong;
      expect(Array.isArray(xk), `${key} 应为数组`).toBe(true);
      expect(xk).toHaveLength(2);
      for (const ch of xk) expect(ch).toHaveLength(1);
    }
  });
});

describe("真太阳时（经度校正 + 均时差）", () => {
  it("东经 120° 时总时差即均时差", () => {
    const r = correctSolarTime("2000-06-01", "12:00", 120);
    expect(r.longitudeDeltaMinutes).toBe(0);
    expect(r.deltaMinutes).toBe(Math.round(r.eotMinutes));
  });

  it("均时差全年在 -15 ~ +17 分钟内", () => {
    for (let m = 1; m <= 12; m++) {
      const eot = equationOfTime(2001, m, 15);
      expect(eot).toBeGreaterThan(-15);
      expect(eot).toBeLessThan(17);
    }
  });

  it("2 月中旬均时差为明显负值，11 月初为明显正值", () => {
    expect(equationOfTime(2001, 2, 12)).toBeLessThan(-9);
    expect(equationOfTime(2001, 11, 3)).toBeGreaterThan(11);
  });

  it("乌鲁木齐大幅西偏可跨日", () => {
    const r = correctSolarTime("2000-03-15", "01:00", 87.6);
    expect(r.dayShift).toBe(-1);
  });

  it("总时差 = 经度分量 + 均时差（四舍五入）", () => {
    const r = correctSolarTime("2000-09-10", "10:00", 116.4);
    expect(r.deltaMinutes).toBe(Math.round(r.longitudeDeltaMinutes + r.eotMinutes));
  });
});

describe("命身宫与二德 · 真实排盘回归", () => {
  it("1995-08-14 04:30：申月寅时得癸未命宫、丁亥身宫，未见癸不报天德", () => {
    const r = calculateBazi({ birthDate: "1995-08-14", birthTime: "04:30", gender: "male" });
    expect(Object.values(r.bazi).map((p) => p.ganZhi)).toEqual(["乙亥", "甲申", "丁丑", "壬寅"]);
    expect(r.mingGong.ganZhi).toBe("癸未");
    expect(r.shenGong.ganZhi).toBe("丁亥");
    expect(r.shenSha.tianDe).toBeNull();
    expect(r.shenSha.yueDe).toEqual({ target: { kind: "gan", value: "壬" }, positions: ["time"] });
  });

  it("酉月天德为寅支：2000-09-14 寅时命中、卯时不命中", () => {
    const cfg = { birthDate: "2000-09-14", gender: "male" as const };
    expect(calculateBazi({ ...cfg, birthTime: "04:30" }).shenSha.tianDe)
      .toEqual({ target: { kind: "zhi", value: "寅" }, positions: ["time"] });
    expect(calculateBazi({ ...cfg, birthTime: "06:30" }).shenSha.tianDe).toBeNull();
  });

  it("十二节气月与十二时辰的宫干宫支均与依赖独立实现一致", () => {
    const seen = new Set<string>();
    for (let month = 1; month <= 12; month++) {
      for (let hour = 0; hour < 24; hour += 2) {
        const birthDate = `2000-${String(month).padStart(2, "0")}-15`;
        const birthTime = `${String(hour).padStart(2, "0")}:30`;
        const r = calculateBazi({ birthDate, birthTime, gender: "male" });
        const ec = Solar.fromYmdHms(2000, month, 15, hour, 30, 0).getLunar().getEightChar();
        seen.add(r.bazi.month.zhi + r.bazi.time.zhi);
        expect(r.mingGong.ganZhi, `${birthDate} ${birthTime} 命`).toBe(ec.getMingGong());
        expect(r.shenGong.ganZhi, `${birthDate} ${birthTime} 身`).toBe(ec.getShenGong());
      }
    }
    expect(seen.size).toBe(144);
  });
});
