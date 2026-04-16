// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 数据备份服务
 * 提供本地数据导出、导入、自动备份功能
 */

import { useProjectStore } from '@/stores/project-store';
import { useCharacterLibraryStore } from '@/stores/character-library-store';
import { useSceneStore } from '@/stores/scene-store';
import { useScriptStore } from '@/stores/script-store';
import { useAPIConfigStore } from '@/stores/api-config-store';
import { useAuthStore } from '@/stores/auth-store';
import { useAppSettingsStore } from '@/stores/app-settings-store';
import { useDirectorStore } from '@/stores/director-store';
import { useDirectorShotStore } from '@/stores/director-shot-store';

// ==================== 类型定义 ====================

export interface BackupData {
  version: string;
  createdAt: string;
  description?: string;
  data: {
    projects?: unknown[];
    characters?: unknown[];
    scenes?: unknown[];
    scripts?: unknown[];
    apiConfig?: unknown;
    settings?: unknown;
    director?: unknown;
    directorShots?: unknown;
  };
}

export interface BackupMetadata {
  id: string;
  size: number;
  createdAt: string;
  description?: string;
}

export interface AutoSaveConfig {
  enabled: boolean;
  intervalMs: number; // 自动保存间隔（毫秒）
  maxBackups: number; // 最大备份数量
  compress: boolean; // 是否压缩
}

// ==================== 常量 ====================

const BACKUP_VERSION = '1.0.0';
const STORAGE_KEY = 'jubuai-backups';
const AUTO_SAVE_KEY = 'jubuai-autosave-config';
const LAST_SAVE_KEY = 'jubuai-last-save';

// ==================== 工具函数 ====================

function generateId(): string {
  return `backup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== 备份服务类 ====================

class DataBackupService {
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * 收集所有应用数据
   */
  collectAllData(): BackupData['data'] {
    const projectStore = useProjectStore.getState();
    const characterStore = useCharacterLibraryStore.getState();
    const sceneStore = useSceneStore.getState();
    const scriptStore = useScriptStore.getState();
    const apiConfigStore = useAPIConfigStore.getState();
    const appSettingsStore = useAppSettingsStore.getState();
    const directorStore = useDirectorStore.getState();
    const directorShotStore = useDirectorShotStore.getState();

    return {
      projects: projectStore.projects,
      characters: characterStore.characters,
      scenes: sceneStore.scenes,
      scripts: scriptStore.scripts,
      apiConfig: {
        providers: apiConfigStore.providers,
        featureBindings: apiConfigStore.featureBindings,
        // 清除 API Key 的明文存储（仅保留标识）
        providersMasked: apiConfigStore.providers.map(p => ({
          ...p,
          apiKey: p.apiKey ? '***ENCRYPTED***' : '',
        })),
      },
      settings: {
        theme: appSettingsStore.theme,
        language: appSettingsStore.language,
        editorSettings: appSettingsStore.editorSettings,
      },
      director: {
        episodes: directorStore.episodes,
        currentEpisodeIndex: directorStore.currentEpisodeIndex,
        trailerConfig: directorStore.trailerConfig,
      },
      directorShots: directorShotStore.shots,
    };
  }

  /**
   * 创建完整备份数据
   */
  createBackup(description?: string): BackupData {
    return {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      description,
      data: this.collectAllData(),
    };
  }

  /**
   * 导出备份为 JSON 文件
   */
  exportToFile(backupData: BackupData, filename?: string): void {
    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `jubuai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * 从文件导入备份
   */
  async importFromFile(file: File): Promise<BackupData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          
          // 验证备份数据格式
          if (!data.version || !data.data) {
            throw new Error('无效的备份文件格式');
          }
          
          resolve(data as BackupData);
        } catch (error) {
          reject(new Error('备份文件解析失败: ' + (error as Error).message));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }

  /**
   * 应用备份数据
   */
  applyBackup(backup: BackupData): { success: boolean; message: string; restored: string[] } {
    const restored: string[] = [];
    
    try {
      const { data } = backup;

      // 恢复项目
      if (data.projects) {
        const projectStore = useProjectStore.getState();
        projectStore.setProjects(data.projects as any[]);
        restored.push(`项目 (${data.projects.length} 个)`);
      }

      // 恢复角色
      if (data.characters) {
        const characterStore = useCharacterLibraryStore.getState();
        characterStore.setCharacters(data.characters as any[]);
        restored.push(`角色 (${data.characters.length} 个)`);
      }

      // 恢复场景
      if (data.scenes) {
        const sceneStore = useSceneStore.getState();
        sceneStore.setScenes(data.scenes as any[]);
        restored.push(`场景 (${data.scenes.length} 个)`);
      }

      // 恢复剧本
      if (data.scripts) {
        const scriptStore = useScriptStore.getState();
        scriptStore.setScripts(data.scripts as any[]);
        restored.push(`剧本 (${data.scripts.length} 个)`);
      }

      // 恢复设置
      if (data.settings) {
        const appSettingsStore = useAppSettingsStore.getState();
        if (data.settings.theme) appSettingsStore.setTheme(data.settings.theme as any);
        if (data.settings.language) appSettingsStore.setLanguage(data.settings.language as any);
        if (data.settings.editorSettings) appSettingsStore.setEditorSettings(data.settings.editorSettings as any);
        restored.push('设置');
      }

      // 恢复导演数据
      if (data.director) {
        const directorStore = useDirectorStore.getState();
        if (data.director.episodes) directorStore.setEpisodes(data.director.episodes as any[]);
        if (data.director.currentEpisodeIndex !== undefined) {
          directorStore.setCurrentEpisodeIndex(data.director.currentEpisodeIndex);
        }
        restored.push('导演数据');
      }

      // 恢复分镜数据
      if (data.directorShots) {
        const directorShotStore = useDirectorShotStore.getState();
        directorShotStore.setShots(data.directorShots as any[]);
        restored.push(`分镜 (${data.directorShots.length} 个)`);
      }

      return {
        success: true,
        message: `成功恢复 ${restored.length} 项数据`,
        restored,
      };
    } catch (error) {
      return {
        success: false,
        message: '恢复失败: ' + (error as Error).message,
        restored: [],
      };
    }
  }

  /**
   * 保存备份到本地存储
   */
  saveToLocal(backup: BackupData): BackupMetadata {
    const backups = this.getLocalBackups();
    const metadata: BackupMetadata = {
      id: generateId(),
      size: new Blob([JSON.stringify(backup)]).size,
      createdAt: backup.createdAt,
      description: backup.description,
    };
    
    backups.unshift(metadata);
    
    // 只保留最近 10 个备份
    const maxBackups = this.getAutoSaveConfig().maxBackups;
    const trimmed = backups.slice(0, maxBackups);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    
    return metadata;
  }

  /**
   * 获取本地备份列表
   */
  getLocalBackups(): BackupMetadata[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * 清除本地备份列表
   */
  clearLocalBackups(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * 获取自动保存配置
   */
  getAutoSaveConfig(): AutoSaveConfig {
    try {
      const stored = localStorage.getItem(AUTO_SAVE_KEY);
      return stored ? JSON.parse(stored) : {
        enabled: true,
        intervalMs: 30000, // 30秒
        maxBackups: 10,
        compress: false,
      };
    } catch {
      return {
        enabled: true,
        intervalMs: 30000,
        maxBackups: 10,
        compress: false,
      };
    }
  }

  /**
   * 更新自动保存配置
   */
  updateAutoSaveConfig(config: Partial<AutoSaveConfig>): AutoSaveConfig {
    const current = this.getAutoSaveConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(updated));
    
    // 如果启用了自动保存，重启定时器
    if (updated.enabled) {
      this.startAutoSave(updated.intervalMs);
    } else {
      this.stopAutoSave();
    }
    
    return updated;
  }

  /**
   * 启动自动保存
   */
  startAutoSave(intervalMs?: number): void {
    this.stopAutoSave();
    
    const config = this.getAutoSaveConfig();
    if (!config.enabled) return;
    
    const interval = intervalMs || config.intervalMs;
    
    // 保存最后保存时间
    this.updateLastSaveTime();
    
    this.autoSaveTimer = setInterval(() => {
      const backup = this.createBackup('自动备份');
      this.saveToLocal(backup);
      this.updateLastSaveTime();
      console.log('[AutoSave] 定时保存完成');
    }, interval);
    
    console.log(`[AutoSave] 已启动，间隔 ${interval / 1000} 秒`);
  }

  /**
   * 停止自动保存
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('[AutoSave] 已停止');
    }
  }

  /**
   * 更新最后保存时间
   */
  updateLastSaveTime(): void {
    localStorage.setItem(LAST_SAVE_KEY, new Date().toISOString());
  }

  /**
   * 获取最后保存时间
   */
  getLastSaveTime(): string | null {
    return localStorage.getItem(LAST_SAVE_KEY);
  }

  /**
   * 手动触发保存
   */
  manualSave(): BackupData {
    const backup = this.createBackup('手动保存');
    this.saveToLocal(backup);
    this.updateLastSaveTime();
    return backup;
  }

  /**
   * 获取备份统计信息
   */
  getBackupStats(): {
    totalBackups: number;
    totalSize: number;
    oldestBackup: string | null;
    newestBackup: string | null;
    lastSaveTime: string | null;
  } {
    const backups = this.getLocalBackups();
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    const lastSaveTime = this.getLastSaveTime();
    
    return {
      totalBackups: backups.length,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].createdAt : null,
      newestBackup: backups.length > 0 ? backups[0].createdAt : null,
      lastSaveTime,
    };
  }

  /**
   * 导出所有数据（完整版，包含 API Key 提示）
   */
  async exportAllDataWithApiKeys(): Promise<string> {
    const apiConfigStore = useAPIConfigStore.getState();
    
    // 创建包含所有数据的备份
    const backup = this.createBackup('完整导出');
    
    // 重新添加 API Key 信息（带警告）
    const providers = apiConfigStore.providers;
    const apiKeysPresent = providers.some(p => p.apiKey);
    
    if (apiKeysPresent) {
      console.warn('[Backup] 警告: 备份包含 API Key，请妥善保管备份文件');
    }
    
    return JSON.stringify(backup, null, 2);
  }
}

// 导出单例
export const dataBackupService = new DataBackupService();
