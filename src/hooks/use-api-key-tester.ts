// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * useApiKeyTester Hook
 * Provides API key testing functionality for different providers
 * Supports special handling for MemeFast and other providers
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
  modelCount?: number;
}

/**
 * 构建 API 测试 URL
 * MemeFast 特殊处理：优先使用 /api/pricing_new 端点
 */
function buildTestUrl(provider: IProvider): string | null {
  const baseUrl = provider.baseUrl.replace(/\/+$/, '');
  
  // MemeFast 特殊处理
  if (provider.platform === 'memefast') {
    // 优先使用 pricing_new 端点获取模型列表
    return `${baseUrl}/api/pricing_new`;
  }
  
  // 标准 OpenAI-compatible API
  if (!baseUrl.endsWith('/v1')) {
    return `${baseUrl}/v1`;
  }
  return `${baseUrl}/models`;
}

/**
 * 诊断 API 提供商（支持 MemeFast 特殊处理）
 * 复用 api-config-store.ts 中 syncModels 的逻辑
 */
export async function diagnoseApiProvider(
  apiKey: string,
  provider: IProvider
): Promise<TestResult> {
  const startTime = Date.now();
  
  // 获取测试 URL
  const testUrl = buildTestUrl(provider);
  if (!testUrl) {
    return {
      valid: false,
      message: `不支持的平台: ${provider.platform}`,
      responseTime: Date.now() - startTime,
    };
  }
  
  const key = apiKey.split(/[,\n]/)[0].trim();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 增加超时到 15 秒

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
        
        const capabilityInfo = capabilities.length > 0 
          ? ` (${capabilities.slice(0, 3).join(', ')}${capabilities.length > 3 ? '...' : ''})`
          : '';
        
        return {
          valid: true,
          message: `连接成功，${modelCount} 个模型可用${capabilityInfo}`,
          statusCode: response.status,
          responseTime,
          modelCount,
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
      // 尝试读取错误信息
      let errorMsg = `服务器错误 (HTTP ${response.status})`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error?.message || errorData.message || errorMsg;
      } catch {}
      
      return {
        valid: false,
        message: errorMsg,
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
          message: '连接超时 (15秒)，请检查网络连接',
          responseTime,
        };
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        // 区分 CSP 阻止和其他网络错误
        const isCSPError = error.message.includes('CORS') || 
                          error.message.includes('Content Security Policy') ||
                          error.message.includes('ERR_BLOCKED_BY_CLIENT');
        
        if (isCSPError) {
          return {
            valid: false,
            message: 'CSP 阻止请求，请检查域名是否在白名单中',
            responseTime,
          };
        }
        
        return {
          valid: false,
          message: '网络错误，请检查网络连接或 VPN/代理设置',
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
 * Test API key validity (Legacy - 保持向后兼容)
 * 内部调用 diagnoseApiProvider
 */
export async function testApiKey(
  apiKey: string,
  provider: IProvider
): Promise<TestResult> {
  return diagnoseApiProvider(apiKey, provider);
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
      const result = await diagnoseApiProvider(apiKey, provider);
      
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
      const result = await diagnoseApiProvider(key, provider);
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
    testApiKey: diagnoseApiProvider, // 使用增强版本
  };
}
