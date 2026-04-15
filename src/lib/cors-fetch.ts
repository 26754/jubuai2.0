// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
/**
 * CORS-safe fetch wrapper
 * 
 * 直接调用 API，让浏览器处理 CORS
 * 支持超时控制和错误处理
 * 自动检测需要代理的域名
 */

// 默认超时时间（毫秒）
const DEFAULT_TIMEOUT = 60000; // 60秒

/** 检测是否在浏览器环境中运行 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof fetch !== 'undefined';
}

/** 需要代理的域名 */
const PROXIED_DOMAINS = [
  'memefast.top',
  'api.memefast.top',
  // 火山引擎
  'ark.cn-beijing.volces.com',
  'ark.cn-shanghai.volces.com',
  'ark.cn-guangzhou.volces.com',
  'ark.cn-hangzhou.volces.com',
  // 阿里云百炼
  'dashscope.aliyuncs.com',
  'dashscope.cn-shanghai.aliyuncs.com',
  'dashcope.cn-beijing.aliyuncs.com',
  // RunningHub
  'www.runninghub.cn',
  'openapi.runninghub.cn',
];

/** 检测 URL 是否需要代理 */
function needsProxy(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return PROXIED_DOMAINS.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/** 转换为代理 URL */
function toProxyUrl(url: string): string {
  // 在开发环境使用 Vite 代理，在生产环境使用服务端代理
  if (import.meta.env.DEV) {
    // 开发环境使用 Vite 代理路径
    return url;
  }
  // 生产环境使用服务端代理
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

/**
 * API 调用配置
 */
export interface FetchOptions extends RequestInit {
  timeout?: number;  // 超时时间（毫秒），默认 60000
  retries?: number;  // 重试次数，默认 0
  forceDirect?: boolean;  // 强制直接调用（绕过代理检测）
}

/**
 * API 调用错误
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public body?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 带超时的 fetch 封装
 */
async function fetchWithTimeout(
  url: string | URL,
  init?: RequestInit,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(`请求超时 (${timeout}ms)`);
    }
    throw error;
  }
}

/**
 * 带重试的 fetch 封装
 */
async function fetchWithRetry(
  url: string | URL,
  init?: RequestInit,
  options: FetchOptions = {}
): Promise<Response> {
  const { retries = 0, timeout = DEFAULT_TIMEOUT, ...fetchInit } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        ...fetchInit,
        // 每次重试清除 Authorization 头（避免缓存问题）
        headers: attempt > 0 
          ? { ...fetchInit.headers, 'Cache-Control': 'no-cache' }
          : fetchInit.headers,
      }, timeout);

      // 4xx 错误不重试
      if (response.status >= 400 && response.status < 500) {
        const body = await response.text().catch(() => '');
        throw new ApiError(
          `请求失败: ${response.status} ${response.statusText}`,
          response.status,
          response.statusText,
          body
        );
      }

      // 5xx 或网络错误重试
      if (response.status >= 500 || !response.ok) {
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries && !(error instanceof ApiError && error.status && error.status < 500)) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }

  throw lastError || new Error('请求失败');
}

/**
 * CORS 安全的 fetch 封装
 * 
 * 功能：
 * - 检测需要代理的域名，自动使用代理
 * - 支持超时控制
 * - 支持自动重试（可选）
 * - 统一的错误处理
 *
 * @param url    目标 URL
 * @param init   请求选项
 * @returns      Response
 */
export async function corsFetch(
  url: string | URL,
  init?: FetchOptions
): Promise<Response> {
  const { retries, timeout, forceDirect, ...fetchInit } = init || {};
  
  // 检测是否需要代理（除非强制直接调用）
  let targetUrl = url.toString();
  if (!forceDirect && needsProxy(targetUrl)) {
    targetUrl = toProxyUrl(targetUrl);
  }
  
  // 如果配置了重试，使用带重试的版本
  if (retries && retries > 0) {
    return fetchWithRetry(targetUrl, fetchInit, { timeout, retries });
  }
  
  // 否则使用带超时的版本
  return fetchWithTimeout(targetUrl, fetchInit, timeout || DEFAULT_TIMEOUT);
}

/**
 * 便捷方法：POST 请求
 */
export async function corsPost(
  url: string | URL,
  body: unknown,
  options: FetchOptions = {}
): Promise<Response> {
  return corsFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * 便捷方法：GET 请求
 */
export async function corsGet(
  url: string | URL,
  options: FetchOptions = {}
): Promise<Response> {
  return corsFetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
}

/**
 * 解析 API 错误响应
 */
export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error?.message || data.message || data.msg || data.error || `HTTP ${response.status}`;
  } catch {
    const text = await response.text();
    return text || `HTTP ${response.status} ${response.statusText}`;
  }
}
