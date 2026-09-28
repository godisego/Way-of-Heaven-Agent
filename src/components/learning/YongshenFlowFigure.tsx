"use client";

import { useState } from "react";

/** 不同取用视角的比较卡；不把流派方法伪装成通用决策算法。 */
const PERSPECTIVES = [
  { id: "fuyi", title: "扶抑", question: "生扶与克泄耗的条件怎样？", detail: "结合月令、通根、透干和全局关系说明偏强或偏弱的依据。项目记分只能给粗略方向，不能据此宣布唯一用神。" },
  { id: "tiaohou", title: "调候", question: "具体日干、月令如何讨论寒暖燥湿？", detail: "按所采用文献逐干逐月核对，并看候选五行能否发挥作用。不能用冬天一律补火、夏天一律补水替代推导。" },
  { id: "tongguan", title: "通关", question: "相克双方之间是否有相生环节？", detail: "先指出相克双方，再检查中间五行。例如木克土，可讨论木生火、火生土。木火本来相生，不应写作木火相战。" },
  { id: "bingyao", title: "病药", question: "该读法把哪一处视为主要矛盾？", detail: "声明作者或流派、矛盾及候选处理条件。病药是传统比喻，不是健康诊断；也不是最后覆盖所有方法的优先规则。" },
  { id: "teshu", title: "从格与化格", question: "是否满足文献规定的特殊条件？", detail: "分别核对从弱、从旺、化气的适用条件和反例。偏强偏弱不等于已成特殊格，不能用同一条无根条件判断所有情况。" },
];

export function YongshenFlowCard({ title }: { title: string }) {
  const [active, setActive] = useState(PERSPECTIVES[0].id);
  const selected = PERSPECTIVES.find((item) => item.id === active)!;
  return (
    <div className="mfig-card" style={{ background: "#fff", border: "1px solid rgba(37,42,48,0.14)", borderRadius: 8, padding: 14 }}>
      <div className="mfig-title" style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{title}</div>
      <p style={{ fontSize: 12, lineHeight: 1.7 }}>先声明文献与读法，再核对条件。以下视角可比较，没有跨流派统一的先后优先级。</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" }}>
        {PERSPECTIVES.map((item) => (
          <button key={item.id} type="button" aria-pressed={active === item.id} onClick={() => setActive(item.id)} style={{ padding: "8px 12px", borderRadius: 6, cursor: "pointer", border: "1px solid rgba(37,42,48,0.2)", background: active === item.id ? "#a8473c" : "#f8fafc", color: active === item.id ? "#fff" : "#252a30" }}>
            {item.title}
          </button>
        ))}
      </div>
      <div aria-live="polite" style={{ fontSize: 12, lineHeight: 1.8, padding: 12, background: "#f8fafc", borderRadius: 6 }}>
        <strong>{selected.question}</strong>
        <p style={{ margin: "6px 0 0" }}>{selected.detail}</p>
      </div>
      <p style={{ fontSize: 11, color: "#5f656b", lineHeight: 1.7, marginBottom: 0 }}>输出应包括：所用读法、依据、尚缺条件与候选解释。图中不自动指定用神，也不推定现实事件。</p>
    </div>
  );
}
