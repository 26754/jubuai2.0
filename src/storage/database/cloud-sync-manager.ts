// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端同步管理器
 * 处理本地数据与云端的同步逻辑
 */

import { useAuthStore } from '@/stores/auth-store';
import { useProjectStore, Project } from '@/stores/project-store';
import { useScriptStore, ScriptProjectData } from '@/stores/script-store';
import { useAppSettingsStore } from '@/stores/app-settings-store';
import { useAPIConfigStore } from '@/stores/api-config-store';
import {
  isCloudStorageAvailable,
  getCloudProjects,
  getCloudScriptData,
  createCloudProject,
  updateCloudProject,
  deleteCloudProject,
  syncProjectToCloud,
  restoreProjectFromCloud,
  syncSettingsToCloud,
  getCloudUserSettings,
  UserSettings,
} from './cloud-storage';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
  pendingChanges: number;
  syncMode: 'idle' | 'auto' | 'manual';
  isOnline: boolean;
  isOffline: boolean;
}

interface SyncOptions {
  syncProjects?: boolean;
  syncSettings?: boolean;
  forceUpload?: boolean;
}

class CloudSyncManager {
  private syncStatus: SyncStatus = {
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    pendingChanges: 0,
    syncMode: 'idle',
    isOnline: true,
    isOffline: false,
  };
  
  private syncCallbacks: Set<(status: SyncStatus) => void> = new Set();
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private pendingSyncTimeout: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 5000; // 5秒
  private offlineQueue: Array<() => Promise<void>> = [];
  private isProcessingOfflineQueue = false;
  
  constructor() {
    // 初始化网络状态监听
    this.initNetworkListener();
  }
  
  /**
   * 初始化网络状态监听
   */
  private initNetworkListener(): void {
    if (typeof window === 'undefined') return;
    
    // 监听浏览器在线/离线事件
    const handleOnline = () => {
      console.log('[CloudSync] Network online detected');
      this.updateStatus({ isOnline: true, isOffline: false });
      this.processOfflineQueue();
    };
    
    const handleOffline = () => {
      console.log('[CloudSync] Network offline detected');
      this.updateStatus({ isOnline: false, isOffline: true });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // 初始化网络状态
    this.updateStatus({ isOnline: navigator.onLine, isOffline: !navigator.onLine });
    
    console.log('[CloudSync] Network listener initialized, online:', navigator.onLine);
  }
  
  /**
   * 处理离线队列中的待同步操作
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.isProcessingOfflineQueue || !navigator.onLine) return;
    if (this.offlineQueue.length === 0) return;
    
    this.isProcessingOfflineQueue = true;
    console.log('[CloudSync] Processing offline queue, items:', this.offlineQueue.length);
    
    while (this.offlineQueue.length > 0) {
      const operation = this.offlineQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('[CloudSync] Failed to process offline operation:', error);
        }
      }
    }
    
    this.isProcessingOfflineQueue = false;
    console.log('[CloudSync] Offline queue processed');
  }
  
  /**
   * 添加操作到离线队列
   */
  private addToOfflineQueue(operation: () => Promise<void>): void {
    if (this.offlineQueue.length >= 100) {
      // 队列过大，移除最旧的项
      this.offlineQueue.shift();
      console.warn('[CloudSync] Offline queue overflow, removed oldest item');
    }
    this.offlineQueue.push(operation);
    console.log('[CloudSync] Operation added to offline queue, queue size:', this.offlineQueue.length);
  }
  
  /**
   * 获取当前同步状态
   */
  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }
  
  /**
   * 订阅同步状态变化
   */
  subscribe(callback: (status: SyncStatus) => void): () => void {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  }
  
  private notifySubscribers(): void {
    this.syncCallbacks.forEach(cb => cb(this.getStatus()));
  }
  
  private updateStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.notifySubscribers();
  }
  
  /**
   * 检查是否可以进行同步
   */
  canSync(): boolean {
    const { isAuthenticated } = useAuthStore.getState();
    return isAuthenticated && isCloudStorageAvailable() && navigator.onLine;
  }
  
  /**
   * 获取离线队列大小
   */
  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }
  
  /**
   * 启动自动同步
   */
  startAutoSync(intervalMs: number = 30000): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }
    
    this.autoSyncInterval = setInterval(async () => {
      if (this.canSync() && this.syncStatus.pendingChanges > 0) {
        console.log('[CloudSync] Auto-sync triggered, pending changes:', this.syncStatus.pendingChanges);
        await this.syncAllToCloud({ syncProjects: true, syncSettings: true });
      }
    }, intervalMs);
    
    console.log('[CloudSync] Auto-sync started with interval:', intervalMs);
  }
  
  /**
   * 停止自动同步
   */
  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('[CloudSync] Auto-sync stopped');
    }
  }
  
  /**
   * 标记有待同步的更改（延迟触发同步）
   */
  markPendingChange(): void {
    this.updateStatus({
      pendingChanges: this.syncStatus.pendingChanges + 1,
    });
    
    // 清除之前的延迟同步
    if (this.pendingSyncTimeout) {
      clearTimeout(this.pendingSyncTimeout);
    }
    
    // 如果离线，将操作添加到队列
    if (!navigator.onLine) {
      this.addToOfflineQueue(async () => {
        await this.syncAllToCloud({ syncProjects: true, syncSettings: true });
      });
      console.log('[CloudSync] Network offline, added to queue');
      return;
    }
    
    // 延迟 2 秒后执行同步（批量处理变更）
    this.pendingSyncTimeout = setTimeout(async () => {
      if (this.canSync()) {
        await this.syncAllToCloud({ syncProjects: true, syncSettings: true });
      }
    }, 2000);
  }
  
  /**
   * 同步所有项目到云端
   */
  async syncAllToCloud(options: SyncOptions = {}): Promise<void> {
    const { syncProjects = true, syncSettings = true, forceUpload = false } = options;
    
    // 检查网络状态
    if (!navigator.onLine) {
      console.log('[CloudSync] Cannot sync: network offline');
      this.addToOfflineQueue(async () => {
        await this.syncAllToCloud(options);
      });
      return;
    }
    
    if (!this.canSync()) {
      console.log('[CloudSync] Cannot sync: not authenticated or cloud unavailable');
      return;
    }
    
    if (this.syncStatus.isSyncing) {
      console.log('[CloudSync] Sync already in progress');
      return;
    }
    
    this.updateStatus({ isSyncing: true, syncMode: 'auto', error: null });
    
    try {
      if (syncProjects) {
        await this.syncProjectsToCloud(forceUpload);
      }
      
      if (syncSettings) {
        await this.syncSettingsToCloud();
      }
      
      this.updateStatus({
        isSyncing: false,
        lastSyncedAt: Date.now(),
        error: null,
        pendingChanges: 0,
        syncMode: 'idle',
      });
      
      this.retryCount = 0; // 重置重试计数
      console.log('[CloudSync] All data synced to cloud successfully');
    } catch (error: any) {
      this.updateStatus({
        isSyncing: false,
        error: error.message,
        syncMode: 'idle',
      });
      
      // 自动重试
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`[CloudSync] Sync failed, retrying (${this.retryCount}/${this.maxRetries}) in ${this.retryDelay}ms...`);
        setTimeout(() => {
          this.syncAllToCloud(options);
        }, this.retryDelay);
      } else {
        console.error('[CloudSync] Sync failed after max retries:', error.message);
        this.retryCount = 0;
      }
      
      throw error;
    }
  }
  
  /**
   * 同步项目数据到云端（改进版）
   * - 同步所有本地项目到云端
   * - 使用项目 ID 进行匹配
   * - 改进日志记录
   */
  private async syncProjectsToCloud(forceUpload: boolean = false): Promise<void> {
    const projectStore = useProjectStore.getState();
    const scriptStore = useScriptStore.getState();
    
    // 获取云端项目列表
    let cloudProjects: any[] = [];
    try {
      cloudProjects = await getCloudProjects();
    } catch (e) {
      console.warn('[CloudSync] Failed to get cloud projects:', e);
    }
    
    const cloudProjectIds = new Set(cloudProjects.map(p => p.id));
    
    console.log('[CloudSync] Starting sync to cloud, local projects:', projectStore.projects.length, 'cloud projects:', cloudProjects.length);
    
    // 同步每个本地项目到云端
    let syncedCount = 0;
    let skippedCount = 0;
    
    for (const project of projectStore.projects) {
      // 跳过默认项目（如果云端没有数据且不是强制上传）
      if (project.id === 'default-project' && !forceUpload && cloudProjects.length === 0) {
        console.log('[CloudSync] Skipping default project (no cloud data):', project.id);
        skippedCount++;
        continue;
      }
      
      // 跳过空项目（没有名称的默认项目）
      if (project.id === 'default-project' && project.name === 'JuBu AI项目' && !project.updatedAt) {
        console.log('[CloudSync] Skipping empty default project:', project.id);
        skippedCount++;
        continue;
      }
      
      const projectData = scriptStore.projects[project.id];
      const scriptData = projectData?.scriptData || null;
      
      // 检查是否需要同步（比较更新时间）
      const cloudProject = cloudProjects.find(p => p.id === project.id);
      if (cloudProject && !forceUpload) {
        const cloudUpdatedAt = cloudProject.updated_at ? new Date(cloudProject.updated_at).getTime() : 0;
        const localUpdatedAt = project.updatedAt;
        
        if (localUpdatedAt <= cloudUpdatedAt) {
          console.log('[CloudSync] Skipping project (cloud is newer):', project.id, project.name);
          skippedCount++;
          continue;
        }
      }
      
      try {
        await syncProjectToCloud(project, scriptData || undefined);
        console.log('[CloudSync] Project synced:', project.id, project.name);
        syncedCount++;
      } catch (error: any) {
        console.error('[CloudSync] Failed to sync project:', project.id, error.message);
        // 继续同步其他项目
      }
    }
    
    console.log('[CloudSync] Sync completed, synced:', syncedCount, 'skipped:', skippedCount);
  }
  
  /**
   * 同步设置数据
   */
  private async syncSettingsToCloud(): Promise<void> {
    try {
      const appSettings = useAppSettingsStore.getState();
      const apiConfig = useAPIConfigStore.getState();
      
      // 获取当前云端设置
      const cloudSettings = await getCloudUserSettings();
      
      // 构建设置数据
      const settingsToSync: Partial<UserSettings> = {
        theme: appSettings.theme,
        language: appSettings.language,
        api_configs: {
          providers: apiConfig.providers.map(p => ({
            id: p.id,
            name: p.name,
            platform: p.platform,
            enabled: p.enabled,
          })),
        },
        editor_settings: {
          // 可以添加更多编辑器设置
        },
      };
      
      if (cloudSettings) {
        // 合并设置（云端设置优先于本地）
        const mergedSettings: Partial<UserSettings> = {
          ...settingsToSync,
          sync_preferences: cloudSettings.sync_preferences,
        };
        await syncSettingsToCloud(mergedSettings);
      } else {
        await syncSettingsToCloud(settingsToSync);
      }
      
      console.log('[CloudSync] Settings synced to cloud');
    } catch (error: any) {
      console.error('[CloudSync] Failed to sync settings:', error.message);
    }
  }
  
  /**
   * 从云端恢复所有项目
   */
  async restoreFromCloud(options: SyncOptions = {}): Promise<void> {
    const { syncSettings = true } = options;
    
    if (!this.canSync()) {
      throw new Error('无法恢复：用户未登录或云端存储不可用');
    }
    
    this.updateStatus({ isSyncing: true, syncMode: 'auto', error: null });
    
    try {
      // 恢复项目数据
      await this.restoreProjectsFromCloud();
      
      // 恢复设置数据
      if (syncSettings) {
        await this.restoreSettingsFromCloud();
      }
      
      this.updateStatus({
        isSyncing: false,
        lastSyncedAt: Date.now(),
        error: null,
        pendingChanges: 0,
        syncMode: 'idle',
      });
      
      console.log('[CloudSync] Data restored from cloud successfully');
    } catch (error: any) {
      this.updateStatus({
        isSyncing: false,
        error: error.message,
        syncMode: 'idle',
      });
      throw error;
    }
  }
  
  /**
   * 从云端恢复项目数据（改进版：智能合并策略）
   * - 保留本地新建的项目
   * - 更新云端已有的项目（使用更新时间戳判断）
   * - 合并而非覆盖，避免本地数据丢失
   */
  private async restoreProjectsFromCloud(): Promise<void> {
    const cloudProjects = await getCloudProjects();
    const projectStore = useProjectStore.getState();
    const scriptStore = useScriptStore.getState();
    
    console.log('[CloudSync] Starting restore from cloud, local projects:', projectStore.projects.length, 'cloud projects:', cloudProjects.length);
    
    // 获取本地项目的 ID 列表（用于判断哪些是本地独有的）
    const localProjectIds = new Set(projectStore.projects.map(p => p.id));
    
    // 恢复/更新每个云端项目
    for (const cloudProject of cloudProjects) {
      try {
        // 检查云端项目是否已存在于本地
        const existingLocalProject = projectStore.projects.find(p => p.id === cloudProject.id);
        
        if (existingLocalProject) {
          // 项目已存在，更新本地数据（使用云端数据覆盖本地）
          // 比较更新时间：云端更新时间 > 本地更新时间 时才更新
          const cloudUpdatedAt = cloudProject.updatedAt ? new Date(cloudProject.updatedAt).getTime() : 0;
          const localUpdatedAt = existingLocalProject.updatedAt;
          
          if (cloudUpdatedAt > localUpdatedAt) {
            // 云端更新，更新本地
            console.log('[CloudSync] Updating local project from cloud:', cloudProject.id, cloudProject.name);
            
            if (cloudProject.name !== existingLocalProject.name) {
              projectStore.renameProject(cloudProject.id, cloudProject.name);
            }
            if (cloudProject.visualStyleId) {
              projectStore.setProjectVisualStyle(cloudProject.id, cloudProject.visualStyleId);
            }
            
            // 恢复剧本数据
            const scriptData = await getCloudScriptData(cloudProject.id);
            if (scriptData) {
              scriptStore.setScriptData(cloudProject.id, scriptData);
            }
          } else {
            console.log('[CloudSync] Keeping local project (newer or same):', cloudProject.id, cloudProject.name);
          }
        } else {
          // 项目不存在，创建新项目
          console.log('[CloudSync] Creating new project from cloud:', cloudProject.id, cloudProject.name);
          projectStore.createProject(cloudProject.name);
          const newProject = projectStore.projects.find(p => p.name === cloudProject.name);
          
          if (newProject && newProject.id !== cloudProject.id) {
            // 新项目使用了不同的 ID（因为 createProject 生成新 ID），需要手动更新
            // 由于我们无法直接修改项目 ID，这种情况下需要用云端 ID 覆盖
            // 暂时跳过，等后续支持项目 ID 修改
            console.warn('[CloudSync] Project ID mismatch, skipping:', cloudProject.id, '->', newProject.id);
          }
          
          if (newProject) {
            // 更新项目信息
            if (cloudProject.visualStyleId) {
              projectStore.setProjectVisualStyle(newProject.id, cloudProject.visualStyleId);
            }
            
            // 恢复剧本数据
            const scriptData = await getCloudScriptData(cloudProject.id);
            if (scriptData) {
              scriptStore.setScriptData(newProject.id, scriptData);
            }
          }
        }
      } catch (error: any) {
        console.error('[CloudSync] Failed to restore project:', cloudProject.id, error.message);
      }
    }
    
    console.log('[CloudSync] Projects restored from cloud:', cloudProjects.length);
  }
  
  /**
   * 从云端恢复设置数据
   */
  private async restoreSettingsFromCloud(): Promise<void> {
    try {
      const cloudSettings = await getCloudUserSettings();
      
      if (!cloudSettings) {
        console.log('[CloudSync] No cloud settings to restore');
        return;
      }
      
      const appSettings = useAppSettingsStore.getState();
      const apiConfig = useAPIConfigStore.getState();
      
      // 恢复主题设置
      if (cloudSettings.theme) {
        appSettings.setTheme(cloudSettings.theme);
      }
      
      // 恢复语言设置
      if (cloudSettings.language) {
        appSettings.setLanguage(cloudSettings.language);
      }
      
      // 恢复 API 配置
      if (cloudSettings.api_configs?.providers) {
        for (const provider of cloudSettings.api_configs.providers) {
          const existingProvider = apiConfig.providers.find(p => p.id === provider.id);
          if (existingProvider) {
            apiConfig.updateProvider(provider.id, { enabled: provider.enabled });
          }
        }
      }
      
      // 恢复同步偏好设置
      if (cloudSettings.sync_preferences) {
        if (cloudSettings.sync_preferences.autoSync) {
          this.startAutoSync(cloudSettings.sync_preferences.syncInterval || 30000);
        } else {
          this.stopAutoSync();
        }
      }
      
      console.log('[CloudSync] Settings restored from cloud');
    } catch (error: any) {
      console.error('[CloudSync] Failed to restore settings:', error.message);
    }
  }
  
  /**
   * 同步单个项目到云端
   */
  async syncProject(projectId: string): Promise<void> {
    if (!this.canSync()) {
      throw new Error('无法同步：用户未登录或云端存储不可用');
    }
    
    const projectStore = useProjectStore.getState();
    const scriptStore = useScriptStore.getState();
    
    const project = projectStore.projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error('项目不存在');
    }
    
    const scriptData = scriptStore.getScriptData(projectId);
    
    await syncProjectToCloud(project, scriptData || undefined);
    console.log('[CloudSync] Project synced:', projectId);
  }
  
  /**
   * 手动触发完整同步
   */
  async manualSync(): Promise<void> {
    if (!this.canSync()) {
      throw new Error('无法同步：用户未登录或云端存储不可用');
    }
    
    this.updateStatus({ syncMode: 'manual' });
    await this.syncAllToCloud({ syncProjects: true, syncSettings: true, forceUpload: true });
  }
  
  /**
   * 重置同步状态
   */
  reset(): void {
    this.stopAutoSync();
    
    if (this.pendingSyncTimeout) {
      clearTimeout(this.pendingSyncTimeout);
      this.pendingSyncTimeout = null;
    }
    
    this.syncStatus = {
      isSyncing: false,
      lastSyncedAt: null,
      error: null,
      pendingChanges: 0,
      syncMode: 'idle',
    };
    this.retryCount = 0;
    this.notifySubscribers();
  }
}

// 单例实例
export const cloudSyncManager = new CloudSyncManager();
