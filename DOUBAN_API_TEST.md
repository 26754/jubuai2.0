# 火山引擎豆包 API 测试指南

## 前提条件

1. **获取火山引擎 API Key**
   - 访问 [火山引擎控制台](https://console.volcengine.com/)
   - 登录或注册账号
   - 开通 ARK API 服务
   - 创建 API Key

2. **API 端点**
   - API 地址: `https://ark.cn-beijing.volces.com/api/v3/chat/completions`
   - 模型列表: `doubao-pro-32k`, `doubao-pro-128k`, `doubao-lite-32k`, `doubao-lite-128k`

## 测试方法

### 方法 1: 使用项目内置测试工具

1. 打开 JuBu AI 应用
2. 进入「设置」→「API 管理」
3. 点击「测试豆包 API」按钮
4. 输入您的 API Key
5. 选择要测试的模型
6. 点击「开始测试」

### 方法 2: 使用命令行测试

```bash
# 进入项目目录
cd /workspace/projects

# 运行测试脚本（需要您的 API Key）
node test-doubao.js <YOUR_API_KEY> doubao-pro-32k
```

示例:
```bash
node test-doubao.js sk-xxx doubao-pro-32k
```

### 方法 3: 使用 cURL 测试

```bash
curl -X POST https://ark.cn-beijing.volces.com/api/v3/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -d '{
    "model": "doubao-pro-32k",
    "messages": [
      {
        "role": "user",
        "content": "你好，请用一句话介绍一下你自己。"
      }
    ],
    "max_tokens": 100,
    "temperature": 0.7
  }'
```

## 可用模型列表

| 模型名称 | 描述 | 上下文长度 | 适用场景 |
|---------|------|-----------|---------|
| doubao-pro-32k | 豆包 Pro 32K | 32K | 通用对话、复杂任务 |
| doubao-pro-128k | 豆包 Pro 128K | 128K | 长文本处理、复杂分析 |
| doubao-lite-32k | 豆包 Lite 32K | 32K | 轻量级对话、快速响应 |
| doubao-lite-128k | 豆包 Lite 128K | 128K | 长文本对话、成本优化 |
| doubao-seedance-1-5-pro-251215 | 视频生成模型 | - | 视频创作 |

## 预期结果

### 成功响应示例
```json
{
  "id": "xxx",
  "model": "doubao-pro-32k",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "你好！我是豆包，一个由字节跳动开发的大型语言模型..."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 45,
    "total_tokens": 65
  }
}
```

### 错误响应示例

#### 401 Unauthorized (API Key 无效)
```json
{
  "error": {
    "message": "Invalid API key provided",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

#### 403 Forbidden (权限不足)
```json
{
  "error": {
    "message": "You don't have access to this model",
    "type": "invalid_request_error",
    "code": "model_not_allowed"
  }
}
```

#### 429 Rate Limited (请求过于频繁)
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded"
  }
}
```

## 常见问题

### Q1: API Key 从哪里获取？
访问火山引擎控制台 (https://console.volcengine.com/)，注册账号并开通 ARK 服务。

### Q2: 为什么测试失败？
1. 检查 API Key 是否正确
2. 确认模型名称是否正确
3. 检查账户余额是否充足
4. 确认是否已开通 ARK API 服务

### Q3: 如何查看 API 调用记录？
登录火山引擎控制台，在 ARK 服务页面查看使用统计。

### Q4: 模型响应慢怎么办？
- 选择 `doubao-lite` 系列模型，响应更快
- 减少 `max_tokens` 参数值
- 检查网络连接

## 相关代码

项目中的测试实现位于:
- 测试工具: `src/lib/ai/doubao-tester.ts`
- 测试对话框: `src/components/api-manager/DoubaoTestDialog.tsx`
- 命令行测试脚本: `test-doubao.js`
