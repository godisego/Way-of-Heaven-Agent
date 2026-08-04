/**
 * 命理径课程 —— 教材是问者自己的盘。
 * 前置：需已建档（bazi-card 存在）；否则 tourController 会把定位步骤降级为居中说明。
 */

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
            "每张卡两段：这个概念本身是什么（命理知识库词条），以及它在你盘中扮演什么角色（确定性规则现算）。\n卡内蓝下划线词条可继续点击，交叉跳转。",
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
  {
    id: "mingli-3",
    no: "三",
    title: "时间轴：起运、大运与流年",
    minutes: 4,
    steps: () => [
      {
        popover: {
          title: "命理径 · 第三课 时间轴",
          description: `原局是出生时的基础配置，大运是十年一个运行阶段，流年是当年的外部天气，小运补看上大运前的幼年。\n这一课把四层放在同一条时间轴上。${NEED_PROFILE}`,
        },
      },
      {
        element: "[data-tour-id='bazi-card']",
        popover: {
          title: "起运：何时进入第一步大运",
          description:
            "顺排者数到出生后的下一个节，逆排者数到前一个节，再按 3 天折 1 年的通行口径换算。页面显示到年、月、日，并给虚岁上运年龄。\n点「起运」行可看你自己的方向与口径。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='bazi-card']",
        popover: {
          title: "大运：十年一个长期环境",
          description:
            "大运从月柱沿六十甲子顺逆排，每十年一步。读某步运时，把运干和运支本气分别换算成相对日主的十神，再回原局看有没有根、制化与承载条件。\n点「当前大运」可直接展开。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='bazi-card']",
        popover: {
          title: "流年：一年一换，以立春为界",
          description:
            "流年不是单独判事件的两个字。正确顺序是原局 → 大运 → 流年：先看长期背景，再看今年引动了哪部分关系。\n页面会标出今年干支、十神以及它落在哪步大运内。",
          side: "left",
        },
      },
      {
        popover: {
          title: "小运：幼年补充层",
          description:
            "小运从时柱起，一岁一柱，方向与大运一致，主要补看尚未上大运前的幼年。上大运后通常退居参考，不必把所有时间层同时堆到成年判断里。",
        },
      },
      {
        popover: {
          title: "实操 · 写一句不带吉凶的时间描述",
          description:
            "退出后依次点起运、当前大运、今年流年，写一句：\n「我在 X 大运的长期背景中，今年又加入 Y 流年关系。」\n先描述结构，再用真实经历核对，不从干支直接跳到具体事件。深读：docs/bazi-luck-cycles.md。",
        },
      },
    ],
  },
  {
    id: "mingli-5",
    no: "五",
    title: "七步读盘：从字段到完整判断",
    minutes: 4,
    steps: () => [
      {
        popover: {
          title: "命理径 · 第五课 七步读盘",
          description: `认识所有字段后，最容易卡在「先看谁」。固定顺序是：校时 → 日主 → 月令 → 根气 → 十神位置 → 强弱流通 → 岁运与现实校准。${NEED_PROFILE}`,
        },
      },
      {
        element: "[data-tour-id='bazi-card']",
        popover: {
          title: "①校时 ②日主 ③月令",
          description:
            "先确认立春、节气、23 点和真太阳时边界；再找日干建立十神坐标；最后看月支这个生产环境支持还是消耗日主。\n输入不稳，就不进入细断。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='bazi-card']",
        popover: {
          title: "④根气 ⑤十神位置",
          description:
            "展开四个地支藏干，看日主和其他天干有没有底层支撑；再看哪些十神已经透在年、月、时干，分别落在哪个宫位。\n十神没有位置，就很容易沦为性格标签。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='overview-btn']",
        popover: {
          title: "⑥强弱与流通",
          description:
            "用月令、通根和天干生扶做透明粗评，再看五行是否能流动。喜忌只给生扶或克泄耗的大方向；页面会明确未计合冲刑害、调候与格局。",
          side: "left",
        },
      },
      {
        element: "[data-tour-id='mingli-panel']",
        popover: {
          title: "⑦岁运叠加，再回现实核对",
          description:
            "大运提供十年背景，流年提供一年触发；最后必须问现实中是否真有相应责任、资源、表达或同侪主题。\n盘面推测与经历不符时，先检查输入、简化算法和流派假设。",
          side: "left",
        },
      },
      {
        popover: {
          title: "毕业练习",
          description:
            "用 150 字说明自己的盘：日主与月令、一处根气证据、两个透干十神及柱位、当前岁运背景，再补一句算法局限。\n深读：docs/bazi-reading-workflow.md；忘词就去学习馆的命理交叉速查。",
        },
      },
    ],
  },
];
