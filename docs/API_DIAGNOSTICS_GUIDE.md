# JuBu AI - API 诊断工具使用指南

## 概述

为了统一 API 测试和模型同步逻辑，我们提供了以下工具函数：

### 1. `diagnoseApiProvider` - 增强版 API 诊断

**位置**: `src/hooks/use-api-key-tester.ts`

**功能**:
- 测试 API Key 有效性
- 获取可用模型数量
- 提取模型能力标签（仅 MemeFast）
- 支持 MemeFast 特殊处理

**使用示例**:

```typescript
import { diagnoseApiProvider } from '@/hooks/use-api-key-tester';
import type { IProvider } from '@/lib/api-key-manager';

// 诊断单个 API Key
const result = await diagnoseApiProvider(apiKey, provider);

if (result.valid) {
  console.log(`连接成功: ${result.modelCount} 个模型`);
  console.log(`响应时间: ${result.responseTime}ms`);
} else {
  console.error(`诊断失败: ${result.message}`);
}
```

**返回值**:

```typescript
interface TestResult {
  valid: boolean;              // Key 是否有效
  message?: string;           // 诊断消息
  statusCode?: number;        // HTTP 状态码
  responseTime?: number;      // 响应时间（毫秒）
  modelCount?: number;        // 可用模型数量
}
```

### 2. `buildTestUrl` - 智能 URL 构建

**功能**:
- MemeFast: 使用 `/api/pricing_new` 端点
- 其他平台: 使用 `/v1/models` 端点

**使用示例**:

```typescript
import { buildTestUrl } from '@/hooks/use-api-key-tester';

const testUrl = buildTestUrl(provider);
console.log('测试 URL:', testUrl);
```

## 与 Model Sync 的集成

### 复用诊断逻辑

`diagnoseApiProvider` 复用了 `api-config-store.ts` 中 `syncModels` 的逻辑：

#### MemeFast 特殊处理

```typescript
// MemeFast 使用两种端点获取模型信息：
// 1. /api/pricing_new - 获取模型元数据（类型、标签、分组）
// 2. /v1/models - 获取模型 ID 列表

if (provider.platform === 'memefast') {
  // 优先使用 pricing_new
  const pricingUrl = `${baseUrl}/api/pricing_new`;
  // ... 处理模型类型和标签
}
```

#### 标准 OpenAI-compatible API

```typescript
// 其他平台使用标准 /v1/models 端点
const modelsUrl = /\/v\d+$/.test(baseUrl)
  ? `${baseUrl}/models`
  : `${baseUrl}/v1/models`;
```

## 最佳实践

### 1. 错误处理

```typescript
async function testAndSync(provider: IProvider) {
  const result = await diagnoseApiProvider(apiKey, provider);
  
  if (!result.valid) {
    // 显示错误消息
    showError(result.message);
    return;
  }
  
  // 诊断成功后同步模型
  const syncResult = await syncModels(provider);
  console.log(`同步完成: ${syncResult.count} 个模型`);
}
```

### 2. 超时处理

默认超时时间为 15 秒，可在需要时调整：

```typescript
const result = await diagnoseApiProvider(apiKey, {
  ...provider,
  // 可以添加自定义超时配置
});
```

### 3. 多 Key 测试

```typescript
const apiKeys = 'key1,key2,key3';
const keyList = apiKeys.split(',').map(k => k.trim());

for (const key of keyList) {
  const result = await diagnoseApiProvider(key, provider);
  console.log(`Key: ${maskKey(key)} - ${result.valid ? '有效' : '无效'}`);
}
```

## 诊断流程图

```
开始诊断
  ↓
构建测试 URL
  ↓
是否 MemeFast?
  ├─ 是 → 使用 /api/pricing_new
  └─ 否 → 使用 /v1/models
  ↓
发送请求
  ↓
检查响应状态
  ├─ 200 OK → 解析模型列表
  ├─ 401/403 → API Key 无效
  ├─ 429 → 请求限流
  └─ 其他 → 显示错误
  ↓
返回诊断结果
```

## 常见问题

### Q: 为什么 MemeFast 使用不同的端点？

A: MemeFast 提供了 `/api/pricing_new` 端点，可以获取更详细的模型元数据，包括模型类型、标签、分组等信息，有助于更好地分类和过滤模型。

### Q: 如何区分不同的错误类型？

A: `diagnoseApiProvider` 会返回不同的错误消息：
- `'API Key 无效或已过期'` - 401/403 错误
- `'请求过于频繁，请稍后重试'` - 429 错误
- `'CSP 阻止请求，请检查域名是否在白名单中'` - CSP 错误
- `'网络错误，请检查网络连接或 VPN/代理设置'` - 网络错误

### Q: 如何处理超时？

A: 默认 15 秒超时足够应对大多数情况。如果网络较慢，可以考虑：
1. 增加超时时间
2. 添加重试机制
3. 显示更友好的错误消息

## 维护记录

- **2025-01-19**: 初始版本
  - 添加 `diagnoseApiProvider` 函数
  - 复用 `syncModels` 的 MemeFast 特殊处理逻辑
  - 增加超时时间和错误处理
