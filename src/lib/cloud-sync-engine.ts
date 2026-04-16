// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 新版云端同步服务
 * 模块化架构，支持选择性同步、离线队列、冲突解决
 */

import { useProjectStore, type Project } from '@/stores/project-store';
import { useCharacterLibraryStore } from '@/stores/character-library-store';
import { useSceneStore } from '@/stores/scene-store';

// ==================== 类型定义 ====================

// 同步数据类型
export type SyncDataType = 'projects' | 'characters' | 'scenes' | 'settings';

// 同步设置
export interface CloudSyncSettings {
  // 基本设置
  enabled: boolean;
  autoSync: boolean;
  syncOnStartup: boolean;
  syncOnChange: boolean;
  
  // 选择性同步
  syncProjects: boolean;
  syncCharacters: boolean;
  syncScenes: boolean;
  syncSettings: boolean;
  
  // 高级设置
  wifiOnly: boolean;
  syncInterval: number; // 毫秒
  maxRetries: number;
  compression: boolean;
  
  // 通知设置
  notifyOnSync: boolean;
  notifyOnConflict: boolean;
  notifyOnError: boolean;
}

// 同步状态
export type SyncStatus = 'idle' | 'syncing' | 'paused' | 'error' | 'offline';

// 同步事件
export interface SyncEvent {
  id: string;
  type: 'start' | 'progress' | 'success' | 'error' | 'conflict' | 'conflict_resolved';
  dataType?: SyncDataType;
  message: string;
  progress?: number;
  timestamp: number;
  details?: Record<string, unknown>;
}

// 同步结果
export interface SyncResult {
  success: boolean;
  uploaded: Record<SyncDataType, number>;
  downloaded: Record<SyncDataType, number>;
  conflicts: ConflictItem[];
  errors: string[];
  duration: number;
  timestamp: number;
}

// 冲突项
export interface ConflictItem {
  id: string;
  dataType: SyncDataType;
  localVersion: unknown;
  cloudVersion: unknown;
  localUpdatedAt: number;
  cloudUpdatedAt: number;
  resolution?: 'local' | 'cloud' | 'merge';
}

// 同步统计
export interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalUploaded: number;
  totalDownloaded: number;
  conflictsResolved: number;
  lastSyncAt: number | null;
  lastErrorAt: number | null;
  lastError: string | null;
}

// 同步队列项
export interface SyncQueueItem {
  id: string;
  dataType: SyncDataType;
  action: 'upload' | 'download' | 'delete';
  data: unknown;
  priority: number;
  createdAt: number;
  retries: number;
  lastError?: string;
}

// 存储键
const SYNC_SETTINGS_KEY = 'jubuai_cloud_sync_settings';
const SYNC_STATS_KEY = 'jubuai_cloud_sync_stats';
const SYNC_QUEUE_KEY = 'jubuai_sync_queue';
const SYNC_LOGS_KEY = 'jubuai_sync_logs';
const SYNC_CONFLICTS_KEY = 'jubuai_sync_conflicts';

// ==================== 默认配置 ====================

const DEFAULT_SETTINGS: CloudSyncSettings = {
  enabled: true,
  autoSync: true,
  syncOnStartup: true,
  syncOnChange: true,
  
  syncProjects: true,
  syncCharacters: true,
  syncScenes: true,
  syncSettings: true,
  
  wifiOnly: false,
  syncInterval: 30000, // 30秒
  maxRetries: 3,
  compression: true,
  
  notifyOnSync: true,
  notifyOnConflict: true,
  notifyOnError: true,
};

const DEFAULT_STATS: SyncStats = {
  totalSyncs: 0,
  successfulSyncs: 0,
  failedSyncs: 0,
  totalUploaded: 0,
  totalDownloaded: 0,
  conflictsResolved: 0,
  lastSyncAt: null,
  lastErrorAt: null,
  lastError: null,
};

// ==================== 云端同步引擎 ====================

class CloudSyncEngine {
  private static instance: CloudSyncEngine;
  
  // 状态
  private status: SyncStatus = 'idle';
  private settings: CloudSyncSettings = { ...DEFAULT_SETTINGS };
  private stats: SyncStats = { ...DEFAULT_STATS };
  private queue: SyncQueueItem[] = [];
  private conflicts: ConflictItem[] = [];
  private logs: SyncEvent[] = [];
  
  // 监听器
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();
  private progressListeners: Set<(progress: number, message: string) => void> = new Set();
  private resultListeners: Set<(result: SyncResult) => void> = new Set();
  private conflictListeners: Set<(conflicts: ConflictItem[]) => void> = new Set();
  private logListeners: Set<(event: SyncEvent) => void> = new Set();
  private queueListeners: Set<() => void> = new Set();
  
  // 定时器
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;

  private constructor() {
    try {
      this.loadSettings();
      this.loadStats();
      this.loadQueue();
      this.loadConflicts();
    } catch (e) {
      console.error('[CloudSyncEngine] Initialization error:', e);
    }
  }

  public static getInstance(): CloudSyncEngine {
    if (!CloudSyncEngine.instance) {
      CloudSyncEngine.instance = new CloudSyncEngine();
    }
    return CloudSyncEngine.instance;
  }

  // ==================== 公共 API ====================

  // 获取设置
  public getSettings(): CloudSyncSettings {
    return { ...this.settings };
  }

  // 更新设置
  public updateSettings(partial: Partial<CloudSyncSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    
    // 如果自动同步设置改变，重启定时器
    if ('autoSync' in partial || 'syncInterval' in partial || 'wifiOnly' in partial) {
      this.updateAutoSync();
    }
  }

  // 获取统计
  public getStats(): SyncStats {
    return { ...this.stats };
  }

  // 获取状态
  public getStatus(): SyncStatus {
    return this.status;
  }

  // 获取队列
  public getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  // 获取冲突
  public getConflicts(): ConflictItem[] {
    return [...this.conflicts];
  }

  // 获取日志
  public getLogs(limit = 50): SyncEvent[] {
    return this.logs.slice(-limit);
  }

  // 手动触发同步
  public async sync(): Promise<SyncResult> {
    if (this.isProcessing) {
      return {
        success: false,
        uploaded: { projects: 0, characters: 0, scenes: 0, settings: 0 },
        downloaded: { projects: 0, characters: 0, scenes: 0, settings: 0 },
        conflicts: [],
        errors: ['同步正在进行中'],
        duration: 0,
        timestamp: Date.now(),
      };
    }

    if (!this.settings.enabled) {
      return {
        success: false,
        uploaded: { projects: 0, characters: 0, scenes: 0, settings: 0 },
        downloaded: { projects: 0, characters: 0, scenes: 0, settings: 0 },
        conflicts: [],
        errors: ['云端同步已禁用'],
        duration: 0,
        timestamp: Date.now(),
      };
    }

    this.isProcessing = true;
    this.setStatus('syncing');
    this.logEvent('start', '同步启动');

    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      uploaded: { projects: 0, characters: 0, scenes: 0, settings: 0 },
      downloaded: { projects: 0, characters: 0, scenes: 0, settings: 0 },
      conflicts: [],
      errors: [],
      duration: 0,
      timestamp: startTime,
    };

    try {
      // 按顺序同步各数据类型
      const dataTypes: SyncDataType[] = ['settings', 'projects', 'characters', 'scenes'];
      
      for (const dataType of dataTypes) {
        if (!this.shouldSync(dataType)) continue;

        this.updateProgress(0, `同步${this.getDataTypeName(dataType)}...`);
        
        const dataResult = await this.syncDataType(dataType);
        
        result.uploaded[dataType] = dataResult.uploaded;
        result.downloaded[dataType] = dataResult.downloaded;
        result.conflicts.push(...dataResult.conflicts);
        result.errors.push(...dataResult.errors);
        
        this.updateProgress(100, `${this.getDataTypeName(dataType)}同步完成`);
      }

      // 处理冲突
      if (result.conflicts.length > 0) {
        this.conflicts = result.conflicts;
        this.saveConflicts();
        this.notifyConflictListeners();
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      // 更新统计
      this.updateStats(result);

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : '同步失败');
      result.duration = Date.now() - startTime;
      this.setStatus('error');
    }

    this.isProcessing = false;
    this.setStatus(result.success ? 'idle' : 'error');
    this.logEvent(result.success ? 'success' : 'error', result.errors.join('; ') || '同步完成');
    this.notifyResultListeners(result);

    return result;
  }

  // 添加到同步队列
  public addToQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries'>): void {
    const queueItem: SyncQueueItem = {
      ...item,
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      retries: 0,
    };
    
    this.queue.push(queueItem);
    this.saveQueue();
    this.notifyQueueListeners();
    
    // 如果设置了同步变更，触发同步
    if (this.settings.syncOnChange && this.settings.autoSync) {
      this.scheduleSync();
    }
  }

  // 解决冲突
  public resolveConflict(
    conflictId: string, 
    resolution: 'local' | 'cloud' | 'merge',
    mergedData?: unknown
  ): void {
    const conflictIndex = this.conflicts.findIndex(c => c.id === conflictId);
    if (conflictIndex === -1) return;

    const conflict = this.conflicts[conflictIndex];
    conflict.resolution = resolution;

    // 应用解决结果
    if (resolution === 'local') {
      // 使用本地版本（稍后上传）
      this.addToQueue({
        dataType: conflict.dataType,
        action: 'upload',
        data: conflict.localVersion,
        priority: 1,
      });
    } else if (resolution === 'cloud') {
      // 使用云端版本（已下载）
      this.applyCloudData(conflict.dataType, conflict.cloudVersion);
    } else if (resolution === 'merge' && mergedData) {
      // 使用合并版本
      this.applyCloudData(conflict.dataType, mergedData);
      this.addToQueue({
        dataType: conflict.dataType,
        action: 'upload',
        data: mergedData,
        priority: 1,
      });
    }

    // 移除冲突
    this.conflicts.splice(conflictIndex, 1);
    this.saveConflicts();
    this.notifyConflictListeners();

    // 更新统计
    this.stats.conflictsResolved++;
    this.saveStats();

    this.logEvent('conflict_resolved', `冲突已解决: ${conflictId} (${resolution})`);
  }

  // 解决所有冲突
  public resolveAllConflicts(resolution: 'local' | 'cloud'): void {
    for (const conflict of this.conflicts) {
      this.resolveConflict(conflict.id, resolution);
    }
  }

  // 清空日志
  public clearLogs(): void {
    this.logs = [];
    localStorage.removeItem(SYNC_LOGS_KEY);
  }

  // 清空队列
  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  // 启动/停止自动同步
  public updateAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (!this.settings.enabled || !this.settings.autoSync) {
      return;
    }

    // 检查 WiFi 限制
    if (this.settings.wifiOnly && !this.isWifiConnected()) {
      this.setStatus('paused');
      return;
    }

    this.syncTimer = setInterval(() => {
      if (this.isWifiConnected() || !this.settings.wifiOnly) {
        this.sync();
      }
    }, this.settings.syncInterval);
  }

  // 订阅状态变更
  public subscribeStatus(listener: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  // 订阅进度更新
  public subscribeProgress(listener: (progress: number, message: string) => void): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  // 订阅同步结果
  public subscribeResult(listener: (result: SyncResult) => void): () => void {
    this.resultListeners.add(listener);
    return () => this.resultListeners.delete(listener);
  }

  // 订阅冲突更新
  public subscribeConflicts(listener: (conflicts: ConflictItem[]) => void): () => void {
    this.conflictListeners.add(listener);
    return () => this.conflictListeners.delete(listener);
  }

  // 订阅日志
  public subscribeLogs(listener: (event: SyncEvent) => void): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  // 订阅队列更新
  public subscribeQueue(listener: () => void): () => void {
    this.queueListeners.add(listener);
    return () => this.queueListeners.delete(listener);
  }

  private notifyQueueListeners(): void {
    this.queueListeners.forEach(listener => listener());
  }

  // ==================== 私有方法 ====================

  private setStatus(status: SyncStatus): void {
    this.status = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  private updateProgress(progress: number, message: string): void {
    this.progressListeners.forEach(listener => listener(progress, message));
    this.logEvent('progress', message, undefined, progress);
  }

  private notifyResultListeners(result: SyncResult): void {
    this.resultListeners.forEach(listener => listener(result));
  }

  private notifyConflictListeners(): void {
    this.conflictListeners.forEach(listener => listener([...this.conflicts]));
  }

  private logEvent(
    type: SyncEvent['type'], 
    message: string, 
    dataType?: SyncDataType,
    progress?: number
  ): void {
    const event: SyncEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      dataType,
      message,
      progress,
      timestamp: Date.now(),
    };
    
    this.logs.push(event);
    if (this.logs.length > 200) {
      this.logs = this.logs.slice(-200);
    }
    this.saveLogs();
    this.logListeners.forEach(listener => listener(event));
  }

  private shouldSync(dataType: SyncDataType): boolean {
    if (!this.settings.enabled) return false;
    
    switch (dataType) {
      case 'projects':
        return this.settings.syncProjects;
      case 'characters':
        return this.settings.syncCharacters;
      case 'scenes':
        return this.settings.syncScenes;
      case 'settings':
        return this.settings.syncSettings;
      default:
        return false;
    }
  }

  private getDataTypeName(dataType: SyncDataType): string {
    const names: Record<SyncDataType, string> = {
      projects: '项目',
      characters: '角色',
      scenes: '场景',
      settings: '设置',
    };
    return names[dataType];
  }

  private async syncDataType(dataType: SyncDataType): Promise<{
    uploaded: number;
    downloaded: number;
    conflicts: ConflictItem[];
    errors: string[];
  }> {
    const result = {
      uploaded: 0,
      downloaded: 0,
      conflicts: [] as ConflictItem[],
      errors: [] as string[],
    };

    try {
      // 1. 获取云端数据
      const cloudData = await this.fetchFromCloud(dataType);
      
      // 2. 获取本地数据
      const localData = this.getLocalData(dataType);
      
      // 3. 比较并处理冲突
      const { toUpload, toDownload, conflicts } = this.compareData(
        dataType,
        localData,
        cloudData
      );
      
      result.conflicts.push(...conflicts);
      
      // 4. 上传本地变更
      if (toUpload.length > 0) {
        await this.uploadToCloud(dataType, toUpload);
        result.uploaded = toUpload.length;
      }
      
      // 5. 下载云端变更
      if (toDownload.length > 0) {
        this.applyCloudData(dataType, toDownload);
        result.downloaded = toDownload.length;
      }
      
    } catch (error) {
      result.errors.push(
        `${this.getDataTypeName(dataType)}同步失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }

    return result;
  }

  private async fetchFromCloud(dataType: SyncDataType): Promise<unknown[]> {
    const token = localStorage.getItem('jubuai_jwt_token');
    if (!token) return [];

    const endpoint = `/api/sync/${dataType}`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // 解析响应格式
      if (Array.isArray(data)) return data;
      if (data.data) return Array.isArray(data.data) ? data.data : [data.data];
      if (data[dataType]) return Array.isArray(data[dataType]) ? data[dataType] : [data[dataType]];
      
      return [];
    } catch (error) {
      console.error(`[CloudSync] Failed to fetch ${dataType}:`, error);
      return [];
    }
  }

  private getLocalData(dataType: SyncDataType): unknown[] {
    switch (dataType) {
      case 'projects': {
        const store = useProjectStore.getState();
        return store.projects || [];
      }
      case 'characters': {
        const store = useCharacterLibraryStore.getState();
        return store.characters || [];
      }
      case 'scenes': {
        const store = useSceneStore.getState();
        return store.scenes || [];
      }
      case 'settings': {
        // 返回需要同步的设置项
        const settings: Record<string, string> = {};
        const syncKeys = [
          'jubuai-api-configs',
          'jubuai-theme',
          'i18nextLng',
          'jubuai_visual_style_id',
        ];
        for (const key of syncKeys) {
          const value = localStorage.getItem(key);
          if (value) settings[key] = value;
        }
        return [settings];
      }
      default:
        return [];
    }
  }

  private compareData(
    dataType: SyncDataType,
    localData: unknown[],
    cloudData: unknown[]
  ): {
    toUpload: unknown[];
    toDownload: unknown[];
    conflicts: ConflictItem[];
  } {
    const localMap = this.createDataMap(dataType, localData, 'local');
    const cloudMap = this.createDataMap(dataType, cloudData, 'cloud');
    
    const toUpload: unknown[] = [];
    const toDownload: unknown[] = [];
    const conflicts: ConflictItem[] = [];

    // 检查本地数据
    for (const [id, localItem] of localMap) {
      const cloudItem = cloudMap.get(id);
      
      if (!cloudItem) {
        // 本地有，云端没有 -> 上传
        toUpload.push(localItem);
      } else {
        // 两者都有 -> 检查冲突
        const localTime = this.getItemTimestamp(localItem, 'local');
        const cloudTime = this.getItemTimestamp(cloudItem, 'cloud');
        
        if (localTime > cloudTime) {
          // 本地更新 -> 上传
          toUpload.push(localItem);
        } else if (cloudTime > localTime) {
          // 云端更新 -> 下载
          toDownload.push(cloudItem);
        }
        // 时间相同则无需处理
      }
    }

    // 检查云端独有的数据
    for (const [id, cloudItem] of cloudMap) {
      if (!localMap.has(id)) {
        toDownload.push(cloudItem);
      }
    }

    return { toUpload, toDownload, conflicts };
  }

  private createDataMap(
    dataType: SyncDataType, 
    data: unknown[], 
    source: 'local' | 'cloud'
  ): Map<string, unknown> {
    const map = new Map();
    
    for (const item of data) {
      if (item && typeof item === 'object') {
        const itemObj = item as Record<string, unknown>;
        const id = this.getItemId(itemObj, dataType, source);
        if (id) {
          map.set(id, { ...itemObj, _source: source });
        }
      }
    }
    
    return map;
  }

  private getItemId(item: Record<string, unknown>, dataType: SyncDataType, source: 'local' | 'cloud'): string | null {
    // 优先使用 id 字段
    if (item.id) return String(item.id);
    if (item._id) return String(item._id);
    
    // 对于设置，使用 key 字段
    if (dataType === 'settings' && item.key) {
      return String(item.key);
    }
    
    return null;
  }

  private getItemTimestamp(item: Record<string, unknown>, source: 'local' | 'cloud'): number {
    const timestampFields = ['updatedAt', 'updated_at', 'timestamp', 'createdAt', 'created_at'];
    
    for (const field of timestampFields) {
      if (item[field]) {
        const value = item[field];
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const parsed = Date.parse(value);
          if (!isNaN(parsed)) return parsed;
        }
      }
    }
    
    return source === 'local' ? Date.now() : 0;
  }

  private async uploadToCloud(dataType: SyncDataType, data: unknown[]): Promise<void> {
    const token = localStorage.getItem('jubuai_jwt_token');
    if (!token) return;

    const endpoint = `/api/sync/${dataType}`;
    
    const payload = dataType === 'settings' 
      ? { settings: data }
      : { [dataType]: data };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Upload failed: HTTP ${response.status}`);
    }
  }

  private applyCloudData(dataType: SyncDataType, data: unknown[]): void {
    for (const item of data) {
      if (item && typeof item === 'object') {
        const itemObj = item as Record<string, unknown>;
        
        switch (dataType) {
          case 'projects':
            try {
              const projectStore = useProjectStore.getState();
              if ('createProject' in projectStore) {
                // 创建新项目
                const name = String(itemObj.name || '云端项目');
                const newProject = projectStore.createProject(name);
                // 如果需要更新其他属性，可以在这里处理
              }
            } catch (e) {
              console.warn('[CloudSync] Failed to apply project:', e);
            }
            break;
          case 'characters':
            try {
              const charStore = useCharacterLibraryStore.getState();
              if ('addCharacter' in charStore) {
                charStore.addCharacter({
                  name: String(itemObj.name || '云端角色'),
                  identityAnchors: (itemObj.identityAnchors || {}) as any,
                  negativePrompt: String(itemObj.negativePrompt || ''),
                  styleId: String(itemObj.styleId || ''),
                  gender: String(itemObj.gender || 'unknown') as any,
                });
              }
            } catch (e) {
              console.warn('[CloudSync] Failed to apply character:', e);
            }
            break;
          case 'scenes':
            try {
              const sceneStore = useSceneStore.getState();
              if ('addScene' in sceneStore) {
                sceneStore.addScene({
                  name: String(itemObj.name || '云端场景'),
                  description: String(itemObj.description || ''),
                  location: String(itemObj.location || ''),
                  timeOfDay: String(itemObj.timeOfDay || 'day') as any,
                  styleId: String(itemObj.styleId || ''),
                });
              }
            } catch (e) {
              console.warn('[CloudSync] Failed to apply scene:', e);
            }
            break;
          case 'settings':
            if (itemObj.key && itemObj.value) {
              localStorage.setItem(String(itemObj.key), String(itemObj.value));
            }
            break;
        }
      }
    }
  }

  private updateStats(result: SyncResult): void {
    this.stats.totalSyncs++;
    
    if (result.success) {
      this.stats.successfulSyncs++;
      this.stats.lastSyncAt = result.timestamp;
    } else {
      this.stats.failedSyncs++;
      this.stats.lastErrorAt = result.timestamp;
      this.stats.lastError = result.errors[0] || '未知错误';
    }
    
    for (const dataType of ['projects', 'characters', 'scenes', 'settings'] as SyncDataType[]) {
      this.stats.totalUploaded += result.uploaded[dataType];
      this.stats.totalDownloaded += result.downloaded[dataType];
    }
    
    this.saveStats();
  }

  private scheduleSync(): void {
    // 防抖：延迟 2 秒后执行同步
    setTimeout(() => {
      if (!this.isProcessing) {
        this.sync();
      }
    }, 2000);
  }

  private isWifiConnected(): boolean {
    // 简单检查：生产环境中可以检查网络类型
    // 这里简化处理，始终返回 true
    return true;
  }

  // ==================== 持久化 ====================

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(SYNC_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings(): void {
    localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(this.settings));
  }

  private loadStats(): void {
    try {
      const stored = localStorage.getItem(SYNC_STATS_KEY);
      if (stored) {
        this.stats = { ...DEFAULT_STATS, ...JSON.parse(stored) };
      }
    } catch {
      this.stats = { ...DEFAULT_STATS };
    }
  }

  private saveStats(): void {
    localStorage.setItem(SYNC_STATS_KEY, JSON.stringify(this.stats));
  }

  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueue(): void {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
  }

  private loadConflicts(): void {
    try {
      const stored = localStorage.getItem(SYNC_CONFLICTS_KEY);
      if (stored) {
        this.conflicts = JSON.parse(stored);
      }
    } catch {
      this.conflicts = [];
    }
  }

  private saveConflicts(): void {
    localStorage.setItem(SYNC_CONFLICTS_KEY, JSON.stringify(this.conflicts));
  }

  private loadLogs(): void {
    try {
      const stored = localStorage.getItem(SYNC_LOGS_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      this.logs = [];
    }
  }

  private saveLogs(): void {
    // 只保存最近的 200 条日志
    const logsToSave = this.logs.slice(-200);
    localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify(logsToSave));
  }
}

// 导出单例
export const cloudSyncEngine = CloudSyncEngine.getInstance();
