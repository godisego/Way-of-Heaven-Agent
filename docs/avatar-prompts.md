---
name: avatar-prompts
description: 三贤头像 AI 生图提示词（半写实古风动漫风），含共用基座、角色分段、负面词与平台参数
---

# 三贤头像生图提示词 · 半写实古风动漫

目标：为 老胡 / 李 / 玄 重做头像，风格「偏真人 × 动漫 × 古风」——即**半写实厚涂国风插画**（介于写实与动漫之间，类似国产古风游戏官方立绘的质感），统一融入茶寮夜谈的暗漆底色与各自主色调。

## 统一规格（三张都必须遵守）

- 比例 **1:1 方图**，生成 1024×1024 以上，最终裁 512×512 放入 `public/avatars/`
- **胸像构图、人物居中**：头部在画面中央偏上，脸部落在中心约 70% 区域内（UI 里是圆形头像，四角会被裁掉，重要元素别贴边）
- 背景统一为**夜晚老茶寮**：深色漆木虚化 + 一两团暖黄灯笼光斑，人物与背景分离清晰
- **不要让模型画文字/印章**（「时·醒·化」的印文交给 UI 兜底色块，模型画字必崩）

## 共用风格基座

每张图的提示词 = 下面这段基座 + 对应角色段。三张用**完全相同的基座**，系列感才出得来。

**中文基座**（即梦 / 豆包 / 通义万相 / 可灵 等国内工具直接用）：

> 半写实古风动漫风格，厚涂数字插画，国风人物立绘质感，胸像特写，人物居中，面部刻画细腻，发丝与织物质感清晰，电影感夜景光影，背景是虚化的深色漆木老茶寮与暖黄灯笼光斑，低饱和暗色调，方形构图，适合裁剪为圆形头像

**英文基座**（Midjourney / SD / Flux 等）：

> semi-realistic anime portrait, ancient Chinese guofeng style, painterly thick-paint digital illustration, game character art quality, bust shot, centered composition, highly detailed face, fine hair and fabric texture, cinematic night lighting, blurred dark lacquered-wood tea house background with warm lantern bokeh, muted dark palette, square format suitable for circular avatar crop

## 一、盲派算师·老胡（`hu`，主色 土褐 #6e4520）

要点：**双目半阖**是他的身份签名（盲而不衰的算师相），市井江湖气 + 嘴角三分看透世情的笑，捻铜钱点明「能算」。

**中文**（基座 + 此段）：

> 一位六十多岁的盲派算命先生，清瘦，满脸风霜刻痕，花白的山羊胡与略乱的鬓发，双目半阖却神情通透，嘴角带一点狡黠温和的笑意，头戴旧毡帽，身穿深褐色粗布褂子，肩搭一条旧布巾，一只手在胸前捻着三枚古旧铜钱，暖黄的灯笼光从侧面照亮他的侧脸，土褐与暖金色调

**英文**（基座 + 此段）：

> an elderly Chinese blind fortune teller in his 60s, thin weathered face with deep wrinkles, grey goatee and slightly messy sideburns, eyes gently half-closed yet knowing, faint shrewd kindly smile, old felt hat, coarse earth-brown cloth jacket, worn cloth draped over shoulder, one hand rubbing three ancient bronze coins at chest level, warm amber lantern light from the side, earthy brown and warm gold tones

## 二、存在主义导师·李（`li`，主色 墨黑 #1a1f28）

要点：他是三人里唯一「不古」的——用**民国式深色立领长衫 + 细圆框眼镜**的知识分子相衔接古风场景；眼神必须**直视观者**（他逼问你），冷光为主、远处一点暖灯作对比。

**中文**（基座 + 此段）：

> 一位三十多岁的冷峻哲人，清瘦面颊，线条锋利，短发微乱，戴细圆框眼镜，眼神冷静锐利、平视直望观者，没有笑意但不凶，身穿民国式深墨色立领长衫，一只手扣着一本合起的旧书抵在胸前，主光是窗外清冷的月色青白光，远处茶寮深处一点暖灯与之对比，墨黑与钢青冷色调

**英文**（基座 + 此段）：

> a cold sharp-featured Chinese philosopher in his 30s, lean face with angular lines, short slightly tousled hair, thin round-rimmed glasses, calm piercing gaze looking straight at the viewer, unsmiling but not hostile, dark ink-black high-collar changshan gown of the Republican era style, one hand holding a closed old book against his chest, key light is cold bluish moonlight from a window, single distant warm lantern glow for contrast, ink black and steel blue tones

## 三、主事·玄（`xuan`，主色 雾青 #3a5646）

要点：茶寮掌柜兼清修道人，年岁难辨、从容含笑；**执白瓷茶盏、热气如雾上升**同时点掉「主事」与「气机」两个身份，画面最柔。

**中文**（基座 + 此段）：

> 一位年岁难辨的道人茶寮主事，面容清癯温和，眼里含着一点从容笑意，头挽道髻插一根木簪，身穿灰青雾绿色交领道袍，双手捧着一盏白瓷茶盏，盏中热气如一缕青雾袅袅上升，柔和的暖灯光与青色水汽交融，画面朦胧而安静，雾青灰绿色调

**英文**（基座 + 此段）：

> an ageless serene Chinese Daoist tea master, thin gentle face with a faint knowing smile, hair in a topknot with a single wooden hairpin, grey-green crossed-collar Daoist robe, both hands holding a white porcelain tea cup, a wisp of steam rising like mist, soft warm lantern glow blending with cool jade mist, tranquil hazy atmosphere, misty jade-green tones

## 附：问者（`guest`，可选第四张，主色 米褐 #c2ad90）

> 中文：一位夜行旅人的半身像，头戴斗笠微微低头，面目隐在阴影里看不真切，肩头被茶寮暖黄灯光照亮，米褐色调，安静而有故事感
>
> 英文：a night traveler bust portrait, wide bamboo hat tilted low, face hidden in shadow and unrecognizable, shoulders lit by warm tea house lantern glow, beige-brown tones, quiet mysterious mood

## 负面提示词（三张共用）

> 中文：文字，水印，印章文字，logo，多余手指，畸形的手，三只手，五官崩坏，大头Q版，儿童化，现代T恤，西装，真实照片质感，欧美卡通风，过曝，高饱和艳色
>
> 英文：text, watermark, seal characters, logo, extra fingers, deformed hands, three hands, distorted face, chibi, childlike, modern t-shirt, business suit, photorealistic photograph, western cartoon, overexposed, oversaturated colors

## 平台参数与系列一致性技巧

- **Midjourney**：`--ar 1:1`；想更「动漫」用 **niji 6**，想更「偏真人」用 **v6.x** 并保留基座里的 anime 关键词。**系列一致性关键**：先抽卡出一张最满意的（建议先出玄或老胡），然后另外两张加 `--sref 那张图的URL --sw 200`，三张笔触立刻统一。
- **国内工具（即梦/豆包/通义万相/可灵）**：直接贴中文提示词，模型风格选「古风插画 / 厚涂」，比例 1:1；多数支持「参考图生图」，同样可以拿第一张定调。
- **SD / Flux**：用英文提示词，选国风或半写实动漫底模（LoRA 关键词 guofeng / hanfu illustration），负面词照贴。
- 手最容易崩：老胡的铜钱、玄的茶盏若手部畸形，可在提示词里去掉手部道具改为「双手拢袖」，或局部重绘。

## 出图后替换步骤

1. 三张图裁成 512×512 的 `hu.png` / `li.png` / `xuan.png`（可选 `guest.png`），放入 `public/avatars/`
2. 改 `src/data/mentors.ts` 三处 `avatar: "/avatars/xx.svg"` → `.png`；问者头像路径在 `src/components/MentorAvatar.tsx`（`/avatars/guest.svg`）
3. 刷新页面即可；图片加载失败会自动回退印文色块，不会白屏

图片准备好后把文件发我，第 2 步的代码改动我来做。
