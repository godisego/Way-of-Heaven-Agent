import { describe, expect, it } from "vitest";
import type { BaziResult, BaziPillar } from "@/core/user/baziCalculator";
import { briefForHu, briefForXuan, briefForLi } from "./chartBrief";

/** 与 explainChart.test 相同的自洽夹具（乙亥 甲申 丁卯 壬寅，日主丁火） */
function pillar(gan: string, zhi: string, hideGan: string[], shiShenGan: string, zhiShiShen: string[]): BaziPillar {
  const ganWx: Record<string, "金" | "木" | "水" | "火" | "土"> = {
    甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
  };
  const zhiWx: Record<string, "金" | "木" | "水" | "火" | "土"> = {
    子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
  };
  return {
    gan, zhi, ganZhi: gan + zhi, naYin: "测试纳音", wuXing: "",
    ganWuXing: ganWx[gan], zhiWuXing: zhiWx[zhi],
    shiShenGan, hideGan, zhiShiShen, xunKong: [],
  };
}

const chart: BaziResult = {
  solar: {
    birthDate: "1995-08-14", birthTime: "04:30", correctedDate: "1995-08-14",
    correctedTime: "04:12", longitude: 120.2, deltaMinutes: -18, dayShift: 0,
  },
  bazi: {
    year: pillar("乙", "亥", ["壬", "甲"], "偏印", ["正官", "正印"]),
    month: pillar("甲", "申", ["庚", "壬", "戊"], "正印", ["正财", "正官", "伤官"]),
    day: pillar("丁", "卯", ["乙"], "日主", ["偏印"]),
    time: pillar("壬", "寅", ["甲", "丙", "戊"], "正官", ["正印", "劫财", "伤官"]),
  },
  dayMaster: "丁",
  dayMasterWuXing: "火",
  shengXiao: "猪",
  wuXingCount: { 金: 1, 木: 3, 水: 2, 火: 1, 土: 1 },
  daYun: [
    { startYear: 2003, startAge: 9, ganZhi: "癸未" },
    { startYear: 2013, startAge: 19, ganZhi: "壬午" },
    { startYear: 2023, startAge: 29, ganZhi: "辛巳" },
  ],
  qiYun: { years: 7, months: 4, days: 12, display: "出生后 7年4个月12天 起运", startAge: 9, convention: "traditional" },
  isForward: false,
  xiaoYun: { direction: "逆排", startGanZhi: "壬寅", steps: [{ age: 1, ganZhi: "辛丑" }] },
  taiYuan: { ganZhi: "乙亥", naYin: "山头火" },
  mingGong: { ganZhi: "子", wuXing: "水" },
  shenGong: { ganZhi: "丑", wuXing: "土" },
  shenSha: {} as unknown as BaziResult["shenSha"],
  summary: "测试盘",
};

// 固定“当前时间”保证流年可复现：2026-07-01 → 丙午年
const NOW = new Date(2026, 6, 1);

describe("briefForHu（老胡 · 全量命理简报）", () => {
  const brief = briefForHu(chart, NOW);

  it("含四柱与藏干十神", () => {
    expect(brief).toContain("乙亥");
    expect(brief).toContain("庚→正财");
  });

  it("含起运精确时长与顺逆", () => {
    expect(brief).toContain("7年4个月12天");
    expect(brief).toContain("逆排");
  });

  it("大运带年份与十神注记，当前步有标记", () => {
    expect(brief).toContain("癸未（2003起");
    expect(brief).toContain("▶辛巳");
  });

  it("流年丙午对日主丁为劫财，落辛巳大运", () => {
    expect(brief).toContain("丙午");
    expect(brief).toContain("劫财");
    expect(brief).toContain("落 辛巳 大运内");
  });

  it("神煞缺失时安全降级", () => {
    expect(brief).toContain("神煞：");
  });

  it("含使用规则与反恐吓约束", () => {
    expect(brief).toContain("使用规则");
    expect(brief).toContain("不得自行推算");
    expect(brief).toContain("恐吓");
  });
});

describe("briefForXuan（玄 · 气机简报）", () => {
  const brief = briefForXuan(chart, NOW);

  it("内容段以气论而非吉凶（使用规则段为列禁用词必然含「吉凶」等字样）", () => {
    expect(brief).toContain("气");
    const content = brief.split("【使用规则】")[0];
    for (const banned of ["破财", "灾", "凶", "十神", "神煞"]) {
      expect(content, `内容段不应出现「${banned}」`).not.toContain(banned);
    }
  });

  it("含五行盈虚与月令", () => {
    expect(brief).toContain("木3");
    expect(brief).toContain("月令申");
  });

  it("含流年与大运的五行之气", () => {
    expect(brief).toContain("丙午");
    expect(brief).toContain("辛巳");
  });

  it("使用规则明确禁批命", () => {
    expect(brief).toContain("不批命");
  });
});

describe("briefForLi（李 · 结构性隔离）", () => {
  it("背景段只含现实信息，无任何干支与命理数据", () => {
    const brief = briefForLi({ currentPlace: "上海徐汇", work: "产品经理", relationship: "恋爱中" });
    expect(brief).toContain("上海徐汇");
    expect(brief).toContain("产品经理");
    // 只检查背景段（使用规则里为列禁用词汇必然出现「大运/流年」等字样）
    const background = brief.split("【使用规则】")[0];
    expect(background).not.toMatch(/[甲乙丙丁戊己庚辛壬癸]/);
    expect(background).not.toContain("八字");
    expect(background).not.toContain("流年");
    expect(background).not.toContain("大运");
  });

  it("空档时给出兜底文案", () => {
    const brief = briefForLi({});
    expect(brief).toContain("未留下背景");
  });
});
