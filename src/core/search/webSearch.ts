/**
 * 联网搜索（零依赖实现，服务端专用）。
 *
 * 设计约束：
 * - 不引入 SDK / API Key：走 Brave Search 的公开 HTML 结果页，正则解析。
 *   DuckDuckGo（anomaly challenge）、Bing（本环境软屏蔽）、Mojeek（captcha）、
 *   Baidu（302 反爬）均不可用于服务端直连，Brave 是实测唯一稳定可用项。
 * - 只做「知识库未命中」时的兜底证据源：给 LLM 提供标题/链接/摘要，
 *   不抓取网页正文（成本与复杂度都不划算）。
 * - 任何失败（网络、反爬、结构改版）都返回 ok=false，由调用方降级为
 *   「纯模型直答」，绝不阻塞问答主链路。
 */

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

/** 回答下方的联网来源标注（存储层与前端共用此类型） */
export type WebSearchBadge = {
  /** 实际发给搜索引擎的查询 */
  query: string;
  engine: string;
  sources: WebSearchResult[];
  /** 搜索失败时的一句说明（此时回答为纯模型直答） */
  note?: string;
};

export type WebSearchOutcome = {
  ok: boolean;
  engine: "brave" | "none";
  query: string;
  results: WebSearchResult[];
  /** ok=false 时的失败原因（用于日志与回答脚注） */
  error?: string;
};

const BRAVE_SEARCH_URL = "https://search.brave.com/search";

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Brave 内部域名与站内链接，全部排除 */
const EXCLUDED_URL_PREFIXES = [
  "https://search.brave.com",
  "https://brave.com",
  "https://imgs.search.brave.com",
  "https://tiles.search.brave.com",
  "https://cdn.search.brave.com",
  "http://search.brave.com",
  "http://brave.com",
];

function stripTags(htmlFragment: string): string {
  return htmlFragment
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 解析 Brave 结果页 HTML。
 *
 * 页面结构（2026-08 实测，Svelte 渲染）：
 *   <div class="result-wrapper ...">
 *     <div class="result-content ...">
 *       <a href="真实URL">…<div class="title search-snippet-title ..." title="标题">标题</div></a>
 *       <div><div><span>日期 -</span> 描述文本……</div></div>
 *       …同站子链接（sitelinks，忽略）…
 *     </div>
 *   </div>
 *
 * 只依赖「result-wrapper 切块 + 块内首个外链 + search-snippet-title +
 * 块内首个长文本节点」四个锚点，对类名后缀（svelte-hash）变化健壮。
 */
export function parseBraveResults(html: string, limit: number): WebSearchResult[] {
  const blocks = html.split('<div class="result-wrapper');
  const results: WebSearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const block of blocks.slice(1)) {
    // 只截取本结果块（下一个 result-wrapper 已由 split 切开，块内取主链接部分）
    const mainLinkMatch = block.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/);
    if (!mainLinkMatch) continue;
    const url = mainLinkMatch[1].replace(/&amp;/g, "&");
    if (EXCLUDED_URL_PREFIXES.some((prefix) => url.startsWith(prefix))) continue;
    if (seenUrls.has(url)) continue;

    const titleMatch = block.match(/class="title search-snippet-title[^"]*"[^>]*>(.*?)<\/div>/s);
    const title = titleMatch ? stripTags(titleMatch[1]) : "";
    if (!title) continue;

    // 描述：主链接 </a> 之后的第一个足够长的纯文本节点（跳过日期短片段）
    const afterLink = block.slice((block.indexOf("</a>") ?? 0) + 4);
    let snippet = "";
    const textNodes = afterLink.match(/>([^<>]{25,220})</g) ?? [];
    for (const raw of textNodes) {
      const text = stripTags(raw.slice(1, -1));
      // 跳过面包屑（›）、日期（如 "May 8, 2026 -"）、纯英文短语碎片
      if (!text || text.includes("›") || /^\d|^[A-Z][a-z]{2} \d{1,2}, \d{4}/.test(text)) continue;
      if (/[\u4e00-\u9fff]/.test(text) || text.split(" ").length > 8) {
        snippet = text;
        break;
      }
    }

    seenUrls.add(url);
    results.push({ title, url, snippet });
    if (results.length >= limit) break;
  }
  return results;
}

/** 联网搜索：失败一律 ok=false，不抛异常（兜底链路不允许阻塞主问答）。 */
export async function searchWeb(
  query: string,
  opts?: { limit?: number; timeoutMs?: number },
): Promise<WebSearchOutcome> {
  const limit = opts?.limit ?? 5;
  const timeoutMs = opts?.timeoutMs ?? 10_000;
  const fail = (error: string): WebSearchOutcome => ({ ok: false, engine: "none", query, results: [], error });

  let response: Response;
  try {
    response = await fetch(
      `${BRAVE_SEARCH_URL}?${new URLSearchParams({ q: query, source: "web" }).toString()}`,
      {
        headers: {
          "User-Agent": DEFAULT_UA,
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
  } catch (e) {
    return fail(`联网搜索请求失败：${e instanceof Error ? e.message : e}`);
  }
  if (!response.ok) {
    return fail(`联网搜索 HTTP ${response.status}（可能被反爬拦截）`);
  }
  const html = await response.text().catch(() => "");
  const results = parseBraveResults(html, limit);
  if (!results.length) {
    return fail("联网搜索结果解析为空（页面结构可能已变化或被验证码拦截）");
  }
  return { ok: true, engine: "brave", query, results };
}
