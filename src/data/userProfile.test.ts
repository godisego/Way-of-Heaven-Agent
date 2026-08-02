import { describe, expect, it } from "vitest";
import { prepareUserProfileForAgent, type UserProfile } from "./userProfile";

describe("prepareUserProfileForAgent", () => {
  it("为只含基础生辰字段的 API 档案补齐排盘", () => {
    const profile = {
      birthDate: "1995-08-14",
      birthTime: "04:30",
      gender: "male",
      birthPlace: "杭州",
      birthLongitude: 120.2,
      currentPlace: "上海",
    } as UserProfile;

    const prepared = prepareUserProfileForAgent(profile);
    expect(prepared?.bazi?.bazi.year.ganZhi).toBeTruthy();
    expect(prepared?.bazi?.daYun.length).toBeGreaterThan(0);
  });

  it("档案不完整时不向模型注入", () => {
    expect(prepareUserProfileForAgent({ birthDate: "1995-08-14" } as UserProfile)).toBeNull();
  });
});
