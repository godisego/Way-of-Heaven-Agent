import { describe, expect, it } from "vitest";
import { calculateShenSha, type ShenShaConfig } from "./shenSha";

// 符号级查表夹具，不声称是有效出生盘。四柱明干先用戊，地支用丑避开四个支目标。
const base: ShenShaConfig = {
  yearGan: "戊", monthGan: "戊", dayMaster: "戊", timeGan: "戊",
  yearZhi: "丑", monthZhi: "寅", dayZhi: "丑", timeZhi: "丑",
};
const deRows = [
  ["寅", "gan", "丁"], ["卯", "zhi", "申"], ["辰", "gan", "壬"],
  ["巳", "gan", "辛"], ["午", "zhi", "亥"], ["未", "gan", "甲"],
  ["申", "gan", "癸"], ["酉", "zhi", "寅"], ["戌", "gan", "丙"],
  ["亥", "gan", "乙"], ["子", "zhi", "巳"], ["丑", "gan", "庚"],
];

describe("天德：十二月目标与四柱实见", () => {
  it.each(deRows)("%s月目标%s %s：不见即无，实见记录全部位置", (monthZhi, kind, value) => {
    const cfg = { ...base, monthZhi };
    expect(calculateShenSha(cfg).tianDe).toBeNull();
    const hitCfg = kind === "gan"
      ? { ...cfg, yearGan: value, monthGan: value, dayMaster: value, timeGan: value }
      : { ...cfg, yearZhi: value, dayZhi: value, timeZhi: value };
    expect(calculateShenSha(hitCfg).tianDe).toEqual({
      target: { kind, value }, positions: kind === "gan" ? ["year", "month", "day", "time"] : ["year", "day", "time"],
    });
  });

  it("不会把藏干算作明干命中", () => {
    // 寅月天德丁，午藏丁，但四柱明干没有丁。
    expect(calculateShenSha({ ...base, yearZhi: "午" }).tianDe).toBeNull();
    // 申月天德癸，丑藏癸，不算命中。
    expect(calculateShenSha({ ...base, monthZhi: "申" }).tianDe).toBeNull();
  });

  it("分别识别日干与时干，缺少其他位置不能吞掉命中", () => {
    expect(calculateShenSha({ ...base, dayMaster: "丁" }).tianDe?.positions).toEqual(["day"]);
    expect(calculateShenSha({ ...base, timeGan: "丁" }).tianDe?.positions).toEqual(["time"]);
  });
});

describe("月德：按月支取干，实见才成立", () => {
  it.each([["寅午戌", "丙"], ["申子辰", "壬"], ["亥卯未", "甲"], ["巳酉丑", "庚"]])("%s月取%s", (months, value) => {
    for (const monthZhi of months) {
      const cfg = { ...base, monthZhi };
      expect(calculateShenSha(cfg).yueDe).toBeNull();
      expect(calculateShenSha({ ...cfg, yearGan: value, monthGan: value, dayMaster: value, timeGan: value }).yueDe)
        .toEqual({ target: { kind: "gan", value }, positions: ["year", "month", "day", "time"] });
    }
  });

  it("年支变化不改变月德查表；藏干不算明干", () => {
    expect(calculateShenSha({ ...base, yearZhi: "申", timeGan: "丙" }).yueDe?.target.value).toBe("丙");
    expect(calculateShenSha({ ...base, yearZhi: "巳" }).yueDe).toBeNull();
  });

  it("未知月支不生成天月德", () => {
    expect(calculateShenSha({ ...base, monthZhi: "?" })).toMatchObject({ tianDe: null, yueDe: null });
  });

  it("驿马继续只按年支，不混入日支起法", () => {
    const cfg = { ...base, yearZhi: "子", monthZhi: "午", dayZhi: "亥", timeZhi: "巳" };
    expect(calculateShenSha(cfg).yiMa).toBeNull();
    expect(calculateShenSha({ ...cfg, timeZhi: "寅" }).yiMa).toEqual({ position: "time", branch: "寅" });
  });
});
