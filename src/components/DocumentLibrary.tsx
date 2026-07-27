"use client";

import { useEffect, useState } from "react";

type DocumentRow = {
  id: string;
  originalFileName: string;
  bookTitle: string | null;
  author: string | null;
  tradition: string | null;
  fileType: "pdf" | "markdown" | "text";
  pageCount: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  uploaded: "待缮",
  extracting: "开卷",
  indexing: "入册",
  indexed: "已藏",
  failed: "未成",
};

const STATUS_TIPS: Record<string, string> = {
  uploaded: "刚收下文件，等待解析。",
  extracting: "正在按章节解析文本。",
  indexing: "正在把文本切 chunk、调 embedding、写向量库。",
  indexed: "已入库，问答时这里的内容会被检索到。",
  failed: "入库失败。见下方错误说明。",
};

const TRADITION_LABEL: Record<string, string> = {
  existentialism: "存在主义",
  yijing: "易经命理",
  stoicism: "斯多葛",
  "chinese-classics": "中华典籍",
  daoism: "道家",
  tiandao: "天道/格律",
};

function traditionText(value: string | null): string | null {
  if (!value) return null;
  return TRADITION_LABEL[value] ?? value;
}

/** 专库归属徽标：由 tradition 标签映射到三贤权属（与 mentors.ts 的 traditions 声明一致） */
function ownerText(tradition: string | null): string {
  switch (tradition) {
    case "existentialism":
    case "stoicism":
      return "李库";
    case "yijing":
      return "胡库";
    case "daoism":
      return "玄库";
    case "chinese-classics":
      return "胡·玄";
    case "tiandao":
      return "三贤同修";
    default:
      return "共享·可补标";
  }
}

export function DocumentLibrary() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/documents", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "未能读取典籍库");
      return;
    }
    setDocuments(data.documents ?? []);
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("documents:changed", handler);
    return () => window.removeEventListener("documents:changed", handler);
  }, []);

  return (
    <section
      className="card"
      data-tour-id="library-card"
      data-tip="你上传过的所有典籍与笔记。每条带状态徽标(uploaded → extracting → indexing → indexed),failed 时还会显示错误信息。"
    >
      <div className="card-title">
        <h2>斋中藏卷</h2>
        <span className="card-hint">{documents.length ? `${documents.length} 卷` : "空阁"}</span>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="document-list">
        {documents.length === 0 ? (
          <div className="empty-state" data-tip="还没有典籍。先去上面传一份 md/txt/pdf。">
            <div className="empty-glyph">空</div>
            <p>斋中尚无卷轴。请先于上方「藏书」入典。</p>
          </div>
        ) : null}

        {documents.map((doc) => {
          const tradition = traditionText(doc.tradition);
          const statusClass = `status status-${doc.status}`;
          return (
            <article className="document-item" key={doc.id}>
              <div className="document-item-head">
                <strong>{doc.bookTitle ?? doc.originalFileName}</strong>
                <span className="document-item-badges">
                  <span
                    className="owner-badge"
                    data-tip="这卷书归哪位的专库：检索分库后，只有对应的贤者能引用它（未标注 = 三人共享）。"
                  >
                    {ownerText(doc.tradition)}
                  </span>
                  <span
                    className={statusClass}
                    data-tip={STATUS_TIPS[doc.status] ?? `当前状态：${doc.status}`}
                  >
                    {STATUS_LABEL[doc.status] ?? doc.status}
                  </span>
                </span>
              </div>
              <div className="meta" data-tip="入库时的元数据：思想传统 / 来源单元数 / 作者。">
                {[
                  tradition,
                  `${doc.pageCount || "?"} ${doc.fileType === "pdf" ? "页" : "节"}`,
                  doc.author,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              {doc.errorMessage ? <p className="error">{doc.errorMessage}</p> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
