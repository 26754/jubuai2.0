// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 实时同步管理器
 * 基于 Supabase Realtime 实现跨平台、跨浏览器实时同步
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase-client';
import { useAuthStore } from '@/stores/auth-store';
import { useProjectStore, Project } from '@/stores/project-store';
import { useScriptStore, ScriptProjectData } from '@/stores/script-store';
import {
  createCloudProject,
  updateCloudProject,
  deleteCloudProject,
  getCloudProjects,
  getCloudProject,
} from './cloud-project-storage';
import { toast } from 'sonner';

// ==================== 类型定义 ====================

export interface RealtimeSyncStatus {
  isConnected: boolean;
  isSubscribed: boolean;
  lastEventAt: number | null;
  pendingChanges: number;
  conflictCount: number;
  error: string | null;
}

export interface SyncChange {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  recordId: string;
  data: any;
  timestamp: number;
  userId: string;
  version: number;
}

export interface ConflictResolution {
  localVersion: any;
  remoteVersion: any;
  strategy: 'local_wins' | 'remote_wins' | 'merge' | 'manual';
  resolvedData?: any;
}

type SyncEventType = 'projects' | 'shots' | 'settings';

interface SyncEvent {
  type: SyncEventType;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_record: any;
  new_record: any;
}

// ==================== 乐观更新队列 ====================

interface OptimisticUpdate {
  id: string;
  table: string;
  recordId: string;
  previousData: any;
  newData: any;
  timestamp: number;
  applied: boolean;
  failed: boolean;
}

class OptimisticUpdateQueue {
  private queue: OptimisticUpdate[] = [];
  private maxSize = 100;

  add(update: Omit<OptimisticUpdate, 'id' | 'applied' | 'failed'>): string {
    const id = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 如果队列已满，移除最老的项
    if (this.queue.length >= this.maxSize) {
      this.queue.shift();
    }
    
    this.queue.push({
      ...update,
      id,
      applied: false,
      failed: false,
    });
    
    return id;
  }

  get(id: string): OptimisticUpdate | undefined {
    return this.queue.find(u => u.id === id);
  }

  markApplied(id: string): void {
    const update = this.queue.find(u => u.id === id);
    if (update) {
      update.applied = true;
    }
  }

  markFailed(id: string): void {
    const update = this.queue.find(u => u.id === id);
    if (update) {
      update.failed = true;
    }
  }

  rollback(id: string): any | undefined {
    const index = this.queue.findIndex(u => u.id === id);
    if (index !== -1) {
      const update = this.queue[index];
      this.queue.splice(index, 1);
      return update.previousData;
    }
    return undefined;
  }

  getPending(): OptimisticUpdate[] {
    return this.queue.filter(u => !u.applied && !u.failed);
  }

  getFailed(): OptimisticUpdate[] {
    return this.queue.filter(u => u.failed);
  }

  clear(): void {
    this.queue = [];
  }
}

// ==================== 离线队列 ====================

interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

class OfflineQueue {
  private queue: OfflineOperation[] = [];
  private storageKey = 'jubuai-offline-queue';
  private maxRetries = 3;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (e) {
      console.error('[OfflineQueue] Failed to load from storage:', e);
      this.queue = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (e) {
      console.error('[OfflineQueue] Failed to save to storage:', e);
    }
  }

  add(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): string {
    const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const offlineOp: OfflineOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.maxRetries,
    };
    
    this.queue.push(offlineOp);
    this.saveToStorage();
    
    return id;
  }

  getNext(): OfflineOperation | undefined {
    return this.queue[0];
  }

  markComplete(id: string): void {
    this.queue = this.queue.filter(op => op.id !== id);
    this.saveToStorage();
  }

  markFailed(id: string): boolean {
    const op = this.queue.find(o => o.id === id);
    if (op) {
      op.retryCount++;
      this.saveToStorage();
      return op.retryCount < op.maxRetries;
    }
    return false;
  }

  hasPending(): boolean {
    return this.queue.length > 0;
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.saveToStorage();
  }
}

// ==================== 实时同步管理器 ====================

class RealtimeSyncManager {
  private status: RealtimeSyncStatus = {
    isConnected: false,
    isSubscribed: false,
    lastEventAt: null,
    pendingChanges: 0,
    conflictCount: 0,
    error: null,
  };

  private callbacks: Set<(status: RealtimeSyncStatus) => void> = new Set();
  private changeCallbacks: Map<SyncEventType, Set<(event: SyncEvent) => void>> = new Map();
  
  private optimisticQueue = new OptimisticUpdateQueue();
  private offlineQueue = new OfflineQueue();
  
  private subscriptions: any[] = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private syncDebounceTimeout: NodeJS.Timeout | null = null;
  
  private readonly RECONNECT_DELAY = 5000;
  private readonly HEARTBEAT_INTERVAL = 30000;
  private readonly SYNC_DEBOUNCE = 1000; // 1秒防抖

  /**
   * 获取当前同步状态
   */
  getStatus(): RealtimeSyncStatus {
    return { ...this.status };
  }

  /**
   * 订阅同步状态变化
   */
  subscribe(callback: (status: RealtimeSyncStatus) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * 订阅特定类型的变更事件
   */
  onChange(type: SyncEventType, callback: (event: SyncEvent) => void): () => void {
    if (!this.changeCallbacks.has(type)) {
      this.changeCallbacks.set(type, new Set());
    }
    this.changeCallbacks.get(type)!.add(callback);
    
    return () => {
      this.changeCallbacks.get(type)?.delete(callback);
    };
  }

  private notifyStatusChange(): void {
    this.callbacks.forEach(cb => cb(this.getStatus()));
  }

  private emitChangeEvent(type: SyncEventType, event: SyncEvent): void {
    this.changeCallbacks.get(type)?.forEach(cb => cb(event));
  }

  private updateStatus(updates: Partial<RealtimeSyncStatus>): void {
    this.status = { ...this.status, ...updates };
    this.notifyStatusChange();
  }

  /**
   * 检查是否可以同步
   */
  canSync(): boolean {
    const { isAuthenticated } = useAuthStore.getState();
    return isAuthenticated && isSupabaseConfigured();
  }

  /**
   * 启动实时同步
   */
  async start(): Promise<void> {
    if (!this.canSync()) {
      console.log('[RealtimeSync] Cannot start: not authenticated');
      return;
    }

    // 先处理离线队列中的待处理操作
    await this.processOfflineQueue();

    // 建立实时连接
    await this.connect();

    // 启动心跳检测
    this.startHeartbeat();
  }

  /**
   * 停止实时同步
   */
  stop(): void {
    this.disconnect();
    this.stopHeartbeat();
    console.log('[RealtimeSync] Stopped');
  }

  /**
   * 建立实时连接
   */
  private async connect(): Promise<void> {
    if (!isSupabaseConfigured()) {
      console.error('[RealtimeSync] Supabase not configured');
      return;
    }

    try {
      const supabase = getSupabaseClient();
      
      // 检查网络状态
      if (!navigator.onLine) {
        console.log('[RealtimeSync] Browser is offline, queuing operations');
        this.updateStatus({ isConnected: false, error: '浏览器离线' });
        return;
      }

      // 获取当前用户
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[RealtimeSync] No authenticated user');
        return;
      }

      // 订阅项目表变化
      const projectChannel = supabase
        .channel(`projects-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            await this.handleProjectChange(payload);
          }
        )
        .subscribe((status) => {
          console.log('[RealtimeSync] Project channel status:', status);
          if (status === 'SUBSCRIBED') {
            this.updateStatus({ isSubscribed: true, isConnected: true, error: null });
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.updateStatus({ isSubscribed: false, isConnected: false });
            this.scheduleReconnect();
          }
        });

      this.subscriptions.push(projectChannel);

      // 订阅 shots 表变化
      const shotsChannel = supabase
        .channel(`shots-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shots',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            await this.handleShotChange(payload);
          }
        )
        .subscribe();

      this.subscriptions.push(shotsChannel);

      console.log('[RealtimeSync] Connected successfully');
      this.updateStatus({ isConnected: true, error: null });

    } catch (error: any) {
      console.error('[RealtimeSync] Connection error:', error);
      this.updateStatus({ isConnected: false, error: error.message });
      this.scheduleReconnect();
    }
  }

  /**
   * 断开实时连接
   */
  private disconnect(): void {
    // 清除重连定时器
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // 取消所有订阅
    this.subscriptions.forEach(sub => {
      try {
        supabase.channel(sub).unsubscribe();
      } catch (e) {
        // 忽略错误
      }
    });
    this.subscriptions = [];

    this.updateStatus({ isConnected: false, isSubscribed: false });
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      console.log('[RealtimeSync] Attempting to reconnect...');
      await this.connect();
    }, this.RECONNECT_DELAY);
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(async () => {
      if (!navigator.onLine) {
        console.log('[RealtimeSync] Browser went offline');
        this.updateStatus({ isConnected: false, error: '浏览器离线' });
        return;
      }

      // 检查连接状态
      const { isConnected } = this.getStatus();
      if (!isConnected) {
        await this.connect();
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 处理项目变更
   */
  private async handleProjectChange(payload: any): Promise<void> {
    const { eventType, old: oldRecord, new: newRecord } = payload;
    
    console.log('[RealtimeSync] Project change:', eventType, newRecord?.id);

    // 更新最后事件时间
    this.updateStatus({ lastEventAt: Date.now() });

    // 检查是否是本地发起的变更（通过乐观更新队列）
    const recordId = newRecord?.id || oldRecord?.id;
    const pendingUpdate = this.optimisticQueue.getPending().find(
      u => u.table === 'projects' && u.recordId === recordId
    );

    // 如果是本地发起的变更，跳过处理（已经在本地应用）
    if (pendingUpdate && pendingUpdate.applied) {
      console.log('[RealtimeSync] Skipping local change confirmation');
      return;
    }

    // 触发变更事件
    this.emitChangeEvent('projects', {
      type: 'projects',
      action: eventType as 'INSERT' | 'UPDATE' | 'DELETE',
      old_record: oldRecord,
      new_record: newRecord,
    });

    // 应用变更到本地存储
    const projectStore = useProjectStore.getState();
    const scriptStore = useScriptStore.getState();

    switch (eventType) {
      case 'INSERT':
        // 检查是否已存在（避免重复添加）
        if (!projectStore.projects.find(p => p.id === newRecord.id)) {
          projectStore.addProjectFromCloud({
            id: newRecord.id,
            name: newRecord.name,
            createdAt: new Date(newRecord.created_at).getTime(),
            updatedAt: new Date(newRecord.updated_at).getTime(),
            visualStyleId: newRecord.visual_style_id,
          });
          
          if (newRecord.script_data) {
            scriptStore.setProjectData(newRecord.id, {
              scriptData: newRecord.script_data,
              rawScript: newRecord.raw_script,
              language: newRecord.language,
              targetDuration: newRecord.target_duration,
              styleId: newRecord.style_id,
              parseStatus: newRecord.parse_status as any,
            });
          }
          
          toast.success('收到云端新项目同步');
        }
        break;

      case 'UPDATE':
        // 检查冲突
        const localProject = projectStore.projects.find(p => p.id === newRecord.id);
        if (localProject) {
          const localUpdatedAt = localProject.updatedAt;
          const remoteUpdatedAt = new Date(newRecord.updated_at).getTime();
          
          // 如果本地更新比远程更新更新，则跳过
          if (localUpdatedAt > remoteUpdatedAt) {
            console.log('[RealtimeSync] Local is newer, not applying remote update');
            return;
          }
        }
        
        // 应用远程更新
        projectStore.updateProjectFromCloud(newRecord.id, {
          name: newRecord.name,
          updatedAt: remoteUpdatedAt,
          visualStyleId: newRecord.visual_style_id,
        });
        
        if (newRecord.script_data) {
          scriptStore.setProjectData(newRecord.id, {
            scriptData: newRecord.script_data,
            rawScript: newRecord.raw_script,
          });
        }
        
        toast.info('项目已从云端更新');
        break;

      case 'DELETE':
        projectStore.deleteProject(newRecord.id);
        scriptStore.deleteProjectData(newRecord.id);
        toast.info('云端已删除项目');
        break;
    }
  }

  /**
   * 处理分镜变更
   */
  private async handleShotChange(payload: any): Promise<void> {
    const { eventType, new: newRecord } = payload;
    
    console.log('[RealtimeSync] Shot change:', eventType, newRecord?.id);
    this.updateStatus({ lastEventAt: Date.now() });

    this.emitChangeEvent('shots', {
      type: 'shots',
      action: eventType as 'INSERT' | 'UPDATE' | 'DELETE',
      old_record: payload.old,
      new_record: newRecord,
    });
  }

  /**
   * 乐观更新：立即更新本地状态
   */
  optimisticUpdate(
    table: string,
    recordId: string,
    previousData: any,
    newData: any
  ): string {
    // 添加到乐观更新队列
    const updateId = this.optimisticQueue.add({
      table,
      recordId,
      previousData,
      newData,
      timestamp: Date.now(),
    });

    // 更新待处理计数
    this.updateStatus({
      pendingChanges: this.optimisticQueue.getPending().length,
    });

    return updateId;
  }

  /**
   * 确认乐观更新成功
   */
  confirmOptimisticUpdate(updateId: string): void {
    this.optimisticQueue.markApplied(updateId);
    this.updateStatus({
      pendingChanges: this.optimisticQueue.getPending().length,
    });
  }

  /**
   * 回滚乐观更新
   */
  rollbackOptimisticUpdate(updateId: string): any | undefined {
    const previousData = this.optimisticQueue.rollback(updateId);
    if (previousData) {
      this.updateStatus({
        pendingChanges: this.optimisticQueue.getPending().length,
      });
    }
    return previousData;
  }

  /**
   * 同步到云端（带防抖）
   */
  async syncToCloud(
    table: string,
    recordId: string,
    data: any,
    operation: 'create' | 'update' | 'delete'
  ): Promise<{ success: boolean; error?: string }> {
    // 清除之前的防抖定时器
    if (this.syncDebounceTimeout) {
      clearTimeout(this.syncDebounceTimeout);
    }

    return new Promise((resolve) => {
      // 防抖处理
      this.syncDebounceTimeout = setTimeout(async () => {
        // 检查网络状态
        if (!navigator.onLine) {
          // 离线则加入离线队列
          this.offlineQueue.add({
            type: operation,
            table,
            data,
          });
          resolve({ success: false, error: '浏览器离线，操作已加入离线队列' });
          return;
        }

        try {
          // 执行同步
          if (operation === 'create') {
            await createCloudProject(data);
          } else if (operation === 'update') {
            await updateCloudProject(data.id, data);
          } else if (operation === 'delete') {
            await deleteCloudProject(data.id);
          }

          resolve({ success: true });
        } catch (error: any) {
          console.error('[RealtimeSync] Sync failed:', error);
          
          // 如果失败，加入离线队列重试
          if (error.message?.includes('network') || error.message?.includes('fetch')) {
            this.offlineQueue.add({
              type: operation,
              table,
              data,
            });
            resolve({ success: false, error: '网络错误，操作已加入离线队列' });
          } else {
            resolve({ success: false, error: error.message });
          }
        }
      }, this.SYNC_DEBOUNCE);
    });
  }

  /**
   * 处理离线队列
   */
  private async processOfflineQueue(): Promise<void> {
    if (!navigator.onLine || !this.offlineQueue.hasPending()) {
      return;
    }

    console.log('[RealtimeSync] Processing offline queue...');

    while (this.offlineQueue.hasPending()) {
      const operation = this.offlineQueue.getNext();
      if (!operation) break;

      try {
        if (operation.type === 'create') {
          await createCloudProject(operation.data);
        } else if (operation.type === 'update') {
          await updateCloudProject(operation.data.id, operation.data);
        } else if (operation.type === 'delete') {
          await deleteCloudProject(operation.data.id);
        }

        this.offlineQueue.markComplete(operation.id);
        console.log('[RealtimeSync] Offline operation completed:', operation.id);
      } catch (error: any) {
        console.error('[RealtimeSync] Offline operation failed:', operation.id, error);
        
        const shouldRetry = this.offlineQueue.markFailed(operation.id);
        if (!shouldRetry) {
          console.error('[RealtimeSync] Max retries reached, dropping operation:', operation.id);
          this.offlineQueue.markComplete(operation.id);
          toast.error(`同步失败：${operation.table} - ${operation.type}`);
        }
      }
    }

    console.log('[RealtimeSync] Offline queue processed');
  }

  /**
   * 获取待处理的离线操作数量
   */
  getOfflineQueueCount(): number {
    return this.offlineQueue.getPendingCount();
  }

  /**
   * 监听浏览器网络状态变化
   */
  setupNetworkListener(): void {
    window.addEventListener('online', async () => {
      console.log('[RealtimeSync] Browser is online');
      toast.success('网络已恢复，正在同步...');
      
      // 重连
      await this.connect();
      
      // 处理离线队列
      await this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[RealtimeSync] Browser is offline');
      this.updateStatus({ isConnected: false, error: '浏览器离线' });
      toast.warning('网络已断开，操作将在恢复后同步');
    });
  }
}

// 导出单例
export const realtimeSyncManager = new RealtimeSyncManager();
