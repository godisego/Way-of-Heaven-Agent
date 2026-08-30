"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GLOSSARY } from "@/data/concepts";
import { getTrackDocs, LEARN_DOCS, type LearnDoc, type LearnTrack } from "@/data/learnDocs";
import { MingliQuickReference } from "@/components/learning/MingliQuickReference";
import { QuizPanel } from "@/components/learning/QuizPanel";
import { QUIZ_QUESTIONS } from "@/data/quizQuestions";
import { MistakeBook } from "@/components/learning/MistakeBook";
import { kbSize } from "@/core/mingli/mingliKb";
import { startLesson } from "@/components/learning/tourController";
import {
  PENDING_LIBRARY_TOUR_KEY,
  showFinalOnboardingHint,
} from "@/components/learning/onboardingTour";

type LearnView = "agent" | "mingli" | "quick";

const TRACK_COPY: Record<LearnTrack, { eyebrow: string; title: string; blurb: string; outcome: string }> = {
  agent: {
    eyebrow: "Agent 工程学径",
    title: "从一次请求，读懂一套智能体",
    blurb: "先认 RAG 与 Agent 的基本零件，再沿着真实请求拆架构、可信检索、工具循环、调试与评测。",
    outcome: "能沿执行轨迹定位第一处错误，并把失败沉淀成可回归的评测。",
  },
  mingli: {
    eyebrow: "命理系统学径",
    title: "从盘面字段，到独立完成一次读盘",
    blurb: "先认全四柱、干支与藏干，再建立十神和强弱坐标，最后叠加大运、流年与现实校准。",
    outcome: "能按七步流程解释一张盘，并清楚区分传统定义、项目算法和未覆盖边界。",
  },
};

const VIEW_HASH: Record<LearnView, string> = {
  agent: "agent-curriculum",
  mingli: "mingli-curriculum",
  quick: "mingli-quick-title",
};

function viewFromHash(hash: string): LearnView {
  if (hash === "#mingli-curriculum" || hash.startsWith("#mingli-stage-")) return "mingli";
  if (hash.startsWith("#mingli-") && hash !== "#mingli-curriculum") return "quick";
  return "agent";
}

function DocRow({ doc, sequence }: { doc: LearnDoc; sequence: number }) {
  return (
    <Link className="learn-lesson-row" href={`/learn/${doc.slug}`}>
      <span className="learn-lesson-number">{String(sequence).padStart(2, "0")}</span>
      <span className="learn-lesson-copy">
        <span className="learn-lesson-title">
          <strong>{doc.title}</strong>
          <em>{doc.level}</em>
        </span>
        <span className="learn-lesson-blurb">{doc.blurb}</span>
        {doc.quickRefs?.length ? (
          <small>{doc.quickRefs.map((item) => item.label).join(" · ")}</small>
        ) : null}
      </span>
      <span className="learn-lesson-arrow" aria-hidden="true">→</span>
    </Link>
  );
}

function Curriculum({ track, onOpenQuick }: { track: LearnTrack; onOpenQuick: () => void }) {
  const docs = getTrackDocs(track);
  const copy = TRACK_COPY[track];
  const stages = Array.from(new Set(docs.map((doc) => doc.stage)));

  return (
    <section className={`learn-curriculum learn-curriculum-${track}`} id={`${track}-curriculum`}>
      <header className="learn-route-head" data-tour-id="learn-route-head">
        <div className="learn-route-copy">
          <span className="learn-kicker">{copy.eyebrow}</span>
          <h2>{copy.title}</h2>
          <p>{copy.blurb}</p>
        </div>
        <div className="learn-route-goal">
          <span>完成这条学径后</span>
          <p>{copy.outcome}</p>
          <div className="learn-route-actions">
            <Link className="learn-primary-link" href={`/learn/${docs[0].slug}`}>
              从第 01 课开始 <span aria-hidden="true">→</span>
            </Link>
            {track === "mingli" ? (
              <button type="button" className="learn-secondary-link" onClick={onOpenQuick}>
                打开命理速查
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="learn-course-layout">
        <aside className="learn-stage-rail" data-tour-id="learn-stage-rail" aria-label={`${copy.eyebrow}阶段目录`}>
          <span>课程阶段</span>
          <nav>
            {stages.map((stage, index) => (
              <a key={stage} href={`#${track}-stage-${index + 1}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {stage.replace(/^.+?·\s*/, "")}
              </a>
            ))}
          </nav>
          <small>{docs.length} 篇 · {stages.length} 个阶段</small>
        </aside>

        <div className="learn-course-flow" data-tour-id="learn-course-flow">
          {stages.map((stage, stageIndex) => {
            const stageDocs = docs.filter((doc) => doc.stage === stage);
            return (
              <section className="learn-stage" id={`${track}-stage-${stageIndex + 1}`} key={stage}>
                <header className="learn-stage-head">
                  <span>{String(stageIndex + 1).padStart(2, "0")}</span>
                  <h3>{stage.replace(/^.+?·\s*/, "")}</h3>
                  <small>{stageDocs.length} 篇</small>
                </header>
                <div className="learn-lesson-list">
                  {stageDocs.map((doc) => (
                    <DocRow
                      key={doc.slug}
                      doc={doc}
                      sequence={docs.findIndex((item) => item.slug === doc.slug) + 1}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {track === "agent" ? (
        <details className="learn-glossary-panel" data-tour-id="learn-glossary">
          <summary>
            <span>
              <small>配套索引</small>
              Agent 核心术语
            </span>
            <em>{GLOSSARY.agent.length} 项</em>
          </summary>
          <dl className="learn-glossary">
            {GLOSSARY.agent.map((concept) => (
              <div className="learn-term" key={concept.term}>
                <dt>
                  {concept.term}
                  {concept.where ? <small>{concept.where}</small> : null}
                </dt>
                <dd style={{ whiteSpace: "pre-line" }}>{concept.explanation}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}

      {/* 自测练习 + 错题本 */}
      <details className="learn-quiz-panel" data-tour-id="learn-quiz">
        <summary>
          <span>
            <small>检测学力</small>
            自测练习
          </span>
          <em>{QUIZ_QUESTIONS.filter((q) => q.track === track).length} 题</em>
        </summary>
        <QuizPanel track={track} />
      </details>

      <details className="learn-mistake-panel" data-tour-id="learn-mistakes">
        <summary>
          <span>
            <small>本机记录</small>
            错题本
          </span>
          <em>自动收集</em>
        </summary>
        <MistakeBook />
      </details>
    </section>
  );
}

/** 学习馆工作台：三种任务只展示一个主视图，避免课程与词条同时堆满页面。 */
export function LearningLibrary() {
  const [activeView, setActiveView] = useState<LearnView>("agent");

  useEffect(() => {
    function syncFromHash() {
      setActiveView(viewFromHash(window.location.hash));
      const targetId = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document.getElementById(targetId)?.scrollIntoView({ block: "start" });
        });
      });
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  // 首次引导链：从首页跳转过来时自动启动学习馆导览，完成后回首页配置供应商。
  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_LIBRARY_TOUR_KEY);
    if (!pending) return;
    sessionStorage.removeItem(PENDING_LIBRARY_TOUR_KEY);
    // 等页面完全渲染后再启动 tour（driver.js 需要目标元素已挂载）
    const timer = window.setTimeout(() => {
      startLesson(pending as "library-tour", () => {
        showFinalOnboardingHint();
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);

  function activate(view: LearnView) {
    setActiveView(view);
    window.history.replaceState(null, "", `#${VIEW_HASH[view]}`);
    window.requestAnimationFrame(() => {
      document.getElementById("learn-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function startLibraryTour() {
    setActiveView("agent");
    window.history.replaceState(null, "", "#agent-curriculum");
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => startLesson("library-tour"), 180);
    });
  }

  return (
    <>
      <nav className="learn-topbar" aria-label="学习馆位置">
        <Link href="/">← 天道茶寮</Link>
        <div className="learn-topbar-actions">
          <span>知识与训练</span>
          <button type="button" onClick={startLibraryTour}>学习馆导览</button>
        </div>
      </nav>

      <header className="learn-home-head" data-tour-id="learn-home-head">
        <div className="learn-home-copy">
          <span className="learn-kicker">系统课程库</span>
          <h1>学习馆</h1>
          <p>两条完整学径，一套随时可查的命理词典。内容与互动图都在本地，无需 Key。</p>
        </div>
        <dl className="learn-overview-stats" aria-label="学习馆内容统计">
          <div><dt>课程讲义</dt><dd>{LEARN_DOCS.length}</dd></div>
          <div><dt>学习阶段</dt><dd>{new Set(LEARN_DOCS.map((d) => d.stage)).size}</dd></div>
          <div><dt>速查词条</dt><dd>{kbSize()}</dd></div>
        </dl>
      </header>

      <div className="learn-workspace" id="learn-workspace">
        <nav className="learn-view-switch" data-tour-id="learn-view-switch" role="tablist" aria-label="选择学习内容">
          <button
            type="button"
            role="tab"
            id="learn-tab-agent"
            aria-controls="learn-view-panel"
            aria-selected={activeView === "agent"}
            className={activeView === "agent" ? "is-active is-agent" : "is-agent"}
            onClick={() => activate("agent")}
          >
            <span>Agent 学径</span>
            <small>{getTrackDocs("agent").length} 篇 · 工程实践</small>
          </button>
          <button
            type="button"
            role="tab"
            id="learn-tab-mingli"
            aria-controls="learn-view-panel"
            aria-selected={activeView === "mingli"}
            className={activeView === "mingli" ? "is-active is-mingli" : "is-mingli"}
            onClick={() => activate("mingli")}
          >
            <span>命理学径</span>
            <small>{getTrackDocs("mingli").length} 篇 · 系统读盘</small>
          </button>
          <button
            type="button"
            role="tab"
            id="learn-tab-quick"
            aria-controls="learn-view-panel"
            aria-selected={activeView === "quick"}
            className={activeView === "quick" ? "is-active is-quick" : "is-quick"}
            onClick={() => activate("quick")}
          >
            <span>命理速查</span>
            <small>{kbSize()} 词 · 交叉索引</small>
          </button>
        </nav>

        <div
          className="learn-view-panel"
          id="learn-view-panel"
          role="tabpanel"
          aria-labelledby={`learn-tab-${activeView}`}
        >
          {activeView === "agent" ? <Curriculum track="agent" onOpenQuick={() => activate("quick")} /> : null}
          {activeView === "mingli" ? <Curriculum track="mingli" onOpenQuick={() => activate("quick")} /> : null}
          {activeView === "quick" ? <MingliQuickReference /> : null}
        </div>
      </div>
    </>
  );
}
