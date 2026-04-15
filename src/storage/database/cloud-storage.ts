// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端存储模块 - 主入口
 * 使用自定义 JWT 认证提供统一的云端存储接口
 */

import { cloudAuth } from '@/lib/cloud-auth';
import { cloudProjectManager } from '@/lib/cloud-project-manager';

/**
 * 检查云端存储是否可用
 * JWT 模式下，只要有 token 就认为可用
 */
export function isCloudStorageAvailable(): boolean {
  return cloudAuth.isLoggedIn();
}

/**
 * 测试云端连接
 */
export async function testCloudConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  if (!isCloudStorageAvailable()) {
    return {
      connected: false,
      error: '未登录或会话已过期',
    };
  }

  try {
    const user = await cloudAuth.getCurrentUser();

    if (!user) {
      return {
        connected: false,
        error: '会话已过期，请重新登录',
      };
    }

    return { connected: true };
  } catch (error: any) {
    console.error('[CloudStorage] 测试连接失败:', error);
    return {
      connected: false,
      error: error.message || '连接失败',
    };
  }
}

/**
 * 导出子模块
 */
export { cloudAuth } from '@/lib/cloud-auth';
export { cloudProjectManager } from '@/lib/cloud-project-manager';
