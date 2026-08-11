import type { MentorId } from "./mentors";

export const DEFAULT_MENTOR_IDS = ["hu", "li", "xuan"] as const satisfies readonly MentorId[];

export class MentorSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MentorSelectionError";
  }
}

export function isMentorId(value: unknown): value is MentorId {
  return typeof value === "string" && DEFAULT_MENTOR_IDS.includes(value as MentorId);
}

/**
 * 请求参数归一化：缺省或三位全选沿用原路径；子集固定为茶寮发言顺序。
 * 空数组与非法值属于调用错误，不能静默退回三贤。
 */
export function parseMentorSelection(value: unknown): MentorId[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length === 0) {
    throw new MentorSelectionError("mentors 必须是至少包含一位角色的数组");
  }
  if (value.some((item) => !isMentorId(item))) {
    throw new MentorSelectionError("mentors 只允许 hu、li、xuan");
  }

  const selected = DEFAULT_MENTOR_IDS.filter((id) => value.includes(id));
  return selected.length === DEFAULT_MENTOR_IDS.length ? undefined : [...selected];
}

export function resolveMentorIds(value?: readonly MentorId[] | null): MentorId[] {
  if (!value?.length) return [...DEFAULT_MENTOR_IDS];
  return DEFAULT_MENTOR_IDS.filter((id) => value.includes(id));
}
