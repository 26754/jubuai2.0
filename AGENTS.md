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
