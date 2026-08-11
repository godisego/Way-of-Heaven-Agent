import { describe, expect, it } from "vitest";
import {
  MentorSelectionError,
  parseMentorSelection,
  resolveMentorIds,
} from "./mentorSelection";

describe("mentor selection", () => {
  it("缺省与三位全选都归一为默认路径", () => {
    expect(parseMentorSelection(undefined)).toBeUndefined();
    expect(parseMentorSelection(["hu", "li", "xuan"])).toBeUndefined();
  });

  it("子集去重并按老胡、李、玄排序", () => {
    expect(parseMentorSelection(["xuan", "hu", "hu"])).toEqual(["hu", "xuan"]);
    expect(resolveMentorIds(["xuan", "hu"])).toEqual(["hu", "xuan"]);
  });

  it.each([[], ["unknown"], "hu", {}])("拒绝非法选择：%j", (value) => {
    expect(() => parseMentorSelection(value)).toThrow(MentorSelectionError);
  });
});
