/**
 * 当模型完全没按三贤格式输出（没有 【…】 标题）时的格式兜底。
 *
 * 两种策略：
 * - 模型内容足够充实（≥3段、每段≥40字）→ 按段落三等分包装进三贤模板
 * - 模型内容空洞/太短 → 用 buildNoEvidenceAnswer 的三贤模板兜底，
 *   不把胡言乱语包装成三贤发言（避免"玄说书法字形标准"这种荒谬输出）
 */
export function wrapAsMentorDialogue(rawContent: string): string {
  const content = rawContent.trim();
  if (!content) return buildNoEvidenceAnswer();
  // 如果已经有三贤标题，不需要包装
  if (/【盲派算师|【存在主义导师|【主事/.test(content)) return content;

  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());

  // 质量门槛：至少3段、每段至少30字，才值得包装。
  // 否则模型多半是输出了一堆空洞套话，包装了也是垃圾。
  if (paragraphs.length < 3 || paragraphs.some((p) => p.trim().length < 30)) {
    return buildNoEvidenceAnswer();
  }

  const third = Math.max(1, Math.ceil(paragraphs.length / 3));
  const huPart = paragraphs.slice(0, third).join("\n\n") || content;
  const liPart = paragraphs.slice(third, third * 2).join("\n\n") || "（承接上文）";
  const xuanPart = paragraphs.slice(third * 2).join("\n\n") || "（收束）";
  return (
    `【盲派算师·老胡】\n${huPart}\n\n` +
    `【存在主义导师·李】\n${liPart}\n\n` +
    `【主事·玄】\n${xuanPart}\n\n` +
    `_⚠️ 以上为系统整编（模型本轮未严格按三贤格式输出，已自动分段包装）。_`
  );
}

/**
 * 无典籍证据时仍维持产品的三贤对谈契约。
 *
 * 这段文字刻意不引用任何思想或典籍；每位只说明证据边界并给一个
 * 下一步，避免空库/检索无命中时退化成无法被 UI 拆分的普通文本。
 */
export function buildNoEvidenceAnswer(
  missing?: string,
  userProfile?: UserProfile | null,
): string {
  const detail = missing?.trim() ? `（${missing.trim()}）` : "";
  const bazi = userProfile?.bazi;
  const activeDaYun = bazi ? findDaYunForYear(bazi.daYun) : null;
  const liuNian = bazi ? currentLiuNian() : null;
  const chartNote = bazi
    ? `排盘上你是${bazi.dayMaster}${bazi.dayMasterWuXing}日主${activeDaYun ? `，眼下行${activeDaYun.ganZhi}大运` : ""}${liuNian ? `，正值${liuNian.ganZhi}流年` : ""}；这只作时势参考，不作铁口断语。`
    : "未见完整生辰，命理处老夫不妄断。";
  return `【盲派算师·老胡】
哎，老夫瞧着啊——典籍中暂时没有能贴合你这个困惑的内容${detail}，这回便不拿空话充数。${chartNote}眼下先守住节奏：把最急的一件事切成今天能收口的一小段，再把能缓三天的事放一放；若想细论，再添些相关书籍或笔记入藏。

【存在主义导师·李】
材料不足，我不会借一个漂亮观点替你回答。先写下：你现在能够亲自决定的最小一步是什么？只写一个，并在明天之前完成它。若要核对思想出处，请先上传相关的 .md、.txt 或 .pdf 材料。

【主事·玄】
两位守住的是同一条边界：无据，不妄言。贫道把路灯点在这里——先补材料，再谈判断；先走小步，不急着求定论。且去，莫急。`;
}
import { findDaYunForYear } from "@/core/user/baziCalculator";
import { currentLiuNian } from "@/core/mingli/liuNian";
import type { UserProfile } from "@/data/userProfile";
