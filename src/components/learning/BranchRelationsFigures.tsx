"use client";

import { useState } from "react";

/**
 * 干支字间关系可视化图表集（合、冲、刑、害、会）。
 *
 * 设计原则（与 MingliFigures 保持一致）：
 * - 配色匹配月白主题，五行色降饱和
 * - 可点击交互：点击某对关系高亮该对
 * - 自包含：不点击也有完整说明
 * - 围栏标记 → MingliFigureInjector 内联注入到讲义段落处
 *
 * 围栏标记 → 组件：
 *   tianganhe → 天干五合
 *   liuhe     → 地支六合
 *   sanhe     → 地支三合局
 *   sanhui    → 地支三会局
 *   liuchong  → 地支六冲
 *   sanxing   → 地支三刑
 *   liuhai    → 地支六害
 */

const COLORS = {
  mu: "#7a9d76", // 木
  huo: "#c46b5e", // 火
  tu: "#b89970", // 土
  jin: "#9a9a9f", // 金
  shui: "#6a87a0", // 水
  cinnabar: "#a8473c",
  ink: "#252a30",
  muted: "#5f656b",
};

const DIZHI_WUXING: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};

const TIANGAN_WUXING: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

function wuxingColor(name: string): string {
  const wx = DIZHI_WUXING[name] ?? TIANGAN_WUXING[name] ?? "";
  return wx === "木" ? COLORS.mu : wx === "火" ? COLORS.huo : wx === "土" ? COLORS.tu : wx === "金" ? COLORS.jin : wx === "水" ? COLORS.shui : COLORS.muted;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** 12地支圆环位置：子=12点钟，顺时针 */
function dizhiPos(name: string, cx: number, cy: number, r: number) {
  const order = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const idx = order.indexOf(name);
  const angle = -90 + idx * 30;
  return polar(cx, cy, r, angle);
}

/** 10天干圆环位置：甲=12点钟，顺时针 */
function tianganPos(name: string, cx: number, cy: number, r: number) {
  const order = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const idx = order.indexOf(name);
  const angle = -90 + idx * 36;
  return polar(cx, cy, r, angle);
}

type Pair = { a: string; b: string; label?: string };
type Triad = { a: string; b: string; c: string; label: string };

// ── 公共子组件 ──

function CircleNode({ pos, label, color, active, dim }: { pos: { x: number; y: number }; label: string; color: string; active?: boolean; dim?: boolean }) {
  return (
    <g>
      <circle cx={pos.x} cy={pos.y} r={15} fill={color} opacity={dim ? 0.22 : 0.88} stroke={active ? COLORS.ink : "none"} strokeWidth={active ? 2 : 0} />
      <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="#fdfdfb" fontSize="12" fontWeight="600" fontFamily="'Songti SC',serif" opacity={dim ? 0.45 : 1}>{label}</text>
    </g>
  );
}

function RelLine({ from, to, color, dash, dim, onClick, active }: { from: { x: number; y: number }; to: { x: number; y: number }; color: string; dash?: string; dim?: boolean; onClick?: () => void; active?: boolean }) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const off = 15;
  return (
    <line
      x1={from.x + (dx / dist) * off}
      y1={from.y + (dy / dist) * off}
      x2={to.x - (dx / dist) * off}
      y2={to.y - (dy / dist) * off}
      stroke={color}
      strokeWidth={active ? 2.2 : 1.4}
      strokeDasharray={dash ?? "none"}
      opacity={dim ? 0.16 : 0.65}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    />
  );
}

function DescBlock({ activeItem, defaultText }: { activeItem: { name: string; color: string; desc: string } | null; defaultText: React.ReactNode }) {
  return (
    <div className="mfig-desc">
      {activeItem ? (
        <p className="mfig-desc-name" style={{ color: activeItem.color }}>{activeItem.name} · {activeItem.desc}</p>
      ) : (
        <p className="mfig-desc-default">{defaultText}</p>
      )}
    </div>
  );
}

// ── 1. 天干五合 ──

const TIANGAN_HE: Array<{ a: string; b: string; hua: string }> = [
  { a: "甲", b: "己", hua: "土" },
  { a: "乙", b: "庚", hua: "金" },
  { a: "丙", b: "辛", hua: "水" },
  { a: "丁", b: "壬", hua: "木" },
  { a: "戊", b: "癸", hua: "火" },
];

export function TianganHeCard({ title }: { title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const CX = 130, CY = 135, R = 88;
  const allGan = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const activeItem = active !== null ? TIANGAN_HE[active] : null;
  const inActive = (g: string) => activeItem !== null && (activeItem.a === g || activeItem.b === g);

  return (
    <div className="mfig-card">
      <h4 className="mfig-title">{title}</h4>
      <svg viewBox="0 0 260 260" className="mfig-svg">
        {TIANGAN_HE.map((pair, i) => {
          const from = tianganPos(pair.a, CX, CY, R);
          const to = tianganPos(pair.b, CX, CY, R);
          const color = pair.hua === "木" ? COLORS.mu : pair.hua === "火" ? COLORS.huo : pair.hua === "土" ? COLORS.tu : pair.hua === "金" ? COLORS.jin : COLORS.shui;
          return (
            <RelLine
              key={i}
              from={from}
              to={to}
              color={color}
              dim={active !== null && active !== i}
              active={active === i}
              onClick={() => setActive(active === i ? null : i)}
            />
          );
        })}
        {allGan.map((g) => (
          <CircleNode key={g} pos={tianganPos(g, CX, CY, R)} label={g} color={wuxingColor(g)} active={inActive(g)} dim={active !== null && !inActive(g)} />
        ))}
      </svg>
      <DescBlock
        activeItem={activeItem ? { name: `${activeItem.a}己合化${activeItem.hua}`.replace("己", activeItem.b), color: wuxingColor(activeItem.hua === "土" ? "丑" : activeItem.hua === "金" ? "申" : activeItem.hua === "水" ? "子" : activeItem.hua === "木" ? "寅" : "巳"), desc: `合化${activeItem.hua}——化神需在月令或周边有根气，且两干相邻，不被克破。` } : null}
        defaultText={<>五对合化：<strong>甲己土</strong>、<strong>乙庚金</strong>、<strong>丙辛水</strong>、<strong>丁壬木</strong>、<strong>戊癸火</strong>。点击任一对查看化神条件。</>}
      />
    </div>
  );
}

// ── 2. 地支六合 ──

const LIUHE: Array<{ a: string; b: string; hua: string | null }> = [
  { a: "子", b: "丑", hua: "土" },
  { a: "寅", b: "亥", hua: "木" },
  { a: "卯", b: "戌", hua: "火" },
  { a: "辰", b: "酉", hua: "金" },
  { a: "巳", b: "申", hua: "水" },
  { a: "午", b: "未", hua: null },
];

export function LiuheCard({ title }: { title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const CX = 130, CY = 135, R = 92;
  const allZhi = Object.keys(DIZHI_WUXING);
  const activeItem = active !== null ? LIUHE[active] : null;
  const inActive = (z: string) => activeItem !== null && (activeItem.a === z || activeItem.b === z);

  return (
    <div className="mfig-card">
      <h4 className="mfig-title">{title}</h4>
      <svg viewBox="0 0 260 260" className="mfig-svg">
        {LIUHE.map((pair, i) => {
          const from = dizhiPos(pair.a, CX, CY, R);
          const to = dizhiPos(pair.b, CX, CY, R);
          const color = pair.hua === null ? COLORS.muted : wuxingColor(pair.hua === "木" ? "寅" : pair.hua === "火" ? "巳" : pair.hua === "土" ? "丑" : pair.hua === "金" ? "申" : "子");
          return (
            <RelLine
              key={i}
              from={from}
              to={to}
              color={color}
              dash={pair.hua === null ? "4 2" : "none"}
              dim={active !== null && active !== i}
              active={active === i}
              onClick={() => setActive(active === i ? null : i)}
            />
          );
        })}
        {allZhi.map((z) => (
          <CircleNode key={z} pos={dizhiPos(z, CX, CY, R)} label={z} color={wuxingColor(z)} active={inActive(z)} dim={active !== null && !inActive(z)} />
        ))}
      </svg>
      <DescBlock
        activeItem={activeItem ? {
          name: `${activeItem.a}${activeItem.b}合${activeItem.hua ? "化" + activeItem.hua : "（合而不化）"}`,
          color: activeItem.hua ? wuxingColor(activeItem.hua === "木" ? "寅" : activeItem.hua === "火" ? "巳" : activeItem.hua === "土" ? "丑" : activeItem.hua === "金" ? "申" : "子") : COLORS.muted,
          desc: activeItem.hua ? `化神为${activeItem.hua}——需月令或周边${activeItem.hua}气支持。` : "午未合流派不一，有合化火、合化土、合而不化三说。",
        } : null}
        defaultText={<>六对合：<strong>子丑土</strong>、<strong>寅亥木</strong>、<strong>卯戌火</strong>、<strong>辰酉金</strong>、<strong>巳申水</strong>、<strong>午未</strong>（虚线表示合而不化）。点击查看。</>}
      />
    </div>
  );
}

// ── 3. 地支三合局 ──

const SANHE: Array<Triad> = [
  { a: "申", b: "子", c: "辰", label: "水局" },
  { a: "亥", b: "卯", c: "未", label: "木局" },
  { a: "寅", b: "午", c: "戌", label: "火局" },
  { a: "巳", b: "酉", c: "丑", label: "金局" },
];

export function SanheCard({ title }: { title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const CX = 130, CY = 135, R = 92;
  const allZhi = Object.keys(DIZHI_WUXING);
  const activeTriad = active !== null ? SANHE[active] : null;
  const inActive = (z: string) => activeTriad !== null && (activeTriad.a === z || activeTriad.b === z || activeTriad.c === z);

  return (
    <div className="mfig-card">
      <h4 className="mfig-title">{title}</h4>
      <svg viewBox="0 0 260 260" className="mfig-svg">
        {SANHE.map((triad, i) => {
          const a = dizhiPos(triad.a, CX, CY, R);
          const b = dizhiPos(triad.b, CX, CY, R);
          const c = dizhiPos(triad.c, CX, CY, R);
          const wxName = triad.label.replace("局", "");
          const color = wuxingColor(wxName === "木" ? "寅" : wxName === "火" ? "巳" : wxName === "土" ? "丑" : wxName === "金" ? "申" : "子");
          const dim = active !== null && active !== i;
          return (
            <g key={i} onClick={() => setActive(active === i ? null : i)} style={{ cursor: "pointer" }}>
              <polygon
                points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`}
                fill={color}
                opacity={dim ? 0.05 : (active === i ? 0.22 : 0.12)}
                stroke={color}
                strokeWidth={active === i ? 2 : 1}
                strokeDasharray="none"
              />
            </g>
          );
        })}
        {allZhi.map((z) => (
          <CircleNode key={z} pos={dizhiPos(z, CX, CY, R)} label={z} color={wuxingColor(z)} active={inActive(z)} dim={active !== null && !inActive(z)} />
        ))}
      </svg>
      <DescBlock
        activeItem={activeTriad ? {
          name: `${activeTriad.a}-${activeTriad.b}-${activeTriad.c} 三合${activeTriad.label}`,
          color: wuxingColor(activeTriad.label.replace("局", "") === "木" ? "寅" : activeTriad.label.replace("局", "") === "火" ? "巳" : activeTriad.label.replace("局", "") === "土" ? "丑" : activeTriad.label.replace("局", "") === "金" ? "申" : "子"),
          desc: `中字${activeTriad.b}为局神，力量集中。三字齐全才成局；缺一字为半合（如${activeTriad.a}${activeTriad.b}或${activeTriad.b}${activeTriad.c}）。`,
        } : null}
        defaultText={<>四组三合局：<strong>申子辰水</strong>、<strong>亥卯未木</strong>、<strong>寅午戌火</strong>、<strong>巳酉丑金</strong>。点击查看半合规则。</>}
      />
    </div>
  );
}

// ── 4. 地支三会局 ──

const SANHUI: Array<Triad> = [
  { a: "寅", b: "卯", c: "辰", label: "木方" },
  { a: "巳", b: "午", c: "未", label: "火方" },
  { a: "申", b: "酉", c: "戌", label: "金方" },
  { a: "亥", b: "子", c: "丑", label: "水方" },
];

export function SanhuiCard({ title }: { title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const CX = 130, CY = 135, R = 92;
  const allZhi = Object.keys(DIZHI_WUXING);
  const activeTriad = active !== null ? SANHUI[active] : null;
  const inActive = (z: string) => activeTriad !== null && (activeTriad.a === z || activeTriad.b === z || activeTriad.c === z);

  return (
    <div className="mfig-card">
      <h4 className="mfig-title">{title}</h4>
      <svg viewBox="0 0 260 260" className="mfig-svg">
        {SANHUI.map((triad, i) => {
          const a = dizhiPos(triad.a, CX, CY, R);
          const b = dizhiPos(triad.b, CX, CY, R);
          const c = dizhiPos(triad.c, CX, CY, R);
          const wxName = triad.label.replace("方", "");
          const color = wuxingColor(wxName === "木" ? "寅" : wxName === "火" ? "巳" : wxName === "土" ? "丑" : wxName === "金" ? "申" : "子");
          const dim = active !== null && active !== i;
          return (
            <polygon
              key={i}
              points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`}
              fill={color}
              opacity={dim ? 0.05 : (active === i ? 0.28 : 0.14)}
              stroke={color}
              strokeWidth={active === i ? 2.2 : 1}
              onClick={() => setActive(active === i ? null : i)}
              style={{ cursor: "pointer" }}
            />
          );
        })}
        {allZhi.map((z) => (
          <CircleNode key={z} pos={dizhiPos(z, CX, CY, R)} label={z} color={wuxingColor(z)} active={inActive(z)} dim={active !== null && !inActive(z)} />
        ))}
      </svg>
      <DescBlock
        activeItem={activeTriad ? {
          name: `${activeTriad.a}${activeTriad.b}${activeTriad.c} 三会${activeTriad.label}`,
          color: wuxingColor(activeTriad.label.replace("方", "") === "木" ? "寅" : activeTriad.label.replace("方", "") === "火" ? "巳" : activeTriad.label.replace("方", "") === "土" ? "丑" : activeTriad.label.replace("方", "") === "金" ? "申" : "子"),
          desc: "三字齐全且位置相邻，会成一方之气。成立条件严，但成立时气势大过三合。",
        } : null}
        defaultText={<>四方会局：<strong>寅卯辰木</strong>、<strong>巳午未火</strong>、<strong>申酉戌金</strong>、<strong>亥子丑水</strong>。相邻且齐全才成立。</>}
      />
    </div>
  );
}

// ── 5. 地支六冲 ──

const LIUCHONG: Array<Pair> = [
  { a: "子", b: "午" },
  { a: "丑", b: "未" },
  { a: "寅", b: "申" },
  { a: "卯", b: "酉" },
  { a: "辰", b: "戌" },
  { a: "巳", b: "亥" },
];

export function LiuchongCard({ title }: { title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const CX = 130, CY = 135, R = 92;
  const allZhi = Object.keys(DIZHI_WUXING);
  const activePair = active !== null ? LIUCHONG[active] : null;
  const inActive = (z: string) => activePair !== null && (activePair.a === z || activePair.b === z);

  return (
    <div className="mfig-card">
      <h4 className="mfig-title">{title}</h4>
      <svg viewBox="0 0 260 260" className="mfig-svg">
        {LIUCHONG.map((pair, i) => {
          const from = dizhiPos(pair.a, CX, CY, R);
          const to = dizhiPos(pair.b, CX, CY, R);
          return (
            <RelLine
              key={i}
              from={from}
              to={to}
              color={COLORS.cinnabar}
              dash="5 3"
              dim={active !== null && active !== i}
              active={active === i}
              onClick={() => setActive(active === i ? null : i)}
            />
          );
        })}
        {allZhi.map((z) => (
          <CircleNode key={z} pos={dizhiPos(z, CX, CY, R)} label={z} color={wuxingColor(z)} active={inActive(z)} dim={active !== null && !inActive(z)} />
        ))}
      </svg>
      <DescBlock
        activeItem={activePair ? {
          name: `${activePair.a}${activePair.b}相冲`,
          color: COLORS.cinnabar,
          desc: "对位正冲——两字位置对位、五行相克、方向相反。冲不等于凶，可能引动移动、变化或激活。",
        } : null}
        defaultText={<>六对正冲：<strong>子午</strong>、<strong>丑未</strong>、<strong>寅申</strong>、<strong>卯酉</strong>、<strong>辰戌</strong>、<strong>巳亥</strong>（虚线＝对位相冲）。</>}
      />
    </div>
  );
}

// ── 6. 地支三刑 ──

const SANXING: Array<{ trio: string[]; name: string }> = [
  { trio: ["寅", "巳", "申"], name: "寅巳申无恩之刑" },
  { trio: ["丑", "戌", "未"], name: "丑戌未恃势之刑" },
  { trio: ["子", "卯"], name: "子卯无礼之刑" },
  { trio: ["辰", "午", "酉", "亥"], name: "辰午酉亥自刑" },
];

export function SanxingCard({ title }: { title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const CX = 130, CY = 135, R = 92;
  const allZhi = Object.keys(DIZHI_WUXING);
  const activeTrio = active !== null ? SANXING[active] : null;
  const inActive = (z: string) => activeTrio !== null && activeTrio.trio.includes(z);

  // 三刑画法：每对相关字之间画线
  function renderTrioLines(trio: string[], i: number) {
    const dim = active !== null && active !== i;
    const color = COLORS.ink;
    const lines: React.ReactElement[] = [];
    for (let m = 0; m < trio.length; m++) {
      for (let n = m + 1; n < trio.length; n++) {
        const from = dizhiPos(trio[m], CX, CY, R);
        const to = dizhiPos(trio[n], CX, CY, R);
        lines.push(
          <RelLine
            key={`${i}-${m}-${n}`}
            from={from}
            to={to}
            color={color}
            dash="3 2"
            dim={dim}
            active={active === i}
            onClick={() => setActive(active === i ? null : i)}
          />
        );
      }
    }
    return lines;
  }

  return (
    <div className="mfig-card">
      <h4 className="mfig-title">{title}</h4>
      <svg viewBox="0 0 260 260" className="mfig-svg">
        {SANXING.map((t, i) => renderTrioLines(t.trio, i))}
        {allZhi.map((z) => (
          <CircleNode key={z} pos={dizhiPos(z, CX, CY, R)} label={z} color={wuxingColor(z)} active={inActive(z)} dim={active !== null && !inActive(z)} />
        ))}
      </svg>
      <DescBlock
        activeItem={activeTrio ? {
          name: activeTrio.name,
          color: COLORS.ink,
          desc: activeTrio.trio.length === 2
            ? "二字相刑——内部不顺、反复牵制，影响多在配合与礼节层面。"
            : activeTrio.trio.length === 4
              ? "自刑——同字再见，结构性内耗，多见于心绪与状态反复。"
              : "三字相刑——三方结构互不顺畅，反复牵制，多见人际关系与权责层面。",
        } : null}
        defaultText={<><strong>寅巳申无恩</strong>、<strong>丑戌未恃势</strong>、<strong>子卯无礼</strong>、<strong>辰午酉亥自刑</strong>（虚线＝刑）。</>}
      />
    </div>
  );
}

// ── 7. 地支六害 ──

const LIUHAI: Array<Pair> = [
  { a: "子", b: "未" },
  { a: "丑", b: "午" },
  { a: "寅", b: "巳" },
  { a: "卯", b: "辰" },
  { a: "申", b: "亥" },
  { a: "酉", b: "戌" },
];

export function LiuhaiCard({ title }: { title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const CX = 130, CY = 135, R = 92;
  const allZhi = Object.keys(DIZHI_WUXING);
  const activePair = active !== null ? LIUHAI[active] : null;
  const inActive = (z: string) => activePair !== null && (activePair.a === z || activePair.b === z);

  return (
    <div className="mfig-card">
      <h4 className="mfig-title">{title}</h4>
      <svg viewBox="0 0 260 260" className="mfig-svg">
        {LIUHAI.map((pair, i) => {
          const from = dizhiPos(pair.a, CX, CY, R);
          const to = dizhiPos(pair.b, CX, CY, R);
          return (
            <RelLine
              key={i}
              from={from}
              to={to}
              color={COLORS.muted}
              dash="2 2"
              dim={active !== null && active !== i}
              active={active === i}
              onClick={() => setActive(active === i ? null : i)}
            />
          );
        })}
        {allZhi.map((z) => (
          <CircleNode key={z} pos={dizhiPos(z, CX, CY, R)} label={z} color={wuxingColor(z)} active={inActive(z)} dim={active !== null && !inActive(z)} />
        ))}
      </svg>
      <DescBlock
        activeItem={activePair ? {
          name: `${activePair.a}${activePair.b}相害`,
          color: COLORS.muted,
          desc: "又称穿——六合被冲位破，形成暗中损耗。影响通常小于冲与刑。",
        } : null}
        defaultText={<>六对相害：<strong>子未</strong>、<strong>丑午</strong>、<strong>寅巳</strong>、<strong>卯辰</strong>、<strong>申亥</strong>、<strong>酉戌</strong>（点线＝害）。</>}
      />
    </div>
  );
}
