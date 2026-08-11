/** 首次访问专用导览：先看懂整个项目，最后回到对话页配置真实模型。 */

import type { Lesson } from "./index";

function currentElement(primary: string, fallback = "body"): Element {
  return document.querySelector(primary) ?? document.querySelector(fallback) ?? document.body;
}

function moveAfter(driver: { moveNext: () => void }, action: () => void): void {
  action();
  window.setTimeout(() => driver.moveNext(), 180);
}

export const ONBOARDING_LESSONS: Lesson[] = [
  {
    id: "onboarding-home",
    no: "始",
    title: "第一次来到茶寮",
    minutes: 4,
    steps: () => [
      {
        popover: {
          title: "先看全貌：这既是应用，也是实验室",
          description:
            "天道茶寮由四部分组成：\n\n" +
            "· 对话案：Agent 自主查典籍、读原文，再组织三贤回答\n" +
            "· 问者档：用确定性代码排八字，把盘面做成可点击教材\n" +
            "· 入阁藏书：把 PDF、Markdown、文本做成可追溯的 RAG 知识库\n" +
            "· 学习馆：沿 Agent 与命理两条学径读文档、看图、查术语\n\n" +
            "零 Key 能用：排盘、逐项释义、学习馆、术语速查和示例对话。真实模型对谈与高质量语义检索才需要供应商。",
        },
      },
      {
        element: "[data-tour-id='chat-panel']",
        popover: {
          title: "一 · 对话案：Agent 负责先查证，再回答",
          description:
            "怎么用：保留「循迹」开启，提出一个需要典籍或盘面的问题。Agent 会选择检索工具、读取命中的原文、整理证据，再生成三贤回应；回答下方可以检查执行轨迹和引用来源。\n\n" +
            "用了什么：TypeScript 编排器、工具注册表、向量检索、证据台账、SSE 流式事件、引用与声口校验。\n\n" +
            "能学什么：Agent 和普通聊天的区别、工具循环、停止条件、可审计 RAG，以及怎样从第一处错误调试一条 AI 链路。",
          side: "right",
        },
      },
      {
        element: "[data-tour-id='agent-toggle']",
        popover: {
          title: "循迹开关：同一道题的两种工程解法",
          description:
            "Agent 模式：模型在白名单工具中决定下一步，直到证据够用或触发停止条件。\n\n" +
            "固定 RAG：关闭循迹后，检索、拼上下文、生成会按预定顺序执行。\n\n" +
            "怎么学：把同一问题各问一次，对照轨迹、耗时和引用，观察自主决策带来了什么，以及它为何必须有预算和刹车。",
          side: "bottom",
        },
      },
      {
        element: "[data-tour-id='demo-reply']",
        popover: {
          title: "先零成本体验三贤，再接真实模型",
          description:
            "怎么用：没有 Key 时点「看示例回复」，先熟悉三段回应、引用展示和产品交互。\n\n" +
            "工程取舍：三贤不是三个模型各说各话。当前实现用一次受控生成固定输出老胡、李、玄三段，再用程序检查次序、越库引用和角色串味，以平衡成本、稳定性和多 Agent 复杂度。",
          side: "bottom",
        },
      },
      {
        element: "[data-tour-id='uploader-card']",
        popover: {
          title: "二 · 入阁藏书：把自己的资料变成可核验记忆",
          description:
            "怎么用：展开「入阁藏书」，上传 PDF、Markdown 或纯文本；之后提问时，Agent 可以检索这些内容并给出书名、页码或章节。\n\n" +
            "用了什么：pdfjs-dist 提取文本，按来源单元切 chunk，Embedding 向量化，本地 JSON 向量索引做余弦检索。无 Embedding Key 也能用本地 mock 跑完整流程，真实模型会提升语义召回。\n\n" +
            "能学什么：摄取、切块、向量检索、来源锚点和反幻觉引用校验怎样连成一条 RAG。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='asker-profile']",
        popover: {
          title: "三 · 问者档：排盘事实交给代码，不交给模型猜",
          description:
            "怎么用：填写出生日期、时间、出生地和现居地并保存；城市经度会用于真太阳时校正。教育、工作、关系经历可选，只用于让回答更贴近现实。\n\n" +
            "用了什么：lunar-javascript 处理节气与干支，自研 TypeScript 规则计算十神、藏干、强弱、起运和岁运。排盘与释义完全不调用模型，因此不需要 Key。\n\n" +
            "能学什么：为什么确定性事实应由可测试、可审计的规则引擎负责。",
          side: "left",
        },
      },
      {
        element: () => currentElement("[data-tour-id='bazi-card']", "[data-tour-id='asker-profile']"),
        popover: {
          title: "排好以后：八个字都可以单独点",
          description:
            "这张盘不是结果截图，而是一套交互教材：\n\n" +
            "· 整柱：看年、月、日、时的宫位与干支组合\n" +
            "· 单个字：点上面的天干或下面的地支，看五行、阴阳与盘中关系\n" +
            "· 地支与时间：继续看藏干、十神、起运、大运和流年\n" +
            "· 关联概念：沿释义卡继续跳转，或把当前问题递给三贤\n\n" +
            "学习目标：从日主、月令、五行和十神开始，逐步学会自己读盘，而不是只收一个不可解释的结论。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='learning-entry']",
        popover: {
          title: "四 · 学习入口：短导览与系统讲义都在这里",
          description:
            "短课中心：点「学习」后，Agent 课会直接圈出当前界面讲 RAG、工具和轨迹；命理课会用你的盘讲四柱、十神与岁运。\n\n" +
            "完整学习馆：提供 Agent 与命理两条连续课程、互动图和命理速查。\n\n" +
            "使用门槛：全部内容随项目本地提供，不需要供应商或 API Key。",
          side: "top",
        },
      },
      {
        popover: {
          title: "现在你知道每一部分怎样接起来了",
          description:
            "职责链路：命理规则算清事实，藏书 RAG 找回依据，Agent 选择工具并组织取证，三贤把事实与依据落到现实选择；学习馆则把整套系统拆开给你学。\n\n" +
            "下一步：进入学习馆。看完后会回到对话页，再带你配置真实模型。",
          doneBtnText: "继续",
        },
      },
    ],
  },
  {
    id: "onboarding-provider",
    no: "终",
    title: "配置真实模型",
    minutes: 2,
    steps: () => [
      {
        element: "[data-tour-id='chat-panel']",
        popover: {
          title: "回到对话案：最后接上真实模型",
          description:
            "零 Key：排盘、释义、学习馆、速查和示例回复都可以直接使用。\n\n" +
            "需要供应商：让三贤真正生成回答，以及让典籍获得更好的语义检索。",
          side: "right",
        },
      },
      {
        element: "[data-tour-id='provider-settings-button']",
        popover: {
          title: "点这里打开供应商配置",
          description:
            "聊天模型：选择供应商后，填写 Base URL、API Key 和模型名。\n\n" +
            "预设供应商：会自动带出常见地址和兼容协议，你只需核对模型名。",
          side: "top",
          nextBtnText: "打开配置",
          onNextClick: (_element, _step, { driver }) => {
            moveAfter(driver, () => {
              if (!document.querySelector("[data-tour-id='provider-settings-panel']")) {
                (document.querySelector("[data-tour-id='provider-settings-button']") as HTMLButtonElement | null)?.click();
              }
            });
          },
        },
      },
      {
        element: () => currentElement("[data-tour-id='provider-settings-panel']", "[data-tour-id='provider-settings-button']"),
        popover: {
          title: "聊天模型必填，Embedding 可以分开选",
          description:
            "聊天模型：驱动三贤回答与 Agent 工具选择，是真实对谈的必需项。\n\n" +
            "Embedding：把问题和典籍变成向量。同一供应商支持时可以复用；不支持时可取消勾选，另配智谱、OpenAI、Ollama 等兼容服务。\n\n" +
            "未配置时：系统会用本地 mock 保留完整学习流程，但语义召回质量较低。",
          side: "left",
        },
      },
      {
        element: () => currentElement("[data-tour-id='provider-settings-actions']", "[data-tour-id='provider-settings-panel']"),
        popover: {
          title: "按这个顺序完成：保存 → 测试全部 → 必要时重建",
          description:
            "保存：配置写入本机服务器配置文件，网页和 CLI 共用；密钥不会再回传页面。\n\n" +
            "测试全部：实测聊天、Embedding，以及当前索引是否匹配。\n\n" +
            "更换 Embedding：如果模型或向量维度改变，按提示重建索引，避免旧向量与新查询落在不同空间。",
          side: "top",
          nextBtnText: "回到对话",
          onNextClick: (_element, _step, { driver }) => {
            moveAfter(driver, () => {
              (document.querySelector(".settings-close") as HTMLButtonElement | null)?.click();
            });
          },
        },
      },
      {
        element: "[data-tour-id='chat-input']",
        popover: {
          title: "第一轮建议这样试",
          description:
            "怎么问：开启「循迹」，问一个你真正在意的问题。已建问者档时，三贤会收到经过分权的盘面摘要；已入藏资料时，可以要求「给出出处」。\n\n" +
            "怎么看：先读回答，再展开执行轨迹，最后点开引用核对原文。你既是在使用对谈应用，也是在观察 Agent + RAG 系统怎样工作。",
          side: "top",
          doneBtnText: "开始提问",
        },
      },
    ],
  },
];
