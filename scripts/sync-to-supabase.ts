/**
 * CLI：把本地 data/ 同步到 Supabase。
 *
 *   npm run sync:supabase
 *   npm run sync:supabase -- --no-files
 *   npm run sync:supabase -- --doc doc_xxx
 *
 * 使用 tsx 直接跑 TypeScript；会加载 .env.local / .env。
 */

import fs from "node:fs";
import path from "node:path";
import { syncLocalToSupabase } from "../src/core/supabase/syncLocalToSupabase";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function parseArgs(argv: string[]) {
  const documentIds: string[] = [];
  let uploadFiles = true;
  let upsertRows = true;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--no-files") uploadFiles = false;
    else if (arg === "--files-only") upsertRows = false;
    else if (arg === "--doc" || arg === "--document") {
      const id = argv[i + 1];
      if (id) {
        documentIds.push(id);
        i += 1;
      }
    }
  }

  return { uploadFiles, upsertRows, documentIds };
}

async function main() {
  const root = process.cwd();
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));

  const args = parseArgs(process.argv.slice(2));
  console.log("[sync:supabase] 开始本地 → Supabase 同步…");
  if (args.documentIds.length) console.log("  限定文档:", args.documentIds.join(", "));
  if (!args.uploadFiles) console.log("  跳过 Storage 文件上传");
  if (!args.upsertRows) console.log("  跳过表 upsert（仅文件）");

  const report = await syncLocalToSupabase({
    uploadFiles: args.uploadFiles,
    upsertRows: args.upsertRows,
    documentIds: args.documentIds.length ? args.documentIds : undefined,
    onLog: (message) => console.log(message),
  });

  console.log("\n[sync:supabase] 报告");
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[sync:supabase] 失败", error);
  process.exitCode = 1;
});
