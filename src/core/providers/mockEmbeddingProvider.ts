import crypto from "node:crypto";
import type { EmbedTextsInput, EmbedTextsResult, EmbeddingProvider } from "./llmProvider";

// 本地 mock embedding：完全不打外网。
// 用 SHA-512 的位流拼出一个固定维度的伪向量，每个 token 决定哪些维度被点亮。
// 这样：
//   - 同一条文本的向量稳定（同样的内容返回同样的向量）
//   - 不同文本的向量不同（足够随机以触发 cosineSimilarity 在 0~1 之间波动）
//   - 维度固定，所有用这个 provider 写入的向量和查询都能互相检索
//
// 分词策略：中文没有空格，若只按空白分词，整段会被当成一个 token，
// 导致中文内容几乎无法被关键词检索到。这里改用「字符二元组(bigram)」：
//   - 先按空白切出词（对英文/数字有效）
//   - 每个词内再滑窗取相邻两字符组成 bigram（对中文有效）
// 这样查询「自由」能命中包含「自由」二字相邻的分块。
//
// 注意：这仍是 hash-based 的词法匹配，不是语义模型，检索质量有限。
// 真正的语义检索请在 .env 配好真实 embedding 端点并设 USE_MOCK_EMBEDDING=0。
const DIM = 256;

function tokenize(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [text];
  const tokens: string[] = [];
  for (const word of trimmed.split(/\s+/)) {
    if (!word) continue;
    if (word.length === 1) {
      tokens.push(word);
      continue;
    }
    // 滑窗取相邻两字符的 bigram，让中文按字捕捉共现
    for (let i = 0; i < word.length - 1; i += 1) {
      tokens.push(word.slice(i, i + 2));
    }
  }
  return tokens.length ? tokens : [trimmed];
}

function hashToVector(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0);
  const tokens = tokenize(text);
  for (const token of tokens) {
    // 用 SHA-512 取 64 字节，循环平铺映射到 DIM 维（DIM 可大于 64）
    const digest = crypto.createHash("sha512").update(token).digest();
    for (let i = 0; i < DIM; i += 1) {
      // 把 1 字节映射到 +1 / -1 的稳定整数
      const byte = digest[i % digest.length];
      vec[i] += byte >= 128 ? 1 : -1;
    }
  }
  // L2 归一化，让 cosine 在 [-1,1] 之间可比
  let norm = 0;
  for (const value of vec) norm += value * value;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  for (let i = 0; i < DIM; i += 1) vec[i] = vec[i] / norm;
  return vec;
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  async embedTexts(input: EmbedTextsInput): Promise<EmbedTextsResult> {
    return {
      model: `mock-local-${DIM}d`,
      embeddings: input.texts.map(hashToVector),
    };
  }
}
