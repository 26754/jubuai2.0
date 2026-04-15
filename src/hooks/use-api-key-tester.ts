// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * useApiKeyTester Hook
 * Provides API key testing functionality for different providers
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import type { IProvider } from '@/lib/api-key-manager';
import { corsFetch } from '@/lib/cors-fetch';

interface TestResult {
  valid: boolean;
  message?: string;
  statusCode?: number;
  responseTime?: number;
}

/**
 * Test API key validity by calling the provider's /v1/models endpoint
 */
export async function testApiKey(
  apiKey: string,
  provider: IProvider
): Promise<TestResult> {
  const startTime = Date.now();
  
  // 构建测试 URL
  let testUrl = provider.baseUrl.replace(/\/+$/, '');
  if (!testUrl.endsWith('/v1')) {
    testUrl = `${testUrl}/v1`;
  }
  testUrl = `${testUrl}/models`;
  
  try {
    // 使用 corsFetch 避免 CORS
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await corsFetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.split(/[,\n]/)[0].trim()}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      // 尝试解析响应获取模型列表
      try {
        const data = await response.json();
        const modelCount = data.data?.length || 0;
        return {
          valid: true,
          message: `连接成功，${modelCount} 个模型可用`,
          statusCode: response.status,
          responseTime,
        };
      } catch {
        return {
          valid: true,
          message: `连接成功 (${response.status})`,
          statusCode: response.status,
          responseTime,
        };
      }
    } else if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        message: 'API Key 无效或已过期',
        statusCode: response.status,
        responseTime,
      };
    } else if (response.status === 429) {
      return {
        valid: false,
        message: '请求过于频繁，请稍后重试',
        statusCode: response.status,
        responseTime,
      };
    } else {
      return {
        valid: false,
        message: `服务器错误 (HTTP ${response.status})`,
        statusCode: response.status,
        responseTime,
      };
    }
  } catch (error: unknown) {
    const responseTime = Date.now() - startTime;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          valid: false,
          message: '连接超时 (10秒)',
          responseTime,
        };
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return {
          valid: false,
          message: '网络错误，请检查网络连接',
          responseTime,
        };
      }
      
      return {
        valid: false,
        message: error.message,
        responseTime,
      };
    }
    
    return {
      valid: false,
      message: '未知错误',
      responseTime,
    };
  }
}

/**
 * useApiKeyTester Hook
 * Provides reactive API key testing functionality
 */
export function useApiKeyTester() {
  // 测试单个 API Key
  const testKey = useCallback(async (
    apiKey: string,
    provider: IProvider
  ): Promise<TestResult> => {
    try {
      const result = await testApiKey(apiKey, provider);
      
      if (result.valid) {
        toast.success(result.message || 'API Key 有效');
      } else {
        toast.error(result.message || 'API Key 无效');
      }
      
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : '测试失败';
      toast.error(message);
      return {
        valid: false,
        message,
      };
    }
  }, []);

  // 测试多个 API Keys
  const testKeys = useCallback(async (
    apiKeys: string,
    provider: IProvider
  ): Promise<TestResult[]> => {
    const keyList = apiKeys
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    
    const results: TestResult[] = [];
    
    for (const key of keyList) {
      const result = await testApiKey(key, provider);
      results.push(result);
    }
    
    const validCount = results.filter(r => r.valid).length;
    toast.success(
      `测试完成: ${validCount}/${results.length} 个 Key 有效`
    );
    
    return results;
  }, []);

  return {
    testKey,
    testKeys,
    testApiKey,
  };
}
