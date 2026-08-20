export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDefaultProvider } from "@/core/providers/openAICompatibleProvider";
import { getAppConfig } from "@/core/config/appConfig";
import { checkRateLimit } from "@/lib/rateLimit";
import { LEARN_DOCS } from "@/data/learnDocs";

/**
 * 学习馆「快速问 AI」—— 轻量 LLM 问答，不经过 RAG 检索和三贤人设。
 *
 * 与 /api/chat 的区别：
 * - 不做向量检索（不走 embedding / 向量库）
 * - 不走三贤人设 / 引用校验 / 声口校验
 * - 独立限流配额（10 次/分钟）
 * - 回复限制 300 字以内
 * - 回答附带"相关讲义"链接
 *
 * 设计意图：学生在学习馆读讲义时有疑问，需要一个即时通道问 AI，
 * 但不需要走完整的 Agent/RAG 链路（太重、太慢、太贵）。
 *
 * 前端组件：src/components/learning/QuickAsk.tsx
 */

const MAX_ANSWER_TOKENS = 512; // ~300 中文字

const SYSTEM_PROMPT = `你是天道茶寮学习馆的 AI 助教，帮助学生理解 AI Agent 和命理知识。

回答规则：
1. 用简洁的中文回答，不超过 300 字
2. 用大白话，避免学术腔
3. 如果学生问的是讲义里的内容，引用讲义里的原话或类比
4. 如果不确定，说"这个我不太确定，建议回看讲义"
5. 不要编造不存在的功能或文件
6. 不要回答与学习无关的问题（如写代码、写邮件），引导回学习话题`;

type LearnAskBody = {
  question?: unknown;
  context?: unknown;
};

export async function POST(request: Request) {
  // ── 限流：10 次/分钟 ──
  const rateCheck = checkRateLimit(request, { maxRequests: 10, windowMs: 60000 });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `提问过于频繁，请 ${rateCheck.retryAfter} 秒后再试` },
      { status: 429 },
    );
  }

  // ── 解析请求 ──
  const body = await request.json().catch(() => ({})) as LearnAskBody;
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const context = typeof body.context === "string" ? body.context.trim() : "";

  if (!question) {
    return NextResponse.json({ error: "问题不能为空" }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "问题太长（上限 500 字）" }, { status: 400 });
  }

  // ── 检查 chat provider 是否已配置 ──
  const config = getAppConfig();
  if (!config.chatBaseUrl || !config.chatApiKey || !config.chatModel) {
    return NextResponse.json({
      error: "聊天供应商未配置——请点击右下齿轮配置 Base URL、API Key 和模型名后再试。",
    }, { status: 503 });
  }

  // ── 构建 prompt ──
  const userPrompt = context
    ? `学生正在阅读：《${context}》\n\n学生提问：${question}`
    : `学生提问：${question}`;

  // ── 调用 LLM（复用 summarize 通道，不走 RAG） ──
  const provider = getDefaultProvider();
  if (typeof provider.summarize !== "function") {
    return NextResponse.json({
      error: "当前供应商不支持快速问答（未实现 summarize 接口）",
    }, { status: 501 });
  }

  try {
    const result = await provider.summarize({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: MAX_ANSWER_TOKENS,
    });

    // ── 找相关讲义（简单关键词匹配） ──
    const relatedDocs = findRelatedDocs(question, context);

    return NextResponse.json({
      answer: result.text,
      relatedDocs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `AI 助教回答失败：${message}` },
      { status: 500 },
    );
  }
}

/**
 * 简单关键词匹配：从问题中提取关键词，匹配讲义标题和简介。
 * 不走向量检索——这是"快速问"，不需要精确匹配。
 */
function findRelatedDocs(question: string, currentDoc?: string): Array<{ slug: string; title: string }> {
  const keywords = question.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  const results: Array<{ slug: string; title: string; score: number }> = [];

  for (const doc of LEARN_DOCS) {
    if (doc.slug === currentDoc) continue; // 不推荐当前讲义
    const haystack = `${doc.title} ${doc.blurb}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (haystack.includes(kw)) score++;
    }
    if (score > 0) {
      results.push({ slug: doc.slug, title: doc.title, score });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ slug, title }) => ({ slug, title }));
}
