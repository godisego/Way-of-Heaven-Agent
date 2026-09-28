"use client";

import { useEffect, useState } from "react";
import { loadReadProgress, PROGRESS_EVENT, setDocRead } from "./learningProgress";

export function LessonProgress({ slug }: { slug: string }) {
  const [read, setRead] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const sync = () => setRead(loadReadProgress()[slug] === true);
    sync();
    setReady(true);
    window.addEventListener(PROGRESS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [slug]);
  return (
    <section className="learn-reading-record" aria-label="阅读记录">
      <button type="button" disabled={!ready} aria-pressed={read} onClick={() => setError(!setDocRead(slug, !read))}>
        {read ? "已读 · 点击取消" : "标记为已读"}
      </button>
      <p aria-live="polite">{error ? "浏览器未能保存记录，请检查本地存储权限。" : "阅读记录只保存在此浏览器；已读、自测与毕业实践分别评价。"}</p>
    </section>
  );
}
