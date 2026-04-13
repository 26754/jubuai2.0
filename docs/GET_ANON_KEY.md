# 获取正确的 Supabase Anon Key

## 问题说明

你之前提供的 Key 格式：
```
sb_publishable_kyDj3jWo2wWibe6aA5Bk4A_nmOSfCcv
```

这看起来是 **Storage Bucket 的 Publishable Key**，不是 **API 的 Anon Key**。

## 如何获取正确的 Anon Key

### Step 1: 访问 Supabase Dashboard

登录 https://supabase.com/dashboard

### Step 2: 选择你的项目

点击项目 `vrfzkmzqebbfwcqnvqsi`

### Step 3: 进入 Settings

在左侧菜单中找到 **Settings**（齿轮图标）

### Step 4: 进入 API 设置

点击 **API**

### Step 5: 复制 Anon Key

在 **Project API keys** 部分，找到 **anon public**：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  (这是一长串 JWT token)
```

这就是正确的 Anon Key，格式应该是：
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyZnpmcGtxZWJiYmZ3Y3FudnFzaSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNj...
```

## 更新 .env 文件

获取正确的 Key 后，更新 `.env` 文件：

```bash
# Supabase 配置
VITE_SUPABASE_URL=https://vrfzkmzqebbfwcqnvqsi.supabase.co
VITE_SUPABASE_ANON_KEY=这里粘贴完整的 JWT token
```

然后重新构建：
```bash
pnpm build
```

## 验证 Key 是否正确

在浏览器控制台测试：

```javascript
const { data, error } = await supabase.auth.getSession()
console.log(data, error)
```

如果返回 `{ data: { session: null }, error: null }`，说明 Key 正确。
