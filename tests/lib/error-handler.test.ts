// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ErrorLevel,
  ErrorCode,
  createError,
  fromError,
  fromResponse,
  formatError,
  isAppError,
  tryCatch,
  tryCatchSync,
  createRetryHandler,
  clearErrorLogs,
  getRecentErrors,
  logError,
} from '@/lib/error-handler.tsx';

describe('error-handler', () => {
  beforeEach(() => {
    clearErrorLogs();
  });

  describe('ErrorLevel and ErrorCode', () => {
    it('should have correct ErrorLevel values', () => {
      expect(ErrorLevel.INFO).toBe('info');
      expect(ErrorLevel.WARNING).toBe('warning');
      expect(ErrorLevel.ERROR).toBe('error');
      expect(ErrorLevel.CRITICAL).toBe('critical');
    });

    it('should have correct ErrorCode values', () => {
      expect(ErrorCode.UNKNOWN).toBe('UNKNOWN');
      expect(ErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorCode.API_KEY_MISSING).toBe('API_KEY_MISSING');
    });
  });

  describe('createError', () => {
    it('should create error with default values', () => {
      const error = createError(ErrorCode.UNKNOWN);

      expect(error.code).toBe(ErrorCode.UNKNOWN);
      expect(error.level).toBe(ErrorLevel.ERROR);
      expect(error.message).toBe('发生未知错误');
      expect(error.timestamp).toBeDefined();
    });

    it('should create error with custom message', () => {
      const error = createError(ErrorCode.API_KEY_MISSING, {
        message: 'Custom API key message',
      });

      expect(error.code).toBe(ErrorCode.API_KEY_MISSING);
      expect(error.message).toBe('Custom API key message');
    });

    it('should create error with custom level', () => {
      const error = createError(ErrorCode.TIMEOUT, {
        level: ErrorLevel.WARNING,
      });

      expect(error.level).toBe(ErrorLevel.WARNING);
    });

    it('should create error with context', () => {
      const error = createError(ErrorCode.NETWORK_ERROR, {
        context: { url: '/api/test', status: 500 },
      });

      expect(error.context).toEqual({ url: '/api/test', status: 500 });
    });
  });

  describe('fromError', () => {
    it('should convert Error to AppError', () => {
      const originalError = new Error('Network failed');
      const appError = fromError(originalError);

      expect(appError.code).toBe(ErrorCode.UNKNOWN);
      expect(appError.message).toBe('Network failed');
      expect(appError.cause).toBe(originalError);
    });

    it('should use custom error code', () => {
      const originalError = new Error('Connection refused');
      const appError = fromError(originalError, ErrorCode.NETWORK_ERROR);

      expect(appError.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it('should handle non-Error values', () => {
      const appError = fromError('Something went wrong');

      expect(appError.code).toBe(ErrorCode.UNKNOWN);
      expect(appError.message).toBe('Something went wrong');
    });
  });

  describe('fromResponse', () => {
    it('should handle 400 status', () => {
      const response = new Response('Bad Request', { status: 400 });
      const error = fromResponse(response);

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.level).toBe(ErrorLevel.WARNING);
    });

    it('should handle 401 status', () => {
      const response = new Response('Unauthorized', { status: 401 });
      const error = fromResponse(response);

      expect(error.code).toBe(ErrorCode.AUTH_ERROR);
      expect(error.level).toBe(ErrorLevel.ERROR);
    });

    it('should handle 404 status', () => {
      const response = new Response('Not Found', { status: 404 });
      const error = fromResponse(response);

      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.level).toBe(ErrorLevel.INFO);
    });

    it('should handle 429 status', () => {
      const response = new Response('Too Many Requests', { status: 429 });
      const error = fromResponse(response);

      expect(error.code).toBe(ErrorCode.RATE_LIMIT);
      expect(error.level).toBe(ErrorLevel.WARNING);
    });

    it('should handle 500 status', () => {
      const response = new Response('Internal Server Error', { status: 500 });
      const error = fromResponse(response);

      expect(error.code).toBe(ErrorCode.SERVER_ERROR);
      expect(error.level).toBe(ErrorLevel.ERROR);
    });

    it('should extract error message from response body', () => {
      const body = { error: 'Invalid API key format' };
      const response = new Response(JSON.stringify(body), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
      const error = fromResponse(response, body);

      expect(error.details).toBe('Invalid API key format');
    });
  });

  describe('formatError', () => {
    it('should format AppError', () => {
      const error = createError(ErrorCode.API_KEY_MISSING);
      const message = formatError(error);

      expect(message).toContain('API Key 未配置');
    });

    it('should format Error', () => {
      const error = new Error('Test error');
      const message = formatError(error);

      expect(message).toBe('Test error');
    });

    it('should format unknown value', () => {
      const message = formatError('Unknown error string');

      expect(message).toBe('Unknown error string');
    });
  });

  describe('isAppError', () => {
    it('should return true for AppError', () => {
      const error = createError(ErrorCode.UNKNOWN);
      expect(isAppError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('test');
      expect(isAppError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isAppError(null)).toBe(false);
    });

    it('should return false for plain object', () => {
      expect(isAppError({ message: 'test' })).toBe(false);
    });
  });

  describe('tryCatch', () => {
    it('should return data on success', async () => {
      const result = await tryCatch(async () => 'success');

      expect(result.data).toBe('success');
      expect(result.error).toBeUndefined();
    });

    it('should return error on failure', async () => {
      const result = await tryCatch(async () => {
        throw new Error('Failed');
      });

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('Failed');
    });

    it('should use custom error code', async () => {
      const result = await tryCatch(async () => {
        throw new Error('Network error');
      }, ErrorCode.NETWORK_ERROR);

      expect(result.error!.code).toBe(ErrorCode.NETWORK_ERROR);
    });
  });

  describe('tryCatchSync', () => {
    it('should return data on success', () => {
      const result = tryCatchSync(() => 'success');

      expect(result.data).toBe('success');
      expect(result.error).toBeUndefined();
    });

    it('should return error on failure', () => {
      const result = tryCatchSync(() => {
        throw new Error('Sync error');
      });

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('Sync error');
    });
  });

  describe('createRetryHandler', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      const handler = createRetryHandler({ maxRetries: 2, delay: 10 });

      const result = await handler(async () => {
        attempts++;
        if (attempts < 3) throw new Error('Retry error');
        return 'success';
      });

      expect(result.data).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should return error after max retries', async () => {
      let attempts = 0;
      const handler = createRetryHandler({ maxRetries: 2, delay: 10 });

      const result = await handler(async () => {
        attempts++;
        throw new Error('Always fails');
      });

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(attempts).toBe(3); // initial + 2 retries
    });

    it('should call onRetry callback', async () => {
      let attempts = 0;
      const onRetry = (attempt: number, error: any) => {
        attempts = attempt;
      };
      const handler = createRetryHandler({ maxRetries: 1, delay: 10, onRetry });

      await handler(async () => {
        throw new Error('Test error');
      });

      expect(attempts).toBe(1);
    });
  });

  describe('logError', () => {
    it('should log error and add to recent errors', () => {
      const error = createError(ErrorCode.NETWORK_ERROR);

      logError('Network operation failed', error);

      const recentErrors = getRecentErrors();
      expect(recentErrors.length).toBeGreaterThan(0);
      expect(recentErrors[0].message).toBe('Network operation failed');
    });
  });
});
