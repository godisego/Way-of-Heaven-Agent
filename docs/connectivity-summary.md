# 系统连通性检查 - 快速总结

**检查日期**: 2026-08-11

---

## ✅ 已正常工作

1. **供应商配置系统** - 服务器配置正确覆盖环境变量
2. **向量数据库** - 266 条记录，27 份文档已入库
3. **导师角色** - 三贤（李、老胡、玄）配置完整
4. **权限系统** - 按 tradition 正确分配文档给导师
5. **发言顺序** - 老胡 → 李 → 玄 固定流程

---

## ⚠️ 需要修复

### 🔴 高优先级（影响使用）

#### 1. Chat 模型名未配置
**文件**: `data/provider-settings.json`  
**问题**: `chat.model` 和 `embedding.model` 字段为空

**解决**:
```bash
# 方法1: 前端齿轮面板修改供应商配置
# 在「模型名称」字段填写，例如：gpt-3.5-turbo

# 方法2: 直接编辑配置文件
vim data/provider-settings.json
# 修改 "model": "" → "model": "gpt-3.5-turbo"
```

#### 2. Embedding 使用 Mock 模式
**当前**: bigram hash (256维)，检索质量差  
**影响**: 无法理解语义，准确率低

**解决**:
```bash
# 1. 配置真实 Key
vim .env.local
# 修改: OPENAI_COMPAT_API_KEY=sk-真实key
# 注释: # USE_MOCK_EMBEDDING=1

# 2. 重建索引（必须！）
npm run reindex:embeddings

# 3. 验证
npm run doctor
```

---

## 📊 数据分布

| 传统 (tradition) | Chunks | 占比 | 导师 |
|-----------------|--------|------|------|
| yijing (易经) | 217 | 81.6% | 老胡 |
| daoism (道家) | 25 | 9.4% | 玄 |
| existentialism (存在主义) | 9 | 3.4% | 李 |
| chinese-classics (中华典籍) | 8 | 3.0% | 老胡、玄 |
| stoicism (斯多葛) | 7 | 2.6% | 李 |

**建议**: 补充存在主义和斯多葛文档，平衡各导师材料

---

## 🎯 导师-传统映射

| 导师 | 可引用的传统 |
|------|-------------|
| 李 (li) | existentialism, stoicism, tiandao |
| 老胡 (hu) | yijing, chinese-classics, tiandao |
| 玄 (xuan) | daoism, chinese-classics, tiandao |

**共享**: `tiandao` 三人共通，`null` (无标签) 三人共享

---

## 🚀 推荐操作

### 立即修复
1. ✅ 配置 Chat 模型名（前端齿轮面板）

### 本周完成
2. ✅ 升级到真实 Embedding + 重建索引

### 本月完成  
3. ⚠️ 补充存在主义/斯多葛文档各 5-10 份

---

## 📝 验证命令

```bash
# 系统健康检查
npm run doctor

# 查看藏书
ls -lh data/documents/

# 重建索引（切换 Embedding 后）
npm run reindex:embeddings
```

---

## 评分

| 项目 | 状态 | 评分 |
|------|------|------|
| 配置连通性 | ⚠️ | 70/100 |
| 向量数据库 | ✅ | 95/100 |
| 角色分配 | ✅ | 100/100 |
| **总体** | **🟡 可用但需优化** | **81/100** |

---

**详细报告**: 见 `docs/connectivity-check.md`
