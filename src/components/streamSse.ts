/**
 * 极简 SSE 客户端解析（零依赖，与项目"最小依赖"调性一致）。
 *
 * 用法：读取一个 fetch Response 的流式 body，按 \n\n 分帧，
 * 解析每帧的 data: 行为 JSON 对象，经 onEvent 回调外发。
 *
 * 与服务端 src/app/api/chat/stream/route.ts 的帧协议配对：
 *   data: {"type":"step"|"delta"|"stop"|"done"|"final"|"error"|"end", ...}
 *
 * 跨块边界安全：buffer 缓存未成帧的尾部，下次拼接。
 */
export type SseEvent = { type: string; [key: string]: unknown };

export async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const event = parseFrame(frame);
        if (event) {
          onEvent(event);
          if (event.type === "end") return;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** 解析一帧：收集所有 data: 行，拼成 JSON。忽略注释行（: 开头）。 */
function parseFrame(frame: string): SseEvent | null {
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    // event:/id:/注释行 均忽略——本项目协议只用 data:
  }
  if (!dataLines.length) return null;
  const data = dataLines.join("\n");
  try {
    return JSON.parse(data) as SseEvent;
  } catch {
    return null;
  }
}
