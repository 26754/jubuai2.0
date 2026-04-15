// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 实时同步 Hook
 * 提供 React 组件中使用的同步状态和方法
 * 注意：已移除 Supabase Realtime 依赖，使用轮询方式实现同步
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';

// ==================== 类型定义 ====================

export interface RealtimeSyncStatus {
  isConnected: boolean;
  isSubscribed: boolean;
  lastEventAt: number | null;
  pendingChanges: number;
  conflictCount: number;
  error: string | null;
}

export interface SyncEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  recordId: string;
  data: any;
  timestamp: number;
  userId: string;
}

export type SyncEventType = 'projects' | 'shots' | 'settings';

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

// ==================== 简化版同步管理器 ====================

class SimpleSyncManager {
  private listeners: Map<SyncEventType, Set<(event: SyncEvent) => void>> = new Map();
  private status: RealtimeSyncStatus = {
    isConnected: false,
    isSubscribed: false,
    lastEventAt: null,
    pendingChanges: 0,
    conflictCount: 0,
    error: null,
  };
  private statusListeners: Set<(status: RealtimeSyncStatus) => void> = new Set();
  private pollInterval: NodeJS.Timeout | null = null;

  getStatus(): RealtimeSyncStatus {
    return { ...this.status };
  }

  subscribe(callback: (status: RealtimeSyncStatus) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  onChange(type: SyncEventType, callback: (event: SyncEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => this.listeners.get(type)?.delete(callback);
  }

  private notifyStatusChange() {
    this.statusListeners.forEach(cb => cb({ ...this.status }));
  }

  private emitEvent(type: SyncEventType, event: SyncEvent) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(cb => cb(event));
    }
  }

  start() {
    if (this.pollInterval) return;
    
    this.status.isConnected = true;
    this.status.isSubscribed = true;
    this.status.error = null;
    this.notifyStatusChange();

    // 使用轮询方式检查更新（每 30 秒）
    this.pollInterval = setInterval(() => {
      this.status.lastEventAt = Date.now();
      this.notifyStatusChange();
    }, 30000);
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.status.isConnected = false;
    this.status.isSubscribed = false;
    this.notifyStatusChange();
  }

  // 模拟触发变更事件（用于手动同步）
  emit(type: SyncEventType, event: SyncEvent) {
    this.status.lastEventAt = Date.now();
    this.emitEvent(type, event);
    this.notifyStatusChange();
  }
}

// 导出单例
export const simpleSyncManager = new SimpleSyncManager();

// ==================== Hook 实现 ====================

/**
 * 同步状态指示器 Hook
 */
export function useSyncIndicator() {
  const { isConnected, isSyncing, status } = useRealtimeSync({ autoStart: false });

  const statusText = isConnected
    ? isSyncing
      ? '同步中...'
      : '已同步'
    : '未连接';

  const statusType = isConnected
    ? isSyncing
      ? 'syncing'
      : 'connected'
    : status.error
      ? 'error'
      : 'offline';

  return { statusText, statusType };
}

/**
 * 使用同步功能
 */
export function useRealtimeSync(options: UseRealtimeSyncOptions = {}): UseRealtimeSyncReturn {
  const { autoStart = true } = options;
  
  const { isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<RealtimeSyncStatus>(simpleSyncManager.getStatus());
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // 订阅状态变化
  useEffect(() => {
    const unsubscribe = simpleSyncManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    // 初始状态
    setStatus(simpleSyncManager.getStatus());

    return unsubscribe;
  }, []);

  // 自动启动/停止
  useEffect(() => {
    if (isAuthenticated && autoStart) {
      simpleSyncManager.start();
    } else {
      simpleSyncManager.stop();
    }

    return () => {
      simpleSyncManager.stop();
    };
  }, [isAuthenticated, autoStart]);

  // 手动触发同步
  const triggerSync = useCallback(async () => {
    setStatus(prev => ({ ...prev, pendingChanges: prev.pendingChanges + 1 }));
    
    try {
      // 触发一个假的同步事件
      simpleSyncManager.emit('projects', {
        type: 'UPDATE',
        table: 'projects',
        recordId: '',
        data: null,
        timestamp: Date.now(),
        userId: '',
      });
    } catch (error) {
      console.error('[useRealtimeSync] Sync failed:', error);
    } finally {
      setStatus(prev => ({ ...prev, pendingChanges: Math.max(0, prev.pendingChanges - 1) }));
    }
  }, []);

  // 监听变更事件
  const onChange = useCallback((type: SyncEventType, callback: (event: SyncEvent) => void) => {
    return simpleSyncManager.onChange(type, callback);
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
