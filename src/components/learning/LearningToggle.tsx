"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLearning } from "./LearningProvider";
import { startLesson } from "./tourController";
import { loadProgress, PROGRESS_EVENT } from "./learningProgress";
import { LESSON_TRACKS, isAvailable, type LessonId } from "@/data/tours";

/**
 * 右下浮动：学习中心。
 * 点主按钮 = 打开面板并激活学习模式（术语悬浮）；
 * 面板里选课启动导览；「关闭学习模式」一并收起。
 */
export function LearningToggle() {
  const { enabled, setEnabled } = useLearning();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setProgress(loadProgress());
    const refresh = () => setProgress(loadProgress());
    window.addEventListener(PROGRESS_EVENT, refresh);
    return () => window.removeEventListener(PROGRESS_EVENT, refresh);
  }, []);

  function onMainClick() {
    if (open) {
      setOpen(false);
      return;
    }
    setEnabled(true);
    setOpen(true);
  }

  function onLesson(id: LessonId) {
    setOpen(false);
    // 面板先收起，让 driver 的遮罩接管视野
    setTimeout(() => startLesson(id), 80);
  }

  function closeAll() {
    setOpen(false);
    setEnabled(false);
  }

  return (
    <div className="learning-dock" aria-label="学习中心">
      {open ? (
        <div className="learning-center" role="dialog" aria-label="学习中心面板">
          <div className="learning-center-head">
            <strong>学习中心</strong>
            <span className="learning-center-sub">双学径 · 本地内容无需 Key</span>
          </div>

          {LESSON_TRACKS.map((track) => (
            <div className="learning-track" key={track.key}>
              <div className="learning-track-title">
                {track.title}
                <span className="learning-track-blurb">{track.blurb}</span>
              </div>
              {track.lessons.map((lesson) =>
                isAvailable(lesson) ? (
                  <button
                    key={lesson.id}
                    type="button"
                    className="learning-lesson"
                    onClick={() => onLesson(lesson.id)}
                  >
                    <span className={`learning-lesson-mark${progress[lesson.id] ? " done" : ""}`}>
                      {progress[lesson.id] ? "✓" : lesson.no}
                    </span>
                    <span className="learning-lesson-title">{lesson.title}</span>
                    <span className="learning-lesson-min">{lesson.minutes} 分钟</span>
                  </button>
                ) : (
                  <div key={lesson.id} className="learning-lesson is-locked">
                    <span className="learning-lesson-mark">{lesson.no}</span>
                    <span className="learning-lesson-title">{lesson.title}</span>
                    <span className="learning-lesson-min">{lesson.lockNote}</span>
                  </div>
                ),
              )}
            </div>
          ))}

          <div className="learning-center-foot">
            <Link className="learning-center-link" href="/learn">
              学习馆 · 全部走读文档与术语表 →
            </Link>
            <span className="learning-center-note">开启期间悬浮界面元素可看讲解</span>
            <button type="button" className="learning-center-off" onClick={closeAll}>
              关闭学习模式
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="learning-dock-btn"
        data-tour-id="learning-entry"
        onClick={onMainClick}
        aria-pressed={enabled}
        aria-expanded={open}
        title={open ? "收起学习中心" : "学习中心：双学径课程 + 术语悬浮讲解"}
      >
        {enabled ? "学习中心" : "学习"}
      </button>
    </div>
  );
}
