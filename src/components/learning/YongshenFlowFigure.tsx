"use client";

import { useState } from "react";

/**
 * 用神取用决策流程图：从日主强弱到最终用神的判断路径。
 *
 * 5 个判断节点：
 *   1. 日主强弱（强/弱/偏旺成势/偏弱成势）
 *   2. 月令调候（寒月需火/燥月需水/无）
 *   3. 阻塞需通关（有/无）
 *   4. 病药（有病需药/无）
 *   5. 从格条件（可从/不可从）
 *
 * 输出：扶抑 / 调候 / 通关 / 病药 / 顺从 五种用神
 *
 * 围栏标记：yongshenflow
 */

const COLORS = {
  mu: "#7a9d76",
  huo: "#c46b5e",
  tu: "#b89970",
  jin: "#9a9a9f",
  shui: "#6a87a0",
  ink: "#252a30",
  muted: "#5f656b",
  cinnabar: "#a8473c",
  amber: "#d97706",
};

type Step = {
  id: string;
  q: string;
  branches: { label: string; next: string | null; result?: string; color: string }[];
};

const STEPS: Step[] = [
  {
    id: "qiangruo",
    q: "日主强弱判断",
    branches: [
      { label: "身强", next: "tiaohou", color: COLORS.mu },
      { label: "身弱", next: "tiaohou", color: COLORS.shui },
      { label: "偏旺成势", next: "congge", color: COLORS.cinnabar },
      { label: "偏弱成势", next: "congge", color: COLORS.amber },
    ],
  },
  {
    id: "congge",
    q: "可否顺从势？",
    branches: [
      { label: "可从", next: null, result: "顺从用神（顺势，不逆）", color: COLORS.cinnabar },
      { label: "不可从", next: "tiaohou", color: COLORS.muted },
    ],
  },
  {
    id: "tiaohou",
    q: "月令需调候？",
    branches: [
      { label: "寒月需火暖", next: "tongguan", result: "调候用神（暖）", color: COLORS.huo },
      { label: "燥月需水润", next: "tongguan", result: "调候用神（润）", color: COLORS.shui },
      { label: "无需调候", next: "tongguan", color: COLORS.muted },
    ],
  },
  {
    id: "tongguan",
    q: "五行阻塞需通关？",
    branches: [
      { label: "有阻塞", next: "bingyao", result: "通关用神（疏通）", color: COLORS.tu },
      { label: "无阻塞", next: "bingyao", color: COLORS.muted },
    ],
  },
  {
    id: "bingyao",
    q: "原局有病需药？",
    branches: [
      { label: "有病", next: null, result: "病药用神（药治）", color: COLORS.cinnabar },
      { label: "无病", next: null, result: "扶抑用神（生扶/克泄耗）", color: COLORS.jin },
    ],
  },
];

export function YongshenFlowCard({ title }: { title: string }) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="mfig-card" style={{ background: "#fff", border: "1px solid rgba(37,42,48,0.14)", borderRadius: 8, padding: 14 }}>
      <div className="mfig-title" style={{ fontWeight: 700, fontSize: 13, color: COLORS.ink, marginBottom: 12 }}>{title}</div>

      <svg viewBox="0 0 720 460" width="100%" style={{ maxHeight: 460 }}>
        <defs>
          <marker id="ys-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill={COLORS.muted} />
          </marker>
        </defs>

        {STEPS.map((s, i) => {
          const x = 30 + i * 140;
          const isActive = active === s.id;
          return (
            <g key={s.id} style={{ cursor: "pointer" }} onClick={() => setActive(isActive ? null : s.id)}>
              {/* 节点框 */}
              <rect
                x={x}
                y={180}
                width={120}
                height={60}
                rx={6}
                fill={isActive ? "#eff6ff" : "#f8fafc"}
                stroke={isActive ? COLORS.cinnabar : "rgba(37,42,48,0.2)"}
                strokeWidth={isActive ? 1.5 : 1}
              />
              <text x={x + 60} y={205} textAnchor="middle" fontSize={12} fontWeight={600} fill={COLORS.ink}>{s.q}</text>
              <text x={x + 60} y={225} textAnchor="middle" fontSize={10} fill={COLORS.muted}>判断 {i + 1}</text>

              {/* 分支箭头 */}
              {s.branches.map((b, bi) => {
                const isLast = b.next === null;
                const yOffset = (bi - (s.branches.length - 1) / 2) * 22;
                const targetX = isLast ? x + 120 : x + 140;
                const targetY = isLast ? 180 + yOffset : 210;
                const opacity = active === null || isActive ? 0.8 : 0.25;
                return (
                  <g key={bi} opacity={opacity}>
                    <path
                      d={isLast
                        ? `M ${x + 120} 210 Q ${x + 130} 210 ${x + 135} ${180 + yOffset}`
                        : `M ${x + 120} 210 L ${targetX - 5} ${targetY}`}
                      stroke={b.color}
                      strokeWidth={1.2}
                      fill="none"
                      markerEnd="url(#ys-arrow)"
                    />
                    {isLast && b.result && (
                      <text
                        x={x + 145}
                        y={180 + yOffset + 4}
                        fontSize={11}
                        fontWeight={600}
                        fill={b.color}
                      >→ {b.result}</text>
                    )}
                    {!isLast && (
                      <text
                        x={x + 128}
                        y={targetY - 4}
                        fontSize={10}
                        fill={b.color}
                      >{b.label}</text>
                    )}
                  </g>
                );
              })}

              {/* 节点序号 */}
              <circle cx={x + 60} cy={172} r={10} fill={COLORS.cinnabar} />
              <text x={x + 60} y={176} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">{i + 1}</text>
            </g>
          );
        })}

        {/* 底部说明 */}
        <text x={360} y={440} textAnchor="middle" fontSize={11} fill={COLORS.muted}>
          判断顺序：1 强弱 → 2 从格 → 3 调候 → 4 通关 → 5 病药；后判断的优先级高于前
        </text>
      </svg>

      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(37,42,48,0.08)", fontSize: 11, color: COLORS.muted, lineHeight: 1.7 }}>
        {active ? (
          <p><strong>当前节点：</strong>{STEPS.find(s => s.id === active)?.q}。点击节点查看分支详情，再点取消。</p>
        ) : (
          <p><strong>用神取用五种：</strong>扶抑（生扶/克泄耗）、调候（暖/润）、通关（疏通五行）、病药（药治原局病）、顺从（从格顺势不逆）。判断按 1→5 顺序，后判断优先级高于前。</p>
        )}
      </div>
    </div>
  );
}
