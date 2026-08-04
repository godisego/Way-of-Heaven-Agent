"use client";

import { useState } from "react";

/**
 * 命理系统分层图：从阴阳五行到断盘结论的七层结构。
 *
 * 设计：垂直堆叠的七层，底层是基石，顶层是输出。每层对应学径一个阶段。
 * 点击任一层高亮该层，显示该层的核心问题与对应讲义。
 *
 * 围栏标记：systemoverview
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

type Layer = {
  id: string;
  name: string;
  subtitle: string;
  coreQuestion: string;
  lesson: string;
  color: string;
};

const LAYERS: Layer[] = [
  {
    id: "foundation",
    name: "阴阳五行",
    subtitle: "哲学基石",
    coreQuestion: "世界由什么组成？气的循环规律是什么？",
    lesson: "阴阳五行入门",
    color: COLORS.mu,
  },
  {
    id: "symbols",
    name: "天干地支",
    subtitle: "符号系统",
    coreQuestion: "用什么符号描述时间与气的状态？",
    lesson: "天干、地支与藏干",
    color: COLORS.huo,
  },
  {
    id: "chart",
    name: "四柱八字",
    subtitle: "盘面层",
    coreQuestion: "出生那一刻的气的快照长什么样？",
    lesson: "八字盘面解剖",
    color: COLORS.tu,
  },
  {
    id: "relations",
    name: "十神 · 合冲刑害",
    subtitle: "关系层",
    coreQuestion: "盘里的字之间是什么关系？日主坐标怎么定？",
    lesson: "十神与强弱 / 十二长生 / 合冲刑害 / 十神组合",
    color: COLORS.jin,
  },
  {
    id: "algorithm",
    name: "格局 · 用神",
    subtitle: "算法层",
    coreQuestion: "这是什么类型的系统？需要什么才能平衡？",
    lesson: "格局取用与用神详法",
    color: COLORS.cinnabar,
  },
  {
    id: "time",
    name: "大运 · 流年",
    subtitle: "时间层",
    coreQuestion: "不同阶段引动哪部分原局？",
    lesson: "起运、大运与流年",
    color: COLORS.amber,
  },
  {
    id: "output",
    name: "断盘结论",
    subtitle: "输出层",
    coreQuestion: "综合以上，如何回到现实处境给观察建议？",
    lesson: "七步读盘工作流",
    color: COLORS.shui,
  },
];

export function SystemOverviewCard({ title }: { title?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const activeLayer = active ? LAYERS.find((l) => l.id === active) : null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(37,42,48,0.14)",
        borderRadius: 8,
        padding: 16,
        fontFamily: "'Noto Sans SC',sans-serif",
      }}
    >
      {title && (
        <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: COLORS.ink }}>
          {title}
        </h4>
      )}

      <svg viewBox="0 0 360 460" width="100%" style={{ maxHeight: 460 }}>
        <defs>
          <marker id="sys-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={COLORS.muted} opacity="0.6" />
          </marker>
        </defs>

        {/* 底部说明：基石 */}
        <text x={180} y={20} textAnchor="middle" fontSize={11} fill={COLORS.muted}>
          ↑ 顶层 = 输出（综合判断）
        </text>

        {/* 七层堆叠 */}
        {LAYERS.slice().reverse().map((layer, i) => {
          const realIndex = LAYERS.length - 1 - i;
          const y = 30 + i * 56;
          const isActive = active === layer.id;
          const isDim = active !== null && !isActive;
          const opacity = isDim ? 0.25 : 1;
          const fillOpacity = isActive ? 0.28 : 0.14;

          return (
            <g
              key={layer.id}
              onClick={() => setActive(isActive ? null : layer.id)}
              style={{ cursor: "pointer" }}
            >
              {/* 主块 */}
              <rect
                x={40}
                y={y}
                width={280}
                height={48}
                rx={6}
                fill={layer.color}
                fillOpacity={fillOpacity}
                stroke={layer.color}
                strokeWidth={isActive ? 2 : 1}
                opacity={opacity}
              />
              {/* 序号 */}
              <circle cx={56} cy={y + 24} r={11} fill={layer.color} opacity={opacity} />
              <text
                x={56}
                y={y + 28}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="#fff"
                opacity={opacity}
              >
                {realIndex + 1}
              </text>
              {/* 层名 */}
              <text
                x={78}
                y={y + 22}
                fontSize={13}
                fontWeight={600}
                fill={COLORS.ink}
                opacity={opacity}
              >
                {layer.name}
              </text>
              {/* 副标题 */}
              <text
                x={78}
                y={y + 38}
                fontSize={10}
                fill={COLORS.muted}
                opacity={opacity}
              >
                {layer.subtitle}
              </text>
              {/* 右侧：阶段标签 */}
              <text
                x={308}
                y={y + 28}
                textAnchor="end"
                fontSize={10}
                fill={layer.color}
                fontWeight={500}
                opacity={opacity}
              >
                第 {realIndex + 1} 层
              </text>
            </g>
          );
        })}

        {/* 底部说明：基石 */}
        <text x={180} y={448} textAnchor="middle" fontSize={11} fill={COLORS.muted}>
          ↓ 底层 = 基石（哲学与符号）
        </text>
      </svg>

      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: "1px solid rgba(37,42,48,0.08)",
          fontSize: 11,
          color: COLORS.muted,
          lineHeight: 1.7,
        }}
      >
        {activeLayer ? (
          <div>
            <p style={{ margin: 0, color: activeLayer.color, fontWeight: 600 }}>
              ● 第 {LAYERS.findIndex((l) => l.id === active) + 1} 层 · {activeLayer.name}（{activeLayer.subtitle}）
            </p>
            <p style={{ margin: "4px 0 0 0" }}>
              <strong>核心问题：</strong>{activeLayer.coreQuestion}
            </p>
            <p style={{ margin: "2px 0 0 0" }}>
              <strong>对应讲义：</strong>{activeLayer.lesson}
            </p>
          </div>
        ) : (
          <p>
            命理系统七层结构：<strong>底层是哲学基石，顶层是断盘输出</strong>。每层只回答一个核心问题，上层依赖下层。点任一层看详情。命理学习的正道是<strong>自底向上</strong>——先基石再符号再盘面，最后到算法与输出。
          </p>
        )}
      </div>
    </div>
  );
}
