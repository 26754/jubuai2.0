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
