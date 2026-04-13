# JuBu AI 云端存储系统

## 概述

使用 Supabase 实现用户项目的云端存储和同步功能。

### 核心优势

| 特性 | 说明 |
|------|------|
| 免费额度 | 每月 500MB 数据库、50GB 存储、10万月活跃用户 |
| 实时同步 | 支持多设备实时数据同步 |
| 用户认证 | 内置邮箱/社交账号认证系统 |
| 安全性 | 行级安全策略 (RLS) 保护用户数据 |
| 无后端 | 前端直连数据库，无需自建服务器 |

---

## 快速开始

### Step 1: 配置环境变量

项目已配置好 Supabase 连接：

```bash
# .env 文件
VITE_SUPABASE_URL=https://vrfzkmzqebbfwcqnvqsi.supabase.co
VITE_SUPABASE_ANON_KEY=你的 Anon Key
```

### Step 2: 创建数据库表

在 Supabase SQL Editor 中执行迁移脚本：

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 **SQL Editor**
4. 粘贴并执行 `migrations/000_create_tables.sql`

**执行结果：**
- ✅ `profiles` 表 - 存储用户资料
- ✅ `projects` 表 - 存储项目元数据
- ✅ `project_data` 表 - 存储项目详细内容（剧本、分镜等）
- ✅ RLS 安全策略 - 保护用户数据
- ✅ 自动触发器 - 记录创建/更新时间

### Step 3: 启用邮箱认证

1. 进入 **Authentication** → **Providers**
2. 启用 **Email** 提供商
3. （可选）配置自定义邮件模板

---

## 数据库表结构

### profiles 用户资料表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 用户ID（关联 auth.users） |
| email | TEXT | 邮箱地址 |
| display_name | TEXT | 显示名称 |
| avatar_url | TEXT | 头像URL |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### projects 项目表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 项目ID |
| user_id | UUID | 所属用户ID |
| name | TEXT | 项目名称 |
| description | TEXT | 项目描述 |
| visual_style_id | TEXT | 视觉风格ID |
| metadata | JSONB | 其他元数据 |
| thumbnail | TEXT | 缩略图URL |
| is_template | BOOLEAN | 是否为模板 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### project_data 项目数据表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 数据ID |
| project_id | UUID | 所属项目ID |
| data_type | TEXT | 数据类型（script/shots/characters/assets） |
| data | JSONB | 具体内容 |
| version | INTEGER | 版本号 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

---

## API 参考

### 导入

```typescript
// 从统一入口导入所有功能
import { 
  cloudAuth,           // 认证管理器
  cloudProjectManager,  // 项目管理器
  useCloudAuth,        // React Hook - 认证状态
  useCloudProjects,    // React Hook - 项目列表
} from '@/cloud-storage';
```

### 用户认证 (cloudAuth)

```typescript
// 注册新用户
const result = await cloudAuth.register(email, password, username?);

// 用户登录
const result = await cloudAuth.login(email, password);

// 用户登出
await cloudAuth.logout();

// 获取当前用户
const user = await cloudAuth.getCurrentUser();

// 监听登录状态变化
const unsubscribe = cloudAuth.onAuthStateChange((user) => {
  console.log('登录状态变化:', user);
});

// 发送密码重置邮件
await cloudAuth.resetPassword(email);

// 更新用户资料
await cloudAuth.updateProfile({ username: '新昵称' });
```

### 项目管理 (cloudProjectManager)

```typescript
// 获取用户所有项目
const projects = await cloudProjectManager.getProjects(userId);

// 创建新项目
const project = await cloudProjectManager.createProject(userId, name, visualStyleId?);

// 更新项目
await cloudProjectManager.updateProject(projectId, {
  name: '新名称',
  description: '描述',
  visualStyleId: '风格ID',
  metadata: { key: 'value' },
});

// 删除项目
await cloudProjectManager.deleteProject(projectId);

// 保存项目数据（剧本、分镜等）
await cloudProjectManager.saveProjectData(projectId, dataType, data);

// 加载项目数据
const projectData = await cloudProjectManager.loadProjectData(projectId, dataType?);
```

---

## React Hooks

### useCloudAuth - 认证状态管理

```tsx
import { useCloudAuth } from '@/cloud-storage';

function AuthComponent() {
  const { 
    user,           // CloudUser | null
    loading,        // boolean - 加载状态
    error,          // string | null - 错误信息
    isAuthenticated,// boolean - 是否已登录
    login,          // (email, password) => Promise
    register,       // (email, password, username?) => Promise
    logout,         // () => Promise
  } = useCloudAuth();

  if (loading) return <div>加载中...</div>;
  if (!isAuthenticated) return <LoginPage onLogin={login} />;
  
  return (
    <div>
      欢迎, {user?.email}
      <button onClick={logout}>登出</button>
    </div>
  );
}
```

### useCloudProjects - 项目列表管理

```tsx
import { useCloudProjects } from '@/cloud-storage';

function ProjectList({ userId }: { userId: string }) {
  const {
    projects,       // CloudProject[]
    loading,        // boolean
    error,          // string | null
    fetchProjects,  // () => Promise - 刷新列表
    createProject,  // (name, visualStyleId?) => Promise
    updateProject,  // (id, updates) => Promise
    deleteProject,  // (id) => Promise
  } = useCloudProjects(userId);

  const handleCreate = async () => {
    await createProject('新项目', 'default-style');
  };

  return (
    <div>
      <button onClick={handleCreate}>创建项目</button>
      {projects.map(p => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  );
}
```

---

## 数据类型

### CloudUser

```typescript
interface CloudUser {
  id: string;           // 用户UUID
  email: string;         // 邮箱
  username?: string;    // 用户名
  createdAt: number;     // 创建时间戳
}
```

### CloudProject

```typescript
interface CloudProject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  visualStyleId?: string;
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}
```

---

## 安全策略

### RLS 行级安全

- 用户只能查看和修改自己的资料
- 用户只能操作自己的项目
- 模板项目对所有用户可见
- 项目数据通过项目权限间接控制

### 触发器

- 新用户注册自动创建 profile
- 记录创建和更新时间

---

## 测试页面

项目包含测试页面用于验证连接：

```
/test-supabase
```

---

## 常见问题

### Q: 忘记密码怎么办？
A: 使用 `cloudAuth.resetPassword(email)` 发送重置邮件

### Q: 如何实现多设备同步？
A: 使用 `useCloudProjects` hook，自动同步项目列表

### Q: 如何导出项目数据？
A: 使用 `cloudProjectManager.loadProjectData()` 获取完整数据

### Q: 数据库迁移失败怎么办？
A: 检查 Supabase 控制台的错误信息，确保 RLS 策略不冲突
