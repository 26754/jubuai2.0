// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 统一云端同步管理器
 * 
 * 功能：
 * - 数据同步：项目、剧本、角色、场景、分镜等元数据
 * - 媒体同步：角色图、场景图、首帧图、生成视频
 * - 数据备份与恢复：导入/导出完整数据
 * - 跨设备同步：浏览器版实时同步
 * - 缓存管理：IndexedDB + 内存缓存
 */

import { cloudAuth } from '@/lib/cloud-auth';

// ==================== 类型定义 ====================

// 同步状态
export interface CloudSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
  pendingChanges: number;
  pendingUploads: number; // 待上传的媒体文件数
  storageUsed: number; // 已用存储空间 (bytes)
  storageQuota: number; // 存储空间限制 (bytes)
}

// 同步项目类型
export type SyncEntityType = 
  | 'project' 
  | 'script' 
  | 'character' 
  | 'scene' 
  | 'shot' 
  | 'media' 
  | 'settings';

// 同步变更记录
export interface SyncChangeRecord {
  id: string;
  type: SyncEntityType;
  entityId: string;
  projectId: string;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
  data?: any;
}

// 媒体文件同步状态
export interface MediaSyncState {
  id: string;
  localUrl: string;
  cloudKey?: string;
  status: 'pending' | 'uploading' | 'synced' | 'error';
  error?: string;
  lastAttempt?: number;
}

// 完整备份数据
export interface FullBackupData {
  version: string;
  timestamp: number;
  userId: string;
  data: {
    projects: any[];
    scripts: Record<string, any>;
    characters: Record<string, any>;
    scenes: Record<string, any>;
    shots: Record<string, any>;
    settings: any;
    mediaManifest: MediaManifest[];
  };
}

// 媒体清单
export interface MediaManifest {
  id: string;
  name: string;
  type: 'image' | 'video';
  category: 'character' | 'scene' | 'keyframe' | 'video';
  projectId: string;
  localPath?: string;
  cloudKey?: string;
  size: number;
  createdAt: number;
  updatedAt: number;
}

// ==================== API 请求 ====================

const API_BASE = '/api/sync';

const getAuthHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  ...cloudAuth.getAuthHeader(),
});

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || `API request failed: ${response.status}`);
  }
  return data.data;
}

// ==================== 统一云端同步管理器 ====================

class UnifiedCloudSync {
  private status: CloudSyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    pendingChanges: 0,
    pendingUploads: 0,
    storageUsed: 0,
    storageQuota: 100 * 1024 * 1024, // 默认 100MB
  };

  private listeners: Set<(status: CloudSyncStatus) => void> = new Set();
  private changeQueue: SyncChangeRecord[] = [];
  private mediaQueue: MediaSyncState[] = [];
  private syncInterval: number = 30000; // 30秒
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 5000;

  // IndexedDB 数据库
  private db: IDBDatabase | null = null;
  private dbName = 'jubuai_cloud_sync';
  private dbVersion = 1;

  constructor() {
    this.initNetworkListener();
    this.initIndexedDB();
  }

  // ==================== 网络状态监听 ====================

  private initNetworkListener(): void {
    window.addEventListener('online', () => {
      this.updateStatus({ isOnline: true });
      this.processQueues();
    });
    window.addEventListener('offline', () => {
      this.updateStatus({ isOnline: false });
    });
  }

  // ==================== IndexedDB 初始化 ====================

  private initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[CloudSync] IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[CloudSync] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 变更记录存储
        if (!db.objectStoreNames.contains('changes')) {
          const changeStore = db.createObjectStore('changes', { keyPath: 'id' });
          changeStore.createIndex('type', 'type', { unique: false });
          changeStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 媒体同步状态存储
        if (!db.objectStoreNames.contains('media')) {
          const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
          mediaStore.createIndex('status', 'status', { unique: false });
          mediaStore.createIndex('projectId', 'projectId', { unique: false });
        }

        // 缓存存储
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('expires', 'expires', { unique: false });
        }
      };
    });
  }

  // ==================== 状态管理 ====================

  private updateStatus(updates: Partial<CloudSyncStatus>): void {
    this.status = { ...this.status, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getStatus()));
  }

  getStatus(): CloudSyncStatus {
    return { ...this.status };
  }

  subscribe(callback: (status: CloudSyncStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // ==================== 变更队列管理 ====================

  /**
   * 记录数据变更
   */
  async recordChange(
    type: SyncEntityType,
    entityId: string,
    projectId: string,
    action: 'create' | 'update' | 'delete',
    data?: any
  ): Promise<void> {
    const record: SyncChangeRecord = {
      id: `${type}_${entityId}_${Date.now()}`,
      type,
      entityId,
      projectId,
      action,
      timestamp: Date.now(),
      data,
    };

    // 保存到 IndexedDB
    await this.saveChangeRecord(record);

    // 更新待同步计数
    this.updateStatus({ pendingChanges: this.changeQueue.length + 1 });

    // 如果离线，添加到离线队列
    if (!navigator.onLine) {
      this.changeQueue.push(record);
      return;
    }

    // 在线时立即处理
    this.processQueues();
  }

  private async saveChangeRecord(record: SyncChangeRecord): Promise<void> {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('changes', 'readwrite');
      const store = tx.objectStore('changes');
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async loadPendingChanges(): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('changes', 'readonly');
      const store = tx.objectStore('changes');
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => {
        this.changeQueue = request.result.sort((a, b) => a.timestamp - b.timestamp);
        this.updateStatus({ pendingChanges: this.changeQueue.length });
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== 媒体文件同步 ====================

  /**
   * 添加媒体文件到同步队列
   */
  async queueMediaUpload(
    id: string,
    localUrl: string,
    projectId: string,
    metadata: { name: string; type: 'image' | 'video'; category: string; size: number }
  ): Promise<void> {
    const state: MediaSyncState = {
      id,
      localUrl,
      status: 'pending',
    };

    await this.saveMediaState(state);
    this.updateStatus({ pendingUploads: this.mediaQueue.length + 1 });

    // 如果在线，立即上传
    if (navigator.onLine) {
      this.processMediaQueue();
    }
  }

  private async saveMediaState(state: MediaSyncState): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('media', 'readwrite');
      const store = tx.objectStore('media');
      store.put(state);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async loadPendingMedia(): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('media', 'readonly');
      const store = tx.objectStore('media');
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        this.mediaQueue = request.result;
        this.updateStatus({ pendingUploads: this.mediaQueue.length });
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 处理媒体上传队列
   */
  private async processMediaQueue(): Promise<void> {
    if (this.mediaQueue.length === 0) return;

    const item = this.mediaQueue[0];
    
    // 更新状态为上传中
    item.status = 'uploading';
    item.lastAttempt = Date.now();
    await this.saveMediaState(item);

    try {
      // 获取文件数据
      const response = await fetch(item.localUrl);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();

      // 上传到云端
      const cloudKey = await this.uploadToCloud(buffer, item.id);

      // 更新状态
      item.status = 'synced';
      item.cloudKey = cloudKey;
      await this.saveMediaState(item);

      // 从队列移除
      this.mediaQueue.shift();
      this.updateStatus({ pendingUploads: this.mediaQueue.length, storageUsed: this.status.storageUsed + blob.size });

      // 继续处理下一个
      if (this.mediaQueue.length > 0) {
        this.processMediaQueue();
      }
    } catch (error: any) {
      console.error('[CloudSync] Media upload failed:', error);
      item.status = 'error';
      item.error = error.message;
      item.lastAttempt = Date.now();
      await this.saveMediaState(item);

      // 重试
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => this.processMediaQueue(), this.retryDelay);
      }
    }
  }

  /**
   * 上传文件到云端存储
   */
  private async uploadToCloud(buffer: ArrayBuffer, fileId: string): Promise<string> {
    // 使用 API 上传媒体文件
    const formData = new FormData();
    formData.append('file', new Blob([buffer]), `${fileId}.dat`);
    formData.append('fileId', fileId);

    const response = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: cloudAuth.getAuthHeader(),
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Upload failed');
    }

    return data.key;
  }

  /**
   * 获取媒体文件的云端 URL
   */
  async getMediaUrl(fileId: string): Promise<string | null> {
    try {
      const url = await apiRequest<string>(`/media/${fileId}/url`, {});
      return url;
    } catch {
      return null;
    }
  }

  // ==================== 队列处理 ====================

  private async processQueues(): Promise<void> {
    if (!navigator.onLine || this.status.isSyncing) return;

    this.updateStatus({ isSyncing: true, error: null });

    try {
      // 加载待处理的变更
      await this.loadPendingChanges();

      // 处理变更队列
      while (this.changeQueue.length > 0) {
        const change = this.changeQueue[0];
        await this.syncChange(change);
        this.changeQueue.shift();
        await this.removeChangeRecord(change.id);
        this.updateStatus({ pendingChanges: this.changeQueue.length });
      }

      // 处理媒体队列
      await this.loadPendingMedia();
      await this.processMediaQueue();

      this.updateStatus({
        isSyncing: false,
        lastSyncedAt: Date.now(),
        error: null,
      });
      this.retryCount = 0;
    } catch (error: any) {
      console.error('[CloudSync] Sync error:', error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => this.processQueues(), this.retryDelay);
      } else {
        this.updateStatus({
          isSyncing: false,
          error: error.message,
        });
        this.retryCount = 0;
      }
    }
  }

  private async syncChange(change: SyncChangeRecord): Promise<void> {
    const endpoint = this.getEndpointForType(change.type);
    
    switch (change.action) {
      case 'create':
      case 'update':
        await apiRequest(endpoint, {
          method: 'POST',
          body: JSON.stringify(change.data),
        });
        break;
      case 'delete':
        await apiRequest(`${endpoint}/${change.entityId}`, {
          method: 'DELETE',
        });
        break;
    }
  }

  private getEndpointForType(type: SyncEntityType): string {
    switch (type) {
      case 'project': return '/projects';
      case 'script': return '/scripts';
      case 'character': return '/characters';
      case 'scene': return '/scenes';
      case 'shot': return '/shots';
      case 'settings': return '/settings';
      default: return '/data';
    }
  }

  private async removeChangeRecord(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('changes', 'readwrite');
      const store = tx.objectStore('changes');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ==================== 自动同步 ====================

  /**
   * 启动自动同步
   */
  startAutoSync(intervalMs?: number): void {
    if (intervalMs) {
      this.syncInterval = intervalMs;
    }

    this.stopAutoSync();
    this.syncTimer = setInterval(() => {
      this.processQueues();
    }, this.syncInterval);

    console.log('[CloudSync] Auto-sync started, interval:', this.syncInterval);
  }

  /**
   * 停止自动同步
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[CloudSync] Auto-sync stopped');
    }
  }

  /**
   * 手动触发同步
   */
  async syncNow(): Promise<void> {
    await this.processQueues();
  }

  // ==================== 完整备份与恢复 ====================

  /**
   * 导出完整备份数据
   */
  async exportBackup(): Promise<FullBackupData> {
    const { useProjectStore } = await import('@/stores/project-store');
    const { useScriptStore } = await import('@/stores/script-store');
    const { useCharacterLibraryStore } = await import('@/stores/character-library-store');
    const { useSceneStore } = await import('@/stores/scene-store');
    const { useAppSettingsStore } = await import('@/stores/app-settings-store');

    const projectStore = useProjectStore.getState();
    const scriptStore = useScriptStore.getState();
    const characterStore = useCharacterLibraryStore.getState();
    const sceneStore = useSceneStore.getState();
    const settingsStore = useAppSettingsStore.getState();

    return {
      version: '1.0.0',
      timestamp: Date.now(),
      userId: cloudAuth.isLoggedIn() ? 'cloud' : 'local',
      data: {
        projects: projectStore.projects,
        scripts: scriptStore.projects,
        characters: characterStore.characters,
        scenes: sceneStore.scenes,
        shots: {}, // 分镜数据从剧本中获取
        settings: {
          theme: settingsStore.theme,
          language: settingsStore.language,
        },
        mediaManifest: [], // 媒体清单单独处理
      },
    };
  }

  /**
   * 从备份恢复数据
   */
  async importBackup(backup: FullBackupData): Promise<void> {
    const { useProjectStore } = await import('@/stores/project-store');
    const { useScriptStore } = await import('@/stores/script-store');
    const { useCharacterLibraryStore } = await import('@/stores/character-library-store');
    const { useSceneStore } = await import('@/stores/scene-store');
    const { useAppSettingsStore } = await import('@/stores/app-settings-store');

    // 恢复项目
    const projectStore = useProjectStore.getState();
    backup.data.projects.forEach(project => {
      const existing = projectStore.projects.find(p => p.id === project.id);
      if (!existing) {
        projectStore.createProject(project.name);
      }
    });

    // 恢复剧本
    const scriptStore = useScriptStore.getState();
    Object.entries(backup.data.scripts).forEach(([projectId, script]) => {
      scriptStore.ensureProject(projectId);
      // 更新剧本数据...
    });

    // 恢复设置
    if (backup.data.settings) {
      const settingsStore = useAppSettingsStore.getState();
      if (backup.data.settings.theme) {
        settingsStore.setTheme(backup.data.settings.theme);
      }
      if (backup.data.settings.language) {
        settingsStore.setLanguage(backup.data.settings.language);
      }
    }

    console.log('[CloudSync] Backup imported successfully');
  }

  /**
   * 下载备份文件
   */
  async downloadBackup(): Promise<void> {
    const backup = await this.exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `jubuai_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * 上传备份文件
   */
  async uploadBackup(file: File): Promise<void> {
    const text = await file.text();
    const backup: FullBackupData = JSON.parse(text);
    await this.importBackup(backup);
  }

  // ==================== 存储空间管理 ====================

  /**
   * 获取存储空间使用情况
   */
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = (estimate.usage || 0);
      const quota = (estimate.quota || this.status.storageQuota);
      this.updateStatus({ storageUsed: used, storageQuota: quota });
      return { used, quota };
    }
    return { used: this.status.storageUsed, quota: this.status.storageQuota };
  }

  /**
   * 清理缓存
   */
  async clearCache(): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      store.clear();
      tx.oncomplete = () => {
        console.log('[CloudSync] Cache cleared');
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * 清理过期的缓存数据
   */
  async cleanupExpiredCache(): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    const now = Date.now();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const index = store.index('expires');
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          console.log('[CloudSync] Expired cache cleaned');
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== 缓存管理 ====================

  /**
   * 设置缓存
   */
  async setCache(key: string, value: any, ttlMs?: number): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    const record = {
      key,
      value,
      expires: ttlMs ? Date.now() + ttlMs : null,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * 获取缓存
   */
  async getCache<T>(key: string): Promise<T | null> {
    if (!this.db) await this.initIndexedDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          resolve(null);
          return;
        }

        // 检查是否过期
        if (record.expires && record.expires < Date.now()) {
          // 删除过期记录
          const deleteTx = this.db!.transaction('cache', 'readwrite');
          deleteTx.objectStore('cache').delete(key);
          resolve(null);
          return;
        }

        resolve(record.value as T);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除缓存
   */
  async deleteCache(key: string): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// 导出单例
export const unifiedCloudSync = new UnifiedCloudSync();
