// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端同步管理器
 * 处理本地数据与云端的同步逻辑
 */

import { useAuthStore } from '@/stores/auth-store';
import { useProjectStore, Project } from '@/stores/project-store';
import { useScriptStore, ScriptProjectData } from '@/stores/script-store';
import {
  isCloudStorageAvailable,
  getCloudProjects,
  getCloudScriptData,
  createCloudProject,
  updateCloudProject,
  deleteCloudProject,
  syncProjectToCloud,
  restoreProjectFromCloud,
} from './cloud-storage';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
  pendingChanges: number;
}

class CloudSyncManager {
  private syncStatus: SyncStatus = {
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    pendingChanges: 0,
  };
  
  private syncCallbacks: Set<(status: SyncStatus) => void> = new Set();
  
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
   * 同步所有项目到云端
   */
  async syncAllToCloud(): Promise<void> {
    if (!this.canSync()) {
      throw new Error('无法同步：用户未登录或云端存储不可用');
    }
    
    this.updateStatus({ isSyncing: true, error: null });
    
    try {
      const projectStore = useProjectStore.getState();
      const scriptStore = useScriptStore.getState();
      
      // 同步每个项目
      for (const project of projectStore.projects) {
        const projectData = scriptStore.projects[project.id];
        const scriptData = projectData?.scriptData || null;
        
        await syncProjectToCloud(project, scriptData || undefined);
      }
      
      this.updateStatus({
        isSyncing: false,
        lastSyncedAt: Date.now(),
        error: null,
        pendingChanges: 0,
      });
      
      console.log('[CloudSync] All projects synced to cloud');
    } catch (error: any) {
      this.updateStatus({
        isSyncing: false,
        error: error.message,
      });
      throw error;
    }
  }
  
  /**
   * 从云端恢复所有项目
   */
  async restoreFromCloud(): Promise<void> {
    if (!this.canSync()) {
      throw new Error('无法恢复：用户未登录或云端存储不可用');
    }
    
    this.updateStatus({ isSyncing: true, error: null });
    
    try {
      const cloudProjects = await getCloudProjects();
      const projectStore = useProjectStore.getState();
      const scriptStore = useScriptStore.getState();
      
      // 清空现有项目
      projectStore.projects.forEach(p => {
        projectStore.deleteProject(p.id);
      });
      
      // 恢复每个云端项目
      for (const cloudProject of cloudProjects) {
        projectStore.createProject(cloudProject.name);
        const newProject = projectStore.projects[0];
        
        // 更新项目信息
        projectStore.renameProject(newProject.id, cloudProject.name);
        if (cloudProject.visualStyleId) {
          projectStore.setProjectVisualStyle(newProject.id, cloudProject.visualStyleId);
        }
        
        // 恢复剧本数据
        const scriptData = await getCloudScriptData(cloudProject.id);
        if (scriptData) {
          scriptStore.setScriptData(newProject.id, scriptData);
        }
      }
      
      this.updateStatus({
        isSyncing: false,
        lastSyncedAt: Date.now(),
        error: null,
      });
      
      console.log('[CloudSync] Projects restored from cloud:', cloudProjects.length);
    } catch (error: any) {
      this.updateStatus({
        isSyncing: false,
        error: error.message,
      });
      throw error;
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
   * 标记有待同步的更改
   */
  markPendingChange(): void {
    this.updateStatus({
      pendingChanges: this.syncStatus.pendingChanges + 1,
    });
  }
  
  /**
   * 重置同步状态
   */
  reset(): void {
    this.syncStatus = {
      isSyncing: false,
      lastSyncedAt: null,
      error: null,
      pendingChanges: 0,
    };
    this.notifySubscribers();
  }
}

// 单例实例
export const cloudSyncManager = new CloudSyncManager();
