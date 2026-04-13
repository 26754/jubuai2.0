# JuBu AI 云端存储 - 快速开始指南

## 前置要求

- Node.js 18+
- npm 或 pnpm
- Supabase 账号

## 第一步：创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 "New Project"
3. 填写项目信息：
   - Name: `jubuai`
   - Database Region: 选择离您最近的区域
   - Pricing Plan: Free (免费额度足够个人使用)
4. 点击 "Create new project"
5. 等待项目创建完成（通常需要 2-3 分钟）

## 第二步：获取配置信息

1. 进入项目 Dashboard
2. 点击左侧菜单 "Project Settings"
3. 点击 "API"
4. 复制以下信息：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public** key: `eyJhbGc...` (以 `eyJ` 开头)

## 第三步：配置环境变量

```bash
# 在项目根目录创建 .env 文件
touch .env

# 编辑 .env 文件
```

添加以下内容：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ 重要：请将 `your-project-id` 和 `your-anon-key-here` 替换为您的实际值

## 第四步：运行数据库迁移

### 方法 1：使用 Supabase Dashboard（推荐）

1. 访问 [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. 进入您的项目
3. 点击左侧菜单 "SQL Editor"
4. 点击 "New query"
5. 复制 `migrations/000_create_tables.sql` 的内容并粘贴
6. 点击 "Run"
7. 重复步骤 4-6，运行 `migrations/001_rls_policies.sql`

### 方法 2：使用 Supabase CLI

```bash
# 1. 安装 Supabase CLI
npm install -g supabase

# 2. 登录 Supabase
supabase login

# 3. 初始化本地项目
supabase init

# 4. 链接到远程项目
supabase link --project-ref your-project-ref

# 5. 运行迁移
supabase db push
```

## 第五步：启用邮箱认证（可选）

1. 在 Supabase Dashboard 中
2. 点击左侧菜单 "Authentication"
3. 点击 "Providers"
4. 点击 "Email"
5. 启用 "Enable Email Signups"
6. （可选）配置自定义邮件模板

## 第六步：测试连接

启动开发服务器：

```bash
pnpm dev
```

访问应用，打开浏览器控制台，如果看到以下信息说明配置成功：

```
[Supabase] 环境变量已配置
```

如果看到警告：

```
[Supabase] 环境变量未配置，将使用本地存储模式
```

说明环境变量未正确配置，请检查 `.env` 文件。

## 第七步：测试功能

### 测试用户注册

1. 打开应用
2. 点击"注册"
3. 填写邮箱、密码
4. 点击"注册"按钮
5. 检查邮箱，验证账号

### 测试项目创建

1. 登录账号
2. 点击"创建项目"
3. 输入项目名称
4. 项目应该出现在项目列表中
5. 在 Supabase Dashboard -> Table Editor -> user_projects 中查看数据

## 常见问题

### Q: 迁移失败怎么办？

**A:** 检查错误信息，常见问题：

1. **权限不足**：确保使用的是项目 owner 的账号
2. **表已存在**：DROP TABLE 语句会删除旧表，确认是否需要
3. **外键约束**：确保 auth.users 表存在（Supabase 默认创建）

### Q: 认证不工作？

**A:** 检查：

1. 环境变量是否正确
2. 邮箱认证是否启用
3. 浏览器控制台是否有 CORS 错误

### Q: 数据没有同步？

**A:** 检查：

1. 用户是否已登录
2. RLS 策略是否正确配置
3. 网络连接是否正常

## 部署

### Vercel

1. 在 Vercel Dashboard 中导入项目
2. 在 "Environment Variables" 中添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. 重新部署

### Netlify

1. 在 Netlify Dashboard 中导入项目
2. 在 "Build & Deploy" -> "Environment" 中添加环境变量
3. 重新部署

## 性能优化

### 数据库索引

已创建的索引：
- `idx_user_projects_user_id` - 按用户 ID 查询
- `idx_user_projects_updated_at` - 按更新时间排序
- `idx_project_data_project_id` - 按项目 ID 查询

### 查询优化

避免全表扫描：
```sql
-- ✅ 好的做法
SELECT * FROM user_projects WHERE user_id = $1 ORDER BY updated_at DESC;

-- ❌ 避免
SELECT * FROM user_projects ORDER BY updated_at DESC;
```

### 数据分页

大量数据时使用分页：
```typescript
const { data, error } = await supabase
  .from('user_projects')
  .select('*')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false })
  .range(0, 19); // 前20条
```

## 安全检查清单

- ✅ RLS 策略已配置
- ✅ Anon Key 已配置（不要泄露 Service Role Key）
- ✅ 邮箱认证已启用
- ✅ 密码强度要求已设置
- ✅ CORS 已配置（仅允许您的域名）

## 下一步

- [完整文档](./CLOUD_STORAGE.md)
- [使用示例](./EXAMPLES.md)
- [API 参考](./API.md)

## 技术支持

- [Supabase 文档](https://supabase.com/docs)
- [Discord 社区](https://discord.gg/supabase)
- [GitHub Issues](https://github.com/26754/jubuai/issues)
