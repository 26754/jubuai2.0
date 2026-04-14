// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 同步状态 Hook
 * 提供组件级别的同步状态订阅
 */

import { useState, useEffect, useCallback } from 'react';
import { cloudSyncManager, SyncStatus } from '@/storage/database/cloud-sync-manager';

/**
 * 订阅云端同步状态
 */
export function useCloudSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(cloudSyncManager.getStatus());
  
  useEffect(() => {
    const unsubscribe = cloudSyncManager.subscribe(setStatus);
    return unsubscribe;
  }, []);
  
  return status;
}

/**
 * 手动触发同步的 Hook
 */
export function useCloudSync() {
  const status = useCloudSyncStatus();
  
  const syncNow = useCallback(async () => {
    await cloudSyncManager.manualSync();
  }, []);
  
  const markPending = useCallback(() => {
    cloudSyncManager.markPendingChange();
  }, []);
  
  return {
    ...status,
    syncNow,
    markPending,
    canSync: cloudSyncManager.canSync(),
  };
}

/**
 * 格式化同步时间为友好显示
 */
export function formatSyncTime(timestamp: number | null): string {
  if (!timestamp) return '从未同步';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${Math.floor(diff / 86400000)} 天前`;
}
