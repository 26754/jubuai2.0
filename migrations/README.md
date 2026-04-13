# JuBu AI 数据库迁移

## 迁移顺序

1. **000_create_tables.sql** - 创建所有数据表
2. **001_rls_policies.sql** - 配置行级安全策略

## 运行迁移

### 使用 Supabase Dashboard

1. 访问 https://supabase.com/dashboard
2. 进入您的项目
3. 点击 "SQL Editor"
4. 按顺序复制并运行迁移文件

### 使用 Supabase CLI

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 初始化本地项目
supabase init

# 运行迁移
supabase db push
```

## 表结构

### user_projects
- `id`: UUID，主键
- `user_id`: UUID，引用 auth.users
- `name`: VARCHAR(255)，项目名称
- `description`: TEXT，项目描述
- `visual_style_id`: VARCHAR(100)，视觉风格 ID
- `metadata`: JSONB，元数据
- `created_at`: TIMESTAMPTZ，创建时间
- `updated_at`: TIMESTAMPTZ，最后更新时间

### project_data
- `id`: UUID，主键
- `project_id`: UUID，引用 user_projects
- `data_type`: VARCHAR(50)，数据类型（script/shots/characters/assets）
- `data`: JSONB，项目数据
- `version`: INT，数据版本
- `created_at`: TIMESTAMPTZ，创建时间
- `updated_at`: TIMESTAMPTZ，最后更新时间

### project_collaborators
- `id`: UUID，主键
- `project_id`: UUID，引用 user_projects
- `user_id`: UUID，引用 auth.users
- `role`: VARCHAR(20)，角色（owner/editor/viewer）
- `invited_at`: TIMESTAMPTZ，邀请时间
- `accepted_at`: TIMESTAMPTZ，接受时间

## RLS 策略

所有表都启用了行级安全策略（RLS），确保：
- 用户只能访问自己的项目
- 项目所有者可以管理协作者
- 协作者只能查看项目（根据角色权限）

## 环境变量

请在 `.env` 文件中配置：

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```
