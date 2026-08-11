export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  deleteProviderSettings,
  readProviderSettings,
  redactProviderSettings,
  writeProviderSettings,
} from "@/core/config/providerSettingsFile";

export async function GET() {
  try {
    const settings = readProviderSettings();
    return NextResponse.json({ settings: redactProviderSettings(settings), exists: Boolean(settings) });
  } catch (error) {
    return failure(error, "读取供应商配置失败");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { settings?: unknown };
    const settings = writeProviderSettings(body.settings);
    return NextResponse.json({ settings: redactProviderSettings(settings), exists: true });
  } catch (error) {
    return failure(error, "保存供应商配置失败", 400);
  }
}

export async function DELETE() {
  try {
    deleteProviderSettings();
    return NextResponse.json({ settings: redactProviderSettings(null), exists: false });
  } catch (error) {
    return failure(error, "清除供应商配置失败");
  }
}

function failure(error: unknown, fallback: string, status = 500) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status },
  );
}
