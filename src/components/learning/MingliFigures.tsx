"use client";

import { useState } from "react";
import { ExampleChartFigure } from "./ExampleChartFigure";

/**
 * 命理可视化图表集（讲义页文末"相关图表"区，按 slug 显示对应图表）。
 *
 * 设计原则：
 * - 固定位置（文末），不突兀打断正文
 * - 配色匹配月白主题（沉朱/竹月/墨色，降饱和五行色）
 * - 可点击交互（点击元素高亮关系）
 * - 自包含（不点也有完整说明）
 *
 * 用法：在 learn/[slug]/page.tsx 末尾，传 slug 给本组件，
 * 它按 slug 决定显示哪些图表（讲到五行才显示五行图）。
 */

const COLORS = {
  mu: "#7a9d76", // 木
  huo: "#c46b5e", // 火
  tu: "#b89970", // 土
  jin: "#9a9a9f", // 金
  shui: "#6a87a0", // 水
  cinnabar: "#a8473c",
};

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

type FigItem = { id: string; title: string };

/** slug → 该讲义相关的图表列表 */
const DOC_FIGURES: Record<string, FigItem[]> = {
  "bazi-stems-branches": [{ id: "wuxing", title: "五行生克关系" }],
  "bazi-ten-gods-strength": [
    { id: "wuxing", title: "五行生克关系" },
    { id: "shishen", title: "十神关系（以日主为轴）" },
  ],
  "bazi-chart-anatomy": [
    { id: "chart", title: "示例盘面（四柱结构）" },
    { id: "shishen", title: "十神关系（以日主为轴）" },
  ],
  "bazi-luck-cycles": [],
  "bazi-reading-workflow": [
    { id: "chart", title: "示例盘面（四柱结构）" },
    { id: "shishen", title: "十神关系（以日主为轴）" },
  ],
};

export function MingliFigures({ slug, track }: { slug: string; track: string }) {
  if (track !== "mingli") return null;
  const figs = DOC_FIGURES[slug];
  if (!figs || !figs.length) return null;

  return (
    <section className="mingli-figures" aria-label="本节相关图表">
      <h3 className="mingli-figures-title">相关图表</h3>
      <div className="mingli-figures-grid">
        {figs.map((f) => {
          if (f.id === "chart") return <ExampleChartFigure key={f.id} />;
          return <FigureCard key={f.id} figId={f.id} title={f.title} />;
        })}
      </div>
    </section>
  );
}

function FigureCard({ figId, title }: { figId: string; title: string }) {
  if (figId === "wuxing") return <WuxingCard title={title} />;
  if (figId === "shishen") return <ShishenCard title={title} />;
  return null;
}

// ── 五行生克图 ──
const WUXING = [
  { id: "mu", name: "木", color: COLORS.mu, angle: -90, sheng: "火", ke: "土", shengBy: "水", keBy: "金", desc: "主仁·生发伸展。如春木萌动。" },
  { id: "huo", name: "火", color: COLORS.huo, angle: -18, sheng: "土", ke: "金", shengBy: "木", keBy: "水", desc: "主礼·炎热向上。如夏日烈阳。" },
  { id: "tu", name: "土", color: COLORS.tu, angle: 54, sheng: "金", ke: "水", shengBy: "火", keBy: "木", desc: "主信·承载化育。如厚土载物。" },
  { id: "jin", name: "金", color: COLORS.jin, angle: 126, sheng: "水", ke: "木", shengBy: "土", keBy: "火", desc: "主义·肃杀收敛。如秋风萧瑟。" },
  { id: "shui", name: "水", color: COLORS.shui, angle: 198, sheng: "木", ke: "火", shengBy: "金", keBy: "土", desc: "主智·润下流动。如冬水归源。" },
];

function WuxingCard({ title }: { title: string }) {
  const [active, setActive] = useState<string | null>(null);
  const CX = 110, CY = 115, R = 72;
  const activeItem = active ? WUXING.find((w) => w.id === active) : null;
  const relOf = (id: string) => {
    if (!activeItem) return null;
    if (id === activeItem.id) return "self";
    const byName = (n: string) => WUXING.find((w) => w.name === n)?.id;
    if (id === byName(activeItem.sheng)) return "sheng";
    if (id === byName(activeItem.ke)) return "ke";
    if (id === byName(activeItem.shengBy)) return "shengBy";
    if (id === byName(activeItem.keBy)) return "keBy";
    return null;
  };

  return (
    <div className="mfig-card">
      <h4 className="mfig-title">{title}</h4>
      <svg viewBox="0 0 220 220" className="mfig-svg">
        <defs>
          <marker id="mwx-s" markerWidth="6" markerHeight="6" refX="4.5" refY="2" orient="auto"><path d="M0,0 L4.5,2 L0,4 Z" fill="#7a9d76" opacity="0.7" /></marker>
          <marker id="mwx-k" markerWidth="6" markerHeight="6" refX="4.5" refY="2" orient="auto"><path d="M0,0 L4.5,2 L0,4 Z" fill={COLORS.cinnabar} opacity="0.7" /></marker>
        </defs>
        {/* 相生（外圈实线） */}
        {WUXING.map((w, i) => {
          const next = WUXING[(i + 1) % 5];
          return <Arrow key={`s${w.id}`} from={polar(CX, CY, R, w.angle)} to={polar(CX, CY, R, next.angle)} color="#7a9d76" dash="" marker="mwx-s" dim={active !== null && relOf(w.id) !== "self" && relOf(next.id) !== "self" && relOf(w.id) !== "sheng" && relOf(next.id) !== "sheng"} />;
        })}
        {/* 相克（内圈虚线） */}
        {WUXING.map((w, i) => {
          const tgt = WUXING[(i + 2) % 5];
          return <Arrow key={`k${w.id}`} from={polar(CX, CY, R - 24, w.angle)} to={polar(CX, CY, R - 24, tgt.angle)} color={COLORS.cinnabar} dash="4 2" marker="mwx-k" dim={active !== null && relOf(w.id) !== "self" && relOf(tgt.id) !== "self" && relOf(w.id) !== "ke" && relOf(tgt.id) !== "ke"} />;
        })}
        {/* 节点 */}
        {WUXING.map((w) => {
          const pos = polar(CX, CY, R, w.angle);
          const rel = relOf(w.id);
          return (
            <g key={w.id} className="mfig-node" onClick={() => setActive(active === w.id ? null : w.id)}>
              <circle cx={pos.x} cy={pos.y} r={16} fill={w.color} opacity={active === null || rel ? 0.9 : 0.25} stroke={active === w.id ? "#252a30" : "none"} strokeWidth={active === w.id ? 2 : 0} />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="#fdfdfb" fontSize="13" fontWeight="600">{w.name}</text>
            </g>
          );
        })}
      </svg>
      <div className="mfig-desc">
        {activeItem ? (
          <>
            <p className="mfig-desc-name" style={{ color: activeItem.color }}>{activeItem.name} · {activeItem.desc}</p>
            <div className="mfig-rels">
              <span className="mfig-rel" style={{ color: "#7a9d76" }}>生→{activeItem.sheng}</span>
              <span className="mfig-rel" style={{ color: COLORS.cinnabar }}>克→{activeItem.ke}</span>
              <span className="mfig-rel" style={{ color: "#6a87a0" }}>←生 {activeItem.shengBy}</span>
              <span className="mfig-rel" style={{ color: "#9a9a9f" }}>←克 {activeItem.keBy}</span>
            </div>
          </>
        ) : (
          <p className="mfig-desc-default">顺位<strong>相生</strong>（木→火→土→金→水），隔位<strong>相克</strong>（木→土→水→火→金）。点击任一五行查看详情。</p>
        )}
      </div>
    </div>
  );
}

// ── 十神关系图 ──
const SHISHEN = [
  { name: "比劫", sub: "同我", color: COLORS.jin, angle: -90, dir: "same", desc: "与我同类（兄弟）。助力也分财。" },
  { name: "食伤", sub: "我生", color: COLORS.mu, angle: -18, dir: "out", desc: "我生出的（子女/才华）。泄秀、表达。" },
  { name: "财星", sub: "我克", color: COLORS.tu, angle: 54, dir: "out", desc: "我支配的（妻财）。为我所用。" },
  { name: "官杀", sub: "克我", color: COLORS.huo, angle: 126, dir: "in", desc: "约束我的（事业/压力）。正官为用、七杀为忌。" },
  { name: "印星", sub: "生我", color: COLORS.shui, angle: 198, dir: "in", desc: "生养我的（母亲/学业）。庇护与传承。" },
];

function ShishenCard({ title }: { title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const CX = 110, CY = 115, R = 70;
  const activeItem = active !== null ? SHISHEN[active] : null;

  return (
    <div className="mfig-card">
      <h4 className="mfig-title">{title}</h4>
      <svg viewBox="0 0 220 220" className="mfig-svg">
        <defs>
          <marker id="mss-o" markerWidth="6" markerHeight="6" refX="4.5" refY="2" orient="auto"><path d="M0,0 L4.5,2 L0,4 Z" fill="#7a9d76" opacity="0.7" /></marker>
          <marker id="mss-i" markerWidth="6" markerHeight="6" refX="4.5" refY="2" orient="auto"><path d="M0,0 L4.5,2 L0,4 Z" fill={COLORS.cinnabar} opacity="0.7" /></marker>
        </defs>
        {/* 箭头 */}
        {SHISHEN.map((s, i) => {
          const pos = polar(CX, CY, R, s.angle);
          if (s.dir === "out") return <Arrow key={i} from={{ x: CX, y: CY }} to={pos} color="#7a9d76" dash="" marker="mss-o" dim={active !== null && active !== i} />;
          if (s.dir === "in") return <Arrow key={i} from={pos} to={{ x: CX, y: CY }} color={COLORS.cinnabar} dash="4 2" marker="mss-i" dim={active !== null && active !== i} />;
          return null;
        })}
        {/* 日主（中心） */}
        <circle cx={CX} cy={CY} r={19} fill="#252a30" opacity={active === null ? 0.9 : 0.4} />
        <text x={CX} y={CY + 1} textAnchor="middle" fill="#fdfdfb" fontSize="11" fontWeight="600">日主</text>
        <text x={CX} y={CY + 11} textAnchor="middle" fill="#fdfdfb" fontSize="8" opacity="0.7">（我）</text>
        {/* 十神节点 */}
        {SHISHEN.map((s, i) => {
          const pos = polar(CX, CY, R, s.angle);
          return (
            <g key={i} className="mfig-node" onClick={() => setActive(active === i ? null : i)}>
              <circle cx={pos.x} cy={pos.y} r={17} fill={s.color} opacity={active === null || active === i ? 0.88 : 0.25} stroke={active === i ? "#252a30" : "none"} strokeWidth={active === i ? 2 : 0} />
              <text x={pos.x} y={pos.y - 1} textAnchor="middle" fill="#fdfdfb" fontSize="10" fontWeight="600">{s.name}</text>
              <text x={pos.x} y={pos.y + 10} textAnchor="middle" fill="#fdfdfb" fontSize="7.5" opacity="0.85">{s.sub}</text>
            </g>
          );
        })}
      </svg>
      <div className="mfig-desc">
        {activeItem ? (
          <>
            <p className="mfig-desc-name" style={{ color: activeItem.color }}>{activeItem.name}（{activeItem.sub}）· {activeItem.desc}</p>
          </>
        ) : (
          <p className="mfig-desc-default">十神以<strong>日主</strong>为轴定关系：<strong>生我</strong>为印、<strong>我生</strong>为食伤、<strong>克我</strong>为官杀、<strong>我克</strong>为财、<strong>同类</strong>为比劫。点击查看。</p>
        )}
      </div>
    </div>
  );
}

function Arrow({ from, to, color, dash, marker, dim }: { from: { x: number; y: number }; to: { x: number; y: number }; color: string; dash: string; marker: string; dim: boolean }) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const off = 18;
  return <line x1={from.x + (dx / dist) * off} y1={from.y + (dy / dist) * off} x2={to.x - (dx / dist) * off} y2={to.y - (dy / dist) * off} stroke={color} strokeWidth={1.3} strokeDasharray={dash || "none"} opacity={dim ? 0.1 : 0.55} markerEnd={`url(#${marker})`} />;
}
