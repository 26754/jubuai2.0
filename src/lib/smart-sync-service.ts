// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * Smart Cloud Sync Service
 * Implements incremental sync and intelligent merge for cross-device synchronization
 * Includes both project data and user settings sync
 */

import { useProjectStore, type Project } from '@/stores/project-store';

// Storage keys
const SYNC_SETTINGS_KEY = 'jubuai_auto_sync_enabled';
const SYNC_FREQUENCY_KEY = 'jubuai_sync_frequency';
const LOCAL_SYNC_INDEX = 'jubuai_sync_index';

// Settings to sync (keys in localStorage)
const SYNCABLE_SETTINGS_KEYS = [
  'jubuai-api-configs',      // API Provider configurations
  'jubuai-theme',             // Theme (dark/light)
  'i18nextLng',              // Language preference
  'jubuai_visual_style_id',  // Last selected visual style
  'jubuai_last_selected_style',
];

// Sync interval constants (in milliseconds)
const SYNC_INTERVALS = {
  manual: 0,
  '5min': 5 * 60 * 1000,
  '15min': 15 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
};

type SyncFrequency = keyof typeof SYNC_INTERVALS;

// Data types
interface ProjectSyncData {
  id: string;
  name: string;
  script_data?: unknown;
  created_at: number;
  updated_at: number;
}

interface SettingsSyncData {
  key: string;
  value: string;
  updated_at: number;
}

interface SyncIndex {
  projects: Record<string, {
    localUpdatedAt: number;
    cloudUpdatedAt: number;
    syncedAt: number;
  }>;
  settings: Record<string, {
    localUpdatedAt: number;
    syncedAt: number;
  }>;
  lastSyncAt: number;
}

interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  settingsUploaded: number;
  settingsDownloaded: number;
  conflicts: number;
  error?: string;
  timestamp: number;
}

// Sync service class
class SmartSyncService {
  private static instance: SmartSyncService;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private syncIndex: SyncIndex = { projects: {}, settings: {}, lastSyncAt: 0 };
  private lastSyncResult: SyncResult | null = null;

  private constructor() {
    this.loadSyncIndex();
  }

  public static getInstance(): SmartSyncService {
    if (!SmartSyncService.instance) {
      SmartSyncService.instance = new SmartSyncService();
    }
    return SmartSyncService.instance;
  }

  /**
   * Load sync index from localStorage
   */
  private loadSyncIndex(): void {
    try {
      const stored = localStorage.getItem(LOCAL_SYNC_INDEX);
      if (stored) {
        this.syncIndex = JSON.parse(stored);
      }
    } catch {
      this.syncIndex = { projects: {}, settings: {}, lastSyncAt: 0 };
    }
  }

  /**
   * Save sync index to localStorage
   */
  private saveSyncIndex(): void {
    localStorage.setItem(LOCAL_SYNC_INDEX, JSON.stringify(this.syncIndex));
  }

  /**
   * Get auth header for API requests
   */
  private getAuthHeader(): HeadersInit | null {
    const token = localStorage.getItem('jubuai_jwt_token');
    if (!token) return null;
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Check if auto-sync is enabled
   */
  public isAutoSyncEnabled(): boolean {
    const stored = localStorage.getItem(SYNC_SETTINGS_KEY);
    if (stored === null) return true; // Default: enabled
    return stored === 'true';
  }

  /**
   * Get sync frequency
   */
  public getSyncFrequency(): SyncFrequency {
    const stored = localStorage.getItem(SYNC_FREQUENCY_KEY);
    return (stored as SyncFrequency) || '15min';
  }

  /**
   * Set sync frequency
   */
  public setSyncFrequency(frequency: SyncFrequency): void {
    localStorage.setItem(SYNC_FREQUENCY_KEY, frequency);
    if (this.isAutoSyncEnabled()) {
      this.restartAutoSync();
    }
  }

  /**
   * Get last sync timestamp
   */
  public getLastSyncTime(): number {
    return this.syncIndex.lastSyncAt || 0;
  }

  /**
   * Check if data needs sync (incremental sync)
   */
  private needsSync(projectId: string, localUpdatedAt: number): boolean {
    const index = this.syncIndex.projects[projectId];
    if (!index) return true; // New project
    return localUpdatedAt > index.syncedAt;
  }

  /**
   * Convert project to sync format
   */
  private projectToSyncData(project: Project): ProjectSyncData {
    return {
      id: project.id,
      name: project.name,
      script_data: project.script,
      created_at: project.createdAt,
      updated_at: project.updatedAt,
    };
  }

  /**
   * Sync projects to cloud (upload)
   */
  private async uploadProjects(projects: Project[]): Promise<{
    success: boolean;
    uploaded: number;
    error?: string;
  }> {
    const headers = this.getAuthHeader();
    if (!headers) {
      return { success: false, uploaded: 0, error: '未登录' };
    }

    // Filter projects that need sync
    const projectsToUpload = projects.filter(p => 
      this.needsSync(p.id, p.updatedAt)
    );

    if (projectsToUpload.length === 0) {
      return { success: true, uploaded: 0 };
    }

    try {
      const syncData = projectsToUpload.map(p => this.projectToSyncData(p));
      
      const response = await fetch('/api/sync/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({ projects: syncData }),
      });

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      // Update sync index
      const now = Date.now();
      for (const project of projectsToUpload) {
        if (!this.syncIndex.projects[project.id]) {
          this.syncIndex.projects[project.id] = {
            localUpdatedAt: 0,
            cloudUpdatedAt: 0,
            syncedAt: 0,
          };
        }
        this.syncIndex.projects[project.id].localUpdatedAt = project.updatedAt;
        this.syncIndex.projects[project.id].syncedAt = now;
      }
      this.syncIndex.lastSyncAt = now;
      this.saveSyncIndex();

      return { success: true, uploaded: projectsToUpload.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      return { success: false, uploaded: 0, error: errorMessage };
    }
  }

  /**
   * Fetch projects from cloud (download)
   */
  private async downloadProjects(): Promise<{
    success: boolean;
    projects: ProjectSyncData[];
    error?: string;
  }> {
    const headers = this.getAuthHeader();
    if (!headers) {
      return { success: false, projects: [], error: '未登录' };
    }

    try {
      const response = await fetch('/api/sync/projects', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      const data = await response.json();
      const projects: ProjectSyncData[] = Array.isArray(data) ? data : [];
      
      return { success: true, projects };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取失败';
      return { success: false, projects: [], error: errorMessage };
    }
  }

  /**
   * Get all syncable settings from localStorage
   */
  private getLocalSettings(): SettingsSyncData[] {
    const settings: SettingsSyncData[] = [];
    const now = Date.now();
    
    for (const key of SYNCABLE_SETTINGS_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        settings.push({
          key,
          value,
          updated_at: now, // Use sync time as approximation
        });
      }
    }
    
    return settings;
  }

  /**
   * Upload settings to cloud
   */
  private async uploadSettings(settings: SettingsSyncData[]): Promise<{
    success: boolean;
    uploaded: number;
    error?: string;
  }> {
    const headers = this.getAuthHeader();
    if (!headers) {
      return { success: false, uploaded: 0, error: '未登录' };
    }

    if (settings.length === 0) {
      return { success: true, uploaded: 0 };
    }

    try {
      const response = await fetch('/api/sync/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      // Update sync index
      const now = Date.now();
      for (const setting of settings) {
        if (!this.syncIndex.settings[setting.key]) {
          this.syncIndex.settings[setting.key] = {
            localUpdatedAt: 0,
            syncedAt: 0,
          };
        }
        this.syncIndex.settings[setting.key].syncedAt = now;
      }
      this.saveSyncIndex();

      return { success: true, uploaded: settings.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      return { success: false, uploaded: 0, error: errorMessage };
    }
  }

  /**
   * Download settings from cloud
   */
  private async downloadSettings(): Promise<{
    success: boolean;
    settings: SettingsSyncData[];
    error?: string;
  }> {
    const headers = this.getAuthHeader();
    if (!headers) {
      return { success: false, settings: [], error: '未登录' };
    }

    try {
      const response = await fetch('/api/sync/settings', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      const data = await response.json();
      const settings: SettingsSyncData[] = data?.settings || [];
      
      return { success: true, settings };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取失败';
      return { success: false, settings: [], error: errorMessage };
    }
  }

  /**
   * Merge and apply settings from cloud
   */
  private mergeAndApplySettings(cloudSettings: SettingsSyncData[]): number {
    let applied = 0;
    
    for (const setting of cloudSettings) {
      // Get local value
      const localValue = localStorage.getItem(setting.key);
      
      // If local doesn't have this setting, or cloud is newer (cloud settings are always newer on download)
      if (localValue === null) {
        // Apply cloud setting
        localStorage.setItem(setting.key, setting.value);
        applied++;
        
        // Update sync index
        if (!this.syncIndex.settings[setting.key]) {
          this.syncIndex.settings[setting.key] = {
            localUpdatedAt: 0,
            syncedAt: 0,
          };
        }
        this.syncIndex.settings[setting.key].syncedAt = setting.updated_at;
      }
    }
    
    if (applied > 0) {
      this.saveSyncIndex();
    }
    
    return applied;
  }

  /**
   * Merge local and cloud projects
   * Strategy: Keep the most recently updated version
   */
  private mergeProjects(
    localProjects: Project[],
    cloudProjects: ProjectSyncData[]
  ): {
    merged: Project[];
    conflicts: number;
  } {
    const merged: Project[] = [...localProjects];
    const cloudMap = new Map(cloudProjects.map(p => [p.id, p]));
    let conflicts = 0;

    for (const cloudProject of cloudProjects) {
      const localIndex = merged.findIndex(p => p.id === cloudProject.id);

      if (localIndex === -1) {
        // Project exists only in cloud - add to local
        merged.push(this.cloudProjectToLocal(cloudProject));
      } else {
        // Project exists in both - check which is newer
        const localProject = merged[localIndex];
        const localUpdatedAt = localProject.updatedAt;
        const cloudUpdatedAt = cloudProject.updated_at;

        if (cloudUpdatedAt > localUpdatedAt) {
          // Cloud version is newer - update local
          merged[localIndex] = {
            ...this.cloudProjectToLocal(cloudProject),
            // Preserve local-only fields
            visualStyleId: localProject.visualStyleId,
            visualStyleLocked: localProject.visualStyleLocked,
          };
          conflicts++;
        } else if (cloudUpdatedAt === localUpdatedAt) {
          // Same timestamp - keep local (could merge other fields)
          conflicts++;
        }
        // If local is newer, keep local version
      }

      // Update sync index
      if (!this.syncIndex.projects[cloudProject.id]) {
        this.syncIndex.projects[cloudProject.id] = {
          localUpdatedAt: 0,
          cloudUpdatedAt: 0,
          syncedAt: 0,
        };
      }
      this.syncIndex.projects[cloudProject.id].cloudUpdatedAt = cloudProject.updated_at;
      this.syncIndex.projects[cloudProject.id].syncedAt = Date.now();
    }

    // Mark local-only projects as needing sync
    for (const localProject of localProjects) {
      if (!cloudMap.has(localProject.id)) {
        if (!this.syncIndex.projects[localProject.id]) {
          this.syncIndex.projects[localProject.id] = {
            localUpdatedAt: 0,
            cloudUpdatedAt: 0,
            syncedAt: 0,
          };
        }
        this.syncIndex.projects[localProject.id].localUpdatedAt = localProject.updatedAt;
      }
    }

    return { merged, conflicts };
  }

  /**
   * Convert cloud project format to local project format
   */
  private cloudProjectToLocal(cloudProject: ProjectSyncData): Project {
    return {
      id: cloudProject.id,
      name: cloudProject.name,
      script: cloudProject.script_data as Project['script'] || {},
      createdAt: cloudProject.created_at,
      updatedAt: cloudProject.updated_at,
    };
  }

  /**
   * Perform full sync with smart merge (projects + settings)
   */
  public async performSmartSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { 
        success: false, 
        uploaded: 0, 
        downloaded: 0,
        settingsUploaded: 0,
        settingsDownloaded: 0,
        conflicts: 0, 
        error: '同步进行中', 
        timestamp: Date.now() 
      };
    }

    const headers = this.getAuthHeader();
    if (!headers) {
      return { 
        success: false, 
        uploaded: 0, 
        downloaded: 0,
        settingsUploaded: 0,
        settingsDownloaded: 0,
        conflicts: 0, 
        error: '未登录', 
        timestamp: Date.now() 
      };
    }

    this.isSyncing = true;
    let settingsUploaded = 0;
    let settingsDownloaded = 0;

    try {
      // ===== 1. Sync Projects =====
      const projectStore = useProjectStore.getState();
      const localProjects = projectStore.projects;

      // Upload local changes first
      const uploadResult = await this.uploadProjects(localProjects);
      if (!uploadResult.success) {
        this.isSyncing = false;
        return { 
          success: false, 
          uploaded: 0, 
          downloaded: 0,
          settingsUploaded: 0,
          settingsDownloaded: 0,
          conflicts: 0, 
          error: uploadResult.error, 
          timestamp: Date.now() 
        };
      }

      // Download cloud projects
      const downloadResult = await this.downloadProjects();
      if (!downloadResult.success) {
        this.isSyncing = false;
        return { 
          success: false, 
          uploaded: uploadResult.uploaded, 
          downloaded: 0,
          settingsUploaded: 0,
          settingsDownloaded: 0,
          conflicts: 0, 
          error: downloadResult.error, 
          timestamp: Date.now() 
        };
      }

      // Merge projects
      const { merged, conflicts } = this.mergeProjects(localProjects, downloadResult.projects);

      // Update local store if there are changes
      if (merged.length !== localProjects.length || conflicts > 0) {
        projectStore.syncProjects(merged);
      }

      // ===== 2. Sync Settings =====
      // Upload local settings
      const localSettings = this.getLocalSettings();
      const settingsUploadResult = await this.uploadSettings(localSettings);
      settingsUploaded = settingsUploadResult.uploaded;

      // Download cloud settings
      const settingsDownloadResult = await this.downloadSettings();
      if (settingsDownloadResult.success) {
        settingsDownloaded = this.mergeAndApplySettings(settingsDownloadResult.settings);
      }

      // Update sync index
      this.syncIndex.lastSyncAt = Date.now();
      this.saveSyncIndex();

      if (import.meta.env.DEV) {
        console.log('[SmartSync] Full sync completed:', {
          projectsUploaded: uploadResult.uploaded,
          projectsDownloaded: downloadResult.projects.length,
          settingsUploaded,
          settingsDownloaded,
          conflicts,
        });
      }

      return { 
        success: true, 
        uploaded: uploadResult.uploaded, 
        downloaded: downloadResult.projects.length,
        settingsUploaded,
        settingsDownloaded,
        conflicts,
        timestamp: Date.now() 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步失败';
      if (import.meta.env.DEV) {
        console.error('[SmartSync] Sync failed:', errorMessage);
      }
      return { 
        success: false, 
        uploaded: 0, 
        downloaded: 0,
        settingsUploaded: 0,
        settingsDownloaded: 0,
        conflicts: 0, 
        error: errorMessage, 
        timestamp: Date.now() 
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Silent sync - for background automatic sync
   */
  public async silentSync(): Promise<void> {
    if (!this.isAutoSyncEnabled()) return;
    if (!localStorage.getItem('jubuai_jwt_token')) return; // Not logged in
    
    try {
      await this.performSmartSync();
    } catch {
      // Silent fail
    }
  }

  /**
   * Debounced silent sync
   */
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  public debouncedSilentSync(delayMs: number = 3000): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.silentSync();
      this.debounceTimer = null;
    }, delayMs);
  }

  /**
   * Start auto-sync timer
   */
  public startAutoSync(): void {
    this.stopAutoSync();

    const frequency = this.getSyncFrequency();
    if (frequency === 'manual') return;

    const interval = SYNC_INTERVALS[frequency];
    if (interval > 0) {
      this.syncTimer = setInterval(() => {
        this.silentSync();
      }, interval);
    }
  }

  /**
   * Stop auto-sync timer
   */
  public stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Restart auto-sync with new settings
   */
  public restartAutoSync(): void {
    this.stopAutoSync();
    this.startAutoSync();
  }

  /**
   * Initialize sync on app start
   */
  public initialize(): void {
    const token = localStorage.getItem('jubuai_jwt_token');
    if (token && this.isAutoSyncEnabled()) {
      // Perform initial sync
      this.silentSync();
      // Start auto-sync timer
      this.startAutoSync();
    }
  }

  /**
   * Check if currently syncing
   */
  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Get last sync result
   */
  public getLastSyncResult(): SyncResult | null {
    return this.lastSyncResult;
  }

  /**
   * Set auto sync enabled/disabled
   */
  public setAutoSyncEnabled(enabled: boolean): void {
    localStorage.setItem(SYNC_SETTINGS_KEY, String(enabled));
    if (enabled) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  /**
   * Fetch projects from cloud (for UI display)
   */
  public async fetchProjectsFromCloud(): Promise<ProjectSyncData[]> {
    const headers = this.getAuthHeader();
    if (!headers) {
      return [];
    }

    try {
      const response = await fetch('/api/sync/projects', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.projects || [];
    } catch {
      return [];
    }
  }

  /**
   * Perform full sync - alias for performSmartSync
   * This method is used by use-cloud-sync hook for manual sync
   */
  public async performFullSync(): Promise<SyncResult> {
    const result = await this.performSmartSync();
    this.lastSyncResult = result;
    return result;
  }
}

// Export singleton
export const smartSyncService = SmartSyncService.getInstance();

// Export types
export type { SyncResult, SyncFrequency, ProjectSyncData, SyncIndex };
