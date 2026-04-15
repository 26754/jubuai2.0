// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * Offline Storage & Draft Manager
 * 
 * 离线存储和草稿管理器
 * 
 * 功能：
 * 1. IndexedDB 缓存优化
 * 2. 自动草稿保存
 * 3. 离线操作队列
 * 4. 数据同步状态管理
 */

import { toast } from "sonner";

// ==================== 类型定义 ====================

/** 存储键名枚举 */
export const STORAGE_KEYS = {
  // 项目数据
  PROJECTS: 'jubuai_projects',
  ACTIVE_PROJECT: 'jubuai_active_project',
  
  // 草稿数据
  DRAFT_SCRIPT: 'jubuai_draft_script',
  DRAFT_CHARACTERS: 'jubuai_draft_characters',
  DRAFT_SCENES: 'jubuai_draft_scenes',
  DRAFT_SHOTS: 'jubuai_draft_shots',
  
  // 草稿元数据
  DRAFT_META: 'jubuai_draft_meta',
  
  // 离线操作队列
  OFFLINE_QUEUE: 'jubuai_offline_queue',
  
  // 用户设置
  USER_SETTINGS: 'jubuai_user_settings',
  
  // 同步状态
  SYNC_STATUS: 'jubuai_sync_status',
  LAST_SYNC_TIME: 'jubuai_last_sync_time',
  
  // 草稿自动保存配置
  DRAFT_CONFIG: 'jubuai_draft_config',
} as const;

/** 草稿元数据 */
export interface DraftMeta {
  /** 项目ID */
  projectId: string;
  /** 草稿类型 */
  type: 'script' | 'character' | 'scene' | 'shot';
  /** 草稿ID */
  draftId: string;
  /** 创建时间 */
  createdAt: Date;
  /** 最后修改时间 */
  updatedAt: Date;
  /** 草稿摘要 */
  summary?: string;
  /** 是否正在编辑 */
  isEditing?: boolean;
  /** 自动保存间隔（毫秒） */
  autoSaveInterval?: number;
}

/** 草稿配置 */
export interface DraftConfig {
  /** 是否启用自动保存 */
  enabled: boolean;
  /** 自动保存间隔（毫秒） */
  interval: number;
  /** 最大草稿数 */
  maxDrafts: number;
  /** 草稿过期时间（毫秒） */
  expiryTime: number;
  /** 是否在关闭页面时保存草稿 */
  saveOnUnload: boolean;
}

/** 离线操作 */
export interface OfflineOperation {
  /** 操作ID */
  id: string;
  /** 操作类型 */
  type: 'create' | 'update' | 'delete';
  /** 实体类型 */
  entityType: 'project' | 'character' | 'scene' | 'shot' | 'script';
  /** 实体ID */
  entityId: string;
  /** 操作数据 */
  data?: any;
  /** 创建时间 */
  createdAt: Date;
  /** 重试次数 */
  retryCount: number;
  /** 状态 */
  status: 'pending' | 'processing' | 'failed' | 'completed';
}

/** 同步状态 */
export interface SyncStatus {
  /** 是否在线 */
  isOnline: boolean;
  /** 最后同步时间 */
  lastSyncTime?: Date;
  /** 待同步操作数 */
  pendingOperations: number;
  /** 同步状态 */
  status: 'idle' | 'syncing' | 'error';
  /** 错误信息 */
  error?: string;
}

// ==================== 默认配置 ====================

const DEFAULT_DRAFT_CONFIG: DraftConfig = {
  enabled: true,
  interval: 30000, // 30秒
  maxDrafts: 10,
  expiryTime: 7 * 24 * 60 * 60 * 1000, // 7天
  saveOnUnload: true,
};

// ==================== LocalStorage 工具 ====================

/** 保存到 localStorage */
export function saveToStorage<T>(key: string, data: T): boolean {
  try {
    const serialized = JSON.stringify(data, (k, v) => {
      if (v instanceof Date) {
        return { __type: 'Date', value: v.toISOString() };
      }
      return v;
    });
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error(`[DraftManager] Failed to save to storage: ${key}`, error);
    return false;
  }
}

/** 从 localStorage 读取 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const serialized = localStorage.getItem(key);
    if (!serialized) return defaultValue;
    
    const data = JSON.parse(serialized, (k, v) => {
      if (v && typeof v === 'object' && v.__type === 'Date') {
        return new Date(v.value);
      }
      return v;
    });
    
    return data;
  } catch (error) {
    console.error(`[DraftManager] Failed to load from storage: ${key}`, error);
    return defaultValue;
  }
}

/** 删除 localStorage 项 */
export function removeFromStorage(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[DraftManager] Failed to remove from storage: ${key}`, error);
    return false;
  }
}

/** 清除所有草稿 */
export function clearAllDrafts(): boolean {
  try {
    const keys = Object.values(STORAGE_KEYS);
    keys.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.error('[DraftManager] Failed to clear drafts', error);
    return false;
  }
}

// ==================== 草稿管理器 ====================

class DraftManager {
  private config: DraftConfig;
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Map<string, Set<(meta: DraftMeta) => void>> = new Map();
  
  constructor() {
    this.config = loadFromStorage(STORAGE_KEYS.DRAFT_CONFIG, DEFAULT_DRAFT_CONFIG);
    this.setupUnloadListener();
  }
  
  /** 获取配置 */
  getConfig(): DraftConfig {
    return { ...this.config };
  }
  
  /** 更新配置 */
  updateConfig(config: Partial<DraftConfig>): void {
    this.config = { ...this.config, ...config };
    saveToStorage(STORAGE_KEYS.DRAFT_CONFIG, this.config);
  }
  
  /** 设置卸载监听 */
  private setupUnloadListener(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('beforeunload', () => {
      if (this.config.saveOnUnload) {
        this.saveAllPendingDrafts();
      }
    });
  }
  
  /** 保存所有待保存的草稿 */
  private saveAllPendingDrafts(): void {
    // 触发所有正在编辑的草稿保存
    this.listeners.forEach((callbacks) => {
      callbacks.forEach(callback => {
        // 获取所有待保存的草稿并触发保存
      });
    });
  }
  
  /** 保存草稿 */
  saveDraft<T>(key: string, data: T, meta?: Partial<DraftMeta>): boolean {
    const draftMeta: DraftMeta = {
      projectId: meta?.projectId || '',
      type: meta?.type || 'script',
      draftId: meta?.draftId || this.generateDraftId(),
      createdAt: meta?.createdAt || new Date(),
      updatedAt: new Date(),
      summary: meta?.summary || this.generateSummary(data),
      ...meta,
    };
    
    // 保存数据
    const dataSaved = saveToStorage(key, data);
    
    // 更新元数据
    if (dataSaved) {
      this.updateDraftMeta(draftMeta);
    }
    
    return dataSaved;
  }
  
  /** 加载草稿 */
  loadDraft<T>(key: string): { data: T | null; meta: DraftMeta | null } {
    const data = loadFromStorage<T | null>(key, null);
    const meta = this.getDraftMeta(key);
    
    return { data, meta };
  }
  
  /** 删除草稿 */
  deleteDraft(key: string): boolean {
    // 删除数据
    const dataDeleted = removeFromStorage(key);
    
    // 删除元数据
    if (dataDeleted) {
      this.removeDraftMeta(key);
    }
    
    // 清除自动保存定时器
    const timer = this.autoSaveTimers.get(key);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(key);
    }
    
    return dataDeleted;
  }
  
  /** 获取草稿元数据 */
  getDraftMeta(key: string): DraftMeta | null {
    const allMeta = this.getAllDraftMeta();
    return allMeta.find(m => m.draftId === key) || null;
  }
  
  /** 更新草稿元数据 */
  private updateDraftMeta(meta: DraftMeta): void {
    const allMeta = this.getAllDraftMeta();
    const index = allMeta.findIndex(m => m.draftId === meta.draftId);
    
    if (index >= 0) {
      allMeta[index] = meta;
    } else {
      allMeta.push(meta);
    }
    
    // 限制草稿数量
    if (allMeta.length > this.config.maxDrafts) {
      allMeta.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      const removed = allMeta.splice(this.config.maxDrafts);
      removed.forEach(m => this.deleteDraft(m.draftId));
    }
    
    saveToStorage(STORAGE_KEYS.DRAFT_META, allMeta);
  }
  
  /** 删除草稿元数据 */
  private removeDraftMeta(key: string): void {
    const allMeta = this.getAllDraftMeta();
    const filtered = allMeta.filter(m => m.draftId !== key);
    saveToStorage(STORAGE_KEYS.DRAFT_META, filtered);
  }
  
  /** 获取所有草稿元数据 */
  getAllDraftMeta(): DraftMeta[] {
    return loadFromStorage<DraftMeta[]>(STORAGE_KEYS.DRAFT_META, []);
  }
  
  /** 启用自动保存 */
  enableAutoSave(
    key: string, 
    getData: () => any,
    onSave?: (data: any) => void
  ): void {
    if (this.autoSaveTimers.has(key)) {
      return; // 已启用
    }
    
    const timer = setInterval(() => {
      const data = getData();
      if (data) {
        const meta = this.getDraftMeta(key);
        this.saveDraft(key, data, { 
          ...meta,
          updatedAt: new Date(),
        });
        onSave?.(data);
      }
    }, this.config.interval);
    
    this.autoSaveTimers.set(key, timer);
  }
  
  /** 禁用自动保存 */
  disableAutoSave(key: string): void {
    const timer = this.autoSaveTimers.get(key);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(key);
    }
  }
  
  /** 清除过期草稿 */
  cleanExpiredDrafts(): number {
    const allMeta = this.getAllDraftMeta();
    const now = Date.now();
    const expired = allMeta.filter(
      m => now - m.updatedAt.getTime() > this.config.expiryTime
    );
    
    expired.forEach(m => this.deleteDraft(m.draftId));
    
    return expired.length;
  }
  
  /** 生成草稿ID */
  private generateDraftId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /** 生成草稿摘要 */
  private generateSummary(data: any): string {
    if (!data) return '';
    
    if (typeof data === 'string') {
      return data.substring(0, 100);
    }
    
    if (data.title) {
      return data.title;
    }
    
    if (data.name) {
      return data.name;
    }
    
    return JSON.stringify(data).substring(0, 100);
  }
  
  /** 订阅草稿变化 */
  subscribe(key: string, callback: (meta: DraftMeta) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }
}

// 单例实例
export const draftManager = new DraftManager();

// ==================== 离线队列管理器 ====================

class OfflineQueueManager {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private processingQueue: boolean = false;
  
  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }
  
  /** 获取在线状态 */
  isNetworkOnline(): boolean {
    return this.isOnline;
  }
  
  /** 添加到离线队列 */
  addToQueue(operation: Omit<OfflineOperation, 'id' | 'createdAt' | 'retryCount' | 'status'>): string {
    const fullOperation: OfflineOperation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      retryCount: 0,
      status: 'pending',
    };
    
    const queue = this.getQueue();
    queue.push(fullOperation);
    saveToStorage(STORAGE_KEYS.OFFLINE_QUEUE, queue);
    
    // 如果在线，尝试处理
    if (this.isOnline) {
      this.processQueue();
    }
    
    return fullOperation.id;
  }
  
  /** 获取队列 */
  getQueue(): OfflineOperation[] {
    return loadFromStorage<OfflineOperation[]>(STORAGE_KEYS.OFFLINE_QUEUE, []);
  }
  
  /** 处理队列 */
  async processQueue(): Promise<void> {
    if (this.processingQueue || !this.isOnline) return;
    
    this.processingQueue = true;
    const queue = this.getQueue();
    const pending = queue.filter(op => op.status === 'pending');
    
    for (const operation of pending) {
      try {
        // 更新状态
        this.updateOperationStatus(operation.id, 'processing');
        
        // 执行操作（这里应该调用实际的API）
        await this.executeOperation(operation);
        
        // 标记完成
        this.updateOperationStatus(operation.id, 'completed');
      } catch (error) {
        // 增加重试次数
        this.incrementRetryCount(operation.id);
        
        if (operation.retryCount >= 3) {
          this.updateOperationStatus(operation.id, 'failed');
        }
      }
    }
    
    // 清理完成的操作
    this.cleanCompleted();
    this.processingQueue = false;
  }
  
  /** 执行单个操作 */
  private async executeOperation(operation: OfflineOperation): Promise<void> {
    // TODO: 实现实际的操作执行逻辑
    console.log('[OfflineQueue] Executing operation:', operation);
    
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  /** 更新操作状态 */
  private updateOperationStatus(id: string, status: OfflineOperation['status']): void {
    const queue = this.getQueue();
    const index = queue.findIndex(op => op.id === id);
    
    if (index >= 0) {
      queue[index].status = status;
      saveToStorage(STORAGE_KEYS.OFFLINE_QUEUE, queue);
    }
  }
  
  /** 增加重试次数 */
  private incrementRetryCount(id: string): void {
    const queue = this.getQueue();
    const index = queue.findIndex(op => op.id === id);
    
    if (index >= 0) {
      queue[index].retryCount++;
      saveToStorage(STORAGE_KEYS.OFFLINE_QUEUE, queue);
    }
  }
  
  /** 清理完成的操作 */
  private cleanCompleted(): void {
    const queue = this.getQueue();
    const filtered = queue.filter(op => op.status !== 'completed');
    saveToStorage(STORAGE_KEYS.OFFLINE_QUEUE, filtered);
  }
  
  /** 处理上线事件 */
  private handleOnline(): void {
    this.isOnline = true;
    this.notifyListeners();
    this.processQueue();
    toast.success('已恢复网络连接，正在同步数据...');
  }
  
  /** 处理离线事件 */
  private handleOffline(): void {
    this.isOnline = false;
    this.notifyListeners();
    toast.warning('网络已断开，操作将在恢复连接后同步');
  }
  
  /** 订阅在线状态变化 */
  subscribe(callback: (isOnline: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /** 通知所有监听器 */
  private notifyListeners(): void {
    this.listeners.forEach(cb => cb(this.isOnline));
  }
}

// 单例实例
export const offlineQueueManager = new OfflineQueueManager();

// ==================== 导出 ====================

export {
  draftManager,
  offlineQueueManager,
  saveToStorage,
  loadFromStorage,
  removeFromStorage,
  clearAllDrafts,
};
