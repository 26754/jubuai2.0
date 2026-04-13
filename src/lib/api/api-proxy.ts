// Copyright (c) 2025 JuBu AI
// API 代理工具 - 自动处理火山引擎等外部 API 的 CORS 问题

/**
 * API URL 代理转换函数
 * 将外部 API URL 转换为代理路径，避免 CORS 问题
 * 
 * 支持的域名：
 * - 火山引擎 ARK API (ark.cn-beijing.volces.com, ark.cn-shanghai.volces.com, ark.cn-guangzhou.volces.com)
 * - 其他外部 API（暂不处理）
 */
export function proxyUrl(url: string): string {
  // 火山引擎 ARK API - 北京
  if (url.includes('ark.cn-beijing.volces.com')) {
    return url.replace('https://ark.cn-beijing.volces.com', '/__proxy/volcengine');
  }
  // 火山引擎 ARK API - 上海
  if (url.includes('ark.cn-shanghai.volces.com')) {
    return url.replace('https://ark.cn-shanghai.volces.com', '/__proxy/volcengine-sh');
  }
  // 火山引擎 ARK API - 广州
  if (url.includes('ark.cn-guangzhou.volces.com')) {
    return url.replace('https://ark.cn-guangzhou.volces.com', '/__proxy/volcengine-gz');
  }
  // 其他外部 API 暂不处理
  return url;
}

/**
 * 检查 URL 是否需要代理
 */
export function needsProxy(url: string): boolean {
  return url.includes('ark.cn-beijing.volces.com') ||
         url.includes('ark.cn-shanghai.volces.com') ||
         url.includes('ark.cn-guangzhou.volces.com');
}

/**
 * 构建 API URL（自动添加 /chat/completions 后缀）
 */
export function buildApiUrl(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const proxiedUrl = proxyUrl(normalizedBaseUrl);
  return /\/v\d+$/.test(proxiedUrl)
    ? `${proxiedUrl}/chat/completions`
    : `${proxiedUrl}/v1/chat/completions`;
}

/**
 * 构建视频生成 API URL
 */
export function buildVideoApiUrl(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const proxiedUrl = proxyUrl(normalizedBaseUrl);
  return `${proxiedUrl}/volc/v1/contents/generations/tasks`;
}

/**
 * 构建图片生成 API URL
 */
export function buildImageApiUrl(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const proxiedUrl = proxyUrl(normalizedBaseUrl);
  return /\/v\d+$/.test(proxiedUrl)
    ? `${proxiedUrl}/images/generations`
    : `${proxiedUrl}/v1/images/generations`;
}
