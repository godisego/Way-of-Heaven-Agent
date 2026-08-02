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
        title: "学习馆 · 系统自学入口",
        description:
          "这里不是一页文件清单，而是三种任务组成的学习工作台：Agent 学径、命理学径和命理速查。页面只展示当前任务，避免十八篇讲义与七十一词条同时堆在眼前。",
        side: "bottom",
      },
    },
    {
      element: "[data-tour-id='learn-view-switch']",
      popover: {
        title: "先选择今天要做的事",
        description:
          "Agent 学径讲系统如何工作；命理学径讲怎样从盘面字段走到完整读盘；命理速查用于忘记概念时随手核对。三个入口随时切换，不会丢失文档内容。",
        side: "bottom",
      },
    },
    {
      element: "[data-tour-id='learn-route-head']",
      popover: {
        title: "每条学径先说清终点",
        description:
          "顶部先交代这条路线会学什么、完成后能做到什么。第一次来可直接从第 01 课开始；已有基础则从下面的阶段目录进入。",
        side: "bottom",
      },
    },
    {
      element: "[data-tour-id='learn-stage-rail']",
      popover: {
        title: "阶段目录是路线地图",
        description:
          "Agent 依次经过认地图、拆系统、建可信链、让模型行动、调试与评测。桌面端目录固定在左侧，手机端会变成可横向浏览的阶段条。",
        side: "right",
      },
    },
    {
      element: "[data-tour-id='learn-course-flow']",
      popover: {
        title: "讲义按顺序连续阅读",
        description:
          "每行都有课程序号、难度和本课目标。进入文档后，面包屑与课程进度告诉你所在位置，页尾的上一篇 / 下一篇把阅读接起来。",
        side: "left",
      },
    },
    {
      element: "[data-tour-id='learn-glossary']",
      popover: {
        title: "术语表默认收起",
        description:
          "Agent 学径末尾附二十七项核心术语，每项都标出仓库中的实现路径。需要读源码时再展开，平时不会占据整页视线。",
        side: "top",
      },
    },
    {
      element: "#learn-tab-mingli",
      popover: {
        title: "命理学径使用同一套方法",
        description:
          "命理径从认盘、读关系、加时间一路走到七步读盘和算法口径。下一步会切到命理径，让你看到对应路线。",
        side: "bottom",
        onNextClick: (_element, _step, { driver }) => {
          switchView("learn-tab-mingli", () => driver.moveNext());
        },
      },
    },
    {
      element: () => currentElement("[data-tour-id='learn-route-head']"),
      popover: {
        title: "命理课程与自己的盘互相核对",
        description:
          "课程行会列出相关的日主、藏干、十神或大运词条。读到陌生概念时，可以进入速查；下一步会自动切到命理速查工作台。",
        side: "bottom",
        onNextClick: (_element, _step, { driver }) => {
          switchView("learn-tab-quick", () => driver.moveNext());
        },
      },
    },
    {
      element: () => currentElement("[data-tour-id='learn-quick-controls']"),
      popover: {
        title: "先搜索，再按类别收窄",
        description:
          "搜索会同时匹配词名、摘要与完整解释；也可以按基础概念、干支、十神、五行、宫位和神煞筛选。词条深链会直接打开这里并定位目标。",
        side: "bottom",
        onPrevClick: (_element, _step, { driver }) => {
          switchView("learn-tab-mingli", () => driver.movePrevious());
        },
      },
    },
    {
      element: () => currentElement("[data-tour-id='learn-quick-workspace']"),
      popover: {
        title: "左边找词，右边读解释",
        description:
          "桌面端左侧是结果列表、右侧是当前词条；手机端会把当前解释放在结果前面。详情底部的相关词条可以继续交叉跳转。现在可以从一篇课或一个词开始了。",
        side: "top",
      },
    },
  ],
};
