// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端存储模块 - 主入口
 * 提供统一的云端存储接口
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase-client';

// 导出子模块
export * from './cloud-project-storage';

/**
 * 检查云端存储是否可用
 */
export function isCloudStorageAvailable(): boolean {
  return isSupabaseConfigured();
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
      error: 'Supabase 未配置',
    };
  }
  
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('health_check').select('id').limit(1);
    
    if (error) {
      return {
        connected: false,
        error: error.message,
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
