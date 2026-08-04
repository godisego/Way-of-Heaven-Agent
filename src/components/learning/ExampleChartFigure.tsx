"use client";

import { useState } from "react";

/**
 * 示例排盘图（教学用，虚构八字）。
 *
 * 参考：用户提供的排盘示例图（四柱 + 藏干 + 十神 + 五行着色）。
 * 本项目自己绘制，不抄袭参考图，用虚构八字（非真实人物）。
 *
 * 用途：八字盘面解剖 / 七步读盘工作流 讲义的"认识盘面结构"示例。
 * 可点击每柱查看该柱的字与十神说明。
 */

// 五行 → 降饱和色（与五行图、实际排盘一致）
const WX_COLOR: Record<string, string> = {
  木: "#7a9d76",
  火: "#c46b5e",
  土: "#b89970",
  金: "#9a9a9f",
  水: "#6a87a0",
};

// 天干 → 五行
const GAN_WX: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

// 地支 → 五行
const ZHI_WX: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};

// 地支 → 藏干（本气为主，教学简化只列本气+中气）
const ZHI_CANG: Record<string, string[]> = {
  子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"],
  辰: ["戊", "乙", "癸"], 巳: ["丙", "庚", "戊"], 午: ["丁", "己"], 未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"], 酉: ["辛"], 戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
};

// 虚构示例八字（非真实人物，纯教学）
// 日主戊土，生于寅月（木旺），用于讲解"日主/月令/十神"结构
const EXAMPLE = {
  gan: ["甲", "丙", "戊", "庚"], // 年月日时 天干
  zhi: ["子", "寅", "午", "申"], // 年月日时 地支
  riZhu: 2, // 日柱索引（0=年 1=月 2=日 3=时）
  pillarName: ["年柱", "月柱", "日柱", "时柱"],
  // 各柱天干相对日主（戊土）的十神
  ganShishen: ["七杀", "偏印", "日主", "食神"],
  // 各柱地支藏干本气相对日主的十神
  zhiShishen: ["正财", "七杀", "正印", "食神"],
};

export function ExampleChartFigure() {
  const [activePillar, setActivePillar] = useState<number | null>(null);

  return (
    <div className="mfig-card exchart-card">
      <h4 className="mfig-title">示例盘面（虚构八字 · 非真实人物）</h4>
      <p className="exchart-intro">
        四柱从右到左为<strong>年·月·日·时</strong>（传统排盘右起）。
        日柱天干（戊）即<strong>日主</strong>，是整个八字的分析坐标。
        点击任一柱查看该柱结构。
      </p>

      <div className="exchart-grid">
        {/* 从右到左：时日月年（传统），但 DOM 从左到右渲染，用 flex-direction: row-reverse */}
        {[0, 1, 2, 3].map((idx) => {
          const realIdx = 3 - idx; // 翻转：DOM 第0个=时柱(idx3)
          const gan = EXAMPLE.gan[realIdx];
          const zhi = EXAMPLE.zhi[realIdx];
          const cang = ZHI_CANG[zhi] ?? [];
          const isRiZhu = realIdx === EXAMPLE.riZhu;
          const isActive = activePillar === realIdx;
          return (
            <button
              type="button"
              key={realIdx}
              className={`exchart-pillar${isRiZhu ? " is-rizhu" : ""}${isActive ? " is-active" : ""}`}
              onClick={() => setActivePillar(activePillar === realIdx ? null : realIdx)}
            >
              <span className="exchart-pillar-name">{EXAMPLE.pillarName[realIdx]}</span>
              <span className="exchart-gan" style={{ color: WX_COLOR[GAN_WX[gan]] }}>{gan}</span>
              <span className="exchart-zhi" style={{ color: WX_COLOR[ZHI_WX[zhi]] }}>{zhi}</span>
              <span className="exchart-shishen">{EXAMPLE.ganShishen[realIdx]}</span>
              <span className="exchart-cang">
                {cang.map((c) => (
                  <span key={c} style={{ color: WX_COLOR[GAN_WX[c]] }}>{c}</span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/* 点击展开的柱说明 */}
      <div className="exchart-detail">
        {activePillar !== null ? (
          <PillarDetail idx={activePillar} />
        ) : (
          <p className="mfig-desc-default">
            盘面五行着色：<span style={{ color: WX_COLOR["木"] }}>木</span>·
            <span style={{ color: WX_COLOR["火"] }}>火</span>·
            <span style={{ color: WX_COLOR["土"] }}>土</span>·
            <span style={{ color: WX_COLOR["金"] }}>金</span>·
            <span style={{ color: WX_COLOR["水"] }}>水</span>。
            藏干为地支内含的天干（本气在前）。点击任一柱查看详情。
          </p>
        )}
      </div>
    </div>
  );
}

function PillarDetail({ idx }: { idx: number }) {
  const gan = EXAMPLE.gan[idx];
  const zhi = EXAMPLE.zhi[idx];
  const cang = ZHI_CANG[zhi] ?? [];
  const ganWx = GAN_WX[gan];
  const zhiWx = ZHI_WX[zhi];
  const isRiZhu = idx === EXAMPLE.riZhu;
  return (
    <div className="exchart-pillar-info">
      <p className="mfig-desc-name">
        {EXAMPLE.pillarName[idx]}：{gan}{zhi}
        {isRiZhu ? "（日主 · 我）" : ""}
      </p>
      <p className="exchart-info-text">
        天干 <strong style={{ color: WX_COLOR[ganWx] }}>{gan}（{ganWx}）</strong>
        对日主为<strong>{EXAMPLE.ganShishen[idx]}</strong>；
        地支 <strong style={{ color: WX_COLOR[zhiWx] }}>{zhi}（{zhiWx}）</strong>
        对日主为<strong>{EXAMPLE.zhiShishen[idx]}</strong>。
      </p>
      <p className="exchart-info-text">
        藏干：{cang.map((c) => `${c}（${GAN_WX[c]}）`).join("、")}。
        藏干是地支内部"藏着"的天干，决定地支的实质力量与暗藏十神。
      </p>
    </div>
  );
}
