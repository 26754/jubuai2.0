# JuBu AI 云端存储文档

## 概述

JuBu AI 使用 Supabase 实现用户项目的云端存储和同步。

## 功能特性

- ✅ 用户认证（注册/登录/登出）
- ✅ 项目云端存储
- ✅ 项目数据同步
- ✅ 离线支持
- ✅ 多设备同步
- ✅ 团队协作（计划中）

## 快速开始

### 1. 配置 Supabase

1. 访问 [Supabase](https://supabase.com) 注册账号
2. 创建新项目
3. 复制项目 URL 和 Anon Key

### 2. 配置环境变量

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑 .env 文件，填入您的 Supabase 配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 运行数据库迁移

```bash
# 方法1：使用 Supabase Dashboard
# 1. 访问 https://supabase.com/dashboard
# 2. 进入 SQL Editor
# 3. 依次运行 migrations/000_create_tables.sql
# 4. 依次运行 migrations/001_rls_policies.sql

# 方法2：使用 Supabase CLI
supabase db push
```

### 4. 启用邮箱认证（可选）

1. 在 Supabase Dashboard 中，访问 "Authentication" > "Providers"
2. 启用 "Email" 提供商
3. 配置邮件设置（可使用 Supabase 提供的测试邮件）

## 使用指南

### 用户认证

```typescript
import { cloudAuth } from '@/lib/cloud-auth';

// 注册
const result = await cloudAuth.register('user@example.com', 'password123', '用户名');

// 登录
const loginResult = await cloudAuth.login('user@example.com', 'password123');

// 登出
await cloudAuth.logout();

// 监听登录状态
const unsubscribe = cloudAuth.onAuthStateChange((user) => {
  if (user) {
    console.log('用户已登录:', user);
  } else {
    console.log('用户已登出');
  }
});

// 获取当前用户
const currentUser = await cloudAuth.getCurrentUser();
```

### 项目管理

```typescript
import { cloudProjectManager } from '@/lib/cloud-project-manager';

// 获取用户所有项目
const projects = await cloudProjectManager.getProjects(userId);

// 创建新项目
const newProject = await cloudProjectManager.createProject(
  userId,
  '我的新项目',
  'visual_style_id'
);

// 更新项目
await cloudProjectManager.updateProject(projectId, {
  name: '更新后的项目名',
});

// 删除项目
await cloudProjectManager.deleteProject(projectId);
```

### 项目数据

```typescript
// 保存剧本数据
await cloudProjectManager.saveProjectData(projectId, 'script', {
  title: '剧本标题',
  content: '剧本内容...',
  scenes: [...],
});

// 保存分镜数据
await cloudProjectManager.saveProjectData(projectId, 'shots', {
  shots: [...],
});

// 加载项目所有数据
const allData = await cloudProjectManager.loadProjectData(projectId);

// 加载特定类型数据
const scriptData = await cloudProjectManager.loadProjectData(projectId, 'script');
```

### 混合存储策略

项目支持本地和云端混合存储：

```typescript
// 本地优先，云端备份
async function saveProject(project) {
  // 1. 先保存到本地
  localStorage.setItem(`project_${project.id}`, JSON.stringify(project));
  
  // 2. 后台同步到云端
  try {
    await cloudProjectManager.updateProject(project.id, project);
  } catch (error) {
    console.error('云端同步失败:', error);
  }
}

// 加载项目（优先云端，降级本地）
async function loadProject(projectId) {
  try {
    // 1. 尝试从云端加载
    const cloudData = await cloudProjectManager.loadProjectData(projectId);
    return cloudData;
  } catch (error) {
    // 2. 云端失败，从本地加载
    const localData = localStorage.getItem(`project_${projectId}`);
    return localData ? JSON.parse(localData) : null;
  }
}
```

## 数据类型

项目数据支持以下类型：

- `script` - 剧本数据
- `shots` - 分镜数据
- `characters` - 角色数据
- `assets` - 资产数据
- `settings` - 设置数据

## 安全

### 行级安全策略（RLS）

所有数据表都启用了行级安全策略：
- 用户只能访问自己的项目
- 未认证用户无法访问任何数据
- 项目数据与项目权限绑定

### 认证

使用 Supabase Auth 进行用户认证：
- 邮箱/密码认证
- 邮箱验证（可选）
- 密码重置（可选）

## 费用

### Supabase 免费额度

- 月活跃用户：500
- 数据库存储：500MB
- 传输流量：2GB/月
- 认证邮件：50封/天

### 超出免费额度

按实际使用量计费，详见 [Supabase 定价](https://supabase.com/pricing)。

## 故障排除

### 问题：登录失败

**可能原因**：
1. 邮箱或密码错误
2. 邮箱未验证
3. Supabase 配置错误

**解决方案**：
1. 检查邮箱和密码是否正确
2. 检查是否收到验证邮件
3. 确认 `.env` 文件配置正确

### 问题：无法保存项目

**可能原因**：
1. 网络连接问题
2. 超出存储配额
3. RLS 策略阻止

**解决方案**：
1. 检查网络连接
2. 检查 Supabase 存储配额
3. 确认用户已正确认证

### 问题：数据不同步

**可能原因**：
1. 多设备同时编辑
2. 网络延迟
3. 本地数据过期

**解决方案**：
1. 实现冲突检测和解决机制
2. 增加同步间隔
3. 提供手动刷新功能

## API 参考

### cloudAuth

```typescript
class CloudAuthManager {
  register(email: string, password: string, username?: string): Promise<AuthResult>
  login(email: string, password: string): Promise<AuthResult>
  logout(): Promise<void>
  getCurrentUser(): Promise<CloudUser | null>
  onAuthStateChange(callback: (user: CloudUser | null) => void): () => void
  resetPassword(email: string): Promise<{ success: boolean; error?: string }>
  updateProfile(data: { username?: string }): Promise<{ success: boolean; error?: string }>
}
```

### cloudProjectManager

```typescript
class CloudProjectManager {
  getProjects(userId: string): Promise<CloudProject[]>
  createProject(userId: string, name: string, visualStyleId?: string): Promise<CloudProject>
  updateProject(projectId: string, updates: Partial<CloudProject>): Promise<void>
  deleteProject(projectId: string): Promise<void>
  saveProjectData(projectId: string, dataType: string, data: any): Promise<void>
  loadProjectData(projectId: string, dataType?: string): Promise<ProjectData[]>
}
```

## 许可证

本项目使用 AGPL-3.0 许可证。
