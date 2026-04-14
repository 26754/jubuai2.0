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
  };
  
  private syncCallbacks: Set<(status: SyncStatus) => void> = new Set();
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private pendingSyncTimeout: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 5000; // 5秒
  
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
   * 检查是否需要进行同步
   */
  canSync(): boolean {
    const { isAuthenticated, isSupabaseConfigured } = useAuthStore.getState();
    return isAuthenticated && isSupabaseConfigured && isCloudStorageAvailable();
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
   * 同步项目数据
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
    
    // 同步每个项目
    for (const project of projectStore.projects) {
      // 跳过默认项目（如果云端没有数据且不是强制上传）
      if (project.id === 'default-project' && !forceUpload && cloudProjects.length === 0) {
        continue;
      }
      
      const projectData = scriptStore.projects[project.id];
      const scriptData = projectData?.scriptData || null;
      
      try {
        await syncProjectToCloud(project, scriptData || undefined);
        console.log('[CloudSync] Project synced:', project.id);
      } catch (error: any) {
        console.error('[CloudSync] Failed to sync project:', project.id, error.message);
        // 继续同步其他项目
      }
    }
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
   * 从云端恢复项目数据
   */
  private async restoreProjectsFromCloud(): Promise<void> {
    const cloudProjects = await getCloudProjects();
    const projectStore = useProjectStore.getState();
    const scriptStore = useScriptStore.getState();
    
    // 清空现有项目（保留默认项目结构）
    const existingProjects = [...projectStore.projects];
    for (const p of existingProjects) {
      if (p.id !== 'default-project') {
        projectStore.deleteProject(p.id);
      }
    }
    
    // 恢复每个云端项目
    for (const cloudProject of cloudProjects) {
      try {
        projectStore.createProject(cloudProject.name);
        const newProject = projectStore.projects.find(p => p.name === cloudProject.name);
        
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
