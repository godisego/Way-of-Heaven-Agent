import { describe, expect, it } from "vitest";
import { parseMentorDialogue } from "@/data/mentors";
import { needsCitation } from "./citationPolicy";
import { buildNoEvidenceAnswer, wrapAsMentorDialogue } from "./noEvidenceAnswer";
import { calculateBazi } from "@/core/user/baziCalculator";
import type { UserProfile } from "@/data/userProfile";

describe("buildNoEvidenceAnswer", () => {
  it("空库兜底仍按老胡 → 李 → 玄输出，且不要求引用", () => {
    const answer = buildNoEvidenceAnswer();
    const segments = parseMentorDialogue(answer);

    expect(segments.map((segment) => segment.mentorId)).toEqual(["hu", "li", "xuan"]);
    expect(answer).toContain("暂时没有能贴合");
    expect(needsCitation(answer)).toBe(false);
  });

  it("可带入 Agent 给出的缺失材料说明", () => {
    expect(buildNoEvidenceAnswer("库中暂无相关材料")).toContain("库中暂无相关材料");
  });

  it("有问者档时老胡结合排盘，李段仍无命理材料", () => {
    const profile: UserProfile = {
      birthDate: "1995-08-14",
      birthTime: "04:30",
      gender: "male",
      birthPlace: "杭州",
      birthLongitude: 120.2,
      currentPlace: "上海",
      updatedAt: "2026-07-31T00:00:00.000Z",
      bazi: calculateBazi({
        birthDate: "1995-08-14",
        birthTime: "04:30",
        gender: "male",
        birthLongitude: 120.2,
      }),
    };

    const segments = parseMentorDialogue(buildNoEvidenceAnswer(undefined, profile));
    expect(segments[0].body).toContain("日主");
    expect(segments[0].body).toContain("大运");
    expect(segments[1].body).not.toMatch(/[甲乙丙丁戊己庚辛壬癸]|大运|流年|日主/);
  });
});

describe("wrapAsMentorDialogue", () => {
  it("充实的裸文本（≥3段、每段≥40字）被包装成三段，可被 parseMentorDialogue 拆分", () => {
    const raw = [
      "这是一段足够长的模型输出内容，超过了四十字的质量门槛，可以被包装为老胡的发言段落。",
      "第二段内容同样足够长，超过四十字门槛，作为李的发言，讲处境与选择的具体建议。",
      "第三段内容也足够长，超过四十字门槛，作为玄的收束，给方向与节奏的建议。",
    ].join("\n\n");
    const wrapped = wrapAsMentorDialogue(raw);
    const segments = parseMentorDialogue(wrapped);
    expect(segments.map((s) => s.mentorId)).toEqual(["hu", "li", "xuan"]);
    expect(wrapped).toContain("【盲派算师·老胡】");
    expect(wrapped).toContain("【存在主义导师·李】");
    expect(wrapped).toContain("【主事·玄】");
    expect(wrapped).toContain("系统整编");
  });

  it("已有三贤标题的文本不重复包装", () => {
    const already = "【盲派算师·老胡】\n老夫瞧着……\n\n【存在主义导师·李】\n先写下……\n\n【主事·玄】\n且去。";
    expect(wrapAsMentorDialogue(already)).toBe(already);
  });

  it("空文本回退到 buildNoEvidenceAnswer", () => {
    const wrapped = wrapAsMentorDialogue("");
    expect(wrapped).toContain("【盲派算师·老胡】");
    expect(wrapped).not.toContain("系统整编");
  });

  it("空洞短文本（段落不足40字）回退到 buildNoEvidenceAnswer，不包装垃圾", () => {
    const raw = "短。\n\n也短。\n\n还是短。";
    const wrapped = wrapAsMentorDialogue(raw);
    expect(wrapped).toContain("【盲派算师·老胡】");
    expect(wrapped).not.toContain("系统整编");
    expect(wrapped).not.toContain("短。");
  });

  it("段落数不足3段回退到 buildNoEvidenceAnswer", () => {
    const raw = "只有一段很长的内容但没法分成三段所以会被判定为不适合包装而走兜底逻辑处理。";
    const wrapped = wrapAsMentorDialogue(raw);
    expect(wrapped).toContain("【盲派算师·老胡】");
    expect(wrapped).not.toContain("系统整编");
  });
});
