export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { listDocuments, getPageByDocumentAndNumber } from "@/core/documents/documentRepository";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const documentId = url.searchParams.get("documentId");
    const pageNumber = url.searchParams.get("pageNumber");

    if (documentId && pageNumber) {
      const page = getPageByDocumentAndNumber(documentId, Number(pageNumber));
      if (!page) return NextResponse.json({ error: "未找到对应页面" }, { status: 404 });
      return NextResponse.json({ page });
    }

    return NextResponse.json({ documents: listDocuments() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取文档失败" }, { status: 500 });
  }
}
