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
│   │   │   └── SettingsPanel.tsx  # 设置面板（包含数据导出）
│   │   └── ui/                  # UI 基础组件
│   ├── lib/
│   │   ├── data-export.ts       # 数据导出/导入工具
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

## Supabase 数据库

### 表结构

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

### RLS 策略
- users can insert their own projects - 仅插入自己的项目
- users can view their own projects - 仅查看自己的项目
- users can update their own projects - 仅更新自己的项目
- users can delete their own projects - 仅删除自己的项目
- shots 表同样策略

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

# Supabase 配置
VITE_SUPABASE_URL=https://voorsnefrbmqgbtfdoel.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## 生产部署

### 构建流程
1. 运行 `pnpm build` 或 `bash scripts/build.sh`
2. 生产服务器自动启动 (`node scripts/server.js`)

### 生产服务器功能
位置: `scripts/server.js`

生产服务器同时提供：
- 静态文件服务（dist 目录）
- API 代理路由：
  - `/__proxy/memefast/*` - MemeFast API
  - `/__proxy/volcengine/*` - 火山引擎 ARK 北京
  - `/__proxy/volcengine-sh/*` - 火山引擎 ARK 上海
  - `/__proxy/volcengine-gz/*` - 火山引擎 ARK 广州
  - `/__proxy/bailian/*` - 阿里云百炼
  - `/__proxy/external/*` - 通用外部 API

### 端口配置
- 生产环境端口: 5000 (由 `DEPLOY_RUN_PORT` 环境变量控制)
- 开发环境端口: 5000 (Vite 默认)

### CSP 配置

位置: `scripts/server.js` 和 `dist/index.html`

#### 问题描述
- **问题**: CSP 阻止 Supabase 脚本执行（EvalError: call to Function() blocked by CSP）
- **影响**: 用户无法通过 Supabase Auth 登录/注册

#### 解决方案
1. **HTTP 响应头方式**（主要）：
   - 在 Express 服务器中添加 CSP 中间件
   - 设置 `Content-Security-Policy` 响应头
   - 允许 `unsafe-eval`、`unsafe-inline` 和 Supabase 域名

2. **HTML meta 标签方式**（后备）：
   - 在 `dist/index.html` 中添加 `<meta http-equiv="Content-Security-Policy">` 标签
   - 确保即使响应头未设置，浏览器也会应用 CSP

#### CSP 策略配置
```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://voorsnefrbmqgbtfdoel.supabase.co https://*.supabase.co https://*.supabase.com;
style-src 'self' 'unsafe-inline';
connect-src 'self' https://voorsnefrbmqgbtfdoel.supabase.co https://*.supabase.co https://*.supabase.com wss://*.supabase.co wss://*.supabase.com;
img-src 'self' data: blob: https:;
font-src 'self' data:;
worker-src 'self' blob:;
frame-src 'none';
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

## API 代理配置

### 问题描述
- **问题**: 剧本解析 API 调用失败（CORS 错误或网络请求失败）
- **根因**: 生产环境中 `corsFetch` 直接使用 `fetch()` 访问第三方 API，触发 CORS 错误

### 解决方案
1. **服务端添加通用 API 代理** (`scripts/server.js`):
   - 添加 `/__api_proxy` 路由，将所有第三方 API 请求通过服务端转发
   - 前端通过 `/__api_proxy?url=<encoded_url>` 调用代理

2. **前端使用代理** (`src/lib/cors-fetch.ts`):
   - 在浏览器环境（包括开发和生产）都使用代理
   - 将原始 headers 通过 `x-proxy-headers` 头传递给代理

### 代理路由清单
```
/__api_proxy/*         - 通用 API 代理（所有第三方 API）
/__proxy/memefast/*    - MemeFast API
/__proxy/volcengine/*  - 火山引擎 ARK 北京
/__proxy/volcengine-sh/* - 火山引擎 ARK 上海
/__proxy/volcengine-gz/* - 火山引擎 ARK 广州
/__proxy/bailian/*     - 阿里云百炼
/__proxy/external/*    - 通用外部 API（需指定 host）
```

### CSP 代理豁免
代理路由 (`/__proxy/*`, `/__api_proxy/*`, `/api/*`) 跳过 CSP 头设置，避免代理响应被拦截。

### 验证方法
```bash
# 测试代理是否正常工作
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"test":"hello"}' \
  'http://localhost:5000/__api_proxy?url=https%3A%2F%2Fhttpbin.org%2Fpost'
```

### 注意事项
- 代理路由必须在 CSP 中间件之前注册
- 只允许代理 http/https 协议的 URL
- 原始 headers 通过 JSON 序列化的 `x-proxy-headers` 头传递

## 云端同步问题修复

### 问题描述
- **问题**: 数据无法上传到云端，Auth 初始化未执行
- **根因**: `App.tsx` 中未调用 `useAuthStore.initialize()` 函数，导致认证状态无法恢复

### 解决方案
1. 在 `App.tsx` 中添加 Auth 初始化调用：
   ```tsx
   const { isAuthenticated, initialize } = useAuthStore();
   
   useEffect(() => {
     initialize();
   }, [initialize]);
   ```

2. 确保 RLS 策略已配置（数据库层面）

### 云端同步前提条件
1. 用户必须先登录/注册账户
2. 登录成功后 `triggerAutoSync()` 会自动执行云端同步
3. 同步逻辑：
   - 云端有数据、本地没有 → 从云端恢复
   - 本地有数据、云端没有 → 上传到云端
   - 都有数据 → 保留本地同时更新云端

## 云端同步优化

### 优化内容

1. **实时同步机制**
   - 数据变更时自动触发同步（延迟 2 秒批量处理）
   - 登录成功后立即同步所有数据

2. **定期自动同步**
   - 每 30 秒检查并同步待同步的更改
   - 可配置的同步间隔

3. **设置数据同步**
   - 新增 `user_settings` 表存储用户设置
   - 同步主题、语言、API 配置等设置
   - 新增 `cloud-settings-storage.ts` 模块

4. **重试机制**
   - 同步失败时自动重试（最多 3 次）
   - 重试间隔 5 秒

5. **同步状态 UI**
   - 新增 `SyncStatusIndicator` 组件显示同步状态
   - 支持手动触发同步
   - 显示上次同步时间、待同步数量等信息

### 新增文件
- `src/storage/database/cloud-settings-storage.ts` - 云端设置存储模块
- `src/components/SyncStatusIndicator.tsx` - 同步状态指示器组件
- `src/hooks/use-cloud-sync.ts` - 同步状态 Hook

### 数据库变更
```sql
-- 新增 user_settings 表
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  theme VARCHAR(50) DEFAULT 'dark',
  language VARCHAR(20) DEFAULT 'zh-CN',
  api_configs JSONB DEFAULT '{}',
  editor_settings JSONB DEFAULT '{}',
  sync_preferences JSONB DEFAULT '{"autoSync": true, "syncInterval": 30000}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Phase 5: 实时同步增强

### 概述
基于 Supabase Realtime 实现跨平台、跨浏览器的实时数据同步，解决传统轮询同步的延迟问题。

### 核心特性

#### 1. Supabase Realtime 实时订阅
- **WebSocket 长连接**：实时接收数据库变更通知
- **PostgreSQL LISTEN/NOTIFY**：数据库级别的事件推送
- **自动重连**：连接断开后自动尝试重连（5秒间隔）

#### 2. 乐观更新机制
- **即时反馈**：操作立即反映到 UI，无需等待网络响应
- **回滚支持**：同步失败时自动回滚到之前状态
- **防抖处理**：避免频繁的同步请求

#### 3. 冲突解决策略
- **时间戳比较**：比较本地和远程更新时间
- **本地优先**：本地更新较新时跳过远程更新
- **远程更新**：收到远程变更时自动合并

#### 4. 离线队列支持
- **离线操作缓存**：网络断开时缓存操作到本地
- **自动重试**：网络恢复后自动处理队列
- **最大重试次数**：3次，失败后丢弃并提示用户

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/storage/database/realtime-sync-manager.ts` | 实时同步管理器核心模块 |
| `src/hooks/use-realtime-sync.ts` | React Hook 封装 |
| `src/components/SyncStatusIndicator.tsx` | 同步状态指示器组件 |
| `src/components/UserCenter.tsx` | 用户中心组件（集成实时同步） |

### 核心 API

#### RealtimeSyncManager
```typescript
// 获取同步状态
const status = realtimeSyncManager.getStatus();

// 订阅状态变化
const unsubscribe = realtimeSyncManager.subscribe((status) => {
  console.log('Sync status:', status);
});

// 监听变更事件
realtimeSyncManager.onChange('projects', (event) => {
  console.log('Project changed:', event);
});

// 启动同步
realtimeSyncManager.start();

// 停止同步
realtimeSyncManager.stop();

// 乐观更新
const updateId = realtimeSyncManager.optimisticUpdate(
  'projects',
  recordId,
  previousData,
  newData
);

// 确认更新成功
realtimeSyncManager.confirmOptimisticUpdate(updateId);

// 回滚更新
const rollbackData = realtimeSyncManager.rollbackOptimisticUpdate(updateId);
```

#### useRealtimeSync Hook
```typescript
function MyComponent() {
  const {
    status,           // 同步状态
    isConnected,       // 是否已连接
    isSyncing,         // 是否正在同步
    offlineQueueCount,  // 离线队列数量
    triggerSync,       // 手动触发同步
    onChange,          // 监听变更事件
  } = useRealtimeSync({ autoStart: true });
  
  // ...
}
```

### 同步状态指示器

#### 状态类型
- `connected`: 已连接，实时同步正常
- `syncing`: 正在同步中
- `offline`: 浏览器离线
- `error`: 连接错误

#### 组件使用
```tsx
// 基础用法
<SyncStatusIndicator />

// 紧凑版
<CompactSyncStatus />

// 横幅版（重要提示）
<SyncBanner />

// 面板版（详细状态）
<SyncStatusPanel />
```

### 数据库配置

确保 Supabase 项目已启用 Realtime 功能：
1. 进入 Supabase Dashboard
2. 选择项目 → Database → Replication
3. 启用 `projects` 和 `shots` 表的复制

### 使用场景

1. **多设备同步**：在不同设备登录同一账户，数据自动同步
2. **实时协作**：多人协作时，变更即时可见
3. **离线工作**：网络断开时继续工作，恢复后自动同步
4. **即时反馈**：操作立即反映，无需等待同步完成

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
Phase 3 包含三大高级功能：AI 助手面板、项目分享系统、模板市场。这些功能位于设置面板的新增 Tab 中。

### AI 助手面板 (`AIAssistant.tsx`)

#### 功能特性
- **多模式支持**：剧本分析、角色建议、场景规划、分镜优化
- **预设助手**：专业编剧、创意头脑风暴、格式优化等预设角色
- **上下文感知**：自动获取当前项目、剧本、角色、场景上下文
- **智能建议**：基于上下文提供个性化建议
- **历史记录**：保存对话历史，支持继续对话

#### 技术实现
- 使用 `llm` Skill 进行 AI 对话
- 流式响应支持（打字机效果）
- 上下文管理（自动获取相关项目数据）
- 预设提示词系统

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
