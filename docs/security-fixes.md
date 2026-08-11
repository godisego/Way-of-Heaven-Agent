# 安全修复报告

**修复日期**: 2026-08-11  
**修复内容**: 针对安全审核发现的问题进行全面修复

---

## 已修复的问题

### ✅ 1. 文件权限加固（高风险）

**问题**: `.env.local` 文件权限为 644，所有用户可读，存在敏感信息泄漏风险。

**修复**:
```bash
chmod 600 .env.local
```

**验证**:
```bash
ls -la .env.local
# -rw------- 1 user staff 968 Jul 26 17:05 .env.local
```

---

### ✅ 2. 文件上传大小限制（高风险）

**问题**: `/api/ingest` 端点未限制上传文件大小，可能导致 DoS 攻击。

**修复**: `src/app/api/ingest/route.ts`
- 添加 50MB 文件大小限制
- 返回 HTTP 413 状态码和友好错误提示

```typescript
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json(
    { error: "文件过大，最大支持 50MB" },
    { status: 413 }
  );
}
```

---

### ✅ 3. API 速率限制（高风险）

**问题**: 所有 API 端点无速率限制，容易被滥用导致资源耗尽。

**修复**: 
1. 创建速率限制中间件 `src/lib/rateLimit.ts`
   - 基于滑动窗口算法
   - 按 IP 地址追踪请求频率
   - 自动清理过期条目防止内存泄漏

2. 为关键端点添加速率限制：
   - `/api/chat`: 每分钟 20 次请求
   - `/api/chat/stream`: 每分钟 15 次请求（流式更严格）
   - `/api/ingest`: 每 10 分钟 10 次上传

```typescript
const rateCheck = checkRateLimit(request, {
  maxRequests: 20,
  windowMs: 60000,
});
if (!rateCheck.allowed) {
  return NextResponse.json(
    { error: `请求过于频繁，请 ${rateCheck.retryAfter} 秒后重试` },
    { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
  );
}
```

**注意**: 当前实现为内存存储，适用于单实例部署。生产环境多实例部署时建议使用 Redis 等分布式存储。

---

### ✅ 4. Content Security Policy 和安全响应头（中风险）

**问题**: 缺少 CSP 和其他安全响应头，无法有效防御 XSS 和点击劫持攻击。

**修复**: `next.config.ts`

添加的安全响应头：
- **Content-Security-Policy**: 限制资源加载来源
  - `script-src 'self' 'unsafe-inline' 'unsafe-eval'` - 允许内联脚本（Next.js 需要）
  - `style-src 'self' 'unsafe-inline'` - 允许内联样式
  - `frame-ancestors 'none'` - 防止被嵌入到 iframe
- **X-Frame-Options**: DENY - 防止点击劫持
- **X-Content-Type-Options**: nosniff - 防止 MIME 类型嗅探
- **Referrer-Policy**: strict-origin-when-cross-origin - 限制 Referer 信息泄漏
- **Permissions-Policy**: 禁用不需要的浏览器功能（摄像头、麦克风、地理位置）

---

### ✅ 5. 安全注释文档（低风险）

**问题**: 使用 `dangerouslySetInnerHTML` 和 `innerHTML` 的地方缺少安全说明。

**修复**:
1. `src/components/learning/MingliFigureInjector.tsx`
   - 添加详细的安全性保障说明
   - 明确内容来源和转义机制

2. `src/components/learning/onboardingTour.ts`
   - 解释 innerHTML 仅用于静态模板
   - 说明动态内容通过 textContent 安全写入

---

## 已验证的安全实践

以下安全措施在审核中确认已正确实现：

✅ **SQL 注入防护**: Supabase 查询使用参数化（`.eq()`, `.rpc()`）  
✅ **密钥隔离**: 使用服务端 `SUPABASE_SERVICE_ROLE_KEY`，无客户端泄漏  
✅ **密钥脱敏**: API 返回时自动隐藏敏感信息（`redactProviderSettings`）  
✅ **文件类型验证**: 白名单限制（仅 `.md/.txt/.pdf`）  
✅ **HTML 转义**: Markdown 渲染前完整转义（`miniMarkdown.ts`）  
✅ **原子文件写入**: 使用临时文件 + rename 防止数据损坏  
✅ **向量维度守卫**: 防止 embedding 模型不匹配导致检索失效  

---

## 测试建议

### 1. 速率限制测试
```bash
# 测试聊天端点
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"question":"test"}' &
done
# 预期：前 20 个成功，后 5 个返回 429
```

### 2. 文件大小限制测试
```bash
# 创建 60MB 测试文件
dd if=/dev/zero of=large.txt bs=1M count=60

# 尝试上传
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@large.txt"
# 预期：返回 413 Payload Too Large
```

### 3. CSP 验证
```bash
# 检查响应头
curl -I http://localhost:3000/
# 预期：看到 Content-Security-Policy 等安全头
```

---

## 生产环境建议

### 短期（部署前必做）
- [x] 修改 `.env.local` 权限为 600
- [x] 添加文件大小限制
- [x] 实现 API 速率限制
- [x] 配置安全响应头

### 中期（1-3 个月）
- [ ] 监控速率限制触发情况，调整阈值
- [ ] 添加详细的访问日志（包括被拦截的请求）
- [ ] 实现更细粒度的错误处理（区分开发/生产环境）
- [ ] 考虑使用 Redis 实现分布式速率限制

### 长期（3-6 个月）
- [ ] 实施 Web Application Firewall (WAF)
- [ ] 添加异常检测和自动封禁机制
- [ ] 实现完整的安全审计日志
- [ ] 定期依赖扫描和更新（`npm audit`）

---

## 依赖安全

当前依赖版本（截至 2026-08-11）：
- `next`: ^15.1.6
- `@supabase/supabase-js`: ^2.49.1
- `pdfjs-dist`: ^4.10.38
- `react`: ^19.0.0

**建议**: 定期运行 `npm audit` 检查已知漏洞，及时更新补丁版本。

---

## 监控指标

建议在生产环境监控以下指标：

1. **速率限制**
   - 被拦截请求数量和 IP 分布
   - 429 错误率趋势

2. **文件上传**
   - 上传文件大小分布
   - 413 错误数量

3. **API 性能**
   - 各端点响应时间
   - 错误率（4xx/5xx）

4. **安全事件**
   - CSP 违规报告（可配置 `report-uri`）
   - 异常 IP 访问模式

---

## 联系方式

如发现新的安全问题，请通过以下方式报告：
- 创建 GitHub Security Advisory（私密报告）
- 邮件联系项目维护者

**请勿在公开 Issue 中讨论安全漏洞。**
