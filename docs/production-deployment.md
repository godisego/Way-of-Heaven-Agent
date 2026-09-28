---
name: production-deployment
description: 生产部署与运维——环境变量/Docker/云部署/监控/告警/灰度/回滚/成本治理
---

# 生产部署与运维

本课用当前项目说明部署需要验证的条件，代码与命令是教学示例，不是已验证的公网生产方案。源码边界核对：2026-09-28。

> **前置**：[架构与能力边界](/learn/architecture)、[评测](/learn/agent-evaluation-observability)、[安全与治理](/learn/ai-security-governance)。当前会话、设置和部分索引仍依赖本地文件；仅配置 `VECTOR_BACKEND=supabase` 不会完成全量持久化迁移。

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
配置入口（具体优先级见 appConfig.ts）：

1. 运行时覆盖（前端面板配置）
   └─ data/provider-settings.json（权限 0600）
   └─ 天道茶寮的齿轮配置走这层

2. .env.local（本地开发）
   └─ git ignore，不提交
   └─ CHAT_API_KEY=sk-xxx

3. .env.example（仅示例，不会作为配置层自动加载）
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
COPY --from=builder /app/docs ./docs
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

## 四 · 按存储条件选择部署方式

先列出文档、原文件、向量、会话、设置的读写位置，再选择运行环境。当前本地 JSON 需要可写且持久的目录，并缺少跨进程写入协调；受保护的单进程环境才与现状接近。公网运行还需补身份、隔离与完整权限控制。

Serverless 或无持久本地文件的环境需要改造这些存储接口，不能只把向量读取切到 Supabase。`sync:supabase` 同步的资料快照不等于会话、设置和所有上传路径已迁移，部分入口仍检查本地索引。用实例替换、重启和并发写入验证持久化与一致性。

平台价格、免费额度、构建和请求限制会变化，请部署时查对应官方说明；本课不提供未经核验的固定报价或默认推荐。即使构建和首页成功，也要实测上传、检索、会话恢复、删除、权限与回滚。

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

以下是适用于已满足存储与访问控制条件的预览环境流程；当前项目不能因 GitHub 推送成功就视为已部署：

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

成本应结合模型、存储、运维、人工复核与错误损失计量；不能先假定哪项最大。

### 成本账本

每个成功任务的成本 = 模型调用 + embedding + 工具及检索 + 存储和计算 + 人工复核 + 预期错误损失，再除以成功任务数。分别记录重试、失败和尾延迟，不只记成功演示。

可评估缓存、模型路由、上下文压缩和 topK 调整；每项都需要比较节约与质量损失。缓存要区分用户权限与资料版本；mock embedding 只适合教学管线检查，不能当真实语义检索质量的低价替代。

教学算例：假设每天 50 次任务，每次模型费用 0.02 元，则模型一项为每天 1 元、30 天 30 元。这里不是供应商报价，不含其他费用，也不是本项目的实测月成本。完整业务账本见[毕业实践](/learn/ai-capstone)。

## 九 · 自测

1. 本地和生产环境的 6 个主要区别是什么？
2. 运行时设置、环境变量与示例文件有什么区别？Key 为什么不能提交到 git？
3. Docker 解决了什么问题？"在我机器上是好的"为什么不是借口？
4. 监控的业务指标、系统指标、AI 指标各有哪些？
5. 灰度发布的流程是什么？为什么要灰度？
6. 回滚的前提是什么？数据库 schema 为什么不能轻易改？
7. 你的 AI 场景如果上线，成本主要花在哪？怎么降本？

> **下一步**：上线前必须看 [AI 安全与治理](/learn/ai-security-governance)，确保不泄露用户数据。
