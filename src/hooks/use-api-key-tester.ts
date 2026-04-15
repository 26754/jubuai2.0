// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * useApiKeyTester Hook
 * Provides API key testing functionality for different providers
 * 使用统一的 api-diagnostics 模块
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import type { IProvider } from '@/lib/api-key-manager';
import { diagnoseApiProvider, type ApiDiagnosticResult } from '@/lib/api-diagnostics';

/**
 * 重新导出诊断结果类型
 */
export type TestResult = ApiDiagnosticResult;

/**
 * useApiKeyTester Hook
 * Provides reactive API key testing functionality
 */
export function useApiKeyTester() {
  // 测试单个 API Key
  const testKey = useCallback(
    async (
      apiKey: string,
      provider: IProvider
    ): Promise<ApiDiagnosticResult> => {
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
          recoverable: false,
        };
      }
    },
    []
  );

  // 测试多个 API Keys
  const testKeys = useCallback(
    async (
      apiKeys: string,
      provider: IProvider
    ): Promise<ApiDiagnosticResult[]> => {
      const keyList = apiKeys
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const results: ApiDiagnosticResult[] = [];

      for (const key of keyList) {
        const result = await diagnoseApiProvider(key, provider);
        results.push(result);
      }

      const validCount = results.filter((r) => r.valid).length;
      toast.success(`测试完成: ${validCount}/${results.length} 个 Key 有效`);

      return results;
    },
    []
  );

  return {
    testKey,
    testKeys,
    testApiKey: diagnoseApiProvider,
  };
}
