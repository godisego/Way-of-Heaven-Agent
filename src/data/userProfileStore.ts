/**
 * 问者档 localStorage 实现。
 *
 * 留了切云端的钩子：将来要接 Supabase，只需新建一个 `SupabaseUserProfileApi`
 * 替换下面 `defaultApi` 的导出即可，调用方（ChatPanel / agents）零改动。
 */

import type { UserProfile } from "@/data/userProfile";
import type { UserProfileApi } from "@/core/user/userProfileApi";

const STORAGE_KEY = "way-of-heaven-agent:user-profile:v1";

class LocalStorageUserProfileApi implements UserProfileApi {
  async load(): Promise<UserProfile | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as UserProfile;
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async save(profile: UserProfile): Promise<void> {
    if (typeof window === "undefined") return;
    const stamped: UserProfile = { ...profile, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

/** 当前默认 API（localStorage）。将来上云时换掉这一行即可。 */
export const userProfileApi: UserProfileApi = new LocalStorageUserProfileApi();
