---
name: production-deployment
description: 生产部署与运维——环境变量/Docker/云部署/监控/告警/灰度/回滚/成本治理
---

# 生产部署与运维

从"本地能跑"到"上线稳定"，中间差了这篇。不学术，用天道茶寮的真实部署做例子。

> **前置**：读 [API 与系统集成](/learn/api-integration) 了解 API 架构。

## 一 · 本地 vs 生产差在哪

| 维度 | 本地开发 | 生产环境 |
|------|---------|---------|
| 配置 | `.env.local`，想改就改 | 环境变量，不能随意改 |
| 数据 | Local JSON 文件 | 数据库（Supabase / Postgres） |
| 日志 | `console.log` 看屏幕 | 结构化日志，集中收集 |
| 错误 | 报错就修 | 不能崩，崩了要告警 |
| 性能 | 一个人用 | 多人并发，要限流 |
| 更新 | `git pull` 重启 | 灰度发布，可回滚 |

## 二 · 环境变量管理

### 三层配置

```
优先级从高到低：

1. 运行时覆盖（前端面板配置）
   └─ data/provider-settings.json（权限 0600）
   └─ 天道茶寮的齿轮配置走这层

2. .env.local（本地开发）
   └─ git ignore，不提交
   └─ CHAT_API_KEY=sk-xxx

3. .env.example（模板，提交到 git）
   └─ 只有变量名，没有值
   └─ CHAT_API_KEY=your_key_here
```

### 生产环境怎么配

```bash
# Vercel 部署：在 Dashboard 配环境变量
VERCEL_ENV=production
CHAT_BASE_URL=https://api.minimaxi.com/anthropic
CHAT_API_KEY=sk-xxx
VECTOR_BACKEND=supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Docker 部署：docker run 时传
docker run -e CHAT_API_KEY=sk-xxx -e VECTOR_BACKEND=supabase ...
```

### 安全红线

| 该做 | 不该做 |
|------|--------|
| Key 只在环境变量里 | 写在代码里提交到 git |
| `.env.local` 加 `.gitignore` | 把 `.env.local` 提交到 git |
| 生产 Key 和开发 Key 分开 | 用同一个 Key |
| 定期轮换 Key | 一个 Key 用三年 |

## 三 · Docker 部署

Docker = 把你的应用 + 依赖 + 环境打包成一个"集装箱"，在哪台机器上都能跑。

### Dockerfile（天道茶寮示例）

```dockerfile
# 阶段 1：安装依赖
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 阶段 2：构建
FROM deps AS builder
COPY . .
RUN npm run build

# 阶段 3：运行（只保留必要文件，镜像小）
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

### 构建和运行

```bash
# 构建镜像
docker build -t tiandao-agent .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e CHAT_API_KEY=sk-xxx \
  -e VECTOR_BACKEND=supabase \
  -v $(pwd)/data:/app/data \
  --name tiandao \
  tiandao-agent

# 查看日志
docker logs -f tiandao

# 停止删除
docker stop tiandao && docker rm tiandao
```

### 为什么用 Docker

```
没有 Docker：
  你机器能跑 → 服务器不能跑 → "在我机器上是好的！"

有 Docker：
  你的镜像 = 服务器镜像
  能跑就是能跑，不能跑就是不能跑
```

## 四 · 云部署方案对比

| 方案 | 适合 | 成本 | 天道茶寮适配 |
|------|------|------|-------------|
| **Vercel** | Next.js 项目，个人/小团队 | 免费起步 | ✅ 最推荐 |
| **自建 VPS** | 需要完全控制 | 5~20 元/月 | ✅ 适合 Docker 部署 |
| **Railway/Render** | 全栈应用，不想折腾 | 5~10 美元/月 | ✅ 简单 |
| **K8s** | 大规模，多服务 | 复杂+贵 | ❌ 杀鸡用牛刀 |

### Vercel 部署天道茶寮

```bash
# 1. 推到 GitHub
git push origin main

# 2. Vercel 导入项目
# vercel.com → New Project → Import GitHub 仓库

# 3. 配环境变量
# Settings → Environment Variables → 添加 CHAT_API_KEY 等

# 4. 部署
# Vercel 自动检测 Next.js → 自动 build → 自动部署

# 5. 访问
# https://your-project.vercel.app
```

**注意**：Vercel 是无状态的——每次部署后本地文件会清空。天道茶寮的 `data/` 目录需要用 Supabase 或外部存储替代。

## 五 · 监控与告警

上线后你怎么知道系统在正常运转？靠监控。

### 监控什么

```
┌──────────────────────────────────────────────────┐
│                   监控四层                         │
├──────────────┬──────────────┬───────────────────┤
│  业务指标     │  系统指标     │  AI 指标          │
├──────────────┼──────────────┼───────────────────┤
│ 日活用户      │ CPU / 内存   │ API 调用量        │
│ 问答次数      │ 响应时间     │ 平均 token 消耗   │
│ 上传文档数    │ 错误率       │ 引用校验通过率    │
│ 检索命中率    │ 请求量 QPS   │ 幻觉率（抽检）    │
└──────────────┴──────────────┴───────────────────┘
```

### 告警规则

| 指标 | 阈值 | 动作 |
|------|------|------|
| API 错误率 | >5% 持续 5 分钟 | 立即告警 |
| 响应时间 | >10 秒持续 5 分钟 | 告警 |
| API 费用 | 日费用 > 预算 80% | 告警 |
| 引用校验通过率 | <80% | 关注 |
| 索引为空 | chunks=0 | 紧急告警 |

### 天道茶寮的健康检查

天道茶寮有 `/api/health` 端点，可以对接监控：

```bash
# 每分钟检查一次
curl -X POST https://your-app.vercel.app/api/health \
  -H "Content-Type: application/json" -d '{}'

# 如果返回 empty:true → 索引丢了，紧急告警
# 如果 providers.chat.configured=false → 配置丢了，告警
```

## 六 · 灰度发布

上线新版本时，别一次性全量更新——先给一小部分用户试用：

```
全量发布（危险）：
  旧版本 100% → 新版本 100%
  如果新版本有 bug → 所有用户受影响

灰度发布（安全）：
  旧版本 90% + 新版本 10%
  ├─ 观察 1 小时，没异常 → 新版本 30%
  ├─ 再观察 → 新版本 50%
  ├─ 再观察 → 新版本 100%
  └─ 任何阶段出问题 → 立即回滚到旧版本
```

### 天道茶寮怎么做灰度

个人项目不需要复杂灰度。简单做法：

1. 开一个 `staging` 分支
2. 在 Vercel 部署 preview 分支
3. 自己先在 preview 环境测试
4. 测试通过 → 合并到 `main` → Vercel 自动部署生产

## 七 · 回滚

上线出了问题怎么办？**回滚到上一个版本**。

```bash
# Vercel 回滚
# Dashboard → Deployments → 选上一个 → "Redeploy"

# Git 回滚
git revert HEAD          # 撤销最近的 commit
git push origin main     # 推送

# Docker 回滚
docker stop tiandao
docker run -d ... tiandao-agent:v0.9  # 跑旧版本
```

**回滚前提**：数据库 schema 不要轻易改——如果新版加了字段，回滚到旧版可能不兼容。

## 八 · 成本治理

AI 应用的主要成本是模型调用费。不治理的话，一个 bug 可能烧光预算。

### 成本构成

```
总成本
├─ LLM API 调用费（最大头）
│   ├─ 聊天：按 token 计费
│   └─ Embedding：按 token 计费（便宜很多）
├─ 服务器费
│   ├─ Vercel：免费 ~20 美元/月
│   └─ VPS：5~20 元/月
├─ 数据库费
│   └─ Supabase：免费 ~25 美元/月
└─ 存储费
    └─ 文档/索引存储：很便宜
```

### 降本技巧

| 技巧 | 怎么做 | 节省 |
|------|--------|------|
| 缓存热门问题 | 相同问题 24h 内不重复调 LLM | 30~50% |
| 分级模型 | 简单问题用小模型，复杂问题用大模型 | 40~60% |
| 缩短 prompt | 去掉冗余指令，精简示例 | 10~20% |
| Mock embedding | 不配真 embedding，用 mock | 100%（embedding 部分） |
| 限制 topK | topK 从 10 降到 5 | 减少上下文 token |

### 天道茶寮的成本

```
假设：每天 50 次对话
├─ 聊天 API：50 × 0.02 元 = 1 元/天
├─ Embedding：mock 免费
├─ 服务器：Vercel 免费
└─ 总计：~30 元/月
```

## 九 · 自测

1. 本地和生产环境的 6 个主要区别是什么？
2. 环境变量的三层优先级是什么？Key 为什么不能提交到 git？
3. Docker 解决了什么问题？"在我机器上是好的"为什么不是借口？
4. 监控的业务指标、系统指标、AI 指标各有哪些？
5. 灰度发布的流程是什么？为什么要灰度？
6. 回滚的前提是什么？数据库 schema 为什么不能轻易改？
7. 你的 AI 场景如果上线，成本主要花在哪？怎么降本？

> **下一步**：上线前必须看 [AI 安全与治理](/learn/ai-security-governance)，确保不泄露用户数据。
