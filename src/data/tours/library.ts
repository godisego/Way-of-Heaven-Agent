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
        title: "学习馆 · 你的自学入口",
        description:
          "这里不是一页文件清单，而是三种任务组成的学习工作台：\n\n· 命理学径（17 篇系统讲义）\n· Agent 学径（11 篇工程实践）\n· 命理速查（132 项术语交叉索引）\n\n页面只展示当前任务，避免信息过载。",
        side: "bottom",
      },
    },
    {
      element: "[data-tour-id='learn-view-switch']",
      popover: {
        title: "看这里 · 三个 tab",
        description:
          "点 tab 切换任务：命理学径带你从零到能独立断盘；Agent 学径教你 RAG/工具循环等工程原理；命理速查是术语字典，随时回来查。",
        side: "bottom",
        onNextClick: (_element, _step, { driver }) => {
          switchView("learn-tab-mingli", () => driver.moveNext());
        },
      },
    },
    {
      element: () => currentElement("[data-tour-id='learn-track-list']"),
      popover: {
        title: "看这里 · 阶段目录",
        description:
          "命理学径分六个阶段：零·入门预备 → 一·先认盘 → 二·读懂关系 → 三·加上时间 → 四·独立走盘 → 五·核对口径。\n\n每篇讲义都属于七层结构的某一层——从阴阳五行到格局用神，层层递进。",
        side: "right",
      },
    },
    {
      element: () => currentElement("[data-tour-id='learn-track-list']"),
      popover: {
        title: "看这里 · 连续阅读",
        description:
          "点任一篇讲义进去，底部有「上一篇 / 下一篇」——可以按学径顺序连续读完，不用记自己读到哪了。\n\n讲义里有可交互的 SVG 图——点图上的元素会高亮并显示详情。",
        side: "right",
        onNextClick: (_element, _step, { driver }) => {
          switchView("learn-tab-quick", () => driver.moveNext());
        },
      },
    },
    {
      element: () => currentElement("[data-tour-id='learn-quick-controls']"),
      popover: {
        title: "看这里 · 术语速查",
        description:
          "遇到不懂的术语？在这里搜——搜词名、搜五行、搜十神名称都行。\n\n也可以按类别筛选：基础概念、天干、地支、十神、五行、宫位、神煞。",
        side: "bottom",
      },
    },
    {
      popover: {
        title: "随时回来",
        description:
          "学习馆永远在这里——对谈时遇到不懂的术语，对谈界面里的蓝下划线词条会直接跳到速查。\n\n接下来：回到茶寮，认识三位贤者，试试问一个问题。",
      },
    },
  ],
};
