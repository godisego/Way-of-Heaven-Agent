export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ingestDocumentBuffer } from "@/core/ingestion/ingestionPipeline";

const ALLOWED_EXT = [".md", ".markdown", ".txt", ".text", ".pdf"];

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传 .md / .txt / .pdf 文件" }, { status: 400 });
    }
    const name = file.name.toLowerCase();
    if (!ALLOWED_EXT.some((ext) => name.endsWith(ext))) {
      return NextResponse.json({ error: "目前支持 .md / .txt / .pdf 文件" }, { status: 400 });
    }

    // 可选的书籍元数据（前端表单可不传，走文件名推断）
    const bookTitle = form.get("bookTitle");
    const author = form.get("author");
    const tradition = form.get("tradition");
    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await ingestDocumentBuffer({
      buffer,
      originalFileName: file.name,
      bookTitle: typeof bookTitle === "string" && bookTitle.trim() ? bookTitle.trim() : null,
      author: typeof author === "string" && author.trim() ? author.trim() : null,
      tradition: typeof tradition === "string" && tradition.trim() ? tradition.trim() : null,
    });
    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "入库失败" }, { status: 500 });
  }
}
