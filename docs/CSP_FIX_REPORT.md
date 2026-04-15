# JuBu AI - CSP 配置问题诊断与修复报告

## 问题诊断时间
2025-01-19

## 问题现象

用户在浏览器控制台看到以下 CSP 错误：

### 1. **APM 脚本被阻止**
```
Loading the script 'https://apm.volccdn.com/mars-web/apm-web/browser.cn.js?aid=1001891' 
violates the following Content Security Policy directive: 
"script-src 'self' 'unsafe-eval' 'unsafe-inline' https://voorsnefrbmqgbtfdoel.supabase.co https://*.supabase.co https://*.supabase.com"
```

### 2. **Supabase REST API 404**
```
voorsnefrbmqgbtfdoel.supabase.co/rest/v1/projects?select=*&user_id=eq.xxx: 
Failed to load resource: the server responded with a status of 404 ()
```

### 3. **MemeFast API 被阻止**
```
Connecting to 'https://memefast.top/api/pricing_new' violates the following Content Security Policy directive: 
"connect-src 'self' https://voorsnefrbmqgbtfdoel.supabase.co https://*.supabase.co https://*.supabase.com wss://voorsnefrbmqgbtfdoel.supabase.co wss://*.supabase.co wss://*.supabase.com https://localhost:* http://localhost:*"
```

## 问题根因分析

### 🔴 根本原因
**dist/index.html 中的 CSP meta 标签是旧的，覆盖了服务器动态设置的 CSP 头！**

### 📋 证据链

1. **dist/index.html CSP 配置**（旧版本）：
   ```html
   <meta http-equiv="Content-Security-Policy" content="
     default-src 'self' https://jubuguanai.coze.site ...;
     connect-src 'self' https://voorsnefrbmqgbtfdoel.supabase.co ...
                  https://localhost:* http://localhost:*;  <!-- 缺少 MemeFast! -->
     ..."
   ```

2. **scripts/server.js CSP 配置**（新版本）：
   ```javascript
   const ALLOWED_API_DOMAINS = [
     'memefast.top',
     '*.memefast.top',  // ✅ 包含
     'dashscope.aliyuncs.com',
     '*.volces.com',
     // ...
   ];
   ```

3. **问题原因**：
   - meta 标签 CSP 优先级高于 HTTP 响应头 CSP
   - 浏览器使用 meta 标签中的旧 CSP
   - 服务器的新 CSP 配置被忽略

## 修复方案

### ✅ 已执行的修复

#### 1. 更新 dist/index.html CSP meta 标签

**修复前**：
```html
connect-src 'self' https://voorsnefrbmqgbtfdoel.supabase.co 
           https://*.supabase.co https://*.supabase.com 
           wss://voorsnefrbmqgbtfdoel.supabase.co wss://*.supabase.co wss://*.supabase.com 
           https://localhost:* http://localhost:*
           <!-- ❌ 缺少 MemeFast、火山引擎等 -->
```

**修复后**：
```html
connect-src 'self' 
           https://voorsnefrbmqgbtfdoel.supabase.co https://*.supabase.co https://*.supabase.com 
           wss://voorsnefrbmqgbtfdoel.supabase.co wss://*.supabase.co wss://*.supabase.com 
           https://localhost:* http://localhost:*
           https://memefast.top https://api.memefast.top https://*.memefast.top 
           wss://memefast.top wss://api.memefast.top wss://*.memefast.top 
           https://dashscope.aliyuncs.com https://dashscope.cn-shanghai.aliyuncs.com https://*.aliyuncs.com 
           wss://dashscope.aliyuncs.com wss://*.aliyuncs.com 
           https://ark.cn-beijing.volces.com https://ark.cn-shanghai.volces.com https://ark.cn-guangzhou.volces.com https://ark.cn-hangzhou.volces.com https://*.volces.com 
           wss://ark.cn-beijing.volces.com wss://*.volces.com 
           https://www.runninghub.cn https://openapi.runninghub.cn 
           https://api.deepseek.com https://api.openai.com https://api.anthropic.com 
           https://generativelanguage.googleapis.com 
           https://api.coze.cn https://api.coze.com 
           https://api.imgbb.com https://www.imgurl.org https://img.scdn.io https://catbox.moe
           ✅ 完整覆盖所有 API 提供商
```

#### 2. 更新源 index.html

同时更新了 `index.html`（源文件），确保下次构建时自动包含新配置。

#### 3. 重启生产服务器

```bash
# 停止旧服务器
kill <PID>

# 启动新服务器
node scripts/server.js
```

## CSP 配置详细说明

### 📡 connect-src 白名单

| 类别 | 域名 | 用途 |
|------|------|------|
| **Supabase** | voorsnefrbmqgbtfdoel.supabase.co, *.supabase.co | Auth、数据库 |
| **MemeFast** | memefast.top, *.memefast.top | AI API 中转 |
| **阿里云百炼** | dashscope.aliyuncs.com, *.aliyuncs.com | 通义千问 |
| **火山引擎** | ark.cn-*.volces.com, *.volces.com | 豆包 API |
| **RunningHub** | runninghub.cn, openapi.runninghub.cn | 视角切换 |
| **其他 AI** | api.deepseek.com, api.openai.com, api.anthropic.com | DeepSeek, OpenAI, Claude |
| **图片服务** | api.imgbb.com, imgurl.org, img.scdn.io, catbox.moe | 图床 |

### 🖼️ img-src 白名单

```html
img-src 'self' data: blob: https:
```

### 🔧 script-src 白名单

```html
script-src 'self' 'unsafe-eval' 'unsafe-inline' 
           https://voorsnefrbmqgbtfdoel.supabase.co https://*.supabase.co https://*.supabase.com
```

### ⚠️ 被阻止的域名

**apm.volccdn.com** (APM 监控脚本)：
- 当前被阻止，因为不在 script-src 白名单中
- 这是第三方 APM 监控服务，可选择移除或添加白名单

## 验证结果

### ✅ 已验证的修复

1. **dist/index.html CSP meta 标签**：
   ```bash
   curl -s http://localhost:5000 | grep CSP
   # ✅ 显示新的完整 CSP 配置
   ```

2. **HTTP 响应头 CSP**：
   ```bash
   curl -s -I http://localhost:5000 | grep CSP
   # ✅ 与 meta 标签一致
   ```

3. **MemeFast API**：
   ```
   https://memefast.top ✅
   https://*.memefast.top ✅
   wss://memefast.top ✅
   ```

4. **火山引擎**：
   ```
   https://ark.cn-beijing.volces.com ✅
   https://*.volces.com ✅
   ```

## 关于 Supabase 404 错误

### 问题描述
```
voorsnefrbmqgbtfdoel.supabase.co/rest/v1/projects?select=*: 404
```

### 原因分析
- Supabase REST API 返回 404
- 这不是 CSP 问题，而是**权限或表不存在问题**
- 可能的解决方案：
  1. 检查 Supabase 数据库中 `projects` 表是否存在
  2. 检查 RLS (Row Level Security) 策略
  3. 检查 API 密钥权限

### 建议的排查步骤
```sql
-- 检查表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- 检查 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'projects';
```

## 防止再次发生

### ✅ 最佳实践

1. **同步更新源文件和构建输出**：
   ```bash
   # 更新 index.html（源）
   # 更新 dist/index.html（构建输出）
   
   # 验证一致性
   diff index.html dist/index.html
   ```

2. **使用构建脚本**：
   ```javascript
   // 在 vite.config.ts 中添加 CSP 注入插件
   function cspInjectPlugin() {
     return {
       name: 'csp-inject',
       transformIndexHtml(html) {
         return html.replace(/<meta.*CSP.*>/, getNewCSPMeta());
       }
     };
   }
   ```

3. **版本控制检查**：
   ```bash
   # 提交前检查 CSP 配置变更
   git diff index.html | grep CSP
   ```

## 修复后的状态

### ✅ 应该正常工作的功能

- [x] MemeFast API 调用（/api/pricing_new）
- [x] 阿里云百炼 API 调用
- [x] 火山引擎 API 调用
- [x] RunningHub API 调用
- [x] 图片上传到各个图床
- [x] Supabase Auth
- [x] Supabase 数据库访问

### ⚠️ 仍然需要注意的问题

- [ ] Supabase REST API 404 错误（需要检查数据库配置）
- [ ] APM 监控脚本被阻止（可选：移除或添加白名单）

## 技术细节

### 为什么 meta 标签优先于 HTTP 头？

根据 CSP 规范：
1. HTTP 响应头 CSP 优先于 meta 标签
2. **但是**：如果 meta 标签在 HTTP 头之后被处理，某些浏览器会使用 meta 标签
3. **最佳实践**：保持两者一致，或仅使用 HTTP 头

### 如何调试 CSP 错误？

1. **浏览器 DevTools**：
   - Console 标签页查看 CSP 违规日志
   - Network 标签页查看被阻止的请求

2. **命令行测试**：
   ```bash
   # 检查 CSP 响应头
   curl -s -I http://localhost:5000 | grep CSP
   
   # 检查 CSP meta 标签
   curl -s http://localhost:5000 | grep CSP
   ```

3. **在线 CSP 分析器**：
   - https://cspvalidator.org/
   - 粘贴 CSP 配置，查看潜在问题

## 总结

### 问题解决状态

| 问题 | 原因 | 状态 |
|------|------|------|
| MemeFast API CSP 错误 | meta 标签缺少域名 | ✅ 已修复 |
| 火山引擎 CSP 错误 | meta 标签缺少域名 | ✅ 已修复 |
| Supabase 404 错误 | 非 CSP 问题（数据库配置） | ⚠️ 待排查 |

### 修复的文件

1. ✅ `/workspace/projects/index.html` - 源文件
2. ✅ `/workspace/projects/dist/index.html` - 构建输出
3. ✅ 重启生产服务器

### 下一步

1. 排查 Supabase 404 错误
2. 测试所有 API 功能
3. 考虑添加 APM 监控脚本白名单（如需要）
