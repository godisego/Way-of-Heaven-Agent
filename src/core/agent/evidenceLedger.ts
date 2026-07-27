/**
 * Evidence Ledger（证据台账）—— agent-loop-design.md 第 6.4 节。
 *
 * 循环中每个工具带回的证据都登记在此：按 chunkId 去重、顺序分配 ev_N、
 * 记录来自第几步。生成阶段的 Sources 与引用校验只认台账，
 * 使「每个事实性引用可回溯到取证步骤」成立。
 */

import type { EvidenceEntry, EvidenceItem } from "./types";

export class EvidenceLedger {
  private entries_: EvidenceEntry[] = [];
  private byChunkId = new Map<string, EvidenceEntry>();

  /** 登记证据（去重）。返回本次实际新增的条目（含分配的 evidenceId）。 */
  add(items: EvidenceItem[], stepIndex: number): EvidenceEntry[] {
    const added: EvidenceEntry[] = [];
    for (const item of items) {
      if (this.byChunkId.has(item.chunkId)) continue;
      const entry: EvidenceEntry = {
        evidenceId: `ev_${this.entries_.length + 1}`,
        addedAtStep: stepIndex,
        item,
      };
      this.entries_.push(entry);
      this.byChunkId.set(item.chunkId, entry);
      added.push(entry);
    }
    return added;
  }

  /** 已知某 chunk 的证据 id（未登记返回 null） */
  idOf(chunkId: string): string | null {
    return this.byChunkId.get(chunkId)?.evidenceId ?? null;
  }

  entries(): EvidenceEntry[] {
    return [...this.entries_];
  }

  /** 供 buildContext / validateCitations 复用的原始记录 */
  records(): EvidenceItem[] {
    return this.entries_.map((e) => e.item);
  }

  count(): number {
    return this.entries_.length;
  }
}
