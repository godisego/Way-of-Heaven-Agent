# 天道智能体路线图

路线优先级遵循：先保证数据与证据可信，再增加 Agent 自主性，最后做多用户和多 Agent。

## Phase 0：工程基线

- [x] 清除旧项目字段和命名
- [x] package-lock 与 package.json 对齐
- [x] TypeScript、ESLint、测试和生产构建命令
- [x] 关键引用、文本解析和当前大运回归测试
- [ ] CI 执行 `npm ci`、typecheck、lint、test、build
- [ ] 固定 Node.js LTS 版本
- [ ] API 请求 schema、长度限制和统一错误响应

## Phase 1：可靠入库与可信 RAG

- [x] PDF / Markdown / TXT 入库
- [x] 失败文档重新上传后可重试
- [x] PDF 页面与文本章节统一来源位置
- [x] 一条假引用使整组引用失败
- [x] 三贤分库检索与越库引用校验（分区 Sources、命理简报三档分发、声口校验器）
- [ ] 原子文件写入或 SQLite/Postgres 事务
- [ ] 后台入库队列、进度推送、取消和重试策略
- [ ] 关键词 + 向量混合检索
- [ ] 最低相关性阈值与邻页扩展
- [ ] rerank 与 Evidence Ledger
- [ ] Prompt Injection 测试与不可信来源隔离

## Phase 2：单 Agent 工具循环

- [ ] Tool Registry 与 JSON Schema
- [ ] `search_library`
- [ ] `read_source_unit`
- [ ] `get_user_profile`
- [ ] `calculate_bazi`
- [ ] `get_current_luck_cycle`
- [ ] 有最大步骤、超时、预算和取消能力的 Orchestrator
- [ ] 执行摘要与工具调用追踪

这一阶段完成后，项目才达到“模型会根据观察结果选择下一步”的 Agent 门槛。

## Phase 3：会话与记忆

- [x] 本地会话持久化基础（会话 API、消息/引用/trace 落盘、前端恢复与切换）
- [ ] 流式回答
- [ ] Session 摘要和未完成事项
- [ ] 用户可查看、编辑、删除的长期记忆
- [ ] 敏感字段授权与日志脱敏
- [ ] Reflection 失败经验版本化

## Phase 4：三贤协作深化

- [ ] 三贤结构化输出与各自 Evidence ID
- [ ] 角色顺序、声口、行动建议的自动评测
- [ ] 独立 Citation / Safety / Actionability Verifier
- [ ] 评测证明必要时，再拆成多模型或多 Agent
- [ ] 三贤交锋、追问和对前文观点的引用

## Phase 5：典籍能力

- [ ] OCR fallback
- [ ] 表格、脚注与版面结构恢复
- [ ] DOCX、HTML 等格式
- [ ] PDF 页面渲染与引用高亮
- [ ] 文档元数据编辑、删除、重建索引
- [x] Embedding 模型版本与全库重索引工具

## Phase 6：云端产品化

- [ ] Supabase Auth 与 `user_id`
- [ ] RLS 多用户隔离
- [ ] 私有 Storage 签名 URL
- [ ] API 限流、费用预算和滥用防护
- [ ] 后台任务、监控、追踪、告警、备份和恢复
- [ ] 脱敏分享页

## Phase 7：评测与发布门禁

- [ ] 典籍事实题
- [ ] 跨典籍综合题
- [ ] 资料不足题
- [ ] 假引用与提示注入题
- [ ] 固定排盘样例
- [ ] 高风险人生问题安全样例
- [ ] Recall@K、引用漏放率、证据覆盖率、P95 延迟和单轮成本看板

详细目标架构见 `docs/agent-blueprint.md`，验证方法见 `docs/verification-plan.md`。
