/**
 * 安全 fetch + JSON 解析。
 *
 * Next.js dev 模式下，API 路由编译产物偶尔损坏（.next 缓存问题），
 * 会返回 HTML 错误页（<!DOCTYPE html...>）而非 JSON。
 * 直接 .json() 会抛 "Unexpected token '<'"，把整个页面打挂。
 *
 * 本工具：
 * 1. fetch 后先检查 content-type / 响应体首字符；
 * 2. 若不是 JSON，抛一个清晰的错误（而非不可读的 token 错误）；
 * 3. 调用方 catch 后能给出友好提示或触发重试。
 */

export class FetchNotJsonError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = "FetchNotJsonError";
  }
}

/**
 * fetch 并安全解析 JSON。响应不是 JSON 时抛 FetchNotJsonError。
 */
export async function safeFetchJson<T = unknown>(
  input: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T }> {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";

  // 明确不是 JSON（是 HTML 错误页等）
  if (!contentType.includes("application/json")) {
    // 尝试读前 100 字判断是否 HTML
    const text = await response.text();
    const preview = text.slice(0, 100).trim();
    if (preview.startsWith("<") || preview.startsWith("<!")) {
      throw new FetchNotJsonError(
        `服务端返回了页面而非数据（HTTP ${response.status}）。可能是缓存损坏，请刷新页面重试。`,
        response.status,
        input,
      );
    }
    // 不是 HTML 也不是 JSON——也当作错误
    throw new FetchNotJsonError(
      `服务端响应格式异常（HTTP ${response.status}）。`,
      response.status,
      input,
    );
  }

  const data = (await response.json()) as T;
  return { ok: response.ok, status: response.status, data };
}
