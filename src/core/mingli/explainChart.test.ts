import { describe, expect, it } from "vitest";
import type { BaziResult, BaziPillar } from "@/core/user/baziCalculator";
import { explainSelection, ganZhiRelation, roughStrength } from "./explainChart";
import { liuNianGanZhi, liuNianYearOf } from "./liuNian";
import { getEntry, kbSize, MINGLI_KB } from "./mingliKb";

/** 手工构造一个自洽的盘（乙亥 甲申 丁卯 壬寅，日主丁火），不依赖 lunar-javascript 运行时 */
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
  shenSha: { tianYi: [], wenChang: [], yiMa: [], taoHua: [], huaGai: [], jiangXing: [], tianDe: [], yueDe: [] } as unknown as BaziResult["shenSha"],
  summary: "测试盘",
};

describe("知识库完整性", () => {
  it("词条数量覆盖概念/干/支/十神/五行/宫位/神煞", () => {
    expect(kbSize()).toBeGreaterThanOrEqual(60);
  });

  it("全部交叉引用指向存在的词条", () => {
    for (const e of Object.values(MINGLI_KB)) {
      for (const id of e.links) {
        expect(getEntry(id), `${e.id} → ${id}`).not.toBeNull();
      }
    }
  });

  it("干支字间关系七条词条齐全且互相交叉引用", () => {
    // 七条核心关系词条：天干五合 + 地支六合/三合/三会/六冲/三刑/六害
    const relationIds = [
      "tiangan-he",
      "dizhi-liuhe",
      "dizhi-sanhe",
      "dizhi-sanhui",
      "dizhi-liuchong",
      "dizhi-sanxing",
      "dizhi-liuhai",
    ];
    for (const id of relationIds) {
      const e = getEntry(id);
      expect(e, `词条 ${id} 应存在`).not.toBeNull();
      expect(e?.category).toBe("concept");
      expect(e?.links.length).toBeGreaterThan(0);
      // 每条关系词条都应交叉引用到至少一条其他关系词条
      const crossToRelations = e!.links.filter((l) => relationIds.includes(l));
      expect(crossToRelations.length, `${id} 应至少交叉引用一条关系词条`).toBeGreaterThan(0);
    }
  });

  it("十二长生五条词条齐全且与五行通根关联", () => {
    const stageIds = [
      "twelve-stages", // 总览
      "stage-shengwang", // 生旺相位
      "stage-shuai", // 衰相位
      "stage-bingsi-mu", // 病死墓相位
      "stage-juetai-yang", // 绝胎养相位
    ];
    for (const id of stageIds) {
      const e = getEntry(id);
      expect(e, `词条 ${id} 应存在`).not.toBeNull();
      expect(e?.category).toBe("concept");
    }
    // 总览词条应引用到五行/天干/地支/通根
    const overview = getEntry("twelve-stages");
    expect(overview?.links).toContain("wuxing-gk");
    expect(overview?.links).toContain("tonggen");
    // 四相位词条都应回链到总览
    for (const id of stageIds.slice(1)) {
      const e = getEntry(id);
      expect(e?.links, `${id} 应回链 twelve-stages`).toContain("twelve-stages");
    }
  });
});

describe("流年计算", () => {
  it("公式正确（1984 甲子 / 2024 甲辰 / 2026 丙午）", () => {
    expect(liuNianGanZhi(1984)).toBe("甲子");
    expect(liuNianGanZhi(2024)).toBe("甲辰");
    expect(liuNianGanZhi(2026)).toBe("丙午");
  });

  it("立春前属上一年（近似 2 月 4 日界）", () => {
    expect(liuNianYearOf(new Date(2025, 0, 20))).toBe(2024);
    expect(liuNianYearOf(new Date(2025, 1, 10))).toBe(2025);
  });
});

describe("解释组合器", () => {
  it("日柱卡：含宫位、干支、藏干十神", () => {
    const card = explainSelection(chart, { kind: "pillar", which: "day" });
    expect(card.title).toContain("丁卯");
    const all = card.sections.map((s) => s.body).join("");
    expect(all).toContain("夫妻宫");
    expect(all).toContain("乙");
    expect(card.links.some((l) => l.id === "gan-丁")).toBe(true);
    expect(card.links.some((l) => l.id === "zhi-卯")).toBe(true);
  });

  it("天干卡：日主与非日主的措辞不同", () => {
    const dm = explainSelection(chart, { kind: "gan", char: "丁", from: "day" });
    expect(dm.sections.map((s) => s.body).join("")).toContain("日主");
    const other = explainSelection(chart, { kind: "gan", char: "壬", from: "time" });
    expect(other.sections.map((s) => s.body).join("")).toContain("正官");
  });

  it("地支卡：列出藏干及其十神", () => {
    const card = explainSelection(chart, { kind: "zhi", char: "申", from: "month" });
    const all = card.sections.map((s) => s.body).join("");
    expect(all).toContain("庚");
    expect(all).toContain("月令");
  });

  it("十神卡：定位盘中出现位置", () => {
    const card = explainSelection(chart, { kind: "shishen", name: "正印" });
    const all = card.sections.map((s) => s.body).join("");
    expect(all).toContain("月柱天干甲");
  });

  it("大运卡：干支分别论十神", () => {
    const card = explainSelection(chart, { kind: "dayun", step: chart.daYun[2] });
    expect(card.title).toContain("辛巳");
    const all = card.sections.map((s) => s.body).join("");
    expect(all).toContain("偏财"); // 辛对丁为偏财
  });

  it("流年卡：给出干支与所在大运", () => {
    const card = explainSelection(chart, { kind: "liunian", year: 2026 });
    expect(card.title).toContain("丙午");
    expect(card.subtitle ?? "").toContain("辛巳");
  });

  it("总览卡：含强弱粗评与免责说明", () => {
    const card = explainSelection(chart, { kind: "overview" });
    const all = card.sections.map((s) => s.body).join("");
    expect(all).toContain("日主丁");
    expect(all).toContain("简化");
  });

  it("词条卡：entry 直达", () => {
    const card = explainSelection(chart, { kind: "entry", id: "shishen" });
    expect(card.title).toContain("十神");
    expect(card.links.length).toBeGreaterThan(0);
  });
});

describe("旧档兼容", () => {
  it("localStorage 旧档的字符串旬空不崩溃且正确展示", () => {
    const legacy: BaziResult = {
      ...chart,
      bazi: {
        ...chart.bazi,
        day: { ...chart.bazi.day, xunKong: "戌亥" as unknown as string[] },
      },
    };
    const card = explainSelection(legacy, { kind: "pillar", which: "day" });
    const all = card.sections.map((s) => s.body).join("");
    expect(all).toContain("戌、亥");
  });
});

describe("干支关系与强弱粗评", () => {
  it("丁卯：地支生天干（木生火）且通根判断合理", () => {
    expect(ganZhiRelation("丁", "卯")).toContain("生天干");
  });

  it("庚寅：天干克地支（盖头）", () => {
    expect(ganZhiRelation("庚", "寅")).toContain("盖头");
  });

  it("粗评输出结构完整", () => {
    const s = roughStrength(chart);
    expect(["偏强", "偏弱", "中和（大致）"]).toContain(s.verdict);
    expect(s.reasons.length).toBeGreaterThanOrEqual(4);
  });
});

describe("盘面总览 · 完整分析", () => {
  it("覆盖喜忌方向、十神偏重、当前运程与宫位", () => {
    const card = explainSelection(chart, { kind: "overview" });
    const all = card.sections.map((s) => s.body).join("");
    expect(card.title).toContain("完整分析");
    expect(all).toContain("宜：");
    expect(all).toContain("忌：");
    expect(all).toContain("偏重");
    expect(all).toContain("印星"); // 本盘印透两干、支藏三印，必为最重
    expect(all).toContain("流年");
    expect(all).toContain("当前大运"); // 夹具大运至 2023 起步，任一现代年份均落在末步
    expect(all).toContain("命宫子");
    expect(all).toContain("山头火"); // 胎元纳音
  });
});
