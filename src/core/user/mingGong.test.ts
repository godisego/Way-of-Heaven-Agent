import { describe, expect, it } from "vitest";
import { calculateMingGong, calculateShenGong, calculateTaiYuan } from "./mingGong";

const branches = [..."子丑寅卯辰巳午未申酉戌亥"];
const months = [..."寅卯辰巳午未申酉戌亥子丑"];
// 按口诀逐格走宫位，独立于实现中的模运算公式。
function walk(month: string, time: string, kind: "ming" | "shen") {
  let palace = 0;
  for (const m of months) {
    if (m === month) break;
    palace = (palace + (kind === "ming" ? 11 : 1)) % 12;
  }
  let clock = branches.indexOf(time);
  const stop = kind === "ming" ? "卯" : "酉";
  while (branches[clock] !== stop) {
    clock = (clock + 1) % 12;
    palace = (palace + (kind === "ming" ? 1 : 11)) % 12;
  }
  return branches[palace];
}

describe("命身宫 · 明确索引与五虎遁", () => {
  it.each([
    ["乙", "申", "寅", "癸未", "丁亥"],
    // 《盲派命理钩玄》转载例：戊申 己未 乙未 丁亥。
    ["戊", "未", "亥", "癸亥", "己未"],
    ["甲", "寅", "子", "丁卯", "丁卯"],
    ["甲", "寅", "酉", "庚午", "丙子"],
  ])("%s年 %s月 %s时：命%s、身%s", (year, month, time, ming, shen) => {
    expect(calculateMingGong(year, month, time).ganZhi).toBe(ming);
    expect(calculateShenGong(year, month, time).ganZhi).toBe(shen);
  });

  it.each(months)("%s月：十二时辰均与逐格推算一致，身宫确实随时辰变化", (month) => {
    const results = new Set<string>();
    for (const time of branches) {
      expect(calculateMingGong("甲", month, time).zhi).toBe(walk(month, time, "ming"));
      const shen = calculateShenGong("甲", month, time);
      expect(shen.zhi).toBe(walk(month, time, "shen"));
      results.add(shen.zhi);
    }
    expect(results.size).toBe(12);
  });

  it.each([
    ["甲己", "丙丁戊己庚辛壬癸甲乙丙丁"],
    ["乙庚", "戊己庚辛壬癸甲乙丙丁戊己"],
    ["丙辛", "庚辛壬癸甲乙丙丁戊己庚辛"],
    ["丁壬", "壬癸甲乙丙丁戊己庚辛壬癸"],
    ["戊癸", "甲乙丙丁戊己庚辛壬癸甲乙"],
  ])("%s年宫干：按寅至丑的五虎遁表，含子丑跨界", (years, stems) => {
    for (const year of years) {
      for (const time of branches) {
        for (const result of [calculateMingGong(year, "寅", time), calculateShenGong(year, "寅", time)]) {
          expect(result.gan).toBe(stems[months.indexOf(result.zhi)]);
          expect(result.ganZhi).toBe(result.gan + result.zhi);
        }
      }
    }
  });

  it("宫支五行与完整干支分开，胎元仍按月干进一月支进三", () => {
    expect(calculateMingGong("乙", "申", "寅")).toEqual({ gan: "癸", zhi: "未", ganZhi: "癸未", wuXing: "土" });
    expect(calculateTaiYuan("壬", "午")).toBe("癸酉");
    expect(calculateTaiYuan("癸", "亥")).toBe("甲寅");
  });

  it("无效输入报错，不以子宫或错误胎元兜底", () => {
    for (const calculate of [calculateMingGong, calculateShenGong]) {
      expect(() => calculate("?", "寅", "子")).toThrow("无效干支");
      expect(() => calculate("甲", "?", "子")).toThrow("无效干支");
      expect(() => calculate("甲", "寅", "?")).toThrow("无效干支");
    }
    expect(() => calculateTaiYuan("?", "寅")).toThrow();
  });
});
