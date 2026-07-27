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

export type VoiceViolation = {
  kind: "missing-role" | "wrong-order" | "cross-voice" | "li-mingli" | "broke-character";
  mentorId: MentorId | null;
  detail: string;
};

/** 各角色的专属声口标记（只用高置信度的自称与标志性口头禅，避免误伤） */
const VOICE_MARKERS: Record<MentorId, string[]> = {
  hu: ["老夫", "听老胡一句", "老朽"],
  li: [], // 李无独占自称（"我/李"太通用），靠禁入他人标记与禁命理约束
  xuan: ["贫道", "且去，莫急", "且去莫急"],
};

/** 李的命理语汇禁区：天干地支单字 + 明确命理术语 */
const LI_MINGLI_PATTERN =
  /[甲乙丙丁戊己庚辛壬癸]|大运|流年|八字|排盘|命理|五行|日主|神煞|太岁|生辰|命宫|干支|起运/;

/** AI 自指 / 出戏 */
const BREAK_CHARACTER_PATTERN = /作为(一个|一名)?(AI|人工智能|大语言模型|语言模型|助手)|我是(一个|一名)?(AI|人工智能|大?语言模型)/i;

const EXPECTED_ORDER: MentorId[] = ["hu", "li", "xuan"];
const MENTOR_CN: Record<MentorId, string> = { hu: "老胡", li: "李", xuan: "玄" };

export function checkVoice(segments: DialogueSegment[]): VoiceViolation[] {
  const violations: VoiceViolation[] = [];
  const mentorSegments = segments.filter(
    (s): s is DialogueSegment & { mentorId: MentorId } => s.mentorId !== null,
  );

  // 1) 三位都到场
  const presentIds = mentorSegments.map((s) => s.mentorId);
  for (const id of EXPECTED_ORDER) {
    if (!presentIds.includes(id)) {
      violations.push({
        kind: "missing-role",
        mentorId: id,
        detail: `${MENTOR_CN[id]}缺席——必须恰好三段发言`,
      });
    }
  }

  // 2) 顺序 老胡 → 李 → 玄（对到场者检查相对顺序）
  const orderFiltered = presentIds.filter((id) => EXPECTED_ORDER.includes(id));
  const expectedFiltered = EXPECTED_ORDER.filter((id) => presentIds.includes(id));
  if (orderFiltered.join(",") !== expectedFiltered.join(",")) {
    violations.push({
      kind: "wrong-order",
      mentorId: null,
      detail: `发言顺序应为 老胡 → 李 → 玄，实际为 ${presentIds.map((i) => MENTOR_CN[i]).join(" → ")}`,
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
      const m = body.match(LI_MINGLI_PATTERN);
      if (m) {
        violations.push({
          kind: "li-mingli",
          mentorId: "li",
          detail: `李使用了命理语汇「${m[0]}」——李只谈处境、选择与责任，命理由老胡与玄负责`,
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
