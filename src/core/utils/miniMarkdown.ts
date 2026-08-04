/**
 * 手写迷你 Markdown 渲染器（学习馆 /learn 用）。
 *
 * 学习优先：不引 react-markdown/remark 全家桶，够用即止。
 * 支持：标题、段落、粗斜体、行内代码、围栏代码块、无序/有序列表、
 * 引用块、表格、分隔线、链接（http/https/mailto/# 与站内相对 docs 链接转 /learn）。
 *
 * 命理图表围栏：讲义里写 ```wuxing / ```shishen / ```chart 标记，
 * 渲染为占位 div（data-mingli-fig="xxx"），由前端 MingliFigureInjector
 * 替换为可交互的 React 图表组件。图表嵌在对应文字段落处，而非文末。
 *
 * 所有文本先做 HTML 转义——渲染结果只来自本仓库 docs/，但防御性转义是习惯。
 */

const DOC_LINK: Record<string, string> = {
  "docs/rag-concepts-primer.md": "/learn/rag-concepts",
  "docs/rag-beginner-walkthrough.md": "/learn/rag-walkthrough",
  "docs/agent-beginner-walkthrough.md": "/learn/agent-walkthrough",
  "docs/agent-loop-design.md": "/learn/agent-loop",
  "docs/rag-citation-design.md": "/learn/citation-design",
  "docs/bazi-guide.md": "/learn/bazi-guide",
  "docs/architecture.md": "/learn/architecture",
  "docs/tech-stack.md": "/learn/tech-stack",
  "docs/agent-blueprint.md": "/learn/agent-blueprint",
  "docs/agent-trace-debugging.md": "/learn/agent-trace-debugging",
  "docs/verification-plan.md": "/learn/verification-plan",
  "docs/m5-acceptance.md": "/learn/m5-acceptance",
  "docs/bazi-chart-anatomy.md": "/learn/bazi-chart-anatomy",
  "docs/bazi-overview.md": "/learn/bazi-overview",
  "docs/bazi-yinyang-wuxing-primer.md": "/learn/bazi-yinyang-wuxing-primer",
  "docs/bazi-stems-branches.md": "/learn/bazi-stems-branches",
  "docs/bazi-ten-gods-strength.md": "/learn/bazi-ten-gods-strength",
  "docs/bazi-branch-relations.md": "/learn/bazi-branch-relations",
  "docs/bazi-twelve-stages.md": "/learn/bazi-twelve-stages",
  "docs/bazi-shishen-zuhe.md": "/learn/bazi-shishen-zuhe",
  "docs/bazi-gege-yongshen.md": "/learn/bazi-gege-yongshen",
  "docs/bazi-luck-cycles.md": "/learn/bazi-luck-cycles",
  "docs/bazi-reading-workflow.md": "/learn/bazi-reading-workflow",
  "docs/mentor-libraries-and-bazi-design.md": "/learn/mentor-libraries-bazi",
};

/** 命理图表围栏标记 → 占位 div 的 data 值 */
const FIGURE_FENCES = new Set([
  "wuxing", "shishen", "chart", "ganzhi", "vector", "agentloop",
  // 干支字间关系图（BranchRelationsFigures）
  "tianganhe", "liuhe", "sanhe", "sanhui", "liuchong", "sanxing", "liuhai",
  // 十二长生图（TwelveStagesFigure）
  "twelvestages",
  // 用神决策流程图（YongshenFlowFigure）
  "yongshenflow",
  // 命理系统分层图（SystemOverviewFigure）
  "systemoverview",
]);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(escaped: string): string {
  let s = escaped;
  // 行内代码优先（内部不再处理其他标记）
  const codes: string[] = [];
  s = s.replace(/`([^`]+)`/g, (_m, c: string) => {
    codes.push(`<code>${c}</code>`);
    return ` ${codes.length - 1} `;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  // 链接：[text](url)，只放行安全协议；仓库内 docs 路径转 /learn
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
    const mapped = DOC_LINK[url.replace(/^\.\//, "")] ?? url;
    if (/^(https?:\/\/|mailto:|#|\/)/.test(mapped)) {
      const external = /^https?:\/\//.test(mapped) ? ' target="_blank" rel="noreferrer"' : "";
      return `<a href="${mapped}"${external}>${text}</a>`;
    }
    return text;
  });
  s = s.replace(/ (\d+) /g, (_m, i: string) => codes[Number(i)] ?? "");
  return s;
}

function renderTable(lines: string[]): string {
  const rows = lines.map((line) =>
    line
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => renderInline(c.trim())),
  );
  const head = rows[0];
  const body = rows.slice(2); // 第二行是对齐分隔
  const th = head.map((c) => `<th>${c}</th>`).join("");
  const trs = body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

export function renderMarkdownToHtml(markdown: string): string {
  // 规范化行尾（Windows \r\n / \r 统一为 \n，否则按 \n 匹配的正则会失败）
  const normalized = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // 去 YAML frontmatter
  const md = normalized.replace(/^---\n[\s\S]*?\n---\n/, "");
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = escapeHtml(raw);

    // 围栏代码块 / 命理图表围栏
    const fence = /^```([a-z]*)/.exec(raw);
    if (fence) {
      const fenceLang = fence[1] || "";
      i++;
      // 命理图表围栏 → 输出占位 div（内容由前端 MingliFigureInjector 渲染）
      if (FIGURE_FENCES.has(fenceLang)) {
        while (i < lines.length && !/^```/.test(lines[i])) i++;
        i++; // 跳过收尾
        out.push(`<div class="mingli-fig-slot" data-mingli-fig="${fenceLang}"></div>`);
        continue;
      }
      // 普通代码块（原文保真，仅转义）
      const buf: string[] = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(escapeHtml(lines[i]));
        i++;
      }
      i++; // 跳过收尾
      out.push(`<pre><code>${buf.join("\n")}</code></pre>`);
      continue;
    }

    // 表格
    if (/^\|.*\|\s*$/.test(raw) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const buf: string[] = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) {
        buf.push(escapeHtml(lines[i]));
        i++;
      }
      out.push(renderTable(buf));
      continue;
    }

    // 标题 / 分隔线 / 引用
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^(---|\*\*\*)\s*$/.test(raw)) {
      out.push("<hr />");
      i++;
      continue;
    }
    if (/^&gt;\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(renderInline(escapeHtml(lines[i].replace(/^>\s?/, ""))));
        i++;
      }
      out.push(`<blockquote><p>${buf.join("<br />")}</p></blockquote>`);
      continue;
    }

    // 列表（同类连续行归组）
    if (/^\s*[-*]\s+/.test(raw) || /^\s*\d+[.、]\s+/.test(raw)) {
      const ordered = /^\s*\d+[.、]\s+/.test(raw);
      const pattern = ordered ? /^\s*\d+[.、]\s+/ : /^\s*[-*]\s+/;
      const buf: string[] = [];
      while (i < lines.length && pattern.test(lines[i])) {
        buf.push(`<li>${renderInline(escapeHtml(lines[i].replace(pattern, "")))}</li>`);
        i++;
      }
      out.push(ordered ? `<ol>${buf.join("")}</ol>` : `<ul>${buf.join("")}</ul>`);
      continue;
    }

    // 空行
    if (!raw.trim()) {
      i++;
      continue;
    }

    // 段落（连续非空、非结构行合并）
    const buf: string[] = [renderInline(line)];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s|^```|^\||^(---|\*\*\*)\s*$|^>\s?|^\s*[-*]\s+|^\s*\d+[.、]\s+/.test(lines[i])
    ) {
      buf.push(renderInline(escapeHtml(lines[i])));
      i++;
    }
    out.push(`<p>${buf.join("<br />")}</p>`);
  }

  return out.join("\n");
}
