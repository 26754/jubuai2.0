# 项目上下文

## 技术栈

- **核心**: Vite 8, TypeScript, React 18, Express
- **UI**: Tailwind CSS 4, Radix UI
- **状态管理**: Zustand
- **测试**: Vitest, jsdom
- **存储**: Supabase, IndexedDB

## 目录结构

```
├── src/
│   ├── components/           # React 组件
│   │   ├── api-manager/      # API 管理组件
│   │   │   ├── ProviderCard.tsx      # 品牌卡片组件
│   │   │   ├── ModelList.tsx         # 模型列表组件
│   │   │   ├── UnifiedApiTestDialog.tsx  # 统一 API 测试对话框
│   │   │   ├── FeatureBindingPanel.tsx   # 功能绑定面板
│   │   │   └── index.ts              # 导出所有组件
│   │   └── ui/               # UI 基础组件
│   ├── lib/                  # 工具库
│   │   ├── error-handler.tsx  # 统一错误处理
│   │   ├── proxy-config.ts    # 代理配置
│   │   ├── api-key-manager.ts # API Key 管理
│   │   └── brand-mapping.ts   # 品牌映射
│   ├── stores/                # Zustand Store
│   │   ├── api-config-store.ts  # API 配置状态
│   │   └── director-store.ts    # 导演状态
│   └── pages/                 # 页面组件
├── tests/                     # 测试文件
│   ├── lib/                   # 工具库测试
│   │   ├── error-handler.test.ts
│   │   └── proxy-config.test.ts
│   └── components/           # 组件测试
│       └── ModelList.test.ts
├── server/                    # Express 服务端
├── package.json
├── vite.config.ts
├── vitest.config.ts           # Vitest 测试配置
└── tsconfig.json
```

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
