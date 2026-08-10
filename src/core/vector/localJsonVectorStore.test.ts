import { describe, it, expect, vi } from "vitest";
import { LocalJsonVectorStore } from "./localJsonVectorStore";
import type { VectorRecord } from "./vectorStore";

function makeRecord(dim: number, model?: string | null): VectorRecord {
  return {
    id: "r1",
    chunkId: "r1",
    documentId: "d1",
    sourceFileName: "f.md",
    pageNumber: 1,
    sectionTitle: null,
    bookTitle: null,
    author: null,
    tradition: null,
    text: "示例文本",
    embedding: new Array<number>(dim).fill(0.1),
    embeddingModel: model,
  };
}

describe("LocalJsonVectorStore.search 向量空间守卫", () => {
  it("维度错位时抛出可操作错误（而非全员 0 分静默通过）", async () => {
    const store = new LocalJsonVectorStore();
    vi.spyOn(store, "readAll").mockReturnValue([makeRecord(256, "mock-local-256d")]);
    const query = new Array<number>(3072).fill(0.2);
    await expect(store.search(query, 5)).rejects.toThrow(/向量空间错位/);
  });

  it("同维度但模型不同时抛错（防伪相似度，比维度错位更隐蔽）", async () => {
    const store = new LocalJsonVectorStore();
    vi.spyOn(store, "readAll").mockReturnValue([makeRecord(1536, "text-embedding-3-small")]);
    const query = new Array<number>(1536).fill(0.2);
    await expect(store.search(query, 5, undefined, "text-embedding-3-large")).rejects.toThrow(/向量模型不一致/);
  });

  it("维度与模型一致时正常返回打分结果", async () => {
    const store = new LocalJsonVectorStore();
    vi.spyOn(store, "readAll").mockReturnValue([makeRecord(8, "m")]);
    const query = new Array<number>(8).fill(0.5);
    const results = await store.search(query, 5, undefined, "m");
    expect(results).toHaveLength(1);
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("索引为空时不校验，返回空数组（首次入库前的正常态）", async () => {
    const store = new LocalJsonVectorStore();
    vi.spyOn(store, "readAll").mockReturnValue([]);
    const results = await store.search([0.1, 0.2], 5);
    expect(results).toEqual([]);
  });

  it("索引未盖戳（旧索引）且维度一致时不报模型错位", async () => {
    const store = new LocalJsonVectorStore();
    vi.spyOn(store, "readAll").mockReturnValue([makeRecord(8, null)]);
    const query = new Array<number>(8).fill(0.5);
    // 旧索引无 embeddingModel，模型守卫应降级跳过，不应抛错
    const results = await store.search(query, 5, undefined, "any-model");
    expect(results).toHaveLength(1);
  });
});
