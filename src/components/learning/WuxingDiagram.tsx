"use client";

import { useState } from "react";

/**
 * 五行生克关系图（子平理论可视化）。
 *
 * SVG 圆环布局：木火土金水顺时针相生，隔位相克。
 * 点击任一五行高亮其生克关系，并显示说明。
 * 用于命理学习馆的理论速览，把"全是文字"的生克关系变成可交互的图。
 */

type Wuxing = {
  id: string;
  name: string;
  color: string;
  /** 圆环上的角度（度，0=正上，顺时针） */
  angle: number;
  /** 生谁（我生） */
  generates: string;
  /** 克谁（我克） */
  overcomes: string;
  /** 谁生我 */
  generatedBy: string;
  /** 谁克我 */
  overcomeBy: string;
  desc: string;
};

const WUXING: Wuxing[] = [
  {
    id: "mu",
    name: "木",
    color: "#5b8c5a",
    angle: -90,
    generates: "火",
    overcomes: "土",
    generatedBy: "水",
    overcomeBy: "金",
    desc: "主仁，主生发、伸展。如春天草木萌动。日主为木者，重成长与条达。",
  },
  {
    id: "huo",
    name: "火",
    color: "#c4503e",
    angle: -18,
    generates: "土",
    overcomes: "金",
    generatedBy: "木",
    overcomeBy: "水",
    desc: "主礼，主炎热、向上。如夏日烈日当空。日主为火者，重热情与光明。",
  },
  {
    id: "tu",
    name: "土",
    color: "#a8845a",
    angle: 54,
    generates: "金",
    overcomes: "水",
    generatedBy: "火",
    overcomeBy: "木",
    desc: "主信，主承载、化育。如四季之交的厚土。日主为土者，重稳定与包容。",
  },
  {
    id: "jin",
    name: "金",
    color: "#8a8a8f",
    angle: 126,
    generates: "水",
    overcomes: "木",
    generatedBy: "土",
    overcomeBy: "火",
    desc: "主义，主肃杀、收敛。如秋风落叶萧瑟。日主为金者，重决断与刚毅。",
  },
  {
    id: "shui",
    name: "水",
    color: "#4a6b8a",
    angle: 198,
    generates: "木",
    overcomes: "火",
    generatedBy: "金",
    overcomeBy: "土",
    desc: "主智，主润下、流动。如冬日水归源。日主为水者，重智慧与变通。",
  },
];

/** 圆心与半径 */
const CX = 130;
const CY = 130;
const R = 88;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function WuxingDiagram() {
  const [active, setActive] = useState<string | null>(null);
  const activeItem = active ? WUXING.find((w) => w.id === active) : null;

  // 高亮逻辑：active 时，我生/我克/生我/克我 各用不同样式
  const relationOf = (id: string): "self" | "generate" | "overcome" | "generatedBy" | "overcomeBy" | null => {
    if (!activeItem) return null;
    if (id === activeItem.id) return "self";
    if (id === WUXING.find((w) => w.name === activeItem.generates)?.id) return "generate";
    if (id === WUXING.find((w) => w.name === activeItem.overcomes)?.id) return "overcome";
    if (id === WUXING.find((w) => w.name === activeItem.generatedBy)?.id) return "generatedBy";
    if (id === WUXING.find((w) => w.name === activeItem.overcomeBy)?.id) return "overcomeBy";
    return null;
  };

  return (
    <div className="wuxing-diagram" data-tour-id="wuxing-diagram">
      <div className="wuxing-diagram-head">
        <h4>五行生克图</h4>
        <span className="wuxing-diagram-hint">点任一五行查看生克关系</span>
      </div>

      <svg viewBox="0 0 260 260" className="wuxing-svg" role="img" aria-label="五行生克关系图">
        <defs>
          <marker id="wuxing-arrow-gen" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#5b8c5a" opacity="0.6" />
          </marker>
          <marker id="wuxing-arrow-over" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#c4503e" opacity="0.6" />
          </marker>
        </defs>
        {/* 相生圈（外圈虚线）与相克圈（内圈虚线）的提示省略，用箭头表示 */}
        {/* 相生箭头（顺时针，相邻） */}
        {WUXING.map((w, i) => {
          const next = WUXING[(i + 1) % WUXING.length];
          return (
            <WuxingArrow
              key={`gen-${w.id}`}
              from={polar(CX, CY, R, w.angle)}
              to={polar(CX, CY, R, next.angle)}
              kind="generate"
              dimmed={active !== null && relationOf(w.id) !== "self" && relationOf(next.id) !== "self" && relationOf(w.id) !== "generate" && relationOf(next.id) !== "generate"}
            />
          );
        })}
        {/* 相克箭头（隔位：跳一个） */}
        {WUXING.map((w, i) => {
          const target = WUXING[(i + 2) % WUXING.length];
          return (
            <WuxingArrow
              key={`over-${w.id}`}
              from={polar(CX, CY, R - 28, w.angle)}
              to={polar(CX, CY, R - 28, target.angle)}
              kind="overcome"
              dimmed={active !== null && relationOf(w.id) !== "self" && relationOf(target.id) !== "self" && relationOf(w.id) !== "overcome" && relationOf(target.id) !== "overcome"}
            />
          );
        })}
        {/* 五行节点 */}
        {WUXING.map((w) => {
          const pos = polar(CX, CY, R, w.angle);
          const rel = relationOf(w.id);
          return (
            <g key={w.id} className="wuxing-node" onClick={() => setActive(active === w.id ? null : w.id)} style={{ cursor: "pointer" }}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={20}
                fill={w.color}
                opacity={active === null || rel ? 1 : 0.3}
                stroke={active === w.id ? "#252a30" : "none"}
                strokeWidth={active === w.id ? 2.5 : 0}
              />
              <text x={pos.x} y={pos.y + 5} textAnchor="middle" fill="#fff" fontSize="16" fontWeight="600" className="wuxing-label">
                {w.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 说明区 */}
      <div className="wuxing-desc">
        {activeItem ? (
          <div className="wuxing-desc-active">
            <p className="wuxing-desc-name" style={{ color: activeItem.color }}>
              {activeItem.name}
            </p>
            <p className="wuxing-desc-text">{activeItem.desc}</p>
            <div className="wuxing-relations">
              <span className="wuxing-rel generate">生 → {activeItem.generates}</span>
              <span className="wuxing-rel overcome">克 → {activeItem.overcomes}</span>
              <span className="wuxing-rel generatedBy">← 生 {activeItem.generatedBy}</span>
              <span className="wuxing-rel overcomeBy">← 克 {activeItem.overcomeBy}</span>
            </div>
          </div>
        ) : (
          <p className="wuxing-desc-default">
            五行<strong>顺位相生</strong>（木→火→土→金→水→木），<strong>隔位相克</strong>（木→土→水→火→金→木）。
            子平八字以此分析日主强弱与十神关系。
          </p>
        )}
      </div>
    </div>
  );
}

function WuxingArrow({
  from,
  to,
  kind,
  dimmed,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  kind: "generate" | "overcome";
  dimmed: boolean;
}) {
  // 计算箭头起止点（从节点边缘出发，留出节点半径）
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = 22;
  const sx = from.x + (dx / dist) * offset;
  const sy = from.y + (dy / dist) * offset;
  const ex = to.x - (dx / dist) * offset;
  const ey = to.y - (dy / dist) * offset;

  const color = kind === "generate" ? "#5b8c5a" : "#c4503e";
  const dash = kind === "generate" ? "none" : "4 3";

  return (
    <line
      x1={sx}
      y1={sy}
      x2={ex}
      y2={ey}
      stroke={color}
      strokeWidth={kind === "generate" ? 1.5 : 1.2}
      strokeDasharray={dash}
      opacity={dimmed ? 0.12 : 0.5}
      markerEnd={kind === "generate" ? "url(#wuxing-arrow-gen)" : "url(#wuxing-arrow-over)"}
    />
  );
}
