/**
 * 声口校验器 —— 反「角色坍缩」的程序化防线。
 *
 * 大模型在单次生成多角色时会漂移成统一模板腔。提示词负责引导，
 * 本模块负责硬性检测：全部规则是确定性的字符串检查，高精度优先
 * （宁可漏报，不可误伤正常发言触发无谓重试）。
 *
 * 检测项（全部为 FAIL 级，任一命中 → 整组重试一次）：
 *  1. missing-role   三位必须都到场
 *  2. wrong-order    顺序必须 老胡 → 李 → 玄
 *  3. cross-voice    他人的专属自称/口头禅出现在错误的段落
 *  4. li-mingli      李使用命理语汇（干支、五行、大运……）——结构性隔离的兜底
 *  5. broke-character AI 自指（"作为AI/人工智能/大模型"）
 */

import type { DialogueSegment, MentorId } from "@/data/mentors";
import { resolveMentorIds } from "@/data/mentorSelection";

export type VoiceViolation = {
  kind: "missing-role" | "unexpected-role" | "wrong-order" | "cross-voice" | "li-mingli" | "broke-character";
  mentorId: MentorId | null;
  detail: string;
};

/** 各角色的专属声口标记（只用高置信度的自称与标志性口头禅，避免误伤） */
const VOICE_MARKERS: Record<MentorId, string[]> = {
  hu: ["老夫", "听老胡一句", "老朽"],
  li: [], // 李无独占自称（"我/李"太通用），靠禁入他人标记与禁命理约束
  xuan: ["贫道", "且去，莫急", "且去莫急"],
};

/** 李的命理语汇禁区：明确术语可直接判定，天干单字必须带命理上下文。 */
const LI_MINGLI_TERM_PATTERN =
  /大运|流年|八字|排盘|命理|五行|日主|日元|神煞|太岁|生辰|命宫|干支|起运/;
const STEM = "[甲乙丙丁戊己庚辛壬癸]";
const BRANCH = "[子丑寅卯辰巳午未申酉戌亥]";
const FIVE_ELEMENT = "[木火土金水]";
const LI_MINGLI_STEM_PATTERNS = [
  new RegExp(`${STEM}(?:${BRANCH}|${FIVE_ELEMENT})`),
  new RegExp(`(?:天干|年干|月干|日干|时干|日主|日元)(?:为|是|属|：|:|\\s)*${STEM}`),
];

/** 返回李段中第一个高置信度命理词；普通词“自己、甲方、辛苦”等不会命中。 */
export function findLiMingliTerm(text: string): string | null {
  const explicit = text.match(LI_MINGLI_TERM_PATTERN);
  if (explicit) return explicit[0];
  for (const pattern of LI_MINGLI_STEM_PATTERNS) {
    const contextual = text.match(pattern);
    if (contextual) return contextual[0];
  }
  return null;
}

/** AI 自指 / 出戏 */
const BREAK_CHARACTER_PATTERN = /作为(一个|一名)?(AI|人工智能|大语言模型|语言模型|助手)|我是(一个|一名)?(AI|人工智能|大?语言模型)/i;

const EXPECTED_ORDER: MentorId[] = ["hu", "li", "xuan"];
const MENTOR_CN: Record<MentorId, string> = { hu: "老胡", li: "李", xuan: "玄" };

export function checkVoice(
  segments: DialogueSegment[],
  mentorIds?: readonly MentorId[],
): VoiceViolation[] {
  const violations: VoiceViolation[] = [];
  const expectedOrder = resolveMentorIds(mentorIds);
  const mentorSegments = segments.filter(
    (s): s is DialogueSegment & { mentorId: MentorId } => s.mentorId !== null,
  );

  // 1) 应到角色齐全，未被邀请的角色不得出现
  const presentIds = mentorSegments.map((s) => s.mentorId);
  for (const id of expectedOrder) {
    if (!presentIds.includes(id)) {
      violations.push({
        kind: "missing-role",
        mentorId: id,
        detail: `${MENTOR_CN[id]}缺席——本轮必须由在席角色完整发言`,
      });
    }
  }
  for (const id of presentIds) {
    if (!expectedOrder.includes(id)) {
      violations.push({
        kind: "unexpected-role",
        mentorId: id,
        detail: `${MENTOR_CN[id]}未在本轮受邀名单中，不应出现`,
      });
    }
  }

  // 2) 按茶寮固定顺序检查本轮在席角色
  const orderFiltered = presentIds.filter((id) => expectedOrder.includes(id));
  const expectedFiltered = expectedOrder.filter((id) => presentIds.includes(id));
  if (orderFiltered.join(",") !== expectedFiltered.join(",")) {
    violations.push({
      kind: "wrong-order",
      mentorId: null,
      detail: `发言顺序应为 ${expectedOrder.map((id) => MENTOR_CN[id]).join(" → ")}，实际为 ${presentIds.map((i) => MENTOR_CN[i]).join(" → ")}`,
    });
  }

  for (const seg of mentorSegments) {
    const body = seg.body;

    // 3) 串味：他人的专属标记出现在本段
    for (const otherId of EXPECTED_ORDER) {
      if (otherId === seg.mentorId) continue;
      for (const marker of VOICE_MARKERS[otherId]) {
        if (body.includes(marker)) {
          violations.push({
            kind: "cross-voice",
            mentorId: seg.mentorId,
            detail: `${MENTOR_CN[seg.mentorId]}的发言里出现了${MENTOR_CN[otherId]}的专属语「${marker}」`,
          });
        }
      }
    }

    // 4) 李禁命理语汇
    if (seg.mentorId === "li") {
      const term = findLiMingliTerm(body);
      if (term) {
        violations.push({
          kind: "li-mingli",
          mentorId: "li",
          detail: `李使用了命理语汇「${term}」——李只谈处境、选择与责任，命理由老胡与玄负责`,
        });
      }
    }

    // 5) AI 自指
    if (BREAK_CHARACTER_PATTERN.test(body)) {
      violations.push({
        kind: "broke-character",
        mentorId: seg.mentorId,
        detail: `${MENTOR_CN[seg.mentorId]}的发言出现 AI 自指，出戏`,
      });
    }
  }

  return violations;
}

/** 把违规列表拼成重试提示（喂回模型的具体整改要求） */
export function violationRetryText(violations: VoiceViolation[]): string {
  return violations.map((v) => `- ${v.detail}`).join("\n");
}
