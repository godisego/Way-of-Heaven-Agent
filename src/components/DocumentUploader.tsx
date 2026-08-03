"use client";

import { useRef, useState } from "react";
import { MENTORS } from "@/data/mentors";
import { providerSettingsApi } from "@/data/providerSettingsStore";

/** 从三贤专库汇总标签，并保留斯多葛等扩展传统 */
const TRADITION_OPTIONS: Array<{ value: string; label: string }> = (() => {
  const map = new Map<string, string>();
  for (const mentor of MENTORS) {
    for (const t of mentor.traditions) map.set(t.key, t.label);
  }
  if (!map.has("stoicism")) map.set("stoicism", "斯多葛");
  if (!map.has("tiandao")) map.set("tiandao", "天道/格律");
  return [...map.entries()].map(([value, label]) => ({ value, label }));
})();

// 上传书籍/笔记文件（.md/.txt/.pdf），交给 /api/ingest 解析入库。
export function DocumentUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [tradition, setTradition] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleUpload() {
    if (!file) {
      setError("请先选择一份典籍或笔记（.md / .txt / .pdf）");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.append("file", file);
      if (bookTitle.trim()) form.append("bookTitle", bookTitle.trim());
      if (tradition.trim()) form.append("tradition", tradition.trim());
      // 附带前端面板的 embedding 设置（切真实模型时用用户配置）
      const settings = await providerSettingsApi.load();
      form.append("settings", JSON.stringify(settings));

      const response = await fetch("/api/ingest", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "入库未成");
        return;
      }
      const unit = data.document?.fileType === "pdf" ? "页" : "节";
      setNotice(
        `已入藏：${data.document?.bookTitle ?? file.name}（${data.document?.pageCount ?? "?"} ${unit}）`,
      );
      setFile(null);
      setBookTitle("");
      setTradition("");
      if (inputRef.current) inputRef.current.value = "";
      window.dispatchEvent(new Event("documents:changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "入库未成");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="card"
      data-tour-id="uploader-card"
      data-tip="把书籍、笔记或文献（.md/.txt/.pdf）传进来。系统会按章节解析 → 切 chunk → embedding → 进向量库，之后问答时会被检索到。"
    >
      <div className="card-title">
        <h2>入阁藏书</h2>
        <span className="card-hint">供三贤取用</span>
      </div>

      <div className="uploader">
        <label className={`file-drop${file ? " has-file" : ""}`}>
          <input
            ref={inputRef}
            type="file"
            accept=".md,.markdown,.txt,.text,.pdf"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError("");
              setNotice("");
            }}
          />
          <span className="file-drop-icon">冊</span>
          <span className="file-drop-title">{file ? "已择书卷" : "点此择卷"}</span>
          <span className="file-drop-meta">支持 Markdown · 纯文本 · PDF</span>
          {file ? <span className="file-name">{file.name}</span> : null}
        </label>

        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="book-title">书名（可选）</label>
          <input
            id="book-title"
            className="field-input"
            type="text"
            placeholder="如：存在与虚无"
            value={bookTitle}
            onChange={(event) => setBookTitle(event.target.value)}
          />
        </div>

        <div className="field">
          <label>思想传统（可选）</label>
          <div className="tradition-chips">
            {TRADITION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`chip${tradition === option.value ? " active" : ""}`}
                onClick={() =>
                  setTradition((prev) => (prev === option.value ? "" : option.value))
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <button className="primary-button full-width" onClick={handleUpload} disabled={busy}>
          {busy ? "缮录中…" : "入藏"}
        </button>

        {notice ? <p className="notice">{notice}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </section>
  );
}
