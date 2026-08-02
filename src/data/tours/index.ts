/**
 * 学习中心 · 课程注册表（设计见 docs/learning-mode-design.md）
 *
 * 本项目的重心是 Agent 学习——Agent 径排第一。
 * 每课 = 一段 driver.js 步骤（3~10 步）+ 面板上的元信息。
 * steps() 返回纯数据；宿主元素是否存在由 tourController 在启动时兜底
 * （不存在的步骤降级为居中弹窗，内容不丢、位置不错）。
 */

import type { DriveStep } from "driver.js";
import { MINGLI_LESSONS } from "./mingli";
import { AGENT_LESSONS } from "./agent";
import { LIBRARY_LESSON } from "./library";

export type LessonId =
  | "agent-1"
  | "agent-2"
  | "agent-3"
  | "agent-4"
  | "agent-5"
  | "agent-6"
  | "library-tour"
  | "mingli-1"
  | "mingli-2"
  | "mingli-3"
  | "mingli-4"
  | "mingli-5";

export type Lesson = {
  id: LessonId;
  /** 面板序号（如「一」） */
  no: string;
  title: string;
  minutes: number;
  steps: () => DriveStep[];
};

export type LockedLesson = {
  id: string;
  no: string;
  title: string;
  /** 面板上的锁定说明 */
  lockNote: string;
};

export type LessonTrack = {
  key: "mingli" | "agent";
  title: string;
  blurb: string;
  lessons: Array<Lesson | LockedLesson>;
};

export function isAvailable(l: Lesson | LockedLesson): l is Lesson {
  return "steps" in l;
}

function byId(list: Lesson[], id: LessonId): Lesson {
  const found = list.find((l) => l.id === id);
  if (!found) throw new Error(`lesson not registered: ${id}`);
  return found;
}

export const LESSON_TRACKS: LessonTrack[] = [
  {
    key: "agent",
    title: "Agent 径 · 看懂机器怎么想",
    blurb: "本项目的重心 · 教具就是这套系统",
    lessons: [
      byId(AGENT_LESSONS, "agent-1"),
      byId(AGENT_LESSONS, "agent-2"),
      byId(AGENT_LESSONS, "agent-3"),
      byId(AGENT_LESSONS, "agent-4"),
      byId(AGENT_LESSONS, "agent-5"),
      byId(AGENT_LESSONS, "agent-6"),
    ],
  },
  {
    key: "mingli",
    title: "命理径 · 学会看自己的盘",
    blurb: "教材就是你的排盘",
    lessons: [
      byId(MINGLI_LESSONS, "mingli-1"),
      byId(MINGLI_LESSONS, "mingli-2"),
      byId(MINGLI_LESSONS, "mingli-3"),
      byId(MINGLI_LESSONS, "mingli-4"),
      byId(MINGLI_LESSONS, "mingli-5"),
    ],
  },
];

export function getLesson(id: LessonId): Lesson | null {
  if (id === LIBRARY_LESSON.id) return LIBRARY_LESSON;
  for (const track of LESSON_TRACKS) {
    for (const l of track.lessons) {
      if (isAvailable(l) && l.id === id) return l;
    }
  }
  return null;
}
