// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 新版云端同步 Hook
 * 集成新版 CloudSyncEngine
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { 
  cloudSyncEngine, 
  type CloudSyncSettings, 
  type SyncStatus, 
  type SyncStats, 
  type SyncEvent,
  type ConflictItem,
  type SyncDataType,
  type SyncQueueItem,
} from '@/lib/cloud-sync-engine';

/**
 * 主 Hook - 使用云端同步
 */
export function useCloudSyncV2() {
  const { isAuthenticated } = useAuthStore();
  
  const [settings, setSettings] = useState<CloudSyncSettings>(cloudSyncEngine.getSettings());
  const [status, setStatus] = useState<SyncStatus>(cloudSyncEngine.getStatus());
  const [stats, setStats] = useState<SyncStats>(cloudSyncEngine.getStats());
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [progress, setProgress] = useState({ value: 0, message: '' });
  const [isSyncing, setIsSyncing] = useState(false);

  // 订阅更新
  useEffect(() => {
    const unsubStatus = cloudSyncEngine.subscribeStatus(setStatus);
    const unsubProgress = cloudSyncEngine.subscribeProgress((value, message) => {
      setProgress({ value, message });
      if (value === 0 && message === '') {
        setIsSyncing(false);
      } else if (value > 0) {
        setIsSyncing(true);
      }
    });
    const unsubResult = cloudSyncEngine.subscribeResult(() => {
      setStats(cloudSyncEngine.getStats());
      setConflicts(cloudSyncEngine.getConflicts());
      setIsSyncing(false);
    });
    const unsubConflicts = cloudSyncEngine.subscribeConflicts(setConflicts);
    const unsubQueue = cloudSyncEngine.subscribeQueue?.(() => {
      setQueue(cloudSyncEngine.getQueue());
    });

    // 初始化
    cloudSyncEngine.updateAutoSync();

    return () => {
      unsubStatus();
      unsubProgress();
      unsubResult();
      unsubConflicts();
      unsubQueue?.();
    };
  }, []);

  // 手动同步
  const sync = useCallback(async () => {
    setIsSyncing(true);
    const result = await cloudSyncEngine.sync();
    return result;
  }, []);

  // 更新设置
  const updateSettings = useCallback((partial: Partial<CloudSyncSettings>) => {
    cloudSyncEngine.updateSettings(partial);
    setSettings(cloudSyncEngine.getSettings());
  }, []);

  // 添加到队列
  const addToQueue = useCallback((
    dataType: SyncDataType, 
    action: 'upload' | 'download' | 'delete',
    data: unknown
  ) => {
    cloudSyncEngine.addToQueue({
      dataType,
      action,
      data,
      priority: 1,
    });
    setQueue(cloudSyncEngine.getQueue());
  }, []);

  // 解决冲突
  const resolveConflict = useCallback((
    conflictId: string,
    resolution: 'local' | 'cloud' | 'merge',
    mergedData?: unknown
  ) => {
    cloudSyncEngine.resolveConflict(conflictId, resolution, mergedData);
  }, []);

  // 解决所有冲突
  const resolveAllConflicts = useCallback((resolution: 'local' | 'cloud') => {
    cloudSyncEngine.resolveAllConflicts(resolution);
  }, []);

  return {
    // 状态
    isAuthenticated,
    isSyncing,
    status,
    settings,
    stats,
    conflicts,
    queue,
    progress,

    // 操作
    sync,
    updateSettings,
    addToQueue,
    resolveConflict,
    resolveAllConflicts,
  };
}

/**
 * Hook - 同步状态
 */
export function useSyncStatusV2() {
  const { isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [progress, setProgress] = useState({ value: 0, message: '' });

  useEffect(() => {
    setStatus(cloudSyncEngine.getStatus());
    
    const unsubStatus = cloudSyncEngine.subscribeStatus(setStatus);
    const unsubProgress = cloudSyncEngine.subscribeProgress((value, message) => {
      setProgress({ value, message });
    });

    return () => {
      unsubStatus();
      unsubProgress();
    };
  }, []);

  return { status, progress, isAuthenticated };
}

/**
 * Hook - 同步统计
 */
export function useSyncStatsV2() {
  const [stats, setStats] = useState<SyncStats>(cloudSyncEngine.getStats());

  useEffect(() => {
    setStats(cloudSyncEngine.getStats());
    
    const unsub = cloudSyncEngine.subscribeResult(() => {
      setStats(cloudSyncEngine.getStats());
    });

    return () => unsub();
  }, []);

  return stats;
}

/**
 * Hook - 同步冲突
 */
export function useSyncConflictsV2() {
  const [conflicts, setConflicts] = useState<ConflictItem[]>(cloudSyncEngine.getConflicts());

  useEffect(() => {
    setConflicts(cloudSyncEngine.getConflicts());
    
    const unsub = cloudSyncEngine.subscribeConflicts(setConflicts);
    return () => unsub();
  }, []);

  const resolve = useCallback((conflictId: string, resolution: 'local' | 'cloud') => {
    cloudSyncEngine.resolveConflict(conflictId, resolution);
  }, []);

  const resolveAll = useCallback((resolution: 'local' | 'cloud') => {
    cloudSyncEngine.resolveAllConflicts(resolution);
  }, []);

  return { conflicts, resolve, resolveAll };
}

/**
 * Hook - 同步日志
 */
export function useSyncLogsV2(limit = 50) {
  const [logs, setLogs] = useState<SyncEvent[]>([]);

  useEffect(() => {
    setLogs(cloudSyncEngine.getLogs(limit));
    
    const unsub = cloudSyncEngine.subscribeLogs((event) => {
      setLogs(prev => [...prev.slice(-(limit - 1)), event]);
    });

    return () => unsub();
  }, [limit]);

  const clear = useCallback(() => {
    cloudSyncEngine.clearLogs();
    setLogs([]);
  }, []);

  return { logs, clear };
}

/**
 * Hook - 同步设置
 */
export function useSyncSettingsV2() {
  const [settings, setSettings] = useState<CloudSyncSettings>(cloudSyncEngine.getSettings());

  const update = useCallback((partial: Partial<CloudSyncSettings>) => {
    cloudSyncEngine.updateSettings(partial);
    setSettings(cloudSyncEngine.getSettings());
  }, []);

  return { settings, update };
}

/**
 * Hook - 数据变更时触发同步
 */
export function useSyncOnChange(
  dataType: SyncDataType,
  _data: unknown,
  debounceMs = 2000
) {
  const { isAuthenticated } = useAuthStore();
  const { settings } = useSyncSettingsV2();

  useEffect(() => {
    if (!isAuthenticated || !settings.enabled || !settings.autoSync || !settings.syncOnChange) {
      return;
    }

    const timer = setTimeout(() => {
      cloudSyncEngine.addToQueue({
        dataType,
        action: 'upload',
        data: _data,
        priority: 1,
      });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [dataType, _data, isAuthenticated, settings, debounceMs]);
}
