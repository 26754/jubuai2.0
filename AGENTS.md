# JuBu AI - 项目上下文

## 项目概述

- **项目名称**: JuBu AI - AI 驱动的动漫/短剧分镜创作工具
- **部署域名**: https://jubuguanai.coze.site
- **Supabase 项目**: https://voorsnefrbmqgbtfdoel.supabase.co

## 技术栈

- **核心**: Vite 8, TypeScript, React 18, Express
- **UI**: Tailwind CSS 4, Radix UI
- **状态管理**: Zustand
- **测试**: Vitest, jsdom
- **存储**: Supabase (云端), IndexedDB (本地)

## 目录结构

```
├── src/
│   ├── components/
│   │   ├── api-manager/         # API 管理组件
│   │   │   ├── ProviderCard.tsx
│   │   │   ├── ModelList.tsx
│   │   │   ├── UnifiedApiTestDialog.tsx
│   │   │   ├── FeatureBindingPanel.tsx
│   │   │   └── index.ts
│   │   ├── auth/                # 认证组件
│   │   │   └── AuthPage.tsx    # 登录/注册页面
│   │   ├── panels/              # 面板组件
│   │   │   └── SettingsPanel.tsx  # 设置面板（包含用户中心、API管理、AI助手、项目分享、模板市场、高级选项）
│   │   │   └── cloud-sync/       # 云端同步组件
│   │   │       ├── CloudSyncSettingsPanel.tsx  # 新版同步设置面板
│   │   │       ├── CloudSyncStatus.tsx         # 同步状态组件
│   │   │       └── CloudSyncTab.tsx             # 旧版同步面板
│   │   └── ui/                  # UI 基础组件
│   ├── lib/
│   │   ├── cloud-sync-engine.ts      # 新版云端同步引擎
│   │   ├── cloud-auth.ts              # 云端认证模块
│   │   ├── smart-sync-service.ts      # 旧版智能同步服务
│   │   ├── error-handler.tsx
│   │   ├── proxy-config.ts
│   │   ├── api-key-manager.ts
│   │   └── brand-mapping.ts
│   ├── stores/
│   │   ├── auth-store.ts        # 认证状态管理
│   │   ├── project-store.ts     # 项目状态管理
│   │   ├── script-store.ts      # 剧本状态管理
│   │   ├── character-library-store.ts
│   │   ├── scene-store.ts
│   │   ├── director-store.ts
│   │   └── api-config-store.ts
│   └── hooks/
│       ├── use-cloud-sync.ts        # 旧版云同步 Hook
│       └── use-cloud-sync-v2.ts     # 新版云同步 Hook
│   └── storage/
│       └── database/
│           ├── supabase-client.ts     # Supabase 客户端
│           ├── cloud-storage.ts       # 云端存储
│           └── cloud-sync-manager.ts   # 云端同步管理
├── server/                      # Express API 服务
├── dist/                        # 生产构建输出
├── .env                         # 环境变量
└── scripts/
    ├── build.sh                 # 构建脚本
    └── server.js                # 生产服务器（静态文件 + API 代理）

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 测试规范

使用 Vitest 进行单元测试。
- 运行所有测试：`pnpm test`
- 运行测试（单次）：`pnpm test:run`
- 运行测试（覆盖率）：`pnpm test:coverage`

## 开发规范

- 使用 Tailwind CSS 进行样式开发
- 遵循组件拆分原则：ProviderCard、ModelList 等可复用组件应独立封装
- 错误处理统一使用 `src/lib/error-handler.tsx` 模块
- API 代理配置统一使用 `src/lib/proxy-config.ts` 模块

## Neon PostgreSQL 数据库

> **重要变更**: 已从 Supabase 迁移到 Neon PostgreSQL + JWT 认证

### 表结构

#### users 表 (新增)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 用户ID |
| email | varchar | 用户邮箱 |
| password_hash | varchar | 密码哈希 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

#### projects 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar | 项目ID |
| user_id | varchar | 用户ID |
| name | varchar | 项目名称 |
| script_data | jsonb | 剧本数据 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

#### shots 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar | 分镜ID |
| user_id | varchar | 用户ID |
| project_id | varchar | 项目ID |
| episode_id | varchar | 集ID |
| scene_id | varchar | 场景ID |
| index_data | jsonb | 索引数据 |
| content | jsonb | 内容数据 |
| camera | jsonb | 镜头数据 |
| status | varchar | 状态 |

#### user_settings 表 (新增)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 设置ID |
| user_id | varchar | 用户ID |
| theme | varchar | 主题 |
| language | varchar | 语言 |
| api_configs | jsonb | API配置 |
| editor_settings | jsonb | 编辑器设置 |
| sync_preferences | jsonb | 同步偏好 |

### 认证方式
- **JWT Token**: 用户登录成功后获取 7 天有效的 JWT Token
- **认证头**: `Authorization: Bearer <token>`
- **密码加密**: 使用 bcryptjs 加密存储

### 数据库初始化
```bash
# 初始化 Neon 数据库表结构
node scripts/init-neon-db.js
```

## 数据导出功能

位置: `src/lib/data-export.ts`

### 功能
- `exportAllData()` - 导出所有本地数据
- `downloadDataAsFile()` - 下载为 JSON 文件
- `importDataFromFile()` - 从文件导入数据
- `applyImportedData()` - 应用导入的数据

### 界面入口
- 设置面板 → 数据备份与恢复 → 导出本地数据/导入备份文件

## 环境变量配置

位置: `.env`

### 必需的环境变量
```bash
# 站点域名
VITE_SITE_URL=https://jubuguanai.coze.site

# ============================================
# Neon PostgreSQL 数据库 (云端数据存储)
# ============================================
NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# ============================================
# JWT 认证密钥
# ============================================
JWT_SECRET=your-jwt-secret-key
```

## 生产部署

### 构建流程
1. 运行 `pnpm build` 或 `bash scripts/build.sh`
2. 生产服务器自动启动 (`node scripts/server.js`)

### 生产服务器功能
位置: `scripts/server.js`

生产服务器同时提供：
- 静态文件服务（dist 目录）
- **JWT 认证 API**
  - `POST /api/auth/register` - 用户注册
  - `POST /api/auth/login` - 用户登录
  - `GET /api/auth/me` - 获取当前用户信息
  - `POST /api/auth/update-password` - 更新密码
- **数据同步 API**（通过直连 Neon PostgreSQL）
  - `/api/sync/projects` - 项目 CRUD
  - `/api/sync/shots` - 分镜 CRUD
  - `/api/sync/settings` - 用户设置 CRUD

### 端口配置
- 生产环境端口: 5000 (由 `DEPLOY_RUN_PORT` 环境变量控制)
- 开发环境端口: 5000 (Vite 默认)

### CSP 配置

位置: `scripts/server.js`

#### CSP 策略配置
```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
connect-src 'self' https://memefast.top https://dashscope.aliyuncs.com https://ark.cn-beijing.volces.com ...;
img-src 'self' data: blob: https:;
frame-src 'none';
worker-src 'self' blob:;
```

#### 验证方法
```bash
curl -I http://localhost:5000 | grep Content-Security-Policy
```
应返回 CSP 响应头。

#### 注意事项
- **生产环境必须使用自定义服务器**：`node scripts/server.js`，不能使用简单的静态文件服务器
- 确保 Vite dev 服务器已停止，否则 5000 端口会被占用
- 修改 `dist/index.html` 后需要重新构建或手动更新文件

## API 调用配置

### 变更说明
- **已移除**: 所有第三方 API 代理路由
- **新方案**: 浏览器直接调用第三方 API（通过 CSP 白名单）

### CSP 配置（scripts/server.js）
生产服务器 CSP 允许以下域名直接访问：
```
connect-src: memefast.top, dashscope.aliyuncs.com, ark.cn-beijing.volces.com, ...
```

### 前端 API 调用
浏览器直接使用 `fetch()` 调用第三方 API，无需代理：
- MemeFast API: `https://api.memefast.top/*`
- 阿里云百炼: `https://dashscope.aliyuncs.com/*`
- 火山引擎: `https://ark.cn-beijing.volces.com/*`

### Vite 开发代理配置
开发环境中，数据同步 API 通过 Vite 代理到 API 服务器：
```typescript
// vite.config.ts
proxy: {
  '/api/sync': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
}
```

## 云端同步 - 新版架构

### 技术方案

新版云端同步采用模块化架构，提供更强的灵活性和可扩展性。

#### 核心模块

1. **CloudSyncEngine** (`src/lib/cloud-sync-engine.ts`)
   - 模块化同步引擎，支持选择性同步
   - 离线队列管理
   - 冲突检测与解决
   - 自动同步定时器
   - 实时状态通知

2. **CloudSyncSettingsPanel** (`src/components/panels/cloud-sync/CloudSyncSettingsPanel.tsx`)
   - 同步概览面板
   - 选择性同步开关（项目/角色/场景/设置）
   - 冲突管理界面
   - 详细同步日志
   - WiFi 仅同步选项

3. **use-cloud-sync-v2** (`src/hooks/use-cloud-sync-v2.ts`)
   - React Hooks 集成
   - 状态订阅机制
   - 便捷的数据变更触发同步

### 同步设置

```typescript
interface CloudSyncSettings {
  enabled: boolean;           // 启用云端同步
  autoSync: boolean;          // 自动同步
  syncOnStartup: boolean;     // 启动时同步
  syncOnChange: boolean;      // 变更时同步

  syncProjects: boolean;      // 同步项目
  syncCharacters: boolean;    // 同步角色
  syncScenes: boolean;        // 同步场景
  syncSettings: boolean;      // 同步设置

  wifiOnly: boolean;          // 仅 WiFi 同步
  syncInterval: number;       // 同步间隔（毫秒）
  maxRetries: number;        // 最大重试次数
  compression: boolean;       // 数据压缩

  notifyOnSync: boolean;      // 同步完成通知
  notifyOnConflict: boolean;  // 冲突提醒
  notifyOnError: boolean;     // 错误通知
}
```

### 使用示例

```typescript
import { cloudSyncEngine } from '@/lib/cloud-sync-engine';
import { useCloudSyncV2 } from '@/hooks/use-cloud-sync-v2';

// 使用 Hook
function MyComponent() {
  const { isSyncing, status, sync, updateSettings } = useCloudSyncV2();

  // 手动同步
  const handleSync = async () => {
    await sync();
  };

  // 更新设置
  const handleToggleSync = () => {
    updateSettings({ autoSync: !autoSync });
  };
}

// 在数据变更时触发同步
import { useSyncOnChange } from '@/hooks/use-cloud-sync-v2';

function ProjectEditor() {
  // 数据变更时自动同步项目
  useSyncOnChange('projects', projectData);

  return <Editor />;
}
```

### 冲突解决

```typescript
import { cloudSyncEngine } from '@/lib/cloud-sync-engine';

// 解决单个冲突
cloudSyncEngine.resolveConflict(conflictId, 'local');  // 使用本地版本
cloudSyncEngine.resolveConflict(conflictId, 'cloud'); // 使用云端版本
cloudSyncEngine.resolveConflict(conflictId, 'merge', mergedData); // 使用合并版本

// 一键解决所有冲突
cloudSyncEngine.resolveAllConflicts('local'); // 全部使用本地
cloudSyncEngine.resolveAllConflicts('cloud'); // 全部使用云端
```

### API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/sync/projects` | GET/POST | 项目同步 |
| `/api/sync/characters` | GET/POST | 角色同步 |
| `/api/sync/scenes` | GET/POST | 场景同步 |
| `/api/sync/settings` | GET/POST | 设置同步 |

所有端点需要 JWT Token 认证。

---

## 云端同步 - Neon PostgreSQL（旧版）

### 技术方案

1. **服务端直连 Neon PostgreSQL**:
   - 使用 `pg` 库直接连接 Neon PostgreSQL 数据库
   - 支持 SSL 连接
   - 支持完整的 CRUD 操作

2. **JWT 认证 API**:
   - `POST /api/auth/register` - 用户注册
   - `POST /api/auth/login` - 用户登录
   - `GET /api/auth/me` - 获取当前用户信息
   - `POST /api/auth/update-password` - 更新密码

3. **数据同步 API**:
   - `/api/sync/projects` - 项目 CRUD
   - `/api/sync/shots` - 分镜 CRUD
   - `/api/sync/settings` - 用户设置 CRUD
   - 所有 API 需要 JWT Token 认证

4. **前端云存储模块**:
   - `cloud-project-storage.ts` 使用服务端 API
   - `cloud-settings-storage.ts` 使用服务端 API

4. **认证流程**:
   - 用户通过 Supabase Auth 登录获取用户 ID
   - 将用户 ID 作为 `X-User-Id` 头传递给服务端 API
   - 服务端使用用户 ID 进行 RLS 策略验证

### 开发环境配置
开发环境中，数据同步 API 和认证 API 都通过 Express 服务器直接访问：
```bash
# 启动生产服务器（端口 5000，包含静态文件服务和 API）
node scripts/server.js
```

### 前端认证模块
位置: `src/lib/cloud-auth.ts`

```typescript
// 使用示例
import { cloudAuth } from '@/lib/cloud-auth';

// 登录
const result = await cloudAuth.login(email, password);
if (result.success) {
  console.log('用户:', result.user);
  console.log('Token:', result.token);
}

// 获取当前用户
const user = await cloudAuth.getCurrentUser();

// 获取认证头
const headers = cloudAuth.getAuthHeader();
// { Authorization: 'Bearer <token>' }
```

### 测试认证 API
```bash
# 用户注册
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}' \
  http://localhost:5000/api/auth/register

# 用户登录
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}' \
  http://localhost:5000/api/auth/login

# 获取用户信息（需要 JWT Token）
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/auth/me

# 测试数据同步 API（需要 JWT Token）
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/sync/projects

# 创建项目
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"id":"proj-1","name":"Test Project","script_data":{}}' \
  http://localhost:5000/api/sync/projects
```

## 视觉风格锁定功能

### 功能说明
当用户在剧本模块中设置视觉风格后，可以锁定角色生成和分镜生成面板的视觉风格跟随剧本自动调整。

### 使用方式
1. 在剧本模块设置视觉风格
2. 在角色生成或分镜生成面板中点击「锁定」按钮 (🔒)
3. 锁定后，视觉风格选择器将被禁用，自动跟随剧本风格
4. 当剧本模块的视觉风格改变时，锁定的面板会自动同步更新

### 技术实现
- 状态存储在 `project-store.ts` 的 `visualStyleLocked` 字段
- 角色生成面板 (`characters/generation-panel.tsx`) 监听项目视觉风格变化
- 分镜生成面板 (`scenes/generation-panel.tsx`) 监听项目视觉风格变化
- 当项目视觉风格变化且锁定状态为 true 时，自动同步本地 `styleId` 状态

## Phase 3: 高级功能

### 概述
Phase 3 包含三大高级功能：AI 助手面板、项目分享系统、模板市场。这些功能已集成到设置面板的 Tab 中，可通过以下入口访问：
- AI 助手：设置面板 → 「AI 助手」Tab
- 项目分享：设置面板 → 「项目分享」Tab
- 模板市场：设置面板 → 「模板市场」Tab

### AI 助手面板 (`AIAssistant.tsx`)

#### 功能特性
- **多模式支持**：剧本分析、角色建议、场景规划、分镜优化
- **预设助手**：专业编剧、创意头脑风暴、格式优化等预设角色
- **上下文感知**：自动获取当前项目、剧本、角色、场景上下文
- **智能建议**：基于上下文提供个性化建议
- **历史记录**：保存对话历史，支持继续对话

#### 技术实现
- 使用 `coze-coding-dev-sdk` 的 `LLMClient` 进行 AI 对话
- 流式响应支持（打字机效果，SSE 协议）
- 上下文管理（自动获取相关项目数据）
- 预设提示词系统
- 后端 API 端点: `POST /api/ai/assistant`
- 默认使用模型: `doubao-seed-2-0-pro-260215`

#### API 端点
```bash
POST /api/ai/assistant
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "mode": "chat",  // chat | script | character | scene | storyboard
  "model": "doubao-seed-2-0-pro-260215",
  "temperature": 0.7
}
```

#### 响应格式（SSE 流式）
```
data: {"content":"你","done":false}
data: {"content":"好","done":false}
...
data: {"done":true,"fullContent":"..."}
```

#### 使用方式
1. 在设置面板中点击「AI 助手」Tab
2. 选择助手模式（剧本/角色/场景/分镜）
3. 选择或自定义预设助手
4. 输入问题或指令
5. AI 将基于当前上下文提供建议

### 项目分享系统 (`ShareManager.tsx`)

#### 功能特性
- **分享链接创建**：一键生成分享链接
- **权限控制**：只读/可编辑权限
- **链接有效期**：可设置过期时间（1小时/24小时/7天/永久）
- **访问限制**：可选访问次数限制
- **密码保护**：可选设置访问密码
- **预设模板**：快速预览/审核协作/协作编辑/公开发布
- **链接管理**：查看/撤销/恢复/删除分享链接
- **访问统计**：查看访问次数、过期时间等

#### 技术实现
- 本地存储分享链接数据
- Token 生成机制
- 过期时间自动判断
- 访问次数统计

#### 预设分享模板
```typescript
const SHARE_PRESETS = [
  { id: 'quick-view', name: '快速预览', permission: 'view', expiresIn: 24 * 60 * 60 * 1000 },
  { id: 'review', name: '审核协作', permission: 'view', expiresIn: 7 * 24 * 60 * 60 * 1000 },
  { id: 'collaboration', name: '协作编辑', permission: 'edit', expiresIn: null },
  { id: 'public', name: '公开发布', permission: 'view', expiresIn: null },
];
```

#### 使用方式
1. 在设置面板中点击「分享」Tab
2. 点击「创建分享链接」
3. 选择预设模板或自定义设置
4. 复制生成的链接进行分享

### 模板市场 (`TemplateMarketplace.tsx`)

#### 功能特性
- **内置模板**：动漫系列、短剧、商业广告、教育内容、角色模板、场景模板、风格预设
- **模板分类**：动漫/短剧/商业/教育/社交/自定义
- **模板类型**：项目/剧本/角色/场景/工作流/风格
- **模板搜索**：支持按名称、描述、标签搜索
- **模板排序**：热门/最新/评分最高/下载最多
- **收藏功能**：收藏喜欢的模板
- **模板导入/导出**：支持 `.jubutemplate` 格式文件
- **我的模板**：创建和管理自定义模板
- **模板使用**：一键应用模板到当前项目

#### 内置模板
```typescript
const BUILT_IN_TEMPLATES = [
  { id: 'anime-series', name: '动漫系列模板', type: 'project', category: 'anime' },
  { id: 'short-drama', name: '短剧模板', type: 'project', category: 'drama' },
  { id: 'commercial-ad', name: '商业广告模板', type: 'project', category: 'commercial' },
  { id: 'educational-content', name: '教育内容模板', type: 'project', category: 'education' },
  { id: 'cyberpunk-style', name: '赛博朋克风格', type: 'style', category: 'anime' },
  { id: 'watercolor-anime', name: '水彩动漫风格', type: 'style', category: 'anime' },
  { id: 'character-archetype-hero', name: '英雄主角模板', type: 'character', category: 'anime' },
  { id: 'scene-fantasy-city', name: '幻想城市场景', type: 'scene', category: 'anime' },
];
```

#### 使用方式
1. 在设置面板中点击「模板」Tab
2. 浏览内置模板或搜索
3. 点击「使用」应用模板到当前项目
4. 也可点击「收藏」保存喜欢的模板
5. 支持导入/导出自定义模板

### 新增组件清单

| 组件 | 路径 | 说明 |
|------|------|------|
| AIAssistant | `src/components/AIAssistant.tsx` | AI 助手面板主组件 |
| ShareManager | `src/components/ShareManager.tsx` | 项目分享系统（包含多个子组件） |
| TemplateMarketplace | `src/components/TemplateMarketplace.tsx` | 模板市场主组件 |

### 共享 Hooks

| Hook | 说明 |
|------|------|
| `useShareLinks` | 分享链接管理 Hook，支持创建、更新、删除、撤销分享链接 |
| `useTemplateStore` | 模板存储 Hook，支持创建、更新、删除、收藏、搜索模板 |

### 存储键值
- `jubuai-share-links-{projectId}`: 项目分享链接数据
- `jubuai-templates`: 用户自定义模板数据
- `jubuai-template-favorites`: 收藏的模板 ID 列表

## Phase 4: 增强功能

### 概述
Phase 4 包含三大增强功能：智能标签系统、跨模块搜索、项目统计面板。

### 智能标签系统 (`TagManager.tsx`)

#### 功能特性
- **自动标签建议**：基于内容分析自动推荐标签
- **多维度分类**：题材、风格、氛围、角色、主题、自定义
- **标签管理**：创建、编辑、删除、收藏标签
- **同义词支持**：标签的同义词关联
- **使用统计**：记录标签使用次数
- **预设标签**：内置常用标签（动作、喜剧、爱情等）

#### 技术实现
- 预设标签系统 + 用户自定义标签
- 本地存储标签数据
- 智能推荐算法（关键词匹配）

#### 使用方式
1. 在剧本/角色/场景模块中点击「添加标签」
2. 输入关键词搜索或选择预设标签
3. 系统会自动推荐相关标签
4. 支持创建自定义标签

### 跨模块搜索 (`GlobalSearch.tsx`)

#### 功能特性
- **全局搜索**：搜索项目、剧本、角色、场景、素材
- **高级搜索语法**：
  - `type:project` - 按类型筛选
  - `tag:动作` - 按标签筛选
  - `-关键词` - 排除关键词
  - 多关键词组合
- **搜索历史**：保存最近搜索记录
- **快捷键支持**：⌘K 快速打开
- **结果高亮**：显示匹配字段和文本片段
- **相关性排序**：按相关度排序搜索结果

#### 技术实现
- 解析式搜索语法
- 防抖搜索优化
- 本地存储搜索历史
- 支持多种排序方式

#### 使用方式
1. 按 ⌘K 或点击搜索按钮打开搜索面板
2. 输入关键词或使用搜索语法
3. 选择搜索范围（项目/剧本/角色/场景/素材）
4. 点击结果跳转到对应内容

### 项目统计面板 (`ProjectStats.tsx`)

#### 功能特性
- **总览视图**：
  - 关键指标卡片（项目数、字数、图片数、分镜数）
  - 完成进度环
  - 内容分布饼图
  - 效率指标
  - 活动趋势图
  - 热门标签
- **角色统计**：按出场次数排序的角色列表
- **场景统计**：各场景的分镜和时长分布
- **时间线视图**：项目内容的创建趋势
- **导出功能**：支持 JSON/CSV 格式导出

#### 技术实现
- 集成来自多个 store 的统计数据
- 多种图表组件（BarChart、ProgressRing）
- 数据导出功能

#### 使用方式
1. 在设置面板或导航栏中点击「统计」
2. 切换不同视图查看详细数据
3. 选择时间范围筛选数据
4. 可导出统计报告

### 新增组件清单

| 组件 | 路径 | 说明 |
|------|------|------|
| TagManager | `src/components/TagManager.tsx` | 智能标签管理系统 |
| GlobalSearch | `src/components/GlobalSearch.tsx` | 全局搜索系统 |
| ProjectStats | `src/components/ProjectStats.tsx` | 项目统计面板 |

### 新增存储键值
- `jubuai-tags`: 用户自定义标签数据
- `jubuai-tags-favorites`: 收藏的标签 ID 列表
- `jubuai-search-history`: 搜索历史记录

## Phase 5: 场景与剧本优化

### 场景多视角优化 (`SceneViewpointOptimizer`)

#### 功能特性
- **AI 自动分析**：分析场景内容，推荐最佳视角数量（3-6个）
- **智能命名建议**：提供中文/英文视角名称建议
- **网格布局优化**：自动计算最佳网格布局（2x2、2x3、3x3）
- **视角预览**：实时预览视角在网格中的位置
- **置信度评估**：每个建议都有置信度评分
- **场景类型识别**：自动识别教室、客厅、办公室等场景类型

#### 技术实现
- 位置: `src/lib/script/scene-viewpoint-analyzer.ts`
- 组件: `src/components/panels/scenes/scene-viewpoint-optimizer.tsx`
- 支持多种预设视角模板（全景、广角、中景、特写等）
- AI 分析失败时自动回退到默认配置

#### 使用方式
1. 在场景面板中点击「多视角优化」按钮
2. AI 自动分析场景内容
3. 查看推荐的视角列表和网格预览
4. 选择要应用的视角
5. 点击「应用建议」确认

### 剧本导入增强 (`ScriptImportDialog`)

#### 功能特性
- **多格式支持**：
  - Markdown（# 标题、**加粗**、对话格式）
  - Fountain（专业 screenplay 格式）
  - JSON（结构化数据）
  - Final Draft XML（专业剧本软件格式）
- **自动格式检测**：智能识别导入内容格式
- **角色自动提取**：从内容中自动识别角色
- **场景智能解析**：自动分割场景并提取元数据
- **导入预览**：预览导入结果和统计信息

#### 技术实现
- 主导入器: `src/lib/script/script-import.ts`
- Markdown 解析器: `src/lib/script/markdown-parser.ts`
- Fountain 解析器: `src/lib/script/fountain-parser.ts`
- 导入对话框: `src/components/dialogs/script-import-dialog.tsx`

#### 使用方式
1. 在剧本模块点击「导入」按钮
2. 选择粘贴内容或上传文件
3. 选择格式（自动检测或手动指定）
4. 点击「预览」查看导入结果
5. 确认无误后点击「确认导入」

#### 支持的格式详情

**Markdown 格式**:
```markdown
# 第一集：相遇

## 第一场：咖啡馆

**咖啡馆内，白天**

小明坐在角落。

**小明**：今天天气真好。
```

**Fountain 格式**:
```fountain
Title: 第一集
Author: 作者名

---

INT. 咖啡馆 - 白天

小明坐在角落。

小明
今天天气真好。
```

**JSON 格式**:
```json
{
  "title": "第一集",
  "scenes": [
    {
      "name": "第一场",
      "location": "咖啡馆",
      "time": "白天",
      "content": [
        { "type": "action", "content": "小明坐在角落" },
        { "type": "dialogue", "character": "小明", "content": "你好" }
      ]
    }
  ]
}
```
