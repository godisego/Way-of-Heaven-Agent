/** 学习馆自身导览：解释三模式工作台与连续阅读路径。 */

import type { Lesson } from "./index";

function currentElement(selector: string): Element {
  return document.querySelector(selector) ?? document.body;
}

function switchView(tabId: string, move: () => void): void {
  document.getElementById(tabId)?.click();
  window.setTimeout(move, 160);
}

export const LIBRARY_LESSON: Lesson = {
  id: "library-tour",
  no: "导",
  title: "学习馆导览",
  minutes: 2,
  steps: () => [
    {
      element: "[data-tour-id='learn-home-head']",
      popover: {
        title: "学习馆：不需要 Key 的完整自学区",
        description:
          "本地内容：课程、图解和词条都随项目提供，不会调用聊天模型或 Embedding，因此没有供应商、没有 Key 也能完整使用。\n\n" +
          "三种任务：沿 Agent 学径拆工程，沿命理学径练读盘，遇到陌生概念时用速查交叉核对。",
        side: "bottom",
      },
    },
    {
      element: "[data-tour-id='learn-view-switch']",
      popover: {
        title: "先选任务，不必从头把所有内容读完",
        description:
          "Agent 学径：适合想看懂这套 AI 系统的人。\n\n" +
          "命理学径：适合想从自己的盘开始学习读盘的人。\n\n" +
          "命理速查：适合读课、看盘或对话时随手查陌生词。三个视图一次只展示当前任务，先看 Agent 学径。",
        side: "bottom",
        nextBtnText: "看 Agent 学径",
        onNextClick: (_element, _step, { driver }) => {
          switchView("learn-tab-agent", () => driver.moveNext());
        },
      },
    },
    {
      element: () => currentElement("[data-tour-id='learn-course-flow']"),
      popover: {
        title: "Agent 学径：把当前项目当作活教材",
        description:
          "怎么学：统一沿五层地图：AI 世界观 → AI 技术树 → 模型原理 → AI Engineering → AI 产品思维。先给概念归位，再拆模型、上下文、工具与评测，最后算清用户价值。\n\n" +
          "能学到：Jev 与 LLM 怎样分工，MCP / A2A / Skills 各解决什么问题，怎样管理上下文、恢复失败，并以业务基线验证交付。讲义区分通用原理与本项目已实现能力。",
        side: "right",
        nextBtnText: "看命理学径",
        onNextClick: (_element, _step, { driver }) => {
          switchView("learn-tab-mingli", () => driver.moveNext());
        },
      },
    },
    {
      element: () => currentElement("[data-tour-id='learn-course-flow']"),
      popover: {
        title: "命理学径：从点一个字到按顺序读完整张盘",
        description:
          "怎么学：先认阴阳五行与四柱，再学天干、地支、藏干、十神和强弱；随后加入大运流年，最后练七步读盘、格局取用和流派边界。\n\n" +
          "能学到：不靠一句断语，而是从日主、月令、根气、十神位置和时间层逐项给出依据。讲义中的盘面与关系图可以点击，高亮后会解释当前元素。",
        side: "right",
        nextBtnText: "看术语速查",
        onNextClick: (_element, _step, { driver }) => {
          switchView("learn-tab-quick", () => driver.moveNext());
        },
      },
    },
    {
      element: () => currentElement("[data-tour-id='learn-quick-controls']"),
      popover: {
        title: "命理速查：阅读过程中随用随查",
        description:
          "怎么查：搜词名、五行或十神，也可以按天干、地支、十神、宫位、神煞等类别筛选。每个词条还会链接相关概念。\n\n" +
          "怎样联动：首页逐字释义与这里使用同一套知识库。盘面点到的概念可以来这里系统核对；课程或对话中遇到陌生词也可以立即回来查。",
        side: "bottom",
      },
    },
    {
      popover: {
        title: "推荐用法：问题驱动，再沿学径补体系",
        description:
          "问题驱动：想理解 Agent 轨迹，就读工具循环与调试；想看懂自己的月支，就从盘面点开，再回命理学径补月令、藏干与十神。\n\n" +
          "系统学习：每篇讲义底部都有上一篇与下一篇，可以沿学径连续阅读。\n\n" +
          "下一步：返回对话页，完成唯一需要外部服务的部分——真实模型配置。",
        doneBtnText: "返回对话页",
      },
    },
  ],
};
