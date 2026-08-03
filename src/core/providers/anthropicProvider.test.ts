import { describe, expect, it } from "vitest";
import { consumeAnthropicSse } from "./anthropicProvider";

/** 把字符串编码成 ReadableStream<Uint8Array>（模拟 fetch response.body） */
function toStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

const DELTA = (text: string) =>
  `event: content_block_delta\ndata: ${JSON.stringify({
    type: "content_block_delta",
    delta: { type: "text_delta", text },
  })}\n\n`;

// Anthropic /messages 流式典型帧序列（节选关键帧）
function typicalStream(): string {
  return [
    "event: message_start\ndata: {\"type\":\"message_start\"}\n\n",
    "event: content_block_start\ndata: {\"type\":\"content_block_start\"}\n\n",
    DELTA("【盲派算师·老胡】\n"),
    DELTA("势未成，宜守。"),
    "event: content_block_stop\ndata: {\"type\":\"content_block_stop\"}\n\n",
    "event: message_delta\ndata: {\"type\":\"message_delta\"}\n\n",
    "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n",
  ].join("");
}

describe("consumeAnthropicSse（Anthropic SSE 流式解析）", () => {
  it("逐帧推送 text_delta，累加返回完整文本", async () => {
    const deltas: string[] = [];
    const full = await consumeAnthropicSse(toStream([typicalStream()]), (t) => deltas.push(t));
    expect(deltas).toEqual(["【盲派算师·老胡】\n", "势未成，宜守。"]);
    expect(full).toBe("【盲派算师·老胡】\n势未成，宜守。");
  });

  it("跨块边界安全：一帧被拆到多个 chunk 里仍能正确拼接", async () => {
    const raw = DELTA("半句A") + DELTA("半句B");
    // 把原始流切成任意大小的小块，强制帧跨 chunk
    const chunks: string[] = [];
    for (let i = 0; i < raw.length; i += 7) chunks.push(raw.slice(i, i + 7));
    const deltas: string[] = [];
    const full = await consumeAnthropicSse(toStream(chunks), (t) => deltas.push(t));
    expect(deltas).toEqual(["半句A", "半句B"]);
    expect(full).toBe("半句A半句B");
  });

  it("忽略 ping / 非 text_delta 帧，遇到 message_stop 立即结束", async () => {
    const stream = toStream([
      "event: ping\ndata: {\"type\":\"ping\"}\n\n",
      DELTA("只此一句。"),
      "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n",
      // 这帧在 message_stop 之后，不应被处理
      DELTA("不应出现"),
    ]);
    const deltas: string[] = [];
    const full = await consumeAnthropicSse(stream, (t) => deltas.push(t));
    expect(deltas).toEqual(["只此一句。"]);
    expect(full).toBe("只此一句。");
  });

  it("error 帧抛出，携带服务端 message", async () => {
    const stream = toStream([
      DELTA("先吐了一点"),
      `event: error\ndata: ${JSON.stringify({ type: "error", error: { message: "模型过载" } })}\n\n`,
    ]);
    const deltas: string[] = [];
    await expect(consumeAnthropicSse(stream, (t) => deltas.push(t))).rejects.toThrow("模型过载");
    // 出错前已推送的 delta 仍然回调过
    expect(deltas).toEqual(["先吐了一点"]);
  });

  it("缺省 event: 行时从 data.type 退化推断（兼容只发 data 的端点）", async () => {
    const stream = toStream([
      `data: ${JSON.stringify({
        type: "content_block_delta",
        delta: { type: "text_delta", text: "无 event 行" },
      })}\n\n`,
      `data: ${JSON.stringify({ type: "message_stop" })}\n\n`,
    ]);
    const deltas: string[] = [];
    const full = await consumeAnthropicSse(stream, (t) => deltas.push(t));
    expect(deltas).toEqual(["无 event 行"]);
    expect(full).toBe("无 event 行");
  });

  it("流自然结束（无显式 message_stop）也返回已累加文本", async () => {
    const stream = toStream([DELTA("结尾没有 stop 帧")]);
    const full = await consumeAnthropicSse(stream, () => {});
    expect(full).toBe("结尾没有 stop 帧");
  });

  it("空流返回空文本", async () => {
    const full = await consumeAnthropicSse(toStream([""]), () => {});
    expect(full).toBe("");
  });
});
