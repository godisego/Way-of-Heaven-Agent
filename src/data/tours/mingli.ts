/**
 * 命理径课程 —— 教材是问者自己的盘。
 * 前置：需已建档（bazi-card 存在）；否则 tourController 会把定位步骤降级为居中说明。
 */

import type { DriveStep } from "driver.js";
import type { Lesson } from "./index";

const NEED_PROFILE =
  "（若右侧看不到四柱，请先在「卷一 · 问者档」填生辰建档——本课用你自己的盘当教材。）";

export const MINGLI_LESSONS: Lesson[] = [
  {
    id: "mingli-1",
    no: "一",
    title: "认盘：四柱、日主与五行",
    minutes: 3,
    steps: () => [
      {
        popover: {
          title: "命理径 · 第一课 认盘",
          description: `八字 = 出生时刻的年、月、日、时四组干支，共八个字。\n这一课认清三件事：哪个字是「我」、颜色是什么意思、盘面的时间轴怎么读。${NEED_PROFILE}`,
        },
      },
      {
        element: "[data-tour-id='bazi-card']",
        popover: {
          title: "四柱：干上支下",
          description:
            "每柱两个字：上为天干（甲乙丙丁…共十个），下为地支（子丑寅卯…共十二个）。\n干支由历法唯一确定——本系统按公历生日经真太阳时校正后查表得出，模型不参与推算。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='bazi-card']",
        popover: {
          title: "五行着色",
          description:
            "字色即五行：木绿、火朱、土赭、金褐、水黛（传统排盘着色法）。\n扫一眼颜色分布，就能看出这张盘哪种气多、哪种气缺——下面「五行」一行有精确计数。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='bazi-card']",
        popover: {
          title: "日主：八个字里的「我」",
          description:
            "日柱的天干叫日主（朱色标注），是全盘的坐标原点——\n其余七个字都以它论生克关系（这套关系名就是「十神」，下一课讲）。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='bazi-card']",
        popover: {
          title: "时间轴",
          description:
            "四柱同时是一条人生时间轴：年柱主早年与祖辈，月柱主青年与父母（也是判断强弱的「月令」），日柱主中年与婚姻，时柱主晚年与子女。",
          side: "left",
        },
      },
      {
        popover: {
          title: "实操 · 点你的日柱",
          description:
            "退出导览后，点一下你的日柱（朱色那格）——释义卡会讲这一柱的宫位含义、干支关系与藏干。\n盘面任何字都可以点，这就是本项目「把排盘做成教材」的方式。",
        },
      },
    ],
  },
  {
    id: "mingli-2",
    no: "二",
    title: "干支与十神：点开每个字",
    minutes: 3,
    steps: () => [
      {
        popover: {
          title: "命理径 · 第二课 干支与十神",
          description: `上一课认了盘，这一课学会「查字典」：每个干支字的本义、地支里藏的天干，以及十神——命理最重要的一套关系语言。${NEED_PROFILE}`,
        },
      },
      {
        element: "[data-tour-id='bazi-card']",
        popover: {
          title: "单点一个字",
          description:
            "整柱、单个天干、单个地支都可以分别点击。\n点天干看它的五行阴阳与本义；点地支还多一层——藏干。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='mingli-panel']",
        popover: {
          title: "释义卡：词条 + 在你盘中",
          description:
            "每张卡两段：这个概念本身是什么（71 词条知识库），以及它在你盘中扮演什么角色（确定性规则现算）。\n卡内蓝下划线词条可继续点击，交叉跳转。",
          side: "left",
        },
      },
      {
        popover: {
          title: "藏干与十神",
          description:
            "藏干：每个地支内部藏 1~3 个天干（如寅藏甲丙戊），本气在前——这是地支力量的来源。\n十神：任一天干与日主的生克关系名（生我=印、我生=食伤、克我=官杀、我克=财、同我=比劫，各分阴阳）。记住口诀，十神就通了一半。",
        },
      },
      {
        popover: {
          title: "实操 · 顺藤摸瓜",
          description:
            "退出后：点你的月支 → 看它藏了哪些干、各是你的什么十神 → 从卡里的关联词条再跳一层（比如跳到「十神」总词条）。\n连点三层不迷路，你就会用这套字典了。",
        },
      },
    ],
  },
  {
    id: "mingli-4",
    no: "四",
    title: "完整分析：八节走读你的盘",
    minutes: 3,
    steps: () => [
      {
        popover: {
          title: "命理径 · 第四课 完整分析",
          description: `前两课是「查字」，这一课是「读文」：系统对你的盘做一次完整的确定性走读——以及，它是怎么算出来的。${NEED_PROFILE}`,
        },
      },
      {
        element: "[data-tour-id='overview-btn']",
        popover: {
          title: "入口：盘面总览",
          description: "点这里打开完整分析。它不调用模型——每个结论都由查表与记分规则推出，可核验。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='mingli-panel']",
        popover: {
          title: "八节结构",
          description:
            "读盘四步 → 日主与月令 → 强弱粗评 → 五行分布 → 喜忌方向 → 十神偏重与性格线索 → 当前运程 → 宫位一览。\n次序就是传统读盘的次序：先定「我」的强弱，再看气的分布与流向，最后落到时间（运程）。",
          side: "left",
        },
      },
      {
        popover: {
          title: "算法透明：强弱是「记分」出来的",
          description:
            "月令旺相休囚死记 ±2~-2；地支通根本气 +2、中余气 +1；天干生扶 ±1——加总 ≥3 偏强、≤-3 偏弱。\n喜忌由强弱推方向（弱宜印比、强宜食伤财官）；十神偏重按透干 2 分、藏干本气 2 中余 1 统计。\n每节都写明局限：未计合冲刑害与调候——诚实比全能重要。",
        },
      },
      {
        popover: {
          title: "实操 · 把分析交给三贤",
          description:
            "完整分析的末尾有「问三贤」——它会把你的盘面要点自动写进问题递上茶案。\n机器给的是结构化事实，三位给的是怎么活。这正是本项目的分工：确定性代码管事实，模型只管解读。",
        },
      },
    ],
  },
];
