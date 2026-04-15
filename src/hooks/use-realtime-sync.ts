// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 实时同步 Hook
 * 提供 React 组件中使用的同步状态和方法
 */

import { useEffect, useState, useCallback } from 'react';
import { realtimeSyncManager, type RealtimeSyncStatus, type SyncEvent, type SyncEventType } from '@/storage/database/realtime-sync-manager';
import { useAuthStore } from '@/stores/auth-store';

// ==================== Hook 类型定义 ====================

export interface UseRealtimeSyncOptions {
  /** 是否在挂载时自动启动 */
  autoStart?: boolean;
  /** 离线时是否显示提示 */
  showOfflineToast?: boolean;
}

export interface UseRealtimeSyncReturn {
  /** 同步状态 */
  status: RealtimeSyncStatus;
  /** 是否已连接 */
  isConnected: boolean;
  /** 是否正在同步 */
  isSyncing: boolean;
  /** 待处理的离线操作数量 */
  offlineQueueCount: number;
  /** 手动触发同步 */
  triggerSync: () => Promise<void>;
  /** 监听变更事件 */
  onChange: (type: SyncEventType, callback: (event: SyncEvent) => void) => () => void;
}

// ==================== Hook 实现 ====================

/**
 * 使用实时同步功能
 */
export function useRealtimeSync(options: UseRealtimeSyncOptions = {}): UseRealtimeSyncReturn {
  const { autoStart = true, showOfflineToast = true } = options;
  
  const { isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<RealtimeSyncStatus>(realtimeSyncManager.getStatus());
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // 订阅状态变化
  useEffect(() => {
    const unsubscribe = realtimeSyncManager.subscribe((newStatus) => {
      setStatus(newStatus);
      setOfflineQueueCount(realtimeSyncManager.getOfflineQueueCount());
    });

    return unsubscribe;
  }, []);

  // 设置网络监听
  useEffect(() => {
    realtimeSyncManager.setupNetworkListener();
  }, []);

  // 自动启动/停止
  useEffect(() => {
    if (autoStart && isAuthenticated) {
      realtimeSyncManager.start();
    } else {
      realtimeSyncManager.stop();
    }

    return () => {
      realtimeSyncManager.stop();
    };
  }, [autoStart, isAuthenticated]);

  // 手动触发同步
  const triggerSync = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('[useRealtimeSync] Cannot sync: not authenticated');
      return;
    }

    console.log('[useRealtimeSync] Manual sync triggered');
    // 这里可以添加手动同步的逻辑
  }, [isAuthenticated]);

  // 监听变更事件
  const onChange = useCallback((type: SyncEventType, callback: (event: SyncEvent) => void) => {
    return realtimeSyncManager.onChange(type, callback);
  }, []);

  return {
    status,
    isConnected: status.isConnected,
    isSyncing: status.pendingChanges > 0,
    offlineQueueCount,
    triggerSync,
    onChange,
  };
}

// ==================== 乐观更新 Hook ====================

export interface UseOptimisticUpdateOptions<T> {
  /** 乐观更新表格名 */
  table: string;
  /** 记录ID */
  recordId: string;
  /** 当前数据 */
  currentData: T;
  /** 同步函数 */
  syncFn: (data: Partial<T>) => Promise<{ success: boolean; error?: string }>;
  /** 同步成功的回调 */
  onSyncSuccess?: (data: Partial<T>) => void;
  /** 同步失败的回调 */
  onSyncError?: (error: string, rollbackData: T) => void;
}

export interface UseOptimisticUpdateReturn<T> {
  /** 更新数据 */
  update: (data: Partial<T>) => Promise<void>;
  /** 是否正在同步 */
  isSyncing: boolean;
  /** 是否同步失败 */
  hasFailed: boolean;
  /** 回滚到之前的数据 */
  rollback: () => void;
}

/**
 * 使用乐观更新
 */
export function useOptimisticUpdate<T>({
  table,
  recordId,
  currentData,
  syncFn,
  onSyncSuccess,
  onSyncError,
}: UseOptimisticUpdateOptions<T>): UseOptimisticUpdateReturn<T> {
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [localData, setLocalData] = useState(currentData);
  const [pendingUpdateId, setPendingUpdateId] = useState<string | null>(null);

  // 同步外部数据变化
  useEffect(() => {
    setLocalData(currentData);
  }, [currentData]);

  // 执行乐观更新
  const update = useCallback(async (data: Partial<T>) => {
    if (isSyncing) {
      console.log('[useOptimisticUpdate] Already syncing, skipping');
      return;
    }

    const previousData = { ...localData };
    const newData = { ...localData, ...data } as T;

    // 立即更新本地状态
    setLocalData(newData);
    setHasFailed(false);

    // 添加乐观更新
    const updateId = realtimeSyncManager.optimisticUpdate(
      table,
      recordId,
      previousData,
      newData
    );
    setPendingUpdateId(updateId);

    // 开始同步
    setIsSyncing(true);

    try {
      const result = await syncFn(data);

      if (result.success) {
        // 确认更新成功
        realtimeSyncManager.confirmOptimisticUpdate(updateId);
        onSyncSuccess?.(data);
      } else {
        // 回滚
        setLocalData(previousData);
        realtimeSyncManager.rollbackOptimisticUpdate(updateId);
        setHasFailed(true);
        onSyncError?.(result.error || '同步失败', previousData);
      }
    } catch (error: any) {
      // 回滚
      setLocalData(previousData);
      realtimeSyncManager.rollbackOptimisticUpdate(updateId);
      setHasFailed(true);
      onSyncError?.(error.message || '同步失败', previousData);
    } finally {
      setIsSyncing(false);
      setPendingUpdateId(null);
    }
  }, [table, recordId, localData, isSyncing, syncFn, onSyncSuccess, onSyncError]);

  // 回滚
  const rollback = useCallback(() => {
    if (pendingUpdateId) {
      const previousData = realtimeSyncManager.rollbackOptimisticUpdate(pendingUpdateId);
      if (previousData) {
        setLocalData(previousData);
        setHasFailed(false);
      }
    }
  }, [pendingUpdateId]);

  return {
    update,
    isSyncing,
    hasFailed,
    rollback,
  };
}

// ==================== 同步状态指示器 Hook ====================

export interface UseSyncIndicatorReturn {
  /** 是否显示同步状态 */
  showIndicator: boolean;
  /** 连接状态文本 */
  statusText: string;
  /** 连接状态图标类型 */
  statusType: 'connected' | 'syncing' | 'offline' | 'error';
  /** 待处理数量 */
  pendingCount: number;
}

/**
 * 使用同步状态指示器
 */
export function useSyncIndicator(): UseSyncIndicatorReturn {
  const { status, offlineQueueCount } = useRealtimeSync({ autoStart: false });

  let statusText = '已连接';
  let statusType: 'connected' | 'syncing' | 'offline' | 'error' = 'connected';

  if (status.error) {
    if (status.error.includes('离线')) {
      statusText = `离线 (${offlineQueueCount} 待同步)`;
      statusType = 'offline';
    } else {
      statusText = '连接错误';
      statusType = 'error';
    }
  } else if (!status.isConnected) {
    statusText = offlineQueueCount > 0 ? `待同步 (${offlineQueueCount})` : '连接中...';
    statusType = 'syncing';
  } else if (status.pendingChanges > 0) {
    statusText = `同步中 (${status.pendingChanges})`;
    statusType = 'syncing';
  }

  const showIndicator = !status.isConnected || status.pendingChanges > 0 || !!status.error;

  return {
    showIndicator,
    statusText,
    statusType,
    pendingCount: status.pendingChanges || offlineQueueCount,
  };
}

export default useRealtimeSync;
