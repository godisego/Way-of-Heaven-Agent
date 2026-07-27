/**
 * 问者档（user profile）—— 用户填一次，三贤 agent 后续每次对话都看得到。
 *
 * 设计原则：
 * - 必填：出生日期 / 时间 / 地点 / 现居地（排盘 + 命理引用最少要这些）
 * - 选填：性别（决定大运顺逆排）、学历 / 工作 / 感情（人生导师视角）
 * - 排盘结果 bazi 自动算，不让用户手填
 *
 * 存储走 localStorage（src/data/userProfileStore.ts），将来切 Supabase 时只换 store 实现。
 */

import { findDaYunForYear, type BaziResult } from "@/core/user/baziCalculator";
import { currentLiuNian } from "@/core/mingli/liuNian";

export type Gender = "male" | "female";

export type UserProfile = {
  /** 出生日期 YYYY-MM-DD（阳历） */
  birthDate: string;
  /** 出生时间 HH:MM（24h） */
  birthTime: string;
  /** 出生地点（省市或城市） */
  birthPlace: string;
  /** 出生经度（东经，度）。提供则排盘做真太阳时校正。 */
  birthLongitude?: number;
  /** 现居地（省市或城市） */
  currentPlace: string;
  /** 性别（决定大运顺逆排） */
  gender: Gender;

  /** 学历（选填，自由文本） */
  education?: string;
  /** 工作（选填，自由文本） */
  work?: string;
  /** 感情状态（选填，自由文本） */
  relationship?: string;

  /** 排盘结果（自动算） */
  bazi?: BaziResult;

  /** 最后更新时间（ISO 8601） */
  updatedAt: string;
};

/** 问者档是否完整（必填字段都填了） */
export function isProfileComplete(p: UserProfile | null | undefined): p is UserProfile {
  if (!p) return false;
  return Boolean(p.birthDate && p.birthTime && p.birthPlace && p.currentPlace && p.gender);
}

/** 问者档给 agent 看的摘要（一段话，注入 system prompt） */
export function profileToAgentText(p: UserProfile): string {
  if (!isProfileComplete(p)) return "";
  const bz = p.bazi;
  const lines: string[] = [];
  lines.push(
    `生于 ${p.birthDate} ${p.birthTime}（${p.birthPlace}，${p.birthLongitude ? `东经 ${p.birthLongitude}°` : "未填经度"}），现居 ${p.currentPlace}。性别：${
      p.gender === "male" ? "男" : "女"
    }。`,
  );
  if (bz) {
    if (bz.solar.deltaMinutes !== 0) {
      lines.push(
        `真太阳时校正：${bz.solar.correctedTime}（时差 ${bz.solar.deltaMinutes} 分钟，${bz.solar.dayShift === 0 ? "同日" : "跨日"})。`,
      );
    }
    lines.push(
      `八字：${bz.bazi.year.ganZhi} ${bz.bazi.month.ganZhi} ${bz.bazi.day.ganZhi} ${bz.bazi.time.ganZhi}（年支 ${bz.shengXiao}）。日主 ${bz.dayMaster}（${bz.dayMasterWuXing}）。`,
    );
    lines.push(
      `五行分布：金${bz.wuXingCount.金} 木${bz.wuXingCount.木} 水${bz.wuXingCount.水} 火${bz.wuXingCount.火} 土${bz.wuXingCount.土}。`,
    );
    const currentDaYun = findDaYunForYear(bz.daYun);
    if (currentDaYun) {
      lines.push(
        `当前大运：${currentDaYun.ganZhi}（${currentDaYun.startYear} 年起，${currentDaYun.startAge} 岁后行运）。`,
      );
    }
    if (typeof bz.qiYun?.display === "string") {
      lines.push(`起运：${bz.qiYun.display}（虚岁 ${bz.qiYun.startAge} 岁上运）。`);
    }
    const ln = currentLiuNian();
    lines.push(`今年流年：${ln.ganZhi}（${ln.year} 年，以立春为界）。`);
    if (bz.xiaoYun) {
      const xys = bz.xiaoYun.steps.slice(0, 5).map((s) => `${s.age}岁${s.ganZhi}`).join("、");
      lines.push(`小运${bz.xiaoYun.direction}（从时柱起）：${xys}…`);
    }
  }
  if (p.education) lines.push(`学历：${p.education}。`);
  if (p.work) lines.push(`工作：${p.work}。`);
  if (p.relationship) lines.push(`感情：${p.relationship}。`);
  return lines.join(" ");
}
