"use client";

/**
 * Agent 学习径可视化图表（小白友好）。
 *
 * 把抽象的 RAG/向量检索/工具循环概念，画成直观的示意图：
 * - VectorSearchFigure：向量检索示意（问句变成向量，和典籍向量匹配，最近的浮上来）
 * - AgentLoopFigure：工具循环示意（困惑→调工具→看观察→够了→三贤回答）
 */

/** 向量检索示意图：用距离直观表示"语义相近=向量距离近" */
export function VectorSearchFigure() {
  return (
    <div className="mfig-card">
      <h4 className="mfig-title">向量检索：怎么从一堆书里找到相关的段落</h4>
      <p className="exchart-intro">
        把<strong>问题</strong>和<strong>每段典籍</strong>都变成一串数字（向量）。
        距离越近，说明内容越相关——就像在地图上找最近的点。
      </p>
      <svg viewBox="0 0 320 200" className="mfig-svg" style={{ maxWidth: 320 }}>
        {/* 问句向量（中心，沉朱） */}
        <circle cx="160" cy="100" r="14" fill="#a8473c" opacity="0.9" />
        <text x="160" y="104" textAnchor="middle" fill="#fdfdfb" fontSize="11" fontWeight="600">问</text>
        <text x="160" y="128" textAnchor="middle" fill="#a8473c" fontSize="9.5">你的困惑</text>

        {/* 相关典籍（近，竹月） */}
        <circle cx="100" cy="60" r="11" fill="#5f7a74" opacity="0.85" />
        <text x="100" y="63" textAnchor="middle" fill="#fdfdfb" fontSize="9">A</text>
        <text x="100" y="42" textAnchor="middle" fill="#5f7a74" fontSize="9">最相关 ✓</text>
        <line x1="160" y1="100" x2="100" y2="60" stroke="#5f7a74" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />

        <circle cx="115" cy="145" r="10" fill="#5f7a74" opacity="0.7" />
        <text x="115" y="148" textAnchor="middle" fill="#fdfdfb" fontSize="8.5">B</text>
        <line x1="160" y1="100" x2="115" y2="145" stroke="#5f7a74" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />

        {/* 不太相关（远，灰色） */}
        <circle cx="240" cy="50" r="8" fill="#9a9a9f" opacity="0.5" />
        <text x="240" y="53" textAnchor="middle" fill="#fdfdfb" fontSize="7.5">C</text>
        <text x="258" y="53" fill="#8b9095" fontSize="8.5">太远 ✗</text>
        <line x1="160" y1="100" x2="240" y2="50" stroke="#9a9a9f" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.25" />

        <circle cx="260" cy="160" r="7" fill="#9a9a9f" opacity="0.4" />
        <text x="260" y="163" textAnchor="middle" fill="#fdfdfb" fontSize="7">D</text>
        <line x1="160" y1="100" x2="260" y2="160" stroke="#9a9a9f" strokeWidth="0.7" strokeDasharray="2 3" opacity="0.2" />
      </svg>
      <div className="mfig-desc">
        <p className="mfig-desc-default">
          <span style={{ color: "#5f7a74" }}>●</span> 绿色圈是相关的典籍段落（向量近，被检索到）；
          <span style={{ color: "#9a9a9f" }}> ●</span> 灰色圈是不相关的（向量远，被忽略）。
          系统只把<strong>最近的几段</strong>交给三贤参考——这就是"检索"。
        </p>
      </div>
    </div>
  );
}

/** Agent 工具循环示意图：困惑 → 调工具 → 看观察 → 够了 → 回答 */
export function AgentLoopFigure() {
  const steps = [
    { label: "收到困惑", icon: "？", color: "#a8473c" },
    { label: "调工具检索", icon: "🔍", color: "#5f7a74" },
    { label: "看观察结果", icon: "👁", color: "#5f7a74" },
    { label: "证据够了？", icon: "✓", color: "#a8473c" },
    { label: "三贤回答", icon: "答", color: "#252a30" },
  ];
  return (
    <div className="mfig-card">
      <h4 className="mfig-title">Agent 工具循环：模型怎么自己找证据</h4>
      <p className="exchart-intro">
        Agent 不是一次性回答，而是像人一样<strong>先查资料再回答</strong>：
        收到问题 → 自己决定调哪个工具 → 看返回的资料 → 判断够不够 → 够了才回答。
      </p>
      <div className="agent-loop-flow">
        {steps.map((s, i) => (
          <div key={i} className="agent-loop-step">
            <div className="agent-loop-node" style={{ borderColor: s.color, color: s.color }}>
              <span className="agent-loop-icon">{s.icon}</span>
              <span className="agent-loop-label">{s.label}</span>
            </div>
            {i < steps.length - 1 ? <div className="agent-loop-arrow">→</div> : null}
          </div>
        ))}
      </div>
      <div className="mfig-desc">
        <p className="mfig-desc-default">
          如果"证据不够"，模型会<strong>回到第 2 步继续检索</strong>（换关键词再搜）——
          这就是"循环"。直到证据充分，才交给三贤生成最终回答。
          下方的<strong>执行轨迹面板</strong>记录了每一步（这就是"循迹"开关看的东西）。
        </p>
      </div>
    </div>
  );
}
