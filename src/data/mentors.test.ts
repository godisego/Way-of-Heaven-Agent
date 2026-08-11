import { describe, expect, it } from "vitest";
import type { BaziResult, BaziPillar } from "@/core/user/baziCalculator";
import type { UserProfile } from "./userProfile";
import {
  buildMentorSystemPrompt,
  buildMentorUserPrompt,
  MENTORS,
  parseMentorDialogue,
} from "./mentors";

function pillar(gan: string, zhi: string, hideGan: string[], shiShenGan: string, zhiShiShen: string[]): BaziPillar {
  const ganWx: Record<string, "金" | "木" | "水" | "火" | "土"> = {
    甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
  };
  const zhiWx: Record<string, "金" | "木" | "水" | "火" | "土"> = {
    子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
  };
  return {
    gan, zhi, ganZhi: gan + zhi, naYin: "测试", wuXing: "",
    ganWuXing: ganWx[gan], zhiWuXing: zhiWx[zhi],
    shiShenGan, hideGan, zhiShiShen, xunKong: [],
  };
}

const bazi: BaziResult = {
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
  dayMaster: "丁", dayMasterWuXing: "火", shengXiao: "猪",
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

const profile: UserProfile = {
  birthDate: "1995-08-14",
  birthTime: "04:30",
  birthPlace: "浙江杭州",
  birthLongitude: 120.2,
  currentPlace: "上海徐汇",
  gender: "male",
  work: "产品经理",
  bazi,
  updatedAt: "2026-07-01T00:00:00.000Z",
};

describe("人设数据完整性", () => {
  it("三位都有禁忌清单、声口示范与分界线", () => {
    for (const m of MENTORS) {
      expect(m.neverSay.length, m.id).toBeGreaterThanOrEqual(5);
      expect(m.styleSample.length, m.id).toBeGreaterThanOrEqual(30);
      expect(m.contrast.length, m.id).toBeGreaterThanOrEqual(20);
    }
  });

  it("示范文本不含他人专属自称", () => {
    const li = MENTORS.find((m) => m.id === "li")!;
    const hu = MENTORS.find((m) => m.id === "hu")!;
    const xuan = MENTORS.find((m) => m.id === "xuan")!;
    expect(li.styleSample).not.toContain("老夫");
    expect(li.styleSample).not.toContain("贫道");
    expect(hu.styleSample).not.toContain("贫道");
    expect(xuan.styleSample).not.toContain("老夫");
  });
});

describe("buildMentorSystemPrompt（分角色注入与铁律）", () => {
  it("无档时：铁律与三角色块齐备，且不含任何命理简报", () => {
    const p = buildMentorSystemPrompt(null);
    expect(p).toContain("【铁律");
    expect(p).toContain("【角色一：盲派算师·老胡】");
    expect(p).toContain("【角色二：存在主义导师·李】");
    expect(p).toContain("【角色三：主事·玄】");
    expect(p).toContain("交稿前自查");
    expect(p).not.toContain("【命理简报 · 排盘系统既定结果】");
  });

  it("有档时：命理简报只进老胡块，气机简报只进玄块，李块无干支", () => {
    const p = buildMentorSystemPrompt(profile);
    const huBlock = p.split("【角色一：盲派算师·老胡】")[1].split("【角色二：")[0];
    const liBlock = p.split("【角色二：存在主义导师·李】")[1].split("【角色三：")[0];
    const xuanBlock = p.split("【角色三：主事·玄】")[1];

    expect(huBlock).toContain("【命理简报 · 排盘系统既定结果】");
    expect(huBlock).toContain("辛巳");

    expect(xuanBlock).toContain("【气机简报 · 以阴阳五行论，不批命】");
    expect(xuanBlock).not.toContain("【命理简报 · 排盘系统既定结果】");

    expect(liBlock).toContain("【现实背景】");
    expect(liBlock).toContain("上海徐汇");
    // 李块的专属材料段（自「本轮专属材料」起）不得出现任何干支
    const liMaterial = liBlock.split("本轮专属材料")[1] ?? "";
    expect(liMaterial).not.toMatch(/[甲乙丙丁戊己庚辛壬癸]/);
  });

  it("铁律包含李禁命理与禁 AI 自指", () => {
    const p = buildMentorSystemPrompt(profile);
    expect(p).toContain("李全程禁用命理语汇");
    expect(p).toContain("AI 自指");
  });

  it("三位全选仍严格走原始默认 prompt", () => {
    expect(buildMentorSystemPrompt(profile, ["hu", "li", "xuan"]))
      .toBe(buildMentorSystemPrompt(profile));
    expect(buildMentorUserPrompt("问", "来源", profile, "上文", ["hu", "li", "xuan"]))
      .toBe(buildMentorUserPrompt("问", "来源", profile, "上文"));
  });

  it("只选老胡时 prompt 只包含老胡角色与命理材料", () => {
    const system = buildMentorSystemPrompt(profile, ["hu"]);
    const user = buildMentorUserPrompt("问八字", "命理来源", profile, undefined, ["hu"]);

    expect(system).toContain("【在席角色一：盲派算师·老胡】");
    expect(system).toContain("【命理简报 · 排盘系统既定结果】");
    expect(system).not.toContain("存在主义导师·李");
    expect(system).not.toContain("主事·玄");
    expect(user).toContain("本轮只请 盲派算师·老胡 回答");
    expect(user).not.toContain("存在主义导师·李");
  });

  it("单角色标题也能拆成对应气泡", () => {
    expect(parseMentorDialogue("【盲派算师·老胡】\n老夫瞧着，先看月令。"))
      .toEqual([{ mentorId: "hu", heading: "盲派算师·老胡", body: "老夫瞧着，先看月令。" }]);
  });

  it("只选玄时切换到独席道家 skill，不再用合议收束声口", () => {
    const system = buildMentorSystemPrompt(profile, ["xuan"]);
    // 独席口头禅：无为/齐物（solo 专属），合议口头禅"两位说得各有道理"必须消失
    expect(system).toContain("无为不是不为");
    expect(system).toContain("独席主答");
    expect(system).not.toContain("两位说得各有道理");
    // 独席声口示范（solo.styleSample）覆盖合议示范
    expect(system).toContain("想强为");
    // 仍只有玄一个角色
    expect(system).not.toContain("存在主义导师·李");
    expect(system).not.toContain("盲派算师·老胡");
  });
});
