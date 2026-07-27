---
name: avatar-sources
description: Where to get mentor portrait images for 天道茶寮
---

# 三贤头像资源指南

当前默认：`public/avatars/{li,hu,xuan,guest}.svg`（水墨示意，可直接替换为 png/webp）。

## 推荐找图渠道（注意版权）

1. **自己画 / 找画师**（最稳）  
   - 小红书 / 米画师 / 约稿「水墨半身、中年文人 / 算命先生 / 道人」  
   - 统一：方图 512×512、浅底或透明、半身肩以上  

2. **免费可商用图库**（改色裁切后使用）  
   - [Unsplash](https://unsplash.com) / [Pexels](https://www.pexels.com)：搜 `chinese tea portrait`、`elderly man portrait` 等，选可商用许可  
   - [Pixabay](https://pixabay.com)  

3. **开放文化资源**  
   - [Wikimedia Commons](https://commons.wikimedia.org)：古画、肖像（看具体许可证）  
   - 故宫 / 地方博物馆开放影像（遵守各馆条款）  

4. **AI 生图（个人项目常用）**  
   - Midjourney / SD：提示词示例  
     - 李：`Chinese ink wash portrait, middle-aged scholarly man with glasses, calm severe eyes, dark robe, square crop, soft paper texture`  
     - 老胡：`folk fortune teller uncle, warm wrinkled smile, half-closed eyes, brown cloth, ink portrait`  
     - 玄：`daoist priest portrait, thin face, hair bun, green-gray robe, serene, ink wash`  
   - 个人用注意各平台商用条款；不要生成真人明星脸。

5. **不要**直接用《天道》剧照演员正脸（肖像权 + 平台风险）。可抽象「气质参考」，勿可识别复制。

## 替换步骤

1. 准备 `li.png` / `hu.png` / `xuan.png`（建议 512px）  
2. 放入 `public/avatars/`  
3. 改 `src/data/mentors.ts` 里对应 `avatar: "/avatars/li.png"`  
4. 刷新页面即可  

路径写在 `MentorProfile.avatar`，对话气泡与角色卡共用。
