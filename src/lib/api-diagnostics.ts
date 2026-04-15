// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * API 诊断工具 - 统一 API 测试和模型同步逻辑
 * 解决 useApiKeyTester 和 api-config-store 中的功能冗余问题
 */

import type { IProvider } from './api-key-manager';
import { corsFetch } from './cors-fetch';

// ==================== 类型定义 ====================

/**
 * API 错误类型枚举
 */
export enum ApiErrorType {
  TIMEOUT = 'TIMEOUT',
  INVALID_KEY = 'INVALID_KEY',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK = 'NETWORK',
  CSP = 'CSP',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * API 诊断结果
 */
export interface ApiDiagnosticResult {
  valid: boolean;
  message: string;
  statusCode?: number;
  responseTime?: number;
  modelCount?: number;
  capabilities?: string[];
  errorType?: ApiErrorType;
  recoverable: boolean;
}

/**
 * API 诊断配置
 */
export interface ApiDiagnosticConfig {
  timeout: number;
  retries: number;
  endpoints: {
    memefast: string;
    standard: string;
  };
}

// ==================== 常量 ====================

/**
 * 默认配置
 */
export const DEFAULT_DIAGNOSTIC_CONFIG: ApiDiagnosticConfig = {
  timeout: 15000,
  retries: 0,
  endpoints: {
    memefast: '/api/pricing_new',
    standard: '/v1/models',
  },
};

// ==================== 工具函数 ====================

/**
 * 构建 API 测试 URL
 */
function buildTestUrl(
  provider: IProvider,
  config: Partial<ApiDiagnosticConfig> = {}
): string | null {
  const baseUrl = provider.baseUrl?.replace(/\/+$/, '');
  if (!baseUrl) return null;

  const { endpoints } = { ...DEFAULT_DIAGNOSTIC_CONFIG, ...config };

  // MemeFast 特殊处理
  if (provider.platform === 'memefast') {
    return `${baseUrl}${endpoints.memefast}`;
  }

  // 标准 OpenAI-compatible API
  if (!baseUrl.endsWith('/v1')) {
    return `${baseUrl}/v1`;
  }
  return `${baseUrl}/models`;
}

/**
 * 解析 API 错误类型
 */
function parseErrorType(error: Error, statusCode?: number): ApiErrorType {
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return ApiErrorType.TIMEOUT;
  }

  if (statusCode === 401 || statusCode === 403) {
    return ApiErrorType.INVALID_KEY;
  }

  if (statusCode === 429) {
    return ApiErrorType.RATE_LIMIT;
  }

  if (
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError')
  ) {
    if (
      error.message.includes('CORS') ||
      error.message.includes('Content Security Policy') ||
      error.message.includes('ERR_BLOCKED_BY_CLIENT')
    ) {
      return ApiErrorType.CSP;
    }
    return ApiErrorType.NETWORK;
  }

  if (statusCode && statusCode >= 500) {
    return ApiErrorType.SERVER_ERROR;
  }

  return ApiErrorType.UNKNOWN;
}

/**
 * 生成用户友好的错误消息
 */
function getErrorMessage(errorType: ApiErrorType): string {
  switch (errorType) {
    case ApiErrorType.TIMEOUT:
      return '连接超时 (15秒)，请检查网络连接';
    case ApiErrorType.INVALID_KEY:
      return 'API Key 无效或已过期';
    case ApiErrorType.RATE_LIMIT:
      return '请求过于频繁，请稍后重试';
    case ApiErrorType.NETWORK:
      return '网络错误，请检查网络连接或 VPN/代理设置';
    case ApiErrorType.CSP:
      return 'CSP 阻止请求，请检查域名是否在白名单中';
    case ApiErrorType.SERVER_ERROR:
      return '服务器错误，请稍后重试';
    default:
      return '未知错误，请稍后重试';
  }
}

// ==================== 核心函数 ====================

/**
 * 诊断 API 提供商连接状态
 * 统一的 API 诊断函数，用于 useApiKeyTester 和 api-config-store
 */
export async function diagnoseApiProvider(
  apiKey: string,
  provider: IProvider,
  config: Partial<ApiDiagnosticConfig> = {}
): Promise<ApiDiagnosticResult> {
  const startTime = Date.now();
  const { timeout } = { ...DEFAULT_DIAGNOSTIC_CONFIG, ...config };

  // 获取测试 URL
  const testUrl = buildTestUrl(provider, config);
  if (!testUrl) {
    return {
      valid: false,
      message: `不支持的平台: ${provider.platform}`,
      recoverable: false,
    };
  }

  const key = apiKey.split(/[,\n]/)[0].trim();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await corsFetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      // 解析响应获取模型数量
      try {
        const data = await response.json();
        let modelCount = 0;
        let capabilities: string[] = [];

        if (provider.platform === 'memefast') {
          // MemeFast 特殊解析
          const arr = data.data || data;
          if (Array.isArray(arr)) {
            modelCount = arr.length;
            // 提取能力标签
            const tagSet = new Set<string>();
            for (const m of arr) {
              if (m.model_tags && Array.isArray(m.model_tags)) {
                m.model_tags.forEach((t: string) => tagSet.add(t));
              }
            }
            capabilities = Array.from(tagSet);
          }
        } else {
          // 标准 OpenAI-compatible API
          const arr = data.data || data;
          modelCount = Array.isArray(arr) ? arr.length : 0;
        }

        const capabilityInfo =
          capabilities.length > 0
            ? ` (${capabilities.slice(0, 3).join(', ')}${
                capabilities.length > 3 ? '...' : ''
              })`
            : '';

        return {
          valid: true,
          message: `连接成功，${modelCount} 个模型可用${capabilityInfo}`,
          statusCode: response.status,
          responseTime,
          modelCount,
          capabilities,
          recoverable: true,
        };
      } catch {
        return {
          valid: true,
          message: `连接成功 (${response.status})`,
          statusCode: response.status,
          responseTime,
          recoverable: true,
        };
      }
    } else {
      // 错误响应
      const errorType = parseErrorType(new Error(), response.status);
      let errorMsg = getErrorMessage(errorType);

      // 尝试读取错误信息
      try {
        const errorData = await response.json();
        errorMsg = errorData.error?.message || errorData.message || errorMsg;
      } catch {}

      return {
        valid: false,
        message: errorMsg,
        statusCode: response.status,
        responseTime,
        errorType,
        recoverable: errorType === ApiErrorType.RATE_LIMIT,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));
    const errorType = parseErrorType(err);

    return {
      valid: false,
      message: getErrorMessage(errorType),
      responseTime,
      errorType,
      recoverable: errorType !== ApiErrorType.INVALID_KEY,
    };
  }
}

/**
 * 测试 API Key（兼容旧接口）
 */
export async function testApiKey(
  apiKey: string,
  provider: IProvider
): Promise<ApiDiagnosticResult> {
  return diagnoseApiProvider(apiKey, provider);
}

// ==================== 日志工具 ====================

/**
 * 统一日志格式
 */
export function logApiDiagnostic(
  action: string,
  provider: IProvider,
  result: ApiDiagnosticResult
): void {
  const { valid, message, responseTime, modelCount } = result;
  const emoji = valid ? '✅' : '❌';
  const timeInfo = responseTime ? ` (${responseTime}ms)` : '';
  const modelInfo = modelCount !== undefined ? ` [${modelCount} models]` : '';

  console.log(
    `[API Diagnostics] ${emoji} ${provider.platform} - ${action}${timeInfo}${modelInfo}: ${message}`
  );
}
