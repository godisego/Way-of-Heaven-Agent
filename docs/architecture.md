# 天道智能体架构

## 系统定位

天道智能体当前是本地优先的 RAG + 受控 Agent 应用：它把用户自己的典籍和笔记转换成可检索知识，再结合问者档生成有出处的三贤回应。默认由 Agent 工具循环取证，显式切换为 `mode:"rag"` 时走固定 RAG。

Agent 只负责受控取证，工具有白名单、次数/超时限制、证据台账和引用校验；长期记忆与多用户能力仍在后续路线。

## 当前架构

```text
Browser UI
  ├─ 问者档与本地排盘
  ├─ 入阁藏书
  ├─ 三贤对谈
  └─ 来源原文预览
        │
        ▼
Next.js API Routes
  ├─ POST /api/ingest       上传、解析、切分、索引
  ├─ GET  /api/documents    文档列表与来源单元原文
  ├─ POST /api/search       检索调试
  └─ POST /api/chat         默认 Agent；mode:"rag" 可切固定 RAG
        │
        ├─ data/app.json                 本地元数据
        ├─ data/documents/*              原始文件
        ├─ data/indexes/chunks.json      本地向量索引
        ├─ Embedding Provider
        └─ Chat Provider

可选同步：本地快照 ── npm run sync:supabase ──► Supabase
```

## 典籍入库

```text
文件校验
  → SHA-256 去重
  → 保存原始文件
  → PDF 按页 / Markdown 按标题 / TXT 按段落单元提取
  → 每个来源单元内切 chunk
  → 批量 Embedding
  → 写本地向量索引
  → 标记 indexed
```

PDF 的 `pageNumber` 表示真实页码，`sectionTitle` 为“第 N 页”。Markdown/TXT 的 `pageNumber` 是来源单元序号，`sectionTitle` 优先使用标题。

相同内容的文档只保留一份。若旧记录状态为 `failed`，再次上传会复用已解析页面/chunk 并重试索引，而不是永久返回失败记录。

## 三贤问答

```text
用户问题 + 问者档
  → query embedding（1 次）
  → 大召回后按三贤专库三路分拣（李 / 胡 / 玄 各 topK，未标注文档进共享池）
  → 分区 Sources（各贤只可引用自己分区）
  → 命理简报三档注入（胡全量 · 玄气机 · 李结构性隔离）
  → 调用一次聊天模型（三段固定顺序生成）
  → 按发言人校验引用（越库 / 杜撰即整组作废）
  → 声口校验（缺角 / 乱序 / 串味 / 李用命理 / AI 自指）
  → 全部违规合并为一次带原因的定向重试
  → 返回回答、引用（含发言人归属）和本轮来源摘要
```

默认问答先进入受控 Agent 取证循环：模型只能在白名单工具中选择检索、读取原文或明确收尾；再复用同一套三贤分库、引用与声口校验。关闭「循迹」后，`mode:"rag"` 走固定流水线，作为稳定对照。分库权属的唯一事实源是 `mentors.ts` 的 traditions 声明。

## 本地存储

本地元数据由 `src/core/db/jsonDb.ts` 管理，写入 `data/app.json`。这是适合单用户 MVP 的可读文件存储，不具备数据库事务、多进程并发和大规模查询能力。

本地向量索引会读入全部记录、计算余弦相似度并排序。数据量增大后应切换到 pgvector 或其他真正的向量数据库。

## Provider 边界

- `EmbeddingProvider.embedTexts`：文本转向量。
- `LlmProvider.generateAnswer`：基于问题、上下文和问者档生成回答。
- `VectorStore.search`：按向量相似度检索。

本地入库始终写本地向量索引。`VECTOR_BACKEND=supabase` 只控制运行时检索从哪里读取，云端数据仍通过同步 CLI 写入。

## Supabase 边界

Supabase 当前是可选的云端只读快照：

- Postgres 保存文档、来源单元和 chunk 元数据；
- pgvector 保存 embedding；
- Storage 保存原始文件；
- `match_chunks` RPC 执行向量检索。

当前 API 使用 service role，因此只能作为受保护的服务端能力。部署到公网前必须增加 Auth、RLS、多用户 `user_id`、限流和请求大小限制。

## 当前已知约束

- 入库仍在一个 HTTP 请求内同步完成，大文档可能超时；
- 本地 JSON 写入没有事务与跨进程锁；
- 只有向量检索，没有关键词检索、rerank 和最低相关性门槛；
- 引用能验证来源位置，但尚不能逐句证明每个结论；
- 会话已支持本地持久化、恢复、改名和删除，但还没有摘要与长期记忆；
- Agent 工具循环已完成 M5 验收，仍需继续补流式事件与系统化评测；
- PDF 暂无 OCR、表格和版面结构恢复。

## 设计原则

1. 排盘和来源读取等确定性工作交给代码，不交给模型猜。
2. 典籍内容是“不可信数据”，不能覆盖系统指令。
3. 所有事实性典籍观点必须进入 Evidence Ledger 并可打开原文核验。
4. 资料不足时停止，不用更多角色话术掩盖证据缺口。
5. 出生信息与私人典籍默认本地保存，外发必须明确授权。
6. Agent 的每个工具、步骤、预算和副作用都应可约束、可取消、可审计。
