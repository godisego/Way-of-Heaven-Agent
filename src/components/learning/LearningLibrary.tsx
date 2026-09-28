"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GLOSSARY } from "@/data/concepts";
import { AGENT_LAYERS, getTrackDocs, LEARN_DOCS, type LearnDoc, type LearnTrack } from "@/data/learnDocs";
import { MingliQuickReference } from "@/components/learning/MingliQuickReference";
import { QuizPanel } from "@/components/learning/QuizPanel";
import { QUIZ_QUESTIONS } from "@/data/quizQuestions";
import { MistakeBook } from "@/components/learning/MistakeBook";
import { kbSize } from "@/core/mingli/mingliKb";
import { startLesson } from "@/components/learning/tourController";
import { loadReadProgress, PROGRESS_EVENT } from "./learningProgress";
import {
  PENDING_LIBRARY_TOUR_KEY,
  showFinalOnboardingHint,
} from "@/components/learning/onboardingTour";

type LearnView = "agent" | "mingli" | "quick";

const TRACK_COPY: Record<LearnTrack, { eyebrow: string; title: string; blurb: string; outcome: string }> = {
  agent: {
    eyebrow: "AI 与 Agent 五层学径",
    title: "从 AI 世界观，到系统设计与产品交付",
    blurb: "统一用五层地图学习：先把概念放对位置，再理解模型、搭建系统，最后验证用户价值。",
    outcome: "通过毕业实践，展示模型选型、Agent 系统设计、失败评测与业务收益测算能力。",
  },
  mingli: {
    eyebrow: "命理系统学径",
    title: "从盘面字段，到有依据地解释传统规则",
    blurb: "先认全四柱、干支与藏干，再建立十神和强弱坐标，最后叠加大运、流年与现实校准。",
    outcome: "通过统一案例，展示输入核验、十神换算与推导能力，并区分传统解释、项目算法和现实证据。",
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

function DocRow({ doc, sequence, read }: { doc: LearnDoc; sequence: number; read: boolean }) {
  return (
    <Link className="learn-lesson-row" href={`/learn/${doc.slug}`}>
      <span className="learn-lesson-number">{String(sequence).padStart(2, "0")}</span>
      <span className="learn-lesson-copy">
        <span className="learn-lesson-title">
          <strong>{doc.title}</strong>
          <em>{doc.role} · {doc.level}{read ? " · 已读" : ""}</em>
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
  const [coreOnly, setCoreOnly] = useState(false);
  const [read, setRead] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const sync = () => setRead(loadReadProgress());
    sync();
    window.addEventListener(PROGRESS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const coreDocs = docs.filter((doc) => doc.role === "必修");
  const visibleDocs = coreOnly ? coreDocs : docs;

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

      <div className="learn-route-controls">
        <div className="learn-route-actions" aria-label="课程范围">
          <button type="button" aria-pressed={!coreOnly} onClick={() => setCoreOnly(false)}>全部课程</button>
          <button type="button" aria-pressed={coreOnly} onClick={() => setCoreOnly(true)}>必修主线</button>
          <Link href={`/learn/${track === "agent" ? "ai-capstone" : "bazi-capstone"}`}>毕业实践与评分标准 →</Link>
        </div>
        <p>必修已读 {coreDocs.filter((doc) => read[doc.slug]).length} / {coreDocs.length} 篇 · 全部已读 {docs.filter((doc) => read[doc.slug]).length} / {docs.length} 篇。读完后手动标记，记录保存在此浏览器。</p>
        <small>按前置提示补课；选修用于拓展，项目案例记录设计演进。阅读、自测和实践分别评价。</small>
      </div>

      {track === "agent" ? (
        <section className="learn-ai-map" aria-label="AI 学习五层地图">
          <div className="learn-ai-map-intro">
            <div>
              <span className="learn-kicker">统一学习地图 · 2026-09-28 课程整理</span>
              <h3>每遇到一个新概念，先找到它的位置</h3>
            </div>
            <Link href="/learn/ai-learning-map">阅读地图与分层验收 →</Link>
          </div>
          <ol className="learn-ai-map-layers">
            {AGENT_LAYERS.map((layer, index) => (
              <li key={layer.stage}>
                <a href={`#agent-stage-${stages.indexOf(layer.stage) + 1}`}>
                  <span className="learn-kicker">第 {index + 1} 层</span>
                  <strong>{layer.title}</strong>
                  <span>{layer.question}</span>
                  <small>{layer.outcome}</small>
                </a>
              </li>
            ))}
          </ol>
          <p>按需补课：<Link href="/learn/web-api-basics">Web 与 API</Link> · <Link href="/learn/classification-probability-basics">分类、概率与评测</Link>。前沿选修：<Link href="/learn/jev-decision-models">Jev 与类型化决策</Link>。</p>
        </section>
      ) : null}

      <div className="learn-course-layout">
        <aside className="learn-stage-rail" data-tour-id="learn-stage-rail" aria-label={`${copy.eyebrow}阶段目录`}>
          <span>课程阶段</span>
          <nav>
            {stages.map((stage, index) => visibleDocs.some((doc) => doc.stage === stage) ? (
              <a key={stage} href={`#${track}-stage-${index + 1}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {stage.replace(/^.+?·\s*/, "")}
              </a>
            ) : null)}
          </nav>
          <small>{docs.length} 篇 · {stages.length} 个阶段</small>
        </aside>

        <div className="learn-course-flow" data-tour-id="learn-course-flow">
          {stages.map((stage, stageIndex) => {
            const stageDocs = visibleDocs.filter((doc) => doc.stage === stage);
            if (!stageDocs.length) return null;
            const modules = Array.from(new Set(stageDocs.map((doc) => doc.module ?? "")));
            return (
              <section className="learn-stage" id={`${track}-stage-${stageIndex + 1}`} key={stage}>
                <header className="learn-stage-head">
                  <span>{String(stageIndex + 1).padStart(2, "0")}</span>
                  <h3>{stage.replace(/^.+?·\s*/, "")}</h3>
                  <small>{stageDocs.length} 篇</small>
                </header>
                {modules.map((module) => <div key={module} className="learn-course-module">
                  {module && <h4>{module}</h4>}
                  <div className="learn-lesson-list">
                    {stageDocs.filter((doc) => (doc.module ?? "") === module).map((doc) => (
                      <DocRow key={doc.slug} doc={doc} sequence={docs.findIndex((item) => item.slug === doc.slug) + 1} read={read[doc.slug] === true} />
                    ))}
                  </div>
                </div>)}
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
            <small>知识检查 · 配合实践评价</small>
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
          <p>两条学径：AI 与 Agent、传统命理。另设命理速查工具，辅助阅读。讲义、自测与互动图无需 Key。</p>
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
            <span>AI 与 Agent 学径</span>
            <small>课程 · {getTrackDocs("agent").length} 篇 · 五层地图</small>
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
            <small>课程 · {getTrackDocs("mingli").length} 篇 · 规则与推导</small>
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
            <span>配套工具 · 命理速查</span>
            <small>{kbSize()} 词 · 供两条学径交叉查阅</small>
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
