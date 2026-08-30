# 系统连通性检查报告

**检查日期**: 2026-08-11  
**检查范围**: 供应商配置、Embedding、向量数据库、导师角色分配

> **✅ 更新（2026-08-30）**：本报告为历史检查记录，文中列出的「Embedding 使用 Mock 模式」等问题已全部解决。
> 当前实际配置：真实嵌入 **MiniMax embo-01（1536 维）** 已配置并探活通过，索引已用真实模型重建（266 条 / 1536 维 / embo-01），
> MiniMax Coding Plan 的同一把 key 实测可同时驱动聊天（/anthropic）与嵌入（/v1）。
> 以下正文保留 8 月 11 日检查时的原始状态，仅作历史参考。

---

## 📊 总体状态

✅ **聊天链路**: 已配置并可用  
⚠️ **Embedding链路**: 当前使用 Mock 模式（bigram hash）  
✅ **向量数据库**: 已建立，266 条记录  
✅ **导师角色分配**: 配置正确，可正常工作  

---

## 🔧 1. 供应商配置检查

### 配置优先级
```
服务器配置 (data/provider-settings.json)  >  环境变量 (.env.local)  >  默认值
```

### 当前配置状态

#### A. 服务器配置文件 (`data/provider-settings.json`)
**状态**: ✅ 存在并已配置

```json
{
  "chat": {
    "provider": "custom-chat",
    "baseUrl": "https://api.ikun.cloud-ip.cc/v1",
    "apiKey": "sk-RPQu...xrp7",
    "model": "",  ⚠️ 模型名为空
    "protocol": "openai"
  },
  "embedding": {
    "provider": "custom-chat", 
    "baseUrl": "https://api.ikun.cloud-ip.cc/v1",
    "apiKey": "sk-RPQu...xrp7",
    "model": "",  ⚠️ 模型名为空
    "protocol": "openai"
  },
  "unified": true,
  "updatedAt": "2026-08-10T13:03:32.819Z"
}
```

**问题**:
- `chat.model` 和 `embedding.model` 字段为空字符串
- 需要在前端齿轮面板设置具体模型名称

#### B. 环境变量配置 (`.env.local`)
**状态**: ✅ 存在，作为回退配置

```bash
# 聊天配置（会被 provider-settings.json 覆盖）
CHAT_BASE_URL=https://api.minimaxi.com/anthropic
CHAT_API_KEY=sk-cp-1yR2...
CHAT_MODEL=MiniMax-M3

# Embedding 配置
OPENAI_COMPAT_BASE_URL=https://api.openai.com/v1
OPENAI_COMPAT_API_KEY=your_api_key_here  ⚠️ 未配置真实 Key
OPENAI_COMPAT_EMBEDDING_MODEL=text-embedding-3-large

# Mock Embedding（当前生效）
USE_MOCK_EMBEDDING=1  ✅ 已启用
```

### 实际生效配置

根据优先级规则，当前生效的配置为：

| 配置项 | 来源 | 值 | 状态 |
|--------|------|-----|------|
| 聊天 BaseURL | provider-settings.json | https://api.ikun.cloud-ip.cc/v1 | ✅ |
| 聊天 API Key | provider-settings.json | sk-RPQu... | ✅ |
| 聊天模型 | provider-settings.json | "" (空) | ⚠️ 需填写 |
| 聊天协议 | provider-settings.json | openai | ✅ |
| Embedding | 自动回退 | Mock (bigram hash) | ⚠️ |
| Embedding 模型 | Mock | mock-local-256d | ✅ (Mock) |
| Embedding 维度 | Mock | 256 | ✅ |

---

## 🧮 2. Embedding 配置检查

### 当前状态
**模式**: Mock Embedding (本地 bigram hash)

### Doctor 输出分析
```
✅ Embedding 链路：当前为本地 Mock 模式（bigram hash），不需要 Embedding Key
🔍 Embedding 探活：（已回退 mock）模型 mock-local-256d，维度 256
✅ 维度一致性：索引与查询均为 256 维
✅ 模型一致性：索引与查询均为「mock-local-256d」
```

### Mock 模式说明

**什么是 Mock Embedding?**
- 使用本地 bigram hash 算法生成 256 维向量
- 不需要调用外部 API，无需 API Key
- 不消耗任何费用
- 适合**演示和开发环境**

**Mock 模式的局限性**:
- ❌ 语义理解能力弱（基于字符组合，不理解含义）
- ❌ 检索质量远低于真实模型
- ❌ 无法跨语言或处理同义词
- ✅ 可以让系统跑通，验证流程

### 升级到真实 Embedding

**选项 1: 使用当前供应商的 Embedding**
```bash
# 在前端齿轮面板配置：
# provider-settings.json 的 embedding.model 填写真实模型名
# 例如：text-embedding-3-small, text-embedding-3-large
```

**选项 2: 使用独立的 Embedding 服务**
```bash
# 修改 .env.local
OPENAI_COMPAT_BASE_URL=https://your-embedding-service.com/v1
OPENAI_COMPAT_API_KEY=your_real_key_here
OPENAI_COMPAT_EMBEDDING_MODEL=text-embedding-3-large

# 注释掉或删除
# USE_MOCK_EMBEDDING=1
```

**重建索引（必须！）**:
```bash
npm run reindex:embeddings
```

⚠️ **重要**: 切换 Embedding 模型后必须重建索引，否则维度不匹配会导致检索失败。

---

## 📚 3. 向量数据库（藏书）检查

### 索引状态
**文件**: `data/indexes/chunks.json`  
**大小**: 2.0 MB  
**总记录数**: 266 条  
**维度**: 256 (Mock)  
**模型**: mock-local-256d

### 文档分布

| 思想传统 (tradition) | Chunk 数量 | 百分比 | 对应导师 |
|---------------------|-----------|--------|----------|
| `yijing` (易经命理) | 217 | 81.6% | 老胡 (hu) |
| `daoism` (道家) | 25 | 9.4% | 玄 (xuan) |
| `existentialism` (存在主义) | 9 | 3.4% | 李 (li) |
| `chinese-classics` (中华典籍) | 8 | 3.0% | 老胡、玄 |
| `stoicism` (斯多葛) | 7 | 2.6% | 李 |
| **总计** | **266** | **100%** | - |

### 已入库文档（27份）

从 `data/app.json` 和 `data/documents/` 确认：

**存在主义类** (existentialism):
- 存在主义笔记.md (3 页)
- 荒诞与反抗行动札记.md (6 页)

**斯多葛类** (stoicism):
- 斯多葛可控圈实践.md (7 页)

**易经命理类** (yijing):
- 周易六十四卦处世选读.md (8 页)
- 以及大量命理相关文档（共 217 chunks）

**中华典籍类** (chinese-classics):
- 多个经典文献

**道家类** (daoism):
- 道家相关文献 (25 chunks)

### 数据完整性
✅ 所有 266 条记录都有 `embeddingModel` 字段  
✅ 所有记录的维度一致 (256)  
✅ tradition 标签正确分配  
✅ 文档元数据完整（书名、作者、页码等）

---

## 👥 4. 导师角色分配检查

### 三贤配置

| 导师 | ID | 席位 | 专长 | 性格 |
|------|-----|------|------|------|
| 李 | `li` | 左席·醒 | 存在主义 | 冷静、锋利、拆自欺 |
| 老胡 | `hu` | 右席·时 | 盲派算师 | 市井通透、论命数 |
| 玄 | `xuan` | 主席·化 | 道家掌柜 | 从容、留白、收束 |

### 导师-传统映射

根据 `src/data/mentors.ts` 中的 `traditions` 配置：

```json
{
  "li": ["existentialism", "stoicism", "tiandao"],
  "hu": ["yijing", "chinese-classics", "tiandao"],
  "xuan": ["daoism", "chinese-classics", "tiandao"]
}
```

### 权限矩阵

| Tradition | 可引用的导师 | 说明 |
|-----------|-------------|------|
| `existentialism` | 李 | 存在主义是李的专属领域 |
| `stoicism` | 李 | 斯多葛也归李 |
| `yijing` | 老胡 | 易经命理是老胡的专属 |
| `chinese-classics` | 老胡、玄 | 中华典籍两人共享 |
| `daoism` | 玄 | 道家是玄的专属 |
| `tiandao` | 李、老胡、玄 | 天道方法论三人共通 |
| `null` (无标签) | 李、老胡、玄 | 未标注文档三人共享 |

### 权限验证逻辑

函数 `isSourceAllowedFor(mentorId, tradition)` 在 `src/data/mentors.ts:255`:

```typescript
// 某来源（按 tradition 标签）是否允许该贤引用
export function isSourceAllowedFor(
  id: MentorId, 
  tradition: string | null | undefined
): boolean {
  if (!tradition) return true;  // 未标注 = 三人共享
  return mentorTraditionScope(id).has(tradition);
}
```

### 发言顺序

固定顺序（来自 `DIALOGUE_MENTORS`）：
1. **老胡** (hu) - 先发言，铺势、批象论命
2. **李** (li) - 第二位，拆自欺、交还自由
3. **玄** (xuan) - 末席，收束、留白

### 用户选择导师

前端可以通过 `mentors` 参数选择子集：

```typescript
// API 请求示例
{
  "question": "如何面对焦虑？",
  "mentors": ["li", "xuan"]  // 只让李和玄回答
}
```

选择逻辑（`parseMentorSelection` in `src/data/mentorSelection.ts`）:
- 未传或 `null` → 默认三贤全上
- `["hu", "li", "xuan"]` → 全选，等同于默认
- `["li"]` → 仅李发言
- `["hu", "xuan"]` → 按固定顺序：老胡 → 玄
- `[]` → 错误，至少要选一位

---

## 🔍 5. 检索流程验证

### 向量检索流程

1. **用户提问** → 2. **生成查询向量** → 3. **相似度搜索** → 4. **按导师过滤** → 5. **返回引用**

### 导师专属检索

当用户选择特定导师时，系统会：

1. 对所有文档进行向量检索
2. 按 `tradition` 字段过滤：
   ```typescript
   // 伪代码
   results.filter(chunk => 
     isSourceAllowedFor(selectedMentorId, chunk.tradition)
   )
   ```
3. 只返回该导师有权限引用的文档

### 实际数据匹配

根据当前数据分布：

| 选择导师 | 可检索的 Chunks | 占比 |
|---------|----------------|------|
| 仅李 | 9 + 7 + ? = ~16 | ~6% |
| 仅老胡 | 217 + 8 + ? = ~225 | ~85% |
| 仅玄 | 25 + 8 + ? = ~33 | ~12% |
| 三贤全选 | 266 | 100% |

**?** = `tiandao` 和 `null` 标签的文档（未单独统计）

### 检索质量预期

**Mock Embedding 模式下**:
- ✅ 能找到字面匹配的内容
- ❌ 无法理解语义相似
- ❌ 同义词无法匹配
- ⚠️ 检索准确率较低

**真实 Embedding 模式下**:
- ✅ 理解语义相似性
- ✅ 同义词、近义词都能匹配
- ✅ 跨语言检索（如果模型支持）
- ✅ 高准确率和召回率

---

## ⚠️ 发现的问题

### 1. 高优先级问题

#### A. Chat 模型名未配置
**问题**: `provider-settings.json` 中 `chat.model` 和 `embedding.model` 为空字符串

**影响**: 
- 系统可能无法正确调用 API
- 可能导致聊天请求失败

**解决方案**:
```bash
# 方法1: 通过前端齿轮面板修改供应商配置
# 在「模型名称」字段填写真实模型名，例如：
# - gpt-3.5-turbo
# - gpt-4
# - claude-3-sonnet
# 等，取决于你的供应商支持的模型

# 方法2: 直接编辑配置文件
# 编辑 data/provider-settings.json，填写 model 字段
```

#### B. Embedding 使用 Mock 模式
**问题**: 当前使用 bigram hash，检索质量差

**影响**:
- 无法理解语义
- 检索准确率低
- 用户体验不佳

**解决方案**:
```bash
# 1. 配置真实 Embedding Key（二选一）:
#    a) 在前端齿轮面板配置 embedding.model
#    b) 或在 .env.local 配置 OPENAI_COMPAT_API_KEY

# 2. 重建索引（必须）
npm run reindex:embeddings

# 3. 验证
npm run doctor
```

### 2. 中优先级问题

#### C. 数据分布不均
**问题**: 
- 易经类文档占 81.6% (217/266)
- 存在主义仅 3.4% (9/266)
- 斯多葛仅 2.6% (7/266)

**影响**:
- 李（存在主义）可引用的材料较少
- 老胡（易经）材料过多可能导致检索偏向

**建议**:
- 补充存在主义和斯多葛相关文档
- 或者删减部分易经类文档以平衡

#### D. OPENAI_COMPAT_API_KEY 未配置
**问题**: `.env.local` 中为占位符 `your_api_key_here`

**影响**: 
- 无法使用真实 Embedding（已自动回退 Mock）
- 限制了系统能力

**解决方案**:
```bash
# 修改 .env.local
OPENAI_COMPAT_API_KEY=sk-your-real-key-here
```

---

## ✅ 正常工作的部分

1. ✅ **配置优先级系统** - provider-settings.json 正确覆盖环境变量
2. ✅ **向量数据库** - 266 条记录完整，维度一致
3. ✅ **导师角色定义** - 三贤配置完整，性格鲜明
4. ✅ **传统标签系统** - 文档正确分类到各个 tradition
5. ✅ **权限过滤逻辑** - `isSourceAllowedFor` 实现正确
6. ✅ **发言顺序** - 老胡 → 李 → 玄 固定顺序
7. ✅ **用户选择导师** - 前端可灵活选择单个或多个导师
8. ✅ **Mock Embedding 回退** - 在无真实 Key 时自动启用
9. ✅ **维度一致性检查** - 防止索引/查询维度不匹配
10. ✅ **模型一致性检查** - 防止 Embedding 模型切换后未重建索引

---

## 🚀 推荐操作步骤

### 立即修复（必须）
1. **配置 Chat 模型名**
   - 打开前端齿轮面板
   - 在供应商配置中填写真实模型名
   - 保存配置

### 短期优化（建议）
2. **升级到真实 Embedding**
   ```bash
   # a) 配置真实 Key
   vim .env.local
   # 修改 OPENAI_COMPAT_API_KEY=真实key
   
   # b) 注释掉 Mock 强制开关
   # USE_MOCK_EMBEDDING=1
   
   # c) 重建索引
   npm run reindex:embeddings
   
   # d) 验证
   npm run doctor
   ```

3. **平衡文档分布**
   - 补充存在主义相关文档 5-10 份
   - 补充斯多葛相关文档 5-10 份
   - 保持各导师都有足够材料

### 长期改进（可选）
4. **扩充藏书库**
   - 持续添加高质量文档
   - 确保每个 tradition 至少 20-30 份文档

5. **监控检索质量**
   - 定期测试各导师的回答质量
   - 根据用户反馈调整文档

---

## 📝 测试命令

```bash
# 1. 检查系统健康
npm run doctor

# 2. 查看藏书列表
ls -lh data/documents/

# 3. 统计向量记录
grep -o '"id":' data/indexes/chunks.json | wc -l

# 4. 重建索引（切换 Embedding 后必须）
npm run reindex:embeddings

# 5. 同步到 Supabase（如果使用云端）
npm run sync:supabase
```

---

## 📊 系统评分

| 检查项 | 状态 | 得分 |
|--------|------|------|
| 聊天配置 | ⚠️ 模型名缺失 | 70/100 |
| Embedding 配置 | ⚠️ Mock 模式 | 50/100 |
| 向量数据库 | ✅ 完整可用 | 95/100 |
| 导师分配 | ✅ 配置正确 | 100/100 |
| 权限控制 | ✅ 逻辑正确 | 100/100 |
| 文档分布 | ⚠️ 不均衡 | 70/100 |
| **总体评分** | **可用但需优化** | **81/100** |

---

## 🎯 结论

**系统状态**: 🟡 **可用，但建议优化**

**核心功能**:
- ✅ 聊天功能可以工作（如果填写模型名）
- ⚠️ 检索功能在 Mock 模式下质量较低
- ✅ 导师角色分配正确
- ✅ 权限控制正常

**建议操作优先级**:
1. **立即**: 配置 Chat 模型名
2. **1周内**: 升级到真实 Embedding
3. **1个月内**: 平衡文档分布，补充内容

完成上述优化后，系统可以达到生产环境标准。
