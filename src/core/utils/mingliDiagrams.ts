/**
 * 命理 SVG 图表（服务端渲染为 HTML 字符串，供 miniMarkdown 围栏标记内联）。
 *
 * 设计：像教材插图——出现在相关段落，配色匹配项目月白主题，
 * 信息自包含（不需要点击也有完整说明），hover 高亮增强可读性。
 *
 * 用法：讲义 Markdown 里写围栏代码块，语言标记为图表名：
 *   ```wuxing
 *   ```
 *   ```shishen
 *   ```
 * miniMarkdown 识别后调用对应函数输出 SVG。
 */

const STROKE = "rgba(37, 42, 48, 0.14)"; // --line
const INK = "#252a30"; // --ink
const INK_SOFT = "#3b4046"; // --ink-soft
const MUTED = "#5f656b"; // --muted
const CINNABAR = "#a8473c"; // --cinnabar

/** 极坐标转直角坐标 */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * 五行生克图：五元素圆环，顺位相生（实线箭头）、隔位相克（虚线箭头）。
 * 配色用传统五行色但降饱和度以匹配月白主题。
 */
export function wuxingDiagramSvg(): string {
  const items = [
    { name: "木", color: "#7a9d76", angle: -90, sheng: "火", ke: "土" },
    { name: "火", color: "#c46b5e", angle: -18, sheng: "土", ke: "金" },
    { name: "土", color: "#b89970", angle: 54, sheng: "金", ke: "水" },
    { name: "金", color: "#9a9a9f", angle: 126, sheng: "水", ke: "木" },
    { name: "水", color: "#6a87a0", angle: 198, sheng: "木", ke: "火" },
  ];
  const CX = 130;
  const CY = 135;
  const R = 85;
  const nodes = items.map((it) => ({ ...it, pos: polar(CX, CY, R, it.angle) }));

  // 相生箭头（相邻顺时针）
  const shengArrows = nodes.map((n, i) => {
    const next = nodes[(i + 1) % nodes.length];
    return arrowLine(n.pos, next.pos, "#7a9d76", 1.4, "none", 22);
  }).join("");
  // 相克箭头（隔一位）
  const keArrows = nodes.map((n, i) => {
    const target = nodes[(i + 2) % nodes.length];
    return arrowLine(polar(CX, CY, R - 26, n.angle), polar(CX, CY, R - 26, target.angle), CINNABAR, 1.1, "5 3", 22);
  }).join("");

  const circles = nodes
    .map(
      (n) => `
      <g class="wx-node">
        <circle cx="${n.pos.x}" cy="${n.pos.y}" r="19" fill="${n.color}" opacity="0.88"/>
        <text x="${n.pos.x}" y="${n.pos.y + 5}" text-anchor="middle" fill="#fdfdfb" font-size="15" font-weight="600" font-family="'Songti SC',serif">${n.name}</text>
      </g>`,
    )
    .join("");

  return `
  <figure class="mingli-fig">
    <svg viewBox="0 0 260 250" role="img" aria-label="五行生克关系图">
      <defs>
        <marker id="wx-gen" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#7a9d76"/></marker>
        <marker id="wx-ke" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="${CINNABAR}"/></marker>
      </defs>
      ${shengArrows}${keArrows}${circles}
    </svg>
    <figcaption>
      <span class="mingli-fig-legend"><i style="background:#7a9d76"></i>实线＝相生（木→火→土→金→水）</span>
      <span class="mingli-fig-legend"><i style="background:${CINNABAR}"></i>虚线＝相克（木→土→水→火→金）</span>
    </figcaption>
  </figure>`;
}

/**
 * 十神关系图：以日主为轴，印/比/食（泄）/财/官 五类，标注生克方向。
 * 中心是日主（我），四周是十神大类，箭头表示对我生克。
 */
export function shishenDiagramSvg(): string {
  const CX = 130;
  const CY = 130;
  // 日主在中心，五类十神环绕
  const items = [
    { name: "比劫", sub: "同我", color: "#9a9a9f", angle: -90, rel: "与我同类", dir: "neither" },
    { name: "食伤", sub: "我生", color: "#7a9d76", angle: -18, rel: "我生出的", dir: "out" },
    { name: "财星", sub: "我克", color: "#b89970", angle: 54, rel: "我支配的", dir: "out" },
    { name: "官杀", sub: "克我", color: "#c46b5e", angle: 126, rel: "约束我的", dir: "in" },
    { name: "印星", sub: "生我", color: "#6a87a0", angle: 198, rel: "生养我的", dir: "in" },
  ];
  const R = 78;
  const nodes = items.map((it) => ({ ...it, pos: polar(CX, CY, R, it.angle) }));

  // 箭头：out=从我（中心）出发，in=指向我（中心）
  const arrows = nodes
    .map((n) => {
      if (n.dir === "neither") return "";
      const color = n.dir === "out" ? "#7a9d76" : CINNABAR;
      const dash = n.dir === "out" ? "none" : "5 3";
      if (n.dir === "out") {
        return arrowLine({ x: CX, y: CY }, n.pos, color, 1.2, dash, 18);
      }
      return arrowLine(n.pos, { x: CX, y: CY }, color, 1.2, dash, 18);
    })
    .join("");

  const circles = nodes
    .map(
      (n) => `
      <g class="wx-node">
        <circle cx="${n.pos.x}" cy="${n.pos.y}" r="20" fill="${n.color}" opacity="0.85"/>
        <text x="${n.pos.x}" y="${n.pos.y - 1}" text-anchor="middle" fill="#fdfdfb" font-size="12" font-weight="600" font-family="'Songti SC',serif">${n.name}</text>
        <text x="${n.pos.x}" y="${n.pos.y + 12}" text-anchor="middle" fill="#fdfdfb" font-size="9" opacity="0.85">${n.sub}</text>
      </g>`,
    )
    .join("");

  return `
  <figure class="mingli-fig">
    <svg viewBox="0 0 260 250" role="img" aria-label="十神关系图（以日主为轴）">
      <defs>
        <marker id="ss-out" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#7a9d76"/></marker>
        <marker id="ss-in" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="${CINNABAR}"/></marker>
      </defs>
      ${arrows}
      <circle cx="${CX}" cy="${CY}" r="22" fill="${INK}" opacity="0.9"/>
      <text x="${CX}" y="${CY - 1}" text-anchor="middle" fill="#fdfdfb" font-size="13" font-weight="600" font-family="'Songti SC',serif">日主</text>
      <text x="${CX}" y="${CY + 12}" text-anchor="middle" fill="#fdfdfb" font-size="9" opacity="0.7">（我）</text>
      ${circles}
    </svg>
    <figcaption>
      <span class="mingli-fig-legend"><i style="background:#7a9d76"></i>实线＝我出去（食伤泄秀·财星受克）</span>
      <span class="mingli-fig-legend"><i style="background:${CINNABAR}"></i>虚线＝来找我（官杀克身·印星生身）</span>
    </figcaption>
  </figure>`;
}

/** 画一条带箭头的线，offset 让起止点离开节点边缘 */
function arrowLine(
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
  width: number,
  dash: string,
  offset: number,
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const sx = from.x + (dx / dist) * offset;
  const sy = from.y + (dy / dist) * offset;
  const ex = to.x - (dx / dist) * offset;
  const ey = to.y - (dy / dist) * offset;
  const marker = color === "#7a9d76" ? (dash === "none" ? "wx-gen" : "ss-out") : dash === "5 3" ? "wx-ke" : "ss-in";
  return `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash}" opacity="0.55" marker-end="url(#${marker})"/>`;
}

/** 围栏标记 → SVG。未知标记返回 null（交给普通代码块渲染）。 */
export function renderDiagram(fenceLang: string): string | null {
  switch (fenceLang.trim()) {
    case "wuxing":
      return wuxingDiagramSvg();
    case "shishen":
      return shishenDiagramSvg();
    default:
      return null;
  }
}
