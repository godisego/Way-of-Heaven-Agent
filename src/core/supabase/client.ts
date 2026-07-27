import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAppConfig } from "@/core/config/appConfig";

let adminClient: SupabaseClient | null = null;

/**
 * 服务端 / CLI 专用客户端（service role）。
 * 切勿 import 到 client component 或暴露给浏览器。
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const { supabaseUrl, supabaseServiceRoleKey } = getAppConfig();
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "缺少 Supabase 配置。请在 .env.local 设置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY。见 docs/supabase-setup.md",
    );
  }

  adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return adminClient;
}

export function isSupabaseConfigured(): boolean {
  const { supabaseUrl, supabaseServiceRoleKey } = getAppConfig();
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function getDocumentsBucket(): string {
  return getAppConfig().supabaseDocumentsBucket;
}
