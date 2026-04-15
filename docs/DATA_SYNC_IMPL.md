# 数据同步 API 实现总结

## 问题背景

Supabase 表（projects、shots、user_settings）无法通过 REST API 访问，因为这些表未发布到 PostgREST publication。

## 解决方案

采用 **Express API Server 直连 PostgreSQL 数据库**方案，绕过 REST API 限制。

## 实现细节

### 1. 数据库连接

- **库**: `pg` (Node.js PostgreSQL 客户端)
- **连接字符串**: 从环境变量读取
  - `PGHOST`: PostgreSQL 主机
  - `PGPORT`: 端口 (默认 5432)
  - `PGDATABASE`: 数据库名
  - `PGUSER`: 用户名
  - `PGPASSWORD`: 密码

### 2. API 端点

#### Projects API
```
GET    /api/sync/projects         - 获取所有项目
GET    /api/sync/projects/:id    - 获取单个项目
POST   /api/sync/projects         - 创建/更新项目 (upsert)
DELETE /api/sync/projects/:id     - 删除项目
```

#### Shots API
```
GET    /api/sync/shots            - 获取分镜列表
POST   /api/sync/shots            - 创建/更新分镜 (upsert)
POST   /api/sync/shots/batch      - 批量创建/更新分镜
DELETE /api/sync/shots/:id        - 删除分镜
```

#### Settings API
```
GET    /api/sync/settings         - 获取用户设置
POST   /api/sync/settings         - 创建/更新用户设置 (upsert)
```

### 3. 认证机制

所有数据同步 API 需要 `X-User-Id` 请求头进行身份验证。

```bash
curl -H "X-User-Id: <user-id>" http://localhost:3001/api/sync/projects
```

### 4. 前端集成

更新了以下模块使用新的服务端 API：
- `cloud-project-storage.ts` - 项目存储
- `cloud-settings-storage.ts` - 设置存储

## 文件变更

### 新增文件
- `server/db.ts` - 数据库连接模块

### 修改文件
- `server/api-server.ts` - 添加数据同步 API
- `scripts/server.js` - 添加数据同步 API 和数据库连接
- `vite.config.ts` - 添加 API 代理配置
- `src/storage/database/cloud-project-storage.ts` - 使用服务端 API
- `src/storage/database/cloud-settings-storage.ts` - 使用服务端 API
- `.env` - 添加数据库配置
- `AGENTS.md` - 更新文档

## 环境配置

```bash
# .env
SUPABASE_DB_PASSWORD=<your-db-password>
SUPABASE_DB_HOST=<your-db-host>
```

## 测试方法

```bash
# 1. 启动 API 服务器
cd /workspace/projects
npx tsx server/api-server.ts

# 2. 测试健康检查
curl http://localhost:3001/api/health

# 3. 测试项目 API
curl -H "X-User-Id: test-user" http://localhost:3001/api/sync/projects

# 4. 创建项目
curl -X POST -H "X-User-Id: test-user" -H "Content-Type: application/json" \
  -d '{"id":"proj-1","name":"Test"}' \
  http://localhost:3001/api/sync/projects
```

## 注意事项

1. API 服务器需要在主服务器启动前运行（端口 3001）
2. Vite 开发服务器通过代理将 `/api/sync/*` 请求转发到 API 服务器
3. 生产环境中，所有服务运行在同一个 Express 服务器中
