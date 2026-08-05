/**
 * 命理知识库（规则引擎 · 知识层）
 *
 * 口径：子平命理通行主流说法；有流派分歧处在词条内注明。
 * 词条是静态知识；「在你盘中的含义」由 explainChart.ts 的组合器
 * 结合具体排盘结果确定性地生成——不靠模型现编，条条可核。
 *
 * links 里的 id 构成词条之间的交叉引用网，前端点击可跳转。
 */

export type MingliCategory =
  | "concept" // 基础概念
  | "tiangan" // 十天干
  | "dizhi" // 十二地支
  | "shishen" // 十神
  | "wuxing" // 五行
  | "gongwei" // 四柱宫位
  | "shensha"; // 神煞

export type MingliEntry = {
  id: string;
  term: string;
  category: MingliCategory;
  /** 一句话（面板首行） */
  brief: string;
  /** 详细说明（2~5 句，通行口径） */
  detail: string;
  /** 交叉引用词条 id */
  links: string[];
};

/** 天干结构化元数据 */
export type GanInfo = {
  wuXing: "金" | "木" | "水" | "火" | "土";
  yinYang: "阳" | "阴";
  /** 物象 */
  image: string;
};

/** 地支结构化元数据 */
export type ZhiInfo = {
  wuXing: "金" | "木" | "水" | "火" | "土";
  yinYang: "阳" | "阴";
  /** 农历月份（节气月） */
  month: string;
  /** 时辰 */
  hours: string;
  shengXiao: string;
  /** 藏干（本气在前） */
  cangGan: string[];
  image: string;
};

export const GAN_INFO: Record<string, GanInfo> = {
  甲: { wuXing: "木", yinYang: "阳", image: "参天大树、栋梁之木" },
  乙: { wuXing: "木", yinYang: "阴", image: "花草藤蔓、柔韧之木" },
  丙: { wuXing: "火", yinYang: "阳", image: "太阳之火、光明普照" },
  丁: { wuXing: "火", yinYang: "阴", image: "灯烛星火、文明之象" },
  戊: { wuXing: "土", yinYang: "阳", image: "城墙高山、厚重之土" },
  己: { wuXing: "土", yinYang: "阴", image: "田园湿土、滋养万物" },
  庚: { wuXing: "金", yinYang: "阳", image: "刀斧钢铁、肃杀之金" },
  辛: { wuXing: "金", yinYang: "阴", image: "珠玉首饰、精纯之金" },
  壬: { wuXing: "水", yinYang: "阳", image: "江河大海、奔流之水" },
  癸: { wuXing: "水", yinYang: "阴", image: "雨露泉水、渗润之水" },
};

export const ZHI_INFO: Record<string, ZhiInfo> = {
  子: { wuXing: "水", yinYang: "阳", month: "十一月（大雪后）", hours: "23:00-01:00", shengXiao: "鼠", cangGan: ["癸"], image: "夜半之水、一阳初生" },
  丑: { wuXing: "土", yinYang: "阴", month: "十二月（小寒后）", hours: "01:00-03:00", shengXiao: "牛", cangGan: ["己", "癸", "辛"], image: "寒冬湿土、金之墓库" },
  寅: { wuXing: "木", yinYang: "阳", month: "正月（立春后）", hours: "03:00-05:00", shengXiao: "虎", cangGan: ["甲", "丙", "戊"], image: "初春生发、火之长生" },
  卯: { wuXing: "木", yinYang: "阴", month: "二月（惊蛰后）", hours: "05:00-07:00", shengXiao: "兔", cangGan: ["乙"], image: "仲春门户、木之专位" },
  辰: { wuXing: "土", yinYang: "阳", month: "三月（清明后）", hours: "07:00-09:00", shengXiao: "龙", cangGan: ["戊", "乙", "癸"], image: "湿土蓄水、水之墓库" },
  巳: { wuXing: "火", yinYang: "阴", month: "四月（立夏后）", hours: "09:00-11:00", shengXiao: "蛇", cangGan: ["丙", "戊", "庚"], image: "初夏之火、金之长生" },
  午: { wuXing: "火", yinYang: "阳", month: "五月（芒种后）", hours: "11:00-13:00", shengXiao: "马", cangGan: ["丁", "己"], image: "盛夏之火、阳极阴生" },
  未: { wuXing: "土", yinYang: "阴", month: "六月（小暑后）", hours: "13:00-15:00", shengXiao: "羊", cangGan: ["己", "丁", "乙"], image: "盛夏燥土、木之墓库" },
  申: { wuXing: "金", yinYang: "阳", month: "七月（立秋后）", hours: "15:00-17:00", shengXiao: "猴", cangGan: ["庚", "壬", "戊"], image: "初秋肃杀、水之长生" },
  酉: { wuXing: "金", yinYang: "阴", month: "八月（白露后）", hours: "17:00-19:00", shengXiao: "鸡", cangGan: ["辛"], image: "仲秋收成、金之专位" },
  戌: { wuXing: "土", yinYang: "阳", month: "九月（寒露后）", hours: "19:00-21:00", shengXiao: "狗", cangGan: ["戊", "辛", "丁"], image: "深秋燥土、火之墓库" },
  亥: { wuXing: "水", yinYang: "阴", month: "十月（立冬后）", hours: "21:00-23:00", shengXiao: "猪", cangGan: ["壬", "甲"], image: "初冬之水、木之长生" },
};

const GAN_DETAIL: Record<string, string> = {
  甲: "十天干之首，阳木。如参天大树，性直向上，有担当、讲原则，喜生发而恶砍伐。得水土滋养则成栋梁；逢庚金修剪，反可成材。",
  乙: "阴木。如花草藤蔓，柔韧善变通，随势攀附而不折，擅协调周旋。喜丙火照暖、癸水滋润；最怕秋金过重。",
  丙: "阳火。如太阳，光明外放、热情坦荡，普照而不求回报。丙火旺者气场强、感染力足；过旺则灼物，宜壬水相济（水火既济）。",
  丁: "阴火。如灯烛之火、星光炉火，主文明、细腻、专注，外柔内明。丁火喜甲木作薪（有源之火），夜生尤见其明；忌癸水浇头。",
  戊: "阳土。如城墙高山，厚重稳固、守成可靠，为万物之堤防。戊土旺者踏实有信；过厚则滞，喜甲木疏土、水来润泽。",
  己: "阴土。如田园湿土，包容滋养、善于承载培育。己土能纳水生金、培木养火，是很好的调和之土；过湿则需丙火暖照。",
  庚: "阳金。如刀斧钢铁，刚健果决、带肃杀之气，主变革与执行。庚金喜丁火锻炼（成器）、壬水淬洗；忌埋于厚土。",
  辛: "阴金。如珠玉首饰，精致锋锐、重品质与体面。辛金喜壬水淘洗（愈发晶莹）、己土滋生；忌丁火强炼、戊土埋没。",
  壬: "阳水。如江河大海，奔流不息、聪明豪放、志向远大。壬水喜戊土为堤（有约束则成大用）、庚金发源；泛滥则漂。",
  癸: "阴水。如雨露泉水，细腻渗透、智慧内敛，润物无声。癸水喜庚辛金发源、见丙火则成雨后天晴之象；最忌己土浊之。",
};

const ZHI_DETAIL: Record<string, string> = {
  子: "水之专位，藏干只有癸水，气纯。为夜半之时、一阳初生之地。子水主智，流动而暗涌；逢午相冲（子午冲），与丑相合（子丑合土）。",
  丑: "湿土，藏己土（本气）、癸水、辛金——因藏辛金，丑又称「金之墓库」，金气收藏于此。丑土寒而能蓄，主隐忍积累；与未相冲，与子相合。",
  寅: "阳木，藏甲木（本气）、丙火、戊土。正月立春之地，万物生发，丙火在此长生，故寅中木火同源。主行动力与开创；与申相冲，与亥相合。",
  卯: "木之专位，藏干只有乙木，气纯。仲春之门户，主生长、条达、仁心。与酉相冲（卯酉冲），与戌相合。",
  辰: "湿土，藏戊土（本气）、乙木、癸水——藏癸水故称「水之墓库」。辰为龙，能蓄水养木，气象最杂，主变化与包藏；与戌相冲，与酉相合。",
  巳: "火（位属阴），藏丙火（本气）、戊土、庚金——庚金在此长生，故巳中火金共处。主文明与机变；与亥相冲，与申相合（也论刑）。",
  午: "火之旺地，藏丁火（本气）、己土。盛夏正阳，阳极而一阴生。主礼、主名气与显达；与子相冲，与未相合。",
  未: "燥土，藏己土（本气）、丁火、乙木——藏乙木故称「木之墓库」。夏末之土，燥而有余温，主蓄养收敛；与丑相冲，与午相合。",
  申: "阳金，藏庚金（本气）、壬水、戊土——壬水在此长生。初秋肃杀之始，主决断、变革与远行；与寅相冲，与巳相合（也论刑）。",
  酉: "金之专位，藏干只有辛金，气纯。仲秋收成之地，主精纯、收敛、义气；与卯相冲，与辰相合。",
  戌: "燥土，藏戊土（本气）、辛金、丁火——藏丁火故称「火之墓库」。深秋之土，主守护与归藏，也号「天门」；与辰相冲，与卯相合。",
  亥: "阴水，藏壬水（本气）、甲木——甲木在此长生，水中有木之生机。为收藏归根之地，主智慧与包容；与巳相冲，与寅相合。",
};

const SHISHEN_DETAIL: Record<string, { brief: string; detail: string }> = {
  比肩: {
    brief: "与日主五行相同、阴阳相同者——同气之兄弟。",
    detail: "象义：兄弟姐妹、朋友同辈、合作与自我。比肩旺者独立自主、不轻易服人；适度为助力（帮身），过多则争财争胜、固执己见。身弱者喜比肩帮扶，身强者比肩反成负担。",
  },
  劫财: {
    brief: "与日主五行相同、阴阳相异者——异性之同气。",
    detail: "象义：竞争者、合伙人、敢闯敢拼之气。劫财主行动力与冒险精神，交际豪爽；过旺则破财、冲动、与人争利。「劫」字即提示：同气相争，财易被分。",
  },
  食神: {
    brief: "日主所生、阴阳相异者——我生之顺气。",
    detail: "象义：才艺、口福、表达、享受生活，也主平和的产出与养育。食神有「寿星」「福星」之称，性温厚；又能克制七杀（食神制杀），化压力为从容。过多则安逸散漫。",
  },
  伤官: {
    brief: "日主所生、阴阳相同者——我生之锐气。",
    detail: "象义：聪明外露、创造力、口才与叛逆。伤官敢想敢说、不拘规矩，是才华之星也是是非之星；「伤官见官」古书视为需调和之局——锋芒直对规则。伤官配印或生财，则才华落地。",
  },
  正财: {
    brief: "日主所克、阴阳相异者——我克之正途。",
    detail: "象义：正当稳定之财（工资、积蓄）、务实勤俭；于男命传统上亦看作妻星。正财主踏实经营、量入为出；过重则日主被「财多身弱」拖累——守着财却使不动。",
  },
  偏财: {
    brief: "日主所克、阴阳相同者——我克之活财。",
    detail: "象义：流动机会之财（生意、外快、意外之得）、慷慨圆融、人缘广；传统上于男命亦象父亲。偏财喜身强者得之，来得快去得也快；主豁达而不吝啬。",
  },
  正官: {
    brief: "克我者、阴阳相异——约束我之正气。",
    detail: "象义：职位、名誉、规范、责任心；传统上于女命亦看作夫星。正官主自律守礼、按部就班，是社会性的「名分」；官多或官重则拘谨压抑，喜印化官生身。",
  },
  七杀: {
    brief: "克我者、阴阳相同——攻我之强力，又名偏官。",
    detail: "象义：压力、挑战、魄力、竞争环境中的狠劲。七杀有制（食神制杀、印化杀）则为权柄魄力，所谓「化杀为权」；无制而身弱，则为小人、病灾、高压。是最讲「驾驭」的一颗星。",
  },
  正印: {
    brief: "生我者、阴阳相异——护我之慈荫。",
    detail: "象义：母亲、长辈庇护、学识文凭、名誉心性。正印主收敛安稳、有学养、得贵人；印旺者好学重名；过旺则依赖、想得多做得少（印重身埋）。",
  },
  偏印: {
    brief: "生我者、阴阳相同——生我而不亲之荫，又名枭神。",
    detail: "象义：另类才思、直觉敏锐、偏门学问（技艺、玄学、艺术）。偏印主思维独特、善钻研冷门；古书有「枭神夺食」之说——偏印过旺会克制食神，象征才思反噬产出与福气。",
  },
};

const WUXING_DETAIL: Record<string, { brief: string; detail: string }> = {
  木: { brief: "生发、条达、仁。", detail: "木主生长与舒展，性仁，色青，季春。水生木，木生火；金克木，木克土。木旺者有主见、进取心强；木弱者易犹豫、缺乏伸展。" },
  火: { brief: "炎上、光明、礼。", detail: "火主升腾与文明，性礼，色赤，季夏。木生火，火生土；水克火，火克金。火旺者热情外向、重体面；火弱者易冷淡、缺乏动力。" },
  土: { brief: "承载、化育、信。", detail: "土主承载与中和，性信，色黄，寄旺四季（辰戌丑未月）。火生土，土生金；木克土，土克水。土旺者稳重守信；土弱者易漂浮、缺乏定力。" },
  金: { brief: "肃杀、收敛、义。", detail: "金主收敛与决断，性义，色白，季秋。土生金，金生水；火克金，金克木。金旺者果决讲义气；金弱者优柔、缺乏锋芒。" },
  水: { brief: "润下、流通、智。", detail: "水主流通与智慧，性智，色黑，季冬。金生水，水生木；土克水，水克火。水旺者聪明善变通；水弱者拘泥、缺乏灵动。" },
};

const GONGWEI_DETAIL: Record<string, { term: string; brief: string; detail: string }> = {
  "gong-year": {
    term: "年柱 · 祖上宫",
    brief: "祖上、父母缘起、幼年（约 1-16 岁）气象。",
    detail: "年柱如树之根，看家族根基、祖辈荫泽与早年环境。年柱十神也提示你从「出身设定」里带来了什么。年干为「太岁之干」，年支即生肖。",
  },
  "gong-month": {
    term: "月柱 · 父母宫",
    brief: "父母兄弟、青年（约 17-32 岁）、也是全局提纲。",
    detail: "月柱看父母兄弟与青年运势；月支即「月令」，是衡量日主强弱的第一标尺，也是格局取用的提纲——所以命书说「月令为纲」。大运正是从月柱顺逆排出去的。",
  },
  "gong-day": {
    term: "日柱 · 夫妻宫",
    brief: "日干是你自己（日主），日支是配偶宫、中年（约 33-48 岁）。",
    detail: "日干为「我」，全盘十神都以它为坐标；日支紧贴日主，为夫妻宫，也反映你最私密的内在与亲密关系模式。日支藏干与日主的生克，常被拿来看婚姻互动的底色。",
  },
  "gong-time": {
    term: "时柱 · 子女宫",
    brief: "子女、晚年（约 49 岁后）、事业归宿。",
    detail: "时柱如果实，看子女缘分、晚景与一生努力的「收尾方向」。时柱十神也象征你最终投向世界的产出。小运即从时柱起排。",
  },
};

const SHENSHA_DETAIL: Record<string, { brief: string; detail: string }> = {
  天乙贵人: { brief: "第一吉神：逢凶化吉、贵人相扶。", detail: "以日干（或年干）查地支。命带天乙，传统认为一生易得人助，危难处常有转机。口诀：甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎。" },
  文昌贵人: { brief: "聪明好学、利文书考试之星。", detail: "以日干查地支，主思维清晰、擅长文字学业。命带文昌者多有书卷气，临考临文常有发挥。" },
  驿马: { brief: "走动、迁移、变动之星。", detail: "以年支（或日支）三合局查。驿马逢冲则动上加动，主远行、调动、奔波；现代也引申为出差、留学、行业变动。" },
  桃花: { brief: "人缘魅力、情缘之星（咸池）。", detail: "以年支（或日支）查子午卯酉。桃花主异性缘与艺术感染力；位置不同说法不同（墙内桃花主夫妻恩爱，墙外桃花招是非），通行只作魅力与人缘看。" },
  华盖: { brief: "孤高、才艺、与玄学有缘之星。", detail: "以年支（或日支）三合局查辰戌丑未。华盖主聪慧脱俗、喜哲学宗教艺术，也带几分孤独气质——「华盖逢空，偏宜僧道」是古书的极端说法，今只作性情参考。" },
  将星: { brief: "统御领导之星。", detail: "以年支（或日支）三合局中位查。将星主组织力与担当，居官杀之上尤显权柄；俗称「坐将星者能服众」。" },
  天德贵人: { brief: "仁厚化解之德星。", detail: "以月支查干支。天德主心地仁厚、常得无形庇佑，凶事可减，与月德并称「二德」。" },
  月德贵人: { brief: "宽和福泽之德星。", detail: "以月支三合局查天干。月德主性情宽和、福泽绵长；二德俱全者，古书谓「凶煞难侵」。" },
  羊刃: { brief: "刚烈好斗、易走极端之星（阳刃）。", detail: "以日干查地支：甲见卯、乙见辰、丙戊见午、丁己见未、庚见酉、辛见戌、壬见子、癸见丑。羊刃是五阳干的帝旺位，力量极盛易走极端。主刚烈、果敢、易伤；带羊刃者多有冲劲但也易冲动招祸。逢冲叫刃冲，传统多读为血光或意外。" },
  禄神: { brief: "衣食俸禄、根基之星。", detail: "以日干查地支：甲见寅、乙见卯、丙戊见巳、丁己见午、庚见申、辛见酉、壬见亥、癸见子。禄神即天干的临官位，主衣食丰足、根基稳固。命带禄神者多有稳定收入来源与自立能力；禄逢冲破则财基动摇。" },
  亡神: { brief: "思虑过度、暗中损耗之星。", detail: "以年支（或日支）三合局查。亡神主心思重、多虑、暗中消耗；居福德之地则主智谋，居凶煞之地则主算计招损。常读为内心反复、做事多顾虑。" },
  劫煞: { brief: "突发变故、夺散之星。", detail: "以年支（或日支）三合局查。劫煞主突如其来的变动或夺散，常与驿马并论主远行变动。劫煞遇冲则力显，多读为意外或波折；但并非必凶，要看整体格局承载。" },
  孤辰寡宿: { brief: "孤独、姻缘迟之星。", detail: "以年支查：亥子丑人见寅为孤辰，见戌为寡宿；寅卯辰人见巳为孤，见丑为寡；余类推。孤辰主男孤、寡宿主女寡。命带者多读为姻缘迟、性情孤僻；今只作性情参考，不直断婚姻。" },
  天罗地网: { brief: "困顿束缚、进退维谷之星。", detail: "以纳音五行查：火命人见戌亥为天罗、见辰巳为地网；水土命人见辰巳为地网。男主天罗、女主地网。主事多困顿、有志难伸；遇吉神则解，遇凶煞则增力。" },
  学堂: { brief: "学业、聪明之星。", detail: "以日干（或纳音）查地支长生位。学堂主聪敏好学、利科考。命带学堂者多有书卷气与学习力；结合文昌同论，更主学业顺遂。" },
  词馆: { brief: "文章口才、仕途之星。", detail: "以日干（或纳音）查地支帝旺位。词馆主擅长文辞口才、利仕途公文。学堂词馆并见者，古书谓主学问精深、仕途有望。" },
  阴阳差错: { brief: "婚姻不顺、阴差阳错之星。", detail: "以日柱查：丙子、丁丑、戊寅、辛卯、壬辰、癸巳、丙午、丁未、戊申、辛酉、壬戌、癸亥。主姻缘反复、事多阴差阳错。今只作婚姻主题的观察线索，不直断离异。" },
  四废: { brief: "无力、虚弱之星。", detail: "以月令查：春庚辛、夏壬癸、秋甲乙、冬丙戊。四废是当令之气所克之干，主力量虚浮、做事难成。命带四废者多有志难伸；需印比扶身方解。" },
  血刃: { brief: "血光、意外之星。", detail: "以日支查：子见戌、丑见亥、寅见子、卯见丑、辰见寅、巳见卯、午见辰、未见巳、申见午、酉见未、戌见申、亥见酉。主血光、意外受伤；逢冲则力显。今只作健康观察线索，不直断灾祸。" },
  流霞: { brief: "男女桃花血光之星。", detail: "以日干查：甲见酉、乙见申、丙见未、丁见午、戊见巳、己见辰、庚见辰、辛见卯、壬见寅、癸见亥。男命流霞主桃花招事、女命主产厄血光。今只作人缘与健康观察参考。" },
};

const CONCEPTS: MingliEntry[] = [
  {
    id: "tiangan",
    term: "天干",
    category: "concept",
    brief: "甲乙丙丁戊己庚辛壬癸——十个「天之气」的符号，主外、主显、主动。",
    detail:
      "天干源自上古十日之名，配阴阳五行：甲乙木、丙丁火、戊己土、庚辛金、壬癸水（每组前阳后阴）。在八字里，天干是显露在外的气——性格的表层、他人可见的行为。四柱的四个天干中，日干最特殊：它就是「你」（日主），其余三干都以它论十神。",
    links: ["dizhi", "wuxing-gk", "yinyang", "riyuan", "shishen"],
  },
  {
    id: "dizhi",
    term: "地支",
    category: "concept",
    brief: "子丑寅卯…亥——十二个「地之气」的符号，主内、主藏、主静。",
    detail:
      "地支对应十二月建与十二时辰，是天干之气落到大地节令上的容器。地支比天干复杂：每个支内藏一到三个天干（藏干），像土壤里埋着的种子——所以地支的作用往往深沉、滞后而持久。支与支之间还有刑冲合害等关系，是盘面「暗流」的来源。",
    links: ["tiangan", "canggan", "yueling", "shengxiao"],
  },
  {
    id: "yinyang",
    term: "阴阳",
    category: "concept",
    brief: "一切二分之气：阳主动、显、刚；阴主静、藏、柔。",
    detail:
      "干支皆分阴阳：甲丙戊庚壬为阳干，乙丁己辛癸为阴干。十神的定名完全依赖阴阳——同性相见为「偏」（偏印、七杀、偏财…），异性相见为「正」（正印、正官、正财…）。大运顺逆（阳年男顺排、阴年男逆排）也由年干阴阳决定。",
    links: ["tiangan", "shishen", "dayun"],
  },
  {
    id: "wuxing-gk",
    term: "五行",
    category: "concept",
    brief: "木火土金水：五种气的循环——相生成链，相克成衡。",
    detail:
      "相生：木生火、火生土、土生金、金生水、水生木。相克：木克土、土克水、水克火、火克金、金克木。八字的一切推理都建立在这两条链上：十神是生克关系的人事化命名，强弱是生克力量的对比。看盘先数五行，是为了先看清气的分布与缺口。",
    links: ["wx-木", "wx-火", "wx-土", "wx-金", "wx-水", "shishen"],
  },
  {
    id: "canggan",
    term: "藏干",
    category: "concept",
    brief: "地支里暗藏的天干——「人元」，地支的真实内容物。",
    detail:
      "每个地支藏一到三个天干：第一位是本气（力量最强，与地支五行一致），其后为中气、余气。例如丑藏己（本气）、癸、辛。藏干是排盘的「第二层」：天干看表面，藏干看底细——天干在地支藏干中有同五行者，称为「通根」，是判断强弱的关键。",
    links: ["dizhi", "tonggen", "yueling"],
  },
  {
    id: "tonggen",
    term: "通根",
    category: "concept",
    brief: "天干之气在地支藏干中有根——浮气落了地。",
    detail:
      "天干如树冠，地支藏干如根系。天干五行在某支藏干中出现（如甲木见寅、亥），即为通根：通本气根最有力，中气余气次之。有根之干经得起克泄，无根之干（虚浮）逢克即倒。日主是否通根，是身强身弱判断的核心一环。",
    links: ["canggan", "qiangruo", "riyuan"],
  },
  {
    id: "nayin",
    term: "纳音",
    category: "concept",
    brief: "六十甲子两两一组配的「音五行」，如甲子乙丑海中金。",
    detail:
      "纳音是比正五行更古老的一套配法：六十甲子每两柱共用一个纳音（海中金、炉中火、大林木…），源自古音律配数。今天的子平论命以正五行为主，纳音多用于称呼年命（如「金命人」）与配婚民俗。本系统展示纳音供参考，不参与强弱计算。",
    links: ["tiangan", "dizhi"],
  },
  {
    id: "xunkong",
    term: "旬空",
    category: "concept",
    brief: "六十甲子每旬十天，十二支中总有两支轮空——空亡之地。",
    detail:
      "十干配十二支，每旬必有两个地支配不上干，即为该旬的「空亡」。命书认为落空亡之支力量虚悬、事象不实——吉神空则福减，凶神空则祸轻。通行看法：空亡影响有限，逢冲逢合可解，作参考即可。",
    links: ["dizhi"],
  },
  {
    id: "riyuan",
    term: "日主（日元）",
    category: "concept",
    brief: "日柱天干——整张盘的「我」，所有十神以它为坐标。",
    detail:
      "八字以日干代表命主本人，称日主或日元。其余七字（三干四支藏干）与日主的生克关系，构成十神系统。看盘第一步永远是：找到日主，认它的五行阴阳，再看它在这个月令里是强是弱——强弱定了，喜忌才有方向。",
    links: ["gong-day", "shishen", "qiangruo", "yueling"],
  },
  {
    id: "yueling",
    term: "月令",
    category: "concept",
    brief: "月柱地支——当令之气，衡量全盘强弱的第一标尺。",
    detail:
      "你出生那个节气月的地支就是月令，代表出生时「天地正在行什么气」。日主与月令同气为得令（旺），月令生日主为相，其余为休囚死——这是强弱判断的第一权重。古法取格局，也是先看月令藏干透出何神。",
    links: ["gong-month", "qiangruo", "canggan"],
  },
  {
    id: "qiangruo",
    term: "身强身弱",
    category: "concept",
    brief: "日主力量的强弱对比——喜忌判断的总开关。",
    detail:
      "综合三件事：①得令否（月令与日主的生克）；②得地否（日主在四支藏干中有无根）；③得势否（天干比劫印星多不多）。身强喜克泄耗（官杀、财、食伤），身弱喜生扶（印、比劫）。本系统给出的是简化粗评——完整判断还需看合冲刑害与调候，仅供学习入门。",
    links: ["yueling", "tonggen", "riyuan", "shishen"],
  },
  {
    id: "shishen",
    term: "十神",
    category: "concept",
    brief: "以日主为轴，把生克关系翻译成十种人事符号。",
    detail:
      "同我者比肩劫财，我生者食神伤官，我克者正财偏财，克我者正官七杀，生我者正印偏印——五种关系 × 阴阳同异 = 十神。它是命理的「人事语言」：财是我能支配的，官是约束我的，印是滋养我的，食伤是我发出的，比劫是与我并肩的。",
    links: ["ss-比肩", "ss-劫财", "ss-食神", "ss-伤官", "ss-正财", "ss-偏财", "ss-正官", "ss-七杀", "ss-正印", "ss-偏印", "riyuan"],
  },
  {
    id: "dayun",
    term: "大运",
    category: "concept",
    brief: "十年一步的人生大节令，从月柱顺逆排出。",
    detail:
      "大运是「你行进中的季节」：以月柱为起点，阳年男/阴年女顺排、阴年男/阳年女逆排，每步十年（前五年侧重看干、后五年侧重看支是常见的读法）。大运与原局干支发生的生克合冲，就是十年际遇的底色。起运岁数由出生到节气的距离折算。",
    links: ["qiyun", "gong-month", "liunian", "yinyang"],
  },
  {
    id: "liunian",
    term: "流年",
    category: "concept",
    brief: "当年的干支（太岁）——一年一换的外部天气。",
    detail:
      "流年以立春为界（不是元旦也不是春节初一）。流年干支与日主论十神，可读出这一年外境偏向哪类主题（财、官、印…）；流年与大运、原局的刑冲合害，则是当年吉凶起伏的触发器。命书称流年天干为「岁君」，地支为「太岁」。",
    links: ["dayun", "xiaoyun", "shishen"],
  },
  {
    id: "xiaoyun",
    term: "小运",
    category: "concept",
    brief: "未上大运前逐年的小节令，从时柱顺逆排。",
    detail:
      "起大运之前的幼年岁月，传统以小运补看：从时柱起，阳男阴女顺排、阴男阳女逆排，一岁一柱。上大运后小运即退居参考。各派对小运重视程度不一，通行做法是幼年参看、成年从略。",
    links: ["dayun", "gong-time"],
  },
  {
    id: "qiyun",
    term: "起运",
    category: "concept",
    brief: "从出生到「上大运」的时间——由出生距节气的远近折算。",
    detail:
      "顺排者数到出生后的下一个节，逆排者数到出生前的上一个节，把这段距离按「3 天 = 1 年、1 天 = 4 个月、1 时辰 = 10 天」折算（两种说法是同一条规则），就是起运时长——所以会出现「3 岁 8 个月上运」这样精确到月天的说法。更讲究的排法直接精确到分钟。",
    links: ["dayun", "yueling"],
  },
  {
    id: "minggong",
    term: "命宫",
    category: "concept",
    brief: "神之所栖——由月支与时支推出的第十三宫。",
    detail:
      "命书谓「命无宫，无所主」：命宫是月支与时支推算出的一个虚拟宫位，象征心神所栖与性情底色，可补日主之未尽。推法为「子起正月，顺数至生月；生月起生时，逆数至卯」的掌上诀（本系统用等价查表）。",
    links: ["shengong", "taiyuan"],
  },
  {
    id: "shengong",
    term: "身宫",
    category: "concept",
    brief: "身之所寄——与命宫相对，看中晚年趋向。",
    detail:
      "身宫与命宫成对：命宫看「心之所主」，身宫看「身之所寄」，传统上偏重中晚年境遇与身体行止的落点。各派推法略有出入（本系统当前用简化推法，词条口径以通行为准）。",
    links: ["minggong"],
  },
  {
    id: "taiyuan",
    term: "胎元",
    category: "concept",
    brief: "受胎之月的干支——先天禀气的来处。",
    detail:
      "以月柱天干进一位、地支进三位推得（约合受孕之月）。胎元象征先天体质与胎中所禀之气，古法在小儿命与寿夭论中使用较多，今多作参考补充。",
    links: ["minggong", "gong-month"],
  },
  {
    id: "zhen-taiyang-shi",
    term: "真太阳时",
    category: "concept",
    brief: "按太阳真实位置校正的出生时间——时柱的严谨前提。",
    detail:
      "钟表时间是行政统一的（北京时间以东经 120° 为准），而时辰本应随太阳走。校正两步：①经度差每 1° 折 4 分钟；②均时差（一年内 ±15 分钟左右的天文摆动）。出生时刻卡在时辰边界时，校正与否可能整整差一个时柱。",
    links: ["wan-zi-shi", "gong-time"],
  },
  {
    id: "wan-zi-shi",
    term: "晚子时",
    category: "concept",
    brief: "23:00-24:00 出生，日柱归今天还是明天？——著名流派分歧。",
    detail:
      "子时横跨两日（23:00-01:00）。「晚子时」派认为 23 点后时柱已是子时、但日柱仍算当天（本系统默认）；另一派认为 23 点即换日。两派各有所本，重要的是全盘一致并向命主说明。本系统两种规则皆可选。",
    links: ["zhen-taiyang-shi", "gong-day"],
  },
  {
    id: "shengxiao",
    term: "生肖",
    category: "concept",
    brief: "年支对应的十二属相——以立春为界，不是春节。",
    detail:
      "命理的属相按年支定，而年柱以立春切换——所以立春前出生属上一年生肖，与民俗「过了春节换属相」不同。生肖在八字中的作用即年支的作用，民间流行的「属相合婚」只是地支合冲的通俗化。",
    links: ["dizhi", "gong-year"],
  },
  {
    id: "tiangan-he",
    term: "天干五合",
    category: "concept",
    brief: "甲己合土、乙庚合金、丙辛合水、丁壬合木、戊癸合火——五对合化。",
    detail:
      "天干五合是隔五相合（甲 1 与己 6）。合是牵绊，化是改五行——合而不化仍为合，两干互相牵制；合化成功（化神得令有根、不被克破）则两干并化为化神五行。判断次序：先看是否相邻（年月、月日、日时），再看化神在月令有无根气，最后看有无他干他支克破。命带天干合者多主联结、羁绊、心思牵动；化与不化，意义差别极大。",
    links: ["tiangan", "dizhi-liuhe", "yueling", "wuxing-gk"],
  },
  {
    id: "dizhi-liuhe",
    term: "地支六合",
    category: "concept",
    brief: "子丑合土、寅亥合木、卯戌合火、辰酉合金、巳申合水、午未合。",
    detail:
      "六合发生在相邻两支之间（如子丑、寅亥）。合化条件与天干五合类似：需化神有根、不被冲破。六合主联结、附着、关系缔结——吉凶看合住的是何十神与何宫位。子丑合多主庇护依附；辰酉合金主决断收敛；午未合流派分歧大，有论合而不化。六合若被三合/三会大势抢走，则合力减弱。",
    links: ["dizhi", "tiangan-he", "dizhi-sanhe", "dizhi-liuchong"],
  },
  {
    id: "dizhi-sanhe",
    term: "地支三合局",
    category: "concept",
    brief: "申子辰合水、亥卯未合木、寅午戌合火、巳酉丑合金——三角远联结。",
    detail:
      "三合是三个地支（生位、旺位、墓位）结成的远程合力，中字为局神（子、卯、午、酉）。三字齐全才成局，缺一字叫半合（申子、子辰半合水），力量约为三合之半。三合一旦成局，该五行气势大盛，常成为整盘的「主旋律」。判断时先看大势：原局有无三合，再岁运是否补齐半合。",
    links: ["dizhi", "dizhi-sanhui", "dizhi-liuhe", "wuxing-gk"],
  },
  {
    id: "dizhi-sanhui",
    term: "地支三会局",
    category: "concept",
    brief: "寅卯辰会木、巳午未会火、申酉戌会金、亥子丑会水——同方相邻聚局。",
    detail:
      "三会比三合更「硬」：要求三方相邻（同季节、同方向）齐全才成立。一旦成会，本方五行极旺，气势通常压过三合与六合。但成立条件严，少一字即破。三会主「方阵之势」，不像三合的「协同管道」——更接近环境压迫式的旺气。判断时优先级：三会 > 三合 > 六合。",
    links: ["dizhi", "dizhi-sanhe", "dizhi-liuhe", "wuxing-gk"],
  },
  {
    id: "dizhi-liuchong",
    term: "地支六冲",
    category: "concept",
    brief: "子午冲、丑未冲、寅申冲、卯酉冲、辰戌冲、巳亥冲——对位相冲。",
    detail:
      "六冲是圆周上正对的两支相冲——五行相克且方向相反。冲不等于凶：冲的本质是结构对撞，可能引动变化、移动、拆开、激活。原局有冲，遇岁运再冲可能应事；原局无冲，遇冲要看日主与十神能否承载。冲能破合（如子午冲破子丑合）。判断次序：先看大势与合会，再看哪对冲最有力、最被引动。",
    links: ["dizhi", "dizhi-liuhe", "dizhi-sanxing", "dizhi-liuhai"],
  },
  {
    id: "dizhi-sanxing",
    term: "地支三刑",
    category: "concept",
    brief: "寅巳申无恩、丑戌未恃势、子卯无礼、辰午酉亥自刑——内部牵制。",
    detail:
      "刑不像冲那样正面对撞，而是结构内部不顺、配合中反复牵制与内耗。寅巳申三字见全则成无恩之刑，多主恩将仇报或人际关系反复；丑戌未恃势之刑多主权责争拗；子卯无礼之刑多主礼节失序、桃花主题；辰午酉亥自刑是同字再见、主自困与状态反复。刑不破合，但减弱合的力量。判断时合会优先，刑作配合考量。",
    links: ["dizhi", "dizhi-liuchong", "dizhi-liuhai", "dizhi-liuhe"],
  },
  {
    id: "dizhi-liuhai",
    term: "地支六害",
    category: "concept",
    brief: "子未害、丑午害、寅巳害、卯辰害、申亥害、酉戌害——又称六穿。",
    detail:
      "害的本质是六合被冲位破，形成暗中损耗——表面无冲突，配合时却互相损耗。如子本与丑合，未冲丑，故子未相害。六害影响通常小于冲与刑，多见于细节性不和、暗中损耗、合作中的小别扭。判断时优先级最低：先看大势合会冲刑，再看害作补充。",
    links: ["dizhi", "dizhi-liuhe", "dizhi-liuchong", "dizhi-sanxing"],
  },
  {
    id: "twelve-stages",
    term: "十二长生",
    category: "concept",
    brief: "五行在十二地支中的生命周期：长生、沐浴、冠带、临官、帝旺、衰、病、死、墓、绝、胎、养。",
    detail:
      "十二长生把五行之气的循环切成 12 阶段：长生（始萌）→沐浴（初见世）→冠带（成形）→临官（成熟）→帝旺（盛极）→衰（始退）→病（更弱）→死（气尽）→墓（归藏）→绝（旧气绝）→胎（新气成胎）→养（胎中养）→回到长生。它和四季轮回同理——死不是终点，绝后还有胎养，再回长生。五阳干长生位：甲亥、丙寅、戊寅、庚巳、壬申。实务上分四相位看：生旺（5 段上升）、衰（1 段回落）、病死墓（3 段归藏）、绝胎养（3 段孕育）。",
    links: ["wuxing-gk", "tiangan", "dizhi", "tonggen", "yueling"],
  },
  {
    id: "stage-shengwang",
    term: "生旺相位",
    category: "concept",
    brief: "长生→沐浴→冠带→临官→帝旺五个阶段——气的上升期。",
    detail:
      "生旺包含长生、沐浴、冠带、临官、帝旺五段，是五行从萌发到盛极的上升期。某天干在地支处于此相位，意味着它在此地支有强根或近强根——长生是新根，临官是成熟根，帝旺是盛极根。实务上，日主通根在生旺位即视为身强的重要依据。",
    links: ["twelve-stages", "tonggen", "qiangruo"],
  },
  {
    id: "stage-shuai",
    term: "衰相位",
    category: "concept",
    brief: "衰——盛极而退的第一步。",
    detail:
      "衰是帝旺之后的第一阶段，意味着五行之气从峰值开始回落。它本身不是无力，只是不再增长。某天干在地支处于衰位，仍有较强力量，只是趋势向下。实务上，衰常被忽略，但在判断大运流年趋势时是关键信号——从帝旺入衰，意味着某段运势见顶。",
    links: ["twelve-stages", "stage-shengwang"],
  },
  {
    id: "stage-bingsi-mu",
    term: "病死墓相位",
    category: "concept",
    brief: "病→死→墓三段——衰竭、归藏。",
    detail:
      "病、死、墓是五行从衰到彻底归藏的三个阶段。某天干在地支处于此相位，意味着它在此地支无力或仅余封存之余气。墓位特殊——是三合局的墓字（申子辰合水之辰、亥卯未合木之未等），既是归藏，也意味着此气曾存在过。实务上，墓不等于无，是封存待发。",
    links: ["twelve-stages", "stage-shuai", "dizhi-sanhe"],
  },
  {
    id: "stage-juetai-yang",
    term: "绝胎养相位",
    category: "concept",
    brief: "绝→胎→养三段——旧气绝尽、新气孕育。",
    detail:
      "绝、胎、养是五行生命周期中最隐蔽的三段。绝是旧气彻底尽，但不是消失——是转入潜藏。胎是新气聚集成形，养是胎中滋育，再下一步即回到长生。实务上，某天干在绝位不代表完了，而代表在孕育新阶段——大运流年遇绝位，常读为转折、潜藏、待发，而非灾祸。",
    links: ["twelve-stages", "stage-bingsi-mu", "stage-shengwang"],
  },
  // === 八种普通格局 ===
  {
    id: "ge-zhenguan",
    term: "正官格",
    category: "concept",
    brief: "月令本气或透干为正官——管理系统。",
    detail:
      "正官代表规则、责任、地位、管理职能。正官格之人多见守秩序、重名誉、宜公职或管理路线。喜印化官生身、财生官；忌伤官见官（伤官克官破格）、七杀混官。身强喜财官，身弱最喜印化。",
    links: ["shishen", "qiangruo", "gege", "yongshen-fuyi"],
  },
  {
    id: "ge-qisha",
    term: "七杀格",
    category: "concept",
    brief: "月令本气或透干为七杀——压力突破型。",
    detail:
      "七杀代表压力、突破、武断、险境中的成就。七杀格之人多见刚毅、有冲劲、宜武职或开拓型事业。喜食神制杀（制其暴）、印化杀（化其压）；忌财生杀过旺（杀攻身）。身强可任杀，身弱必须有制化。",
    links: ["shishen", "qiangruo", "gege", "yongshen-fuyi", "zuhe-shishen-zhi-sha"],
  },
  {
    id: "ge-zhengcai",
    term: "正财格",
    category: "concept",
    brief: "月令本气或透干为正财——稳定积累型。",
    detail:
      "正财代表稳定收入、勤恳经营、节俭积累。正财格之人多见务实、守成、宜稳定职业。喜官杀护财、比劫制财（防过散）；忌财多身弱（财多压身）、比劫夺财过旺。身强喜财官，身弱财多需印比。",
    links: ["shishen", "qiangruo", "gege", "zuhe-bijie-duo-cai"],
  },
  {
    id: "ge-piancai",
    term: "偏财格",
    category: "concept",
    brief: "月令本气或透干为偏财——经营变动型。",
    detail:
      "偏财代表经营之财、变动之财、流动之财。偏财格之人多见活跃、善交际、宜经商或变动型事业。喜官杀护、食神生；忌比劫夺（比劫夺偏财更凶于夺正财）。身强最喜，身弱财多需印比扶身。",
    links: ["shishen", "qiangruo", "gege", "zuhe-bijie-duo-cai"],
  },
  {
    id: "ge-zhengyin",
    term: "正印格",
    category: "concept",
    brief: "月令本气或透干为正印——庇护学业型。",
    detail:
      "正印代表庇护、学业、传承、文职。正印格之人多见温文、好学、宜学术或文职。喜官杀生印、比劫助印；忌财破印（财克印破格）。身弱最喜印化官生身；身强则印过旺反滞。",
    links: ["shishen", "qiangruo", "gege", "zuhe-cai-po-yin"],
  },
  {
    id: "ge-pianyin",
    term: "偏印格",
    category: "concept",
    brief: "月令本气或透干为偏印——偏门学问孤独型。",
    detail:
      "偏印代表偏门学问、玄学、孤独、非常规思维。偏印格之人多见孤峭、有偏门才能。喜比劫化偏印、官杀生；最忌偏印夺食（偏印克食神，称枭神夺食）。身弱喜偏印生身；身强则偏印为忌。",
    links: ["shishen", "qiangruo", "gege", "zuhe-xiao-shen-duo-shi"],
  },
  {
    id: "ge-shishen",
    term: "食神格",
    category: "concept",
    brief: "月令本气或透干为食神——创造表达型。",
    detail:
      "食神代表创造、表达、福禄、享受。食神格之人多见温和有才华、宜文艺或服务类。喜财生食神、比劫助；最忌偏印夺食（枭神夺食）。身强最喜食神泄秀；身弱食神过旺则虚耗。",
    links: ["shishen", "qiangruo", "gege", "zuhe-shishen-sheng-cai", "zuhe-xiao-shen-duo-shi"],
  },
  {
    id: "ge-shangguan",
    term: "伤官格",
    category: "concept",
    brief: "月令本气或透干为伤官——才华颠覆型。",
    detail:
      "伤官代表才华、颠覆、锐利、批判。伤官格之人多见聪明外露、有批判力、宜创作或挑战型事业。喜财化伤生官、印制伤官；最忌伤官见正官（伤官克官，破格）。身强喜伤官泄秀；身弱则伤官泄气过重。",
    links: ["shishen", "qiangruo", "gege", "zuhe-shangguan-jian-guan", "zuhe-shangguan-peiyin"],
  },
  // === 五种用神取法 ===
  {
    id: "yongshen-fuyi",
    term: "扶抑用神",
    category: "concept",
    brief: "身强用克泄耗、身弱用生扶——最基础用神法。",
    detail:
      "扶抑是用神取法中最基础的——身强则用食伤/财/官杀克泄耗，使力量流动；身弱则用印/比劫生扶，使日主能承载。但扶抑是优先级最低的用神法——要先排除从格、调候、通关、病药后才论扶抑。",
    links: ["qiangruo", "yongshen-tiaohou", "yongshen-tongguan", "yongshen-bingyao", "yongshen-shuncong"],
  },
  {
    id: "yongshen-tiaohou",
    term: "调候用神",
    category: "concept",
    brief: "寒月需火暖、燥月需水润——气候调衡。",
    detail:
      "调候是看月令过寒或过燥时，先于扶抑制衡气温。如冬月（亥子丑）水旺，日主虽强仍需丙丁火暖；夏月（巳午未）火旺，日主虽弱仍需壬癸水润。调候用神有时与扶抑矛盾，要先调候后扶抑。",
    links: ["yueling", "yongshen-fuyi", "wuxing-gk"],
  },
  {
    id: "yongshen-tongguan",
    term: "通关用神",
    category: "concept",
    brief: "两行相战、五行不通——用通关五行疏通。",
    detail:
      "原局两行相战（如木克土、金克木）且无化解时，取能疏通二者的五行为通关用神。如木土相战用火通关（木生火、火生土）；火金相战用土通关。通关的本质是在两端建立中间转化节点。",
    links: ["wuxing-gk", "yongshen-fuyi"],
  },
  {
    id: "yongshen-bingyao",
    term: "病药用神",
    category: "concept",
    brief: "原局有病（过旺过弱）——用能治病的药。",
    detail:
      "病药用神看原局何处是病（过旺或过弱之字），用能治该病的五行作为药。如木过旺克土为病，用金克木或火泄木为药。病药比扶抑更精确——不是泛论身强身弱，而是具体定位病在何处。",
    links: ["yongshen-fuyi", "qiangruo"],
  },
  {
    id: "yongshen-shuncong",
    term: "顺从用神",
    category: "concept",
    brief: "成从格或化格——顺势不逆势。",
    detail:
      "日主极弱无根且无破，或极旺无制，形成从格或化气格时，用神不是扶抑而是顺势——从财用财、从杀用官杀、从儿用食伤、从旺用比劫。判断从格要严：必须日主毫无根气、克泄之物极旺、无任何破势之字。",
    links: ["qiangruo", "yongshen-fuyi", "gege"],
  },
  // === 十神组合断法 ===
  {
    id: "gege",
    term: "格局",
    category: "concept",
    brief: "原局以何十神为本——八普通格 + 五特殊格。",
    detail:
      "格局是子平命理的核心判断框架。取格口诀：以月令本气为先，透干为用。八种普通格局：正官格、七杀格、正财格、偏财格、正印格、偏印格、食神格、伤官格。五种特殊格局：从财格、从杀格、从儿格、从旺格、化气格。格局告诉你这张盘是哪种类型的系统。",
    links: ["yueling", "shishen", "yongshen-fuyi", "yongshen-shuncong"],
  },
  {
    id: "zuhe-shishen-sheng-cai",
    term: "食神生财",
    category: "concept",
    brief: "食神 + 财星——才华转出为利。",
    detail:
      "食神生财是食神生财星，将创造力转化为收入。身强则顺（才华有承载）；身弱则虚耗（输出过多而日主不支）。多见于靠表达、创作、技艺谋生的人。喜比劫助身、忌印制食神（夺食）。",
    links: ["shishen", "ge-shishen", "ge-zhengcai", "ge-piancai"],
  },
  {
    id: "zuhe-shangguan-jian-guan",
    term: "伤官见官",
    category: "concept",
    brief: "伤官 + 正官同透——才华与规则冲突。",
    detail:
      "伤官见官是子平忌见组合之一——伤官克正官，才华与规则冲突，多见职场变动、言论招祸。但若有印星制伤官（印制伤护官），则化凶为吉。身强有印制则化；身弱无制则凶。古书言伤官见官为祸百端，但实务要看是否有制化。",
    links: ["shishen", "ge-shangguan", "ge-zhenguan", "zuhe-shangguan-peiyin"],
  },
  {
    id: "zuhe-guan-yin-xiang-sheng",
    term: "官印相生",
    category: "concept",
    brief: "正官 + 正印——责任有学识庇护。",
    detail:
      "官印相生是正官生正印、正印生日主，形成责任-学识-自身的良性循环。多见于文职管理或学术行政路线。身弱最喜此组合（官生印、印生身）；身强则官印过旺反滞，需食伤泄秀。",
    links: ["shishen", "ge-zhenguan", "ge-zhengyin"],
  },
  {
    id: "zuhe-sha-yin-xiang-sheng",
    term: "杀印相生",
    category: "concept",
    brief: "七杀 + 印星——压力转化为学识。",
    detail:
      "杀印相生是七杀生印星、印星生日主，把压力转化为学识与成就。多见于非传统路径的成就者（武职、技艺、玄学）。身弱最喜（杀重印化为贵）；杀重无印则灾（杀攻身无化）。比官印相生更显化于非主流路径。",
    links: ["shishen", "ge-qisha", "ge-pianyin", "ge-zhengyin"],
  },
  {
    id: "zuhe-cai-sheng-guan-sha",
    term: "财生官杀",
    category: "concept",
    brief: "财星 + 官杀——资源带来责任或压力。",
    detail:
      "财生官杀是财星生官杀，资源带来责任与压力，也可能因财招祸（财生杀攻身）。身强喜财官（资源支撑责任）；身弱财官克身则凶（财生杀攻身）。要分辨是财生官（顺）还是财生杀（逆）。",
    links: ["shishen", "ge-zhengcai", "ge-piancai", "ge-zhenguan", "ge-qisha"],
  },
  {
    id: "zuhe-xiao-shen-duo-shi",
    term: "枭神夺食",
    category: "concept",
    brief: "偏印 + 食神——庇护过强压住创造。",
    detail:
      "偏印克食神，称枭神夺食。食神为福禄之星，被偏印夺则福禄受损，多见于思虑过重、机会错过。食神为用最忌此组合；偏印为用（身弱喜偏印生身）则不忌。解法：用财破偏印（财克印解夺食）。",
    links: ["shishen", "ge-pianyin", "ge-shishen", "zuhe-cai-po-yin"],
  },
  {
    id: "zuhe-bijie-duo-cai",
    term: "比劫夺财",
    category: "concept",
    brief: "比肩/劫财 + 财星——同辈资源竞争。",
    detail:
      "比劫夺财是比肩或劫财克财星，同辈资源竞争，多见于破财或感情分争。身强最忌此组合（比劫帮身已足，再夺财则灾）；身弱则比劫帮身不忌（比劫扶身胜过夺财之损）。偏财被夺比正财被夺更凶。",
    links: ["shishen", "ge-zhengcai", "ge-piancai", "qiangruo"],
  },
  {
    id: "zuhe-shishen-zhi-sha",
    term: "食神制杀",
    category: "concept",
    brief: "食神 + 七杀——创造力化解压力。",
    detail:
      "食神制杀是食神克七杀，创造力化解压力，多见于武职或开拓型成就。身强则制有力（食神足够制杀）；身弱则制不力（食神无力，反被杀攻）。此组合是七杀格的喜用组合之一。",
    links: ["shishen", "ge-qisha", "ge-shishen"],
  },
  {
    id: "zuhe-shangguan-peiyin",
    term: "伤官配印",
    category: "concept",
    brief: "伤官 + 印星——才华有学识收敛。",
    detail:
      "伤官配印是印星制伤官，让才华收敛而不招祸，多见于学者型表达者。印不能过旺（过旺则夺伤官之力）；平衡才顺。是伤官格见官的化解之一——有印制伤护官，化凶为吉。",
    links: ["shishen", "ge-shangguan", "ge-zhengyin", "ge-pianyin", "zuhe-shangguan-jian-guan"],
  },
  {
    id: "zuhe-cai-po-yin",
    term: "财破印",
    category: "concept",
    brief: "财星 + 印星——资源干扰学识。",
    detail:
      "财破印是财星克印星，资源干扰学识，多见于因利忘本或学业受阻。印为用最忌此组合（印为庇护被破）；财为用则不忌。是正印格的忌见组合之一。",
    links: ["shishen", "ge-zhengyin", "ge-pianyin", "ge-zhengcai", "ge-piancai"],
  },
];

function ganEntries(): MingliEntry[] {
  return Object.keys(GAN_INFO).map((g) => {
    const info = GAN_INFO[g];
    return {
      id: `gan-${g}`,
      term: `${g}（${info.yinYang}${info.wuXing}）`,
      category: "tiangan" as const,
      brief: `${info.yinYang}${info.wuXing}，${info.image}。`,
      detail: GAN_DETAIL[g],
      links: ["tiangan", `wx-${info.wuXing}`, "yinyang"],
    };
  });
}

function zhiEntries(): MingliEntry[] {
  return Object.keys(ZHI_INFO).map((z) => {
    const info = ZHI_INFO[z];
    return {
      id: `zhi-${z}`,
      term: `${z}（${info.yinYang}${info.wuXing}）`,
      category: "dizhi" as const,
      brief: `${info.yinYang}${info.wuXing}，${info.month}，${info.hours}（${info.shengXiao}）。藏干：${info.cangGan.join("、")}。`,
      detail: ZHI_DETAIL[z],
      links: ["dizhi", `wx-${info.wuXing}`, "canggan", ...info.cangGan.map((g) => `gan-${g}`)],
    };
  });
}

function shiShenEntries(): MingliEntry[] {
  return Object.keys(SHISHEN_DETAIL).map((s) => ({
    id: `ss-${s}`,
    term: s,
    category: "shishen" as const,
    brief: SHISHEN_DETAIL[s].brief,
    detail: SHISHEN_DETAIL[s].detail,
    links: ["shishen", "riyuan", "yinyang"],
  }));
}

function wuXingEntries(): MingliEntry[] {
  return Object.keys(WUXING_DETAIL).map((w) => ({
    id: `wx-${w}`,
    term: `${w}（五行）`,
    category: "wuxing" as const,
    brief: WUXING_DETAIL[w].brief,
    detail: WUXING_DETAIL[w].detail,
    links: ["wuxing-gk"],
  }));
}

function gongWeiEntries(): MingliEntry[] {
  return Object.keys(GONGWEI_DETAIL).map((id) => ({
    id,
    term: GONGWEI_DETAIL[id].term,
    category: "gongwei" as const,
    brief: GONGWEI_DETAIL[id].brief,
    detail: GONGWEI_DETAIL[id].detail,
    links: ["gong-year", "gong-month", "gong-day", "gong-time"].filter((x) => x !== id),
  }));
}

function shenShaEntries(): MingliEntry[] {
  return Object.keys(SHENSHA_DETAIL).map((s) => ({
    id: `sha-${s}`,
    term: s,
    category: "shensha" as const,
    brief: SHENSHA_DETAIL[s].brief,
    detail: SHENSHA_DETAIL[s].detail,
    links: ["shishen"],
  }));
}

/** 全量词条表（id → entry） */
export const MINGLI_KB: Record<string, MingliEntry> = Object.fromEntries(
  [
    ...CONCEPTS,
    ...ganEntries(),
    ...zhiEntries(),
    ...shiShenEntries(),
    ...wuXingEntries(),
    ...gongWeiEntries(),
    ...shenShaEntries(),
  ].map((e) => [e.id, e]),
);

export function getEntry(id: string): MingliEntry | null {
  return MINGLI_KB[id] ?? null;
}

/** 词条数量（测试用） */
export function kbSize(): number {
  return Object.keys(MINGLI_KB).length;
}
