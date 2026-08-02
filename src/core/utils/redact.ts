/**
 * 敏感字段脱敏（Phase 3）—— 用于日志与错误响应。
 *
 * 不让密钥、上游报文里的私密字段、出生时辰随错误消息外泄。
 * 错误响应统一返回固定文案 + code，真实详情只走 console.error 且先 redact。
 */

const KEY_RE = /\b(sk-[A-Za-z0-9_\-]{6,})\b/g;
const BEARER_RE = /\b(Bearer\s+[A-Za-z0-9_\-\.]{6,})\b/gi;
const APIKEY_HDR_RE = /"(x-api-key|api-key|authorization)"\s*:\s*"[^"]*"/gi;

/** 把字符串里的密钥/Bearer/密钥头替换成 *** */
export function redactSecrets(text: string): string {
  if (!text) return text;
  return text
    .replace(KEY_RE, "sk-***")
    .replace(BEARER_RE, "Bearer ***")
    .replace(APIKEY_HDR_RE, '"$1":"***"');
}

/** 出生时辰 HH:MM 的脱敏：把 "04:30" 这类时辰从文本里抹成 HH:MM 占位 */
const TIME_RE = /\b(\d{2}):(\d{2})\b/g;
export function redactBirthTime(text: string): string {
  if (!text) return text;
  // 仅在含"生辰/出生/时辰"等命理语境时替换，避免误伤时间戳
  if (!/生辰|出生|时辰|birthTime|birth_time/i.test(text)) return text;
  return text.replace(TIME_RE, "HH:MM");
}

/** 统一脱敏：密钥 + 出生时辰 */
export function redactAll(text: string): string {
  return redactBirthTime(redactSecrets(text));
}
