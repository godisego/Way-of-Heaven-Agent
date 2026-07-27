# Supabase 搭建与「本地建库 → 同步上云」

Way of Heaven Agent（天道智能体） 默认仍是 **本地优先**：

1. 本机上传 / 解析 / embedding → 写 `data/app.json` + `data/indexes/chunks.json` + `data/documents/`
2. 需要上云时，执行 **单向同步** 到 Supabase
3. 以后 GitHub + Vercel 部署时，应用只 **读** Supabase（`VECTOR_BACKEND=supabase`），不在 Serverless 写本地盘

当前仓库已搭好 **同步框架**，还 **不会** 在运行时自动写云端。你需要先建 Supabase 项目并跑一次 migration。

---

## 1. 创建 Supabase 项目

1. 打开 [https://supabase.com](https://supabase.com) 新建项目
2. **Project Settings → API** 记下：
   - Project URL → `SUPABASE_URL`
   - `service_role` key（secret）→ `SUPABASE_SERVICE_ROLE_KEY`  
     **不要** 把 service_role 提交到 Git，也不要放进前端
3. （可选）`anon` key 本阶段不用；前端只打你自己的 Next API

---

## 2. 执行数据库 Migration

在 Supabase Dashboard → **SQL Editor**，粘贴并运行：

```text
supabase/migrations/001_init.sql
```

该脚本会：

- 启用 `vector` 扩展
- 创建 `documents` / `document_pages` / `chunks` / 会话相关表
- 创建 `match_chunks(...)` 向量检索函数
- 开启 RLS（无公开策略 → 仅 service_role 可访问，适合个人项目）

### Storage Bucket

Dashboard → **Storage** → New bucket：

| 字段 | 值 |
|------|-----|
| Name | `documents` |
| Public | **关闭** |

与 `.env` 中 `SUPABASE_DOCUMENTS_BUCKET` 一致（默认 `documents`）。

### 向量维度

默认 **`vector(3072)`**，对齐 `text-embedding-3-large`。  
若 embedding 模型维度不同：

1. 改 `001_init.sql` 里所有 `vector(3072)` 与 `match_chunks` 参数
2. 重新建表或 `alter column`（有数据时需迁移）

---

## 3. 本地环境变量

复制 `.env.example` 到 `.env.local`，补上：

```bash
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DOCUMENTS_BUCKET=documents

# 本地开发保持默认即可
VECTOR_BACKEND=local
```

---

## 4. 安装依赖

```bash
npm install
```

会装上 `@supabase/supabase-js` 与用于跑同步脚本的 `tsx`。

---

## 5. 日常工作流

### 本地建库（和以前一样）

```bash
npm run dev
# 浏览器上传 md/txt/pdf，等 status=indexed
```

数据落在：

```text
data/app.json
data/indexes/chunks.json
data/documents/*
```

### 同步到 Supabase

```bash
npm run sync:supabase
```

可选参数：

```bash
# 只 upsert 表，不传文件
npm run sync:supabase -- --no-files

# 只传某个文档
npm run sync:supabase -- --doc doc_xxxxxxxx

# 只传文件、不写表
npm run sync:supabase -- --files-only
```

脚本逻辑见 `src/core/supabase/syncLocalToSupabase.ts`：

1. 读本地文档列表  
2. 上传源文件到 Storage  
3. upsert documents / pages / chunks（embedding 来自 `chunks.json`）

### 验证同步

Supabase Table Editor 应能看到行；Storage `documents` 下应有文件。  
SQL：

```sql
select count(*) from documents;
select count(*) from chunks where embedding is not null;
```

---

## 6. 代码地图（框架）

| 路径 | 作用 |
|------|------|
| `supabase/migrations/001_init.sql` | 云端 schema + `match_chunks` |
| `src/core/supabase/client.ts` | service role 客户端 |
| `src/core/supabase/mappers.ts` | 本地 camelCase ↔ DB snake_case |
| `src/core/supabase/storage.ts` | 本地文件 → Storage |
| `src/core/supabase/syncLocalToSupabase.ts` | 同步编排 |
| `src/core/supabase/vectorStore.ts` | 云端 VectorStore（读 RPC / 写 embedding） |
| `scripts/sync-to-supabase.ts` | CLI 入口 |
| `src/core/config/appConfig.ts` | `SUPABASE_*` / `VECTOR_BACKEND` |

本地入库路径 **未改**：`ingestionPipeline` 仍写 JsonDb + LocalJsonVectorStore。

---

## 7. 之后（尚未做，框架已留口）

| 步骤 | 说明 |
|------|------|
| Vercel 部署 | Env 填 Supabase + Chat/Embed；`VECTOR_BACKEND=supabase` |
| 云端只读问答 | `getVectorStore()` 已支持切 supabase；chat 仍走现有 RAG |
| 会话落 Supabase | 表已建，repository 待写 |
| Agent tool loop | 与存储无关，后续单独做 |
| Auth / RLS 多用户 | 个人阶段不需要；要分享时再加 `user_id` |

---

## 8. 安全清单

- [ ] `SUPABASE_SERVICE_ROLE_KEY` 只在本地 `.env.local` 与 Vercel 服务端 Env  
- [ ] 不要把 service_role 写进 `NEXT_PUBLIC_*`  
- [ ] Storage bucket 保持 private  
- [ ] Git 不提交 `.env.local` 与真实 PDF（若含隐私）

---

## 9. 常见问题

**Q: sync 报 embedding 维度错误**  
A: 本地向量维数与表 `vector(N)` 不一致。检查 embedding 模型，或重建列。

**Q: embeddingsMissing > 0**  
A: 该 chunk 在 `chunks.json` 里没有向量（未 index 完或 mock/失败）。重新入库或只同步 `status=indexed` 的文档。

**Q: 本地改了文档，云端旧数据？**  
A: 再跑一遍 `npm run sync:supabase`（upsert 覆盖同 id）。

**Q: 会不会从云端覆盖本地？**  
A: 当前 **不会**。只有 local → supabase 单向同步。
