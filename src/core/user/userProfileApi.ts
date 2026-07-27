/**
 * 问者档 API 抽象层。
 *
 * 目前唯一实现是 localStorage（src/data/userProfileStore.ts），
 * 将来上云时只需新建 Supabase 实现并切换 store，调用方不动。
 */

import type { UserProfile } from "@/data/userProfile";

export interface UserProfileApi {
  /** 读档；无档或解析失败返回 null */
  load(): Promise<UserProfile | null>;
  /** 存档（覆盖） */
  save(profile: UserProfile): Promise<void>;
  /** 清档 */
  clear(): Promise<void>;
}
