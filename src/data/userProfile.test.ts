import { describe, expect, it } from "vitest";
import { prepareUserProfileForAgent, type UserProfile } from "./userProfile";
import { calculateBazi, BAZI_RULE_VERSION } from "@/core/user/baziCalculator";

describe("prepareUserProfileForAgent", () => {
  it("重算旧规则档案，保留出生资料与起运口径", () => {
    const bazi = calculateBazi({ birthDate: "1985-02-14", birthTime: "04:00", gender: "male", qiYunConvention: "exact" });
    delete bazi.ruleVersion;
    bazi.bazi.month.zhiShiShen[1] = "伤官";
    const profile: UserProfile = { birthDate: "1985-02-14", birthTime: "04:00", gender: "male", birthPlace: "北京", currentPlace: "北京", updatedAt: "2026-09-01", bazi };
    const result = prepareUserProfileForAgent(profile)!;
    expect(result.bazi?.bazi.month.zhiShiShen[1]).toBe("食神");
    expect(result.bazi?.ruleVersion).toBe(BAZI_RULE_VERSION);
    expect(result.bazi?.qiYun.convention).toBe("exact");
    expect(result.birthDate).toBe(profile.birthDate);
    expect(profile.bazi?.bazi.month.zhiShiShen[1]).toBe("伤官");
  });
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

describe("v2 派生字段迁移", () => {
  it.each(["04:30", "23:30"])("%s：重算宫位和天月德，同时保留真太阳时、晚子时、起运选择", (birthTime) => {
    const input = {
      birthDate: "1995-08-14", birthTime, gender: "male" as const, birthLongitude: 120.2,
      qiYunConvention: "exact" as const, lateZiRule: "next-day" as const,
    };
    const fresh = calculateBazi(input);
    const legacy = {
      ...fresh, ruleVersion: 2,
      mingGong: { ganZhi: "巳", wuXing: "火" },
      shenGong: { ganZhi: "丑", wuXing: "土" },
      shenSha: { ...fresh.shenSha, tianDe: { gan: "癸" }, yueDe: { gan: "壬" } },
    } as unknown as typeof fresh;
    const profile: UserProfile = {
      ...input, birthPlace: "杭州", currentPlace: "上海", updatedAt: "2026-09-01", bazi: legacy,
    };
    const prepared = prepareUserProfileForAgent(profile)!;
    expect(prepared.bazi).toEqual(fresh);
    expect(prepared.bazi?.ruleVersion).toBe(BAZI_RULE_VERSION);
    expect(prepared.bazi?.lateZiRule).toBe("next-day");
    expect(prepared.bazi?.qiYun.convention).toBe("exact");
    expect(prepared.birthLongitude).toBe(120.2);
    expect(profile.bazi?.mingGong.ganZhi).toBe("巳");
    if (birthTime === "04:30") {
      expect(prepared.bazi?.mingGong.ganZhi).toBe("癸未");
      expect(prepared.bazi?.shenGong.ganZhi).toBe("丁亥");
      expect(prepared.bazi?.shenSha.tianDe).toBeNull();
    }
  });
});
