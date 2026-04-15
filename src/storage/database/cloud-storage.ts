// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端存储模块 - 主入口
 * 使用自定义 JWT 认证提供统一的云端存储接口
 */

import { cloudAuth } from '@/lib/cloud-auth';

// 导出子模块
export * from './cloud-project-storage';
export * from './cloud-settings-storage';

// 导出别名函数（用于兼容）
export {
  createCloudProject as syncProjectToCloud,
  getCloudProject as restoreProjectFromCloud,
} from './cloud-project-storage';

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
  } catch (err: any) {
    return {
      connected: false,
      error: err.message || '未知错误',
    };
  }
}
