// 从 md / txt 纯文本按「章节」切分。
// 章节单位复用现有 page 结构：pageNumber = 章节序号（从 1 递增），sectionTitle = 章节标题。
//
// 策略：
//   - Markdown：按标题行（# / ## / ### …）切段，标题作为 sectionTitle。
//   - 纯文本 / 无标题：按空行分隔的「段落块」聚合，标题为空，序号递增。
// 每个章节保留原文文本，交给下游 chunkPages 再按字符窗口细切。

export type ExtractedSection = {
  pageNumber: number;
  sectionTitle: string | null;
  text: string;
};

const HEADING_REGEX = /^\s{0,3}(#{1,6})\s+(.*\S)\s*$/;

export function extractTextSections(raw: string): ExtractedSection[] {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  const hasHeadings = lines.some((line) => HEADING_REGEX.test(line));
  const sections = hasHeadings ? splitByHeadings(lines) : splitByBlankLines(normalized);

  // 过滤空章节并重新编号，保证 pageNumber 连续从 1 开始
  return sections
    .filter((section) => section.text.trim().length > 0)
    .map((section, index) => ({ ...section, pageNumber: index + 1 }));
}

function splitByHeadings(lines: string[]): ExtractedSection[] {
  const sections: ExtractedSection[] = [];
  let currentTitle: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text || currentTitle) {
      sections.push({ pageNumber: 0, sectionTitle: currentTitle, text });
    }
    buffer = [];
  };

  for (const line of lines) {
    const match = line.match(HEADING_REGEX);
    if (match) {
      // 遇到新标题：先收束上一节，再开启新节
      flush();
      currentTitle = match[2].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

// 纯文本：按连续空行切成段落块，若整体很短则整篇作为一节。
function splitByBlankLines(text: string): ExtractedSection[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length <= 1) {
    return [{ pageNumber: 0, sectionTitle: null, text: text.trim() }];
  }
  return blocks.map((block) => ({ pageNumber: 0, sectionTitle: null, text: block }));
}
