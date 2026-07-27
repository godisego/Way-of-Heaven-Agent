import { describe, expect, it } from "vitest";
import { parseMentorDialogue } from "@/data/mentors";
import { checkVoice } from "./voicePolicy";

const GOOD = `【盲派算师·老胡】
哎，老夫瞧着啊——你这局是节气没到。下半月钱别动、人别硬碰，把旧账理一理。留三分。

【存在主义导师·李】
「等时机」——你确定不是在等一个免于选择的许可？今晚把那件事写成一句话，贴在明早看得见的地方。

【主事·玄】
两位说的其实是一件事。方向你已有，缺的是节奏。这周只一件：先停下搅浑水的手。贫道听着。且去，莫急。`;

function check(text: string) {
  return checkVoice(parseMentorDialogue(text));
}

describe("checkVoice（声口校验器）", () => {
  it("规范回答零违规", () => {
    expect(check(GOOD)).toEqual([]);
  });

  it("缺角：只有两段 → missing-role", () => {
    const text = GOOD.split("【主事·玄】")[0];
    const v = check(text);
    expect(v.some((x) => x.kind === "missing-role" && x.mentorId === "xuan")).toBe(true);
  });

  it("乱序：李先于老胡 → wrong-order", () => {
    const text = `【存在主义导师·李】
你在等什么？

【盲派算师·老胡】
哎，老夫瞧着，这局宜守。

【主事·玄】
贫道听着。且去，莫急。`;
    const v = check(text);
    expect(v.some((x) => x.kind === "wrong-order")).toBe(true);
  });

  it("串味：玄说「老夫」 → cross-voice", () => {
    const text = GOOD.replace("贫道听着。且去，莫急。", "老夫瞧着，且去。");
    const v = check(text);
    expect(v.some((x) => x.kind === "cross-voice" && x.mentorId === "xuan")).toBe(true);
  });

  it("串味：老胡说「贫道」 → cross-voice", () => {
    const text = GOOD.replace("留三分。", "贫道以为留三分。");
    const v = check(text);
    expect(v.some((x) => x.kind === "cross-voice" && x.mentorId === "hu")).toBe(true);
  });

  it("李用命理语汇 → li-mingli", () => {
    const text = GOOD.replace(
      "「等时机」——你确定不是在等一个免于选择的许可？",
      "你的大运还没到，流年不利，等等再说。",
    );
    const v = check(text);
    expect(v.some((x) => x.kind === "li-mingli")).toBe(true);
  });

  it("李段出现干支单字 → li-mingli", () => {
    const text = GOOD.replace("今晚把那件事写成一句话", "你是丁火之人，今晚把那件事写成一句话");
    const v = check(text);
    expect(v.some((x) => x.kind === "li-mingli")).toBe(true);
  });

  it("AI 自指 → broke-character", () => {
    const text = GOOD.replace("哎，老夫瞧着啊", "作为一个AI，我认为");
    const v = check(text);
    expect(v.some((x) => x.kind === "broke-character" && x.mentorId === "hu")).toBe(true);
  });

  it("老胡自己说「老夫」不算违规", () => {
    expect(check(GOOD).filter((x) => x.kind === "cross-voice")).toEqual([]);
  });
});
