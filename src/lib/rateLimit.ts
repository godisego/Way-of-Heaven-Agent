/**
 * 简单的内存速率限制器（适用于单实例部署）。
 *
 * 基于滑动窗口算法，按 IP 地址限制请求频率。
 * 生产环境建议使用 Redis 或其他分布式存储实现跨实例共享。
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// 定期清理过期条目，避免内存泄漏
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60000); // 每分钟清理一次

export type RateLimitConfig = {
  /** 时间窗口内允许的最大请求数 */
  maxRequests: number;
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 可选的自定义标识符提取函数（默认使用 IP） */
  keyExtractor?: (request: Request) => string;
};

/**
 * 检查请求是否超过速率限制。
 *
 * @returns { allowed: true } 或 { allowed: false, retryAfter: number }
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
): { allowed: true } | { allowed: false; retryAfter: number } {
  const key = config.keyExtractor
    ? config.keyExtractor(request)
    : getClientIp(request);

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // 新窗口或窗口已过期
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return { allowed: true };
  }

  if (entry.count < config.maxRequests) {
    // 窗口内仍有配额
    entry.count++;
    return { allowed: true };
  }

  // 超过限制
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: false, retryAfter };
}

/**
 * 从请求头提取客户端 IP。
 * 优先使用 X-Forwarded-For（反向代理场景），回退到直连 IP。
 */
function getClientIp(request: Request): string {
  // Vercel / Cloudflare 等会设置 X-Forwarded-For
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // X-Forwarded-For 可能包含多个 IP（客户端, 代理1, 代理2...），取第一个
    return forwarded.split(",")[0].trim();
  }

  // 本地开发或直连场景
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // 无法获取真实 IP 时的兜底（仅用于开发环境）
  return "unknown";
}
