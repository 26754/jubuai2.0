// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * 统一错误处理模块
 * 提供标准化的错误类型定义、错误创建和错误格式化
 */

import type { ReactNode } from 'react';
import { AlertCircle, Info, AlertTriangle, XCircle } from 'lucide-react';

// ==================== 错误类型定义 ====================

export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum ErrorCode {
  // 通用错误
  UNKNOWN = 'UNKNOWN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',

  // API 特定错误
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  API_MODEL_NOT_FOUND = 'API_MODEL_NOT_FOUND',
  API_PROVIDER_UNAVAILABLE = 'API_PROVIDER_UNAVAILABLE',

  // 文件操作错误
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_TYPE_UNSUPPORTED = 'FILE_TYPE_UNSUPPORTED',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',

  // 存储错误
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_READ_ERROR = 'STORAGE_READ_ERROR',
  STORAGE_WRITE_ERROR = 'STORAGE_WRITE_ERROR',
}

export interface AppError {
  code: ErrorCode;
  level: ErrorLevel;
  message: string;
  details?: string;
  cause?: Error;
  context?: Record<string, unknown>;
  timestamp: number;
}

export interface ErrorDisplayConfig {
  icon: ReactNode;
  className: string;
  title: string;
}

// ==================== 错误级别映射 ====================

export const ERROR_LEVEL_CONFIG: Record<ErrorLevel, ErrorDisplayConfig> = {
  [ErrorLevel.INFO]: {
    icon: <Info className="h-4 w-4" />,
    className: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300',
    title: '提示',
  },
  [ErrorLevel.WARNING]: {
    icon: <AlertTriangle className="h-4 w-4" />,
    className: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
    title: '警告',
  },
  [ErrorLevel.ERROR]: {
    icon: <AlertCircle className="h-4 w-4" />,
    className: 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300',
    title: '错误',
  },
  [ErrorLevel.CRITICAL]: {
    icon: <XCircle className="h-4 w-4" />,
    className: 'bg-destructive/15 border-destructive/40 text-destructive dark:text-destructive',
    title: '严重错误',
  },
};

// ==================== 错误码映射 ====================

export const ERROR_CODE_CONFIG: Record<ErrorCode, { defaultMessage: string; level: ErrorLevel }> = {
  [ErrorCode.UNKNOWN]: { defaultMessage: '发生未知错误', level: ErrorLevel.ERROR },
  [ErrorCode.NETWORK_ERROR]: { defaultMessage: '网络连接失败，请检查网络', level: ErrorLevel.ERROR },
  [ErrorCode.TIMEOUT]: { defaultMessage: '请求超时，请稍后重试', level: ErrorLevel.WARNING },
  [ErrorCode.PARSE_ERROR]: { defaultMessage: '数据解析失败', level: ErrorLevel.ERROR },
  [ErrorCode.VALIDATION_ERROR]: { defaultMessage: '数据验证失败', level: ErrorLevel.WARNING },
  [ErrorCode.AUTH_ERROR]: { defaultMessage: '认证失败，请重新登录', level: ErrorLevel.ERROR },
  [ErrorCode.PERMISSION_DENIED]: { defaultMessage: '权限不足', level: ErrorLevel.ERROR },
  [ErrorCode.NOT_FOUND]: { defaultMessage: '请求的资源不存在', level: ErrorLevel.INFO },
  [ErrorCode.RATE_LIMIT]: { defaultMessage: '请求过于频繁，请稍后重试', level: ErrorLevel.WARNING },
  [ErrorCode.SERVER_ERROR]: { defaultMessage: '服务器错误，请稍后重试', level: ErrorLevel.ERROR },
  [ErrorCode.API_KEY_MISSING]: { defaultMessage: 'API Key 未配置', level: ErrorLevel.WARNING },
  [ErrorCode.API_KEY_INVALID]: { defaultMessage: 'API Key 无效', level: ErrorLevel.ERROR },
  [ErrorCode.API_QUOTA_EXCEEDED]: { defaultMessage: 'API 配额已用尽', level: ErrorLevel.WARNING },
  [ErrorCode.API_MODEL_NOT_FOUND]: { defaultMessage: '模型不存在', level: ErrorLevel.WARNING },
  [ErrorCode.API_PROVIDER_UNAVAILABLE]: { defaultMessage: '服务提供商不可用', level: ErrorLevel.ERROR },
  [ErrorCode.FILE_TOO_LARGE]: { defaultMessage: '文件过大', level: ErrorLevel.WARNING },
  [ErrorCode.FILE_TYPE_UNSUPPORTED]: { defaultMessage: '不支持的文件类型', level: ErrorLevel.WARNING },
  [ErrorCode.FILE_UPLOAD_FAILED]: { defaultMessage: '文件上传失败', level: ErrorLevel.ERROR },
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: { defaultMessage: '存储空间不足', level: ErrorLevel.WARNING },
  [ErrorCode.STORAGE_READ_ERROR]: { defaultMessage: '读取存储失败', level: ErrorLevel.ERROR },
  [ErrorCode.STORAGE_WRITE_ERROR]: { defaultMessage: '写入存储失败', level: ErrorLevel.ERROR },
};

// ==================== 错误创建函数 ====================

/**
 * 创建标准化应用错误
 */
export function createError(
  code: ErrorCode,
  overrides?: Partial<Omit<AppError, 'code' | 'timestamp'>>
): AppError {
  const config = ERROR_CODE_CONFIG[code];
  return {
    code,
    level: overrides?.level ?? config.level,
    message: overrides?.message ?? config.defaultMessage,
    details: overrides?.details,
    cause: overrides?.cause,
    context: overrides?.context,
    timestamp: Date.now(),
  };
}

/**
 * 从原始 Error 创建 AppError
 */
export function fromError(error: unknown, code: ErrorCode = ErrorCode.UNKNOWN): AppError {
  if (error instanceof Error) {
    const config = ERROR_CODE_CONFIG[code];
    return createError(code, {
      message: error.message || config.defaultMessage,
      cause: error,
    });
  }
  return createError(code, {
    message: String(error),
  });
}

/**
 * 从 HTTP 响应创建 AppError
 */
export function fromResponse(response: Response, body?: unknown): AppError {
  const status = response.status;
  let code: ErrorCode;
  let message: string;

  switch (status) {
    case 400:
      code = ErrorCode.VALIDATION_ERROR;
      message = '请求参数无效';
      break;
    case 401:
      code = ErrorCode.AUTH_ERROR;
      message = '认证失败，请检查 API Key';
      break;
    case 403:
      code = ErrorCode.PERMISSION_DENIED;
      message = '权限不足';
      break;
    case 404:
      code = ErrorCode.NOT_FOUND;
      message = '请求的资源不存在';
      break;
    case 429:
      code = ErrorCode.RATE_LIMIT;
      message = '请求过于频繁，请稍后重试';
      break;
    case 500:
    case 502:
    case 503:
      code = ErrorCode.SERVER_ERROR;
      message = '服务器错误，请稍后重试';
      break;
    default:
      code = ErrorCode.UNKNOWN;
      message = `请求失败 (${status})`;
  }

  // 尝试从响应体中提取错误信息
  let details: string | undefined;
  if (body && typeof body === 'object') {
    const errorBody = body as Record<string, unknown>;
    if (errorBody.error) {
      details = String(errorBody.error);
    } else if (errorBody.message) {
      details = String(errorBody.message);
    }
  }

  return createError(code, { message, details });
}

// ==================== 错误格式化函数 ====================

/**
 * 格式化错误为用户友好的消息
 */
export function formatError(error: AppError | Error | unknown): string {
  if (isAppError(error)) {
    let msg = error.message;
    if (error.details) {
      msg += error.details;
    }
    return msg;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * 获取错误的堆栈信息
 */
export function getErrorStack(error: AppError | Error | unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  if (isAppError(error) && error.cause instanceof Error) {
    return error.cause.stack;
  }
  return undefined;
}

/**
 * 检查是否为 AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'level' in error &&
    'message' in error &&
    'timestamp' in error
  );
}

// ==================== 错误处理工具 ====================

/**
 * 安全执行异步函数，捕获错误并返回
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorCode: ErrorCode = ErrorCode.UNKNOWN
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await fn();
    return { data };
  } catch (err) {
    return { error: fromError(err, errorCode) };
  }
}

/**
 * 安全执行同步函数，捕获错误并返回
 */
export function tryCatchSync<T>(
  fn: () => T,
  errorCode: ErrorCode = ErrorCode.UNKNOWN
): { data?: T; error?: AppError } {
  try {
    const data = fn();
    return { data };
  } catch (err) {
    return { error: fromError(err, errorCode) };
  }
}

/**
 * 重试装饰器工厂
 */
export function createRetryHandler(
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
    onRetry?: (attempt: number, error: AppError) => void;
  } = {}
) {
  const { maxRetries = 3, delay = 1000, backoff = true, onRetry } = options;

  return async function retry<T>(
    fn: () => Promise<T>,
    errorCode: ErrorCode = ErrorCode.UNKNOWN
  ): Promise<{ data?: T; error?: AppError }> {
    let lastError: AppError | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await tryCatch(fn, errorCode);

      if (result.data !== undefined) {
        return result;
      }

      lastError = result.error!;

      // 如果已经达到最大重试次数
      if (attempt >= maxRetries) {
        break;
      }

      // 通知重试回调
      onRetry?.(attempt + 1, lastError);

      // 等待后重试（使用指数退避）
      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    return { error: lastError };
  };
}

// ==================== 错误日志 ====================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  error?: AppError | Error;
  context?: Record<string, unknown>;
  timestamp: number;
}

const LOG_ENTRIES: LogEntry[] = [];
const MAX_LOG_ENTRIES = 100;

/**
 * 记录错误日志
 */
export function logError(
  message: string,
  error?: AppError | Error | unknown,
  context?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    level: 'error',
    message,
    error: isAppError(error) ? error : error instanceof Error ? fromError(error) : undefined,
    context,
    timestamp: Date.now(),
  };

  LOG_ENTRIES.push(entry);

  // 保持日志数量限制
  if (LOG_ENTRIES.length > MAX_LOG_ENTRIES) {
    LOG_ENTRIES.shift();
  }

  // 输出到控制台
  if (entry.error) {
    console.error(`[ERROR] ${message}`, entry.error, context);
  } else {
    console.error(`[ERROR] ${message}`, context);
  }
}

/**
 * 记录信息日志
 */
export function logInfo(message: string, context?: Record<string, unknown>): void {
  console.info(`[INFO] ${message}`, context);
}

/**
 * 记录警告日志
 */
export function logWarn(message: string, context?: Record<string, unknown>): void {
  console.warn(`[WARN] ${message}`, context);
}

/**
 * 记录调试日志
 */
export function logDebug(message: string, context?: Record<string, unknown>): void {
  console.debug(`[DEBUG] ${message}`, context);
}

/**
 * 获取最近的错误日志
 */
export function getRecentErrors(count: number = 10): LogEntry[] {
  return LOG_ENTRIES.filter((e) => e.level === 'error').slice(-count);
}

/**
 * 清除错误日志
 */
export function clearErrorLogs(): void {
  LOG_ENTRIES.length = 0;
}

// ==================== 导出 ====================

export default {
  ErrorLevel,
  ErrorCode,
  createError,
  fromError,
  fromResponse,
  formatError,
  getErrorStack,
  isAppError,
  tryCatch,
  tryCatchSync,
  createRetryHandler,
  logError,
  logInfo,
  logWarn,
  logDebug,
  getRecentErrors,
  clearErrorLogs,
  ERROR_LEVEL_CONFIG,
  ERROR_CODE_CONFIG,
};
