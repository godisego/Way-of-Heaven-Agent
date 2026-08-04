"use client";

import { useState } from "react";

/**
 * 十二长生可视化：五行在十二地支中的生命周期。
 *
 * 设计：12 个阶段按时钟顺序排在圆周上，分为四个相位：
 *   生旺（长生→帝旺，绿）
 *   衰（衰，琥珀）
 *   病死墓（病→墓，朱）
 *   绝胎养（绝→养，水）
 * 点击任一相位高亮该段，再点取消。
 *
 * 围栏标记：twelvestages
 */

const COLORS = {
  mu: "#7a9d76", // 木
  huo: "#c46b5e", // 火
  tu: "#b89970", // 土
  jin: "#9a9a9f", // 金
  shui: "#6a87a0", // 水
  ink: "#252a30",
  muted: "#5f656b",
  cinnabar: "#a8473c",
};

/** 12 长生阶段，按圆周顺序。phase: 0=生旺, 1=衰, 2=病死墓, 3=绝胎养 */
type Stage = { name: string; brief: string; phase: 0 | 1 | 2 | 3 };

const STAGES: Stage[] = [
  { name: "长生", brief: "如婴儿初生，气始萌发", phase: 0 },
  { name: "沐浴", brief: "如婴儿洗浴，初见世而脆弱", phase: 0 },
  { name: "冠带", brief: "如少年束发，渐成形仪", phase: 0 },
  { name: "临官", brief: "如成年加冠，可任事", phase: 0 },
  { name: "帝旺", brief: "盛极之位，如帝王之极", phase: 0 },
  { name: "衰", brief: "盛极而衰，气始减退", phase: 1 },
  { name: "病", brief: "衰而更弱，如病态初显", phase: 2 },
  { name: "死", brief: "气尽形亡，无以为继", phase: 2 },
  { name: "墓", brief: "归藏入库，余气封存", phase: 2 },
  { name: "绝", brief: "气绝于地，如草木冬尽", phase: 3 },
  { name: "胎", brief: "气聚成胎，新轮将始", phase: 3 },
  { name: "养", brief: "胎中滋养，待形而成", phase: 3 },
];

const PHASE_COLORS = ["#7a9d76", "#b89970", "#a8473c", "#6a87a0"];
const PHASE_NAMES = ["生旺", "衰", "病死墓", "绝胎养"];
const PHASE_DESCS = [
  "长生到帝旺——气从萌发到盛极，五行的上升期。",
  "衰——盛极而退的第一步，气始减。",
  "病、死、墓——气尽形亡，余气封存。",
  "绝、胎、养——旧气绝，新气胎，待再长生。",
];

/** 五阳干长生地支（子平通行口径） */
const YANG_GAN_STARTS: Array<{ gan: string; wuxing: string; start: string }> = [
  { gan: "甲", wuxing: "木", start: "亥" },
  { gan: "丙", wuxing: "火", start: "寅" },
  { gan: "戊", wuxing: "土", start: "寅" },
  { gan: "庚", wuxing: "金", start: "巳" },
  { gan: "壬", wuxing: "水", start: "申" },
];

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function TwelveStagesCard({ title }: { title: string }) {
  const [activePhase, setActivePhase] = useState<number | null>(null);
  const CX = 130;
  const CY = 130;
  const R_LABEL = 100;
  const R_NODE = 70;

  const toggle = (p: number) => setActivePhase(activePhase === p ? null : p);

  return (
    <div className="mfig-card" style={{ background: "#fafaf9", border: "1px solid rgba(37,42,48,0.12)", borderRadius: 8, padding: 16 }}>
      <h4 className="mfig-title" style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{title}</h4>
      <svg viewBox="0 0 320 280" style={{ width: "100%", maxWidth: 360, height: "auto" }}>
        {/* 中心圆 */}
        <circle cx={CX} cy={CY} r={48} fill="none" stroke="rgba(37,42,48,0.08)" strokeWidth={1} />
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize={13} fontWeight={600} fill={COLORS.ink}>十二</text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize={13} fontWeight={600} fill={COLORS.ink}>长生</text>

        {/* 12 个阶段节点 */}
        {STAGES.map((s, i) => {
          const angle = -90 + i * 30;
          const node = polar(CX, CY, R_NODE, angle);
          const label = polar(CX, CY, R_LABEL, angle);
          const color = PHASE_COLORS[s.phase];
          const dim = activePhase !== null && activePhase !== s.phase;
          return (
            <g key={s.name} opacity={dim ? 0.2 : 1} style={{ cursor: "pointer" }} onClick={() => toggle(s.phase)}>
              <circle cx={node.x} cy={node.y} r={13} fill={color} opacity={activePhase === s.phase ? 0.95 : 0.55} stroke={color} strokeWidth={1.5} />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#fff">{s.name[0]}</text>
              <text x={label.x} y={label.y + 4} textAnchor="middle" fontSize={11} fill={COLORS.ink}>{s.name}</text>
            </g>
          );
        })}

        {/* 圆环表示循环 */}
        <circle cx={CX} cy={CY} r={R_NODE} fill="none" stroke="rgba(37,42,48,0.06)" strokeWidth={1} strokeDasharray="2 3" />
      </svg>

      {/* 相位图例 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
        {PHASE_NAMES.map((n, p) => (
          <button
            key={n}
            onClick={() => toggle(p)}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              borderRadius: 4,
              border: `1px solid ${PHASE_COLORS[p]}`,
              background: activePhase === p ? PHASE_COLORS[p] : "transparent",
              color: activePhase === p ? "#fff" : PHASE_COLORS[p],
              cursor: "pointer",
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.7 }}>
        {activePhase !== null ? (
          <p><strong style={{ color: PHASE_COLORS[activePhase] }}>{PHASE_NAMES[activePhase]}：</strong> {PHASE_DESCS[activePhase]}</p>
        ) : (
          <p>圆周按时钟顺序排 12 阶段。<strong>长生</strong>是气之始，<strong>帝旺</strong>是盛极，<strong>墓</strong>是归藏，<strong>胎</strong>是新轮将启。点任一相位查看。</p>
        )}
      </div>

      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(37,42,48,0.08)", fontSize: 11, color: COLORS.muted, lineHeight: 1.7 }}>
        <div style={{ fontWeight: 600, color: COLORS.ink, marginBottom: 4 }}>五阳干长生位</div>
        {YANG_GAN_STARTS.map((y) => (
          <span key={y.gan} style={{ marginRight: 10 }}>
            <strong style={{ color: COLORS[y.gan === "甲" ? "mu" : y.gan === "丙" || y.gan === "戊" ? "huo" : y.gan === "戊" ? "tu" : y.gan === "庚" ? "jin" : "shui"] }}>
              {y.gan}{y.wuxing}
            </strong>
            <span style={{ color: COLORS.muted }}>·长生在{y.start}</span>
          </span>
        ))}
        <div style={{ marginTop: 4, fontSize: 10, color: COLORS.muted }}>（阴干长生位流派分歧大，本图只列阳干通行口径）</div>
      </div>
    </div>
  );
}
