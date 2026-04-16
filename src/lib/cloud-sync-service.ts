// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * Cloud Auto-Sync Service
 * Automatically syncs project data to cloud when user logs in or data changes
 */

import { useProjectStore } from "@/stores/project-store";

// Storage keys
const LAST_SYNC_KEY = 'jubuai_last_sync_time';
const SYNC_SETTINGS_KEY = 'jubuai_auto_sync_enabled';

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
interface ProjectData {
  id: string;
  name: string;
  script_data?: unknown;
  active?: boolean;
  created_at?: number;
  updated_at?: number;
}

interface SyncResult {
  success: boolean;
  projectsSynced?: number;
  settingsSynced?: number;
  error?: string;
  timestamp: number;
}

/**
 * Cloud Sync Service
 */
class CloudSyncService {
  private static instance: CloudSyncService;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private lastSyncResult: SyncResult | null = null;
  private isSyncing = false;

  private constructor() {
    // Initialize sync on service creation
    this.initAutoSync();
  }

  public static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService();
    }
    return CloudSyncService.instance;
  }

  /**
   * Check if auto-sync is enabled
   * 默认返回 true（启用自动同步）
   */
  public isAutoSyncEnabled(): boolean {
    const stored = localStorage.getItem(SYNC_SETTINGS_KEY);
    // 如果没有设置，默认启用自动同步
    if (stored === null) {
      return true;
    }
    return stored === 'true';
  }

  /**
   * Enable or disable auto-sync
   */
  public setAutoSyncEnabled(enabled: boolean): void {
    localStorage.setItem(SYNC_SETTINGS_KEY, enabled ? 'true' : 'false');
    if (enabled) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  /**
   * Get sync frequency setting
   */
  public getSyncFrequency(): SyncFrequency {
    const stored = localStorage.getItem('jubuai_sync_frequency');
    return (stored as SyncFrequency) || 'manual';
  }

  /**
   * Set sync frequency
   */
  public setSyncFrequency(frequency: SyncFrequency): void {
    localStorage.setItem('jubuai_sync_frequency', frequency);
    if (this.isAutoSyncEnabled()) {
      this.restartAutoSync();
    }
  }

  /**
   * Get last sync time
   */
  public getLastSyncTime(): number | null {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? parseInt(stored, 10) : null;
  }

  /**
   * Save last sync time
   */
  private saveLastSyncTime(time: number): void {
    localStorage.setItem(LAST_SYNC_KEY, time.toString());
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
   * Sync projects to cloud
   */
  public async syncProjects(): Promise<SyncResult> {
    const headers = this.getAuthHeader();
    if (!headers) {
      return { success: false, error: '未登录', timestamp: Date.now() };
    }

    try {
      const state = useProjectStore.getState();
      const projects = state.projects;
      const activeProjectId = state.activeProjectId;

      // Get all project data
      const projectsData = projects.map(p => ({
        id: p.id,
        name: p.name,
        script_data: p.script,
        active: p.id === activeProjectId,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      }));

      // Upload to cloud
      const response = await fetch('/api/sync/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({ projects: projectsData }),
      });

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      const result = await response.json();
      console.log('[CloudSync] Projects synced:', result);

      return {
        success: true,
        projectsSynced: projectsData.length,
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步失败';
      console.error('[CloudSync] Projects sync failed:', error);
      return { success: false, error: errorMessage, timestamp: Date.now() };
    }
  }

  /**
   * Sync settings to cloud
   */
  public async syncSettings(): Promise<SyncResult> {
    const headers = this.getAuthHeader();
    if (!headers) {
      return { success: false, error: '未登录', timestamp: Date.now() };
    }

    try {
      // Get API configs and other settings
      const apiConfigs = localStorage.getItem('jubuai_api_configs');
      const visualStyleId = localStorage.getItem('jubuai_visual_style_id');
      const theme = localStorage.getItem('jubuai_theme');

      const settingsData = {
        apiConfigs: apiConfigs ? JSON.parse(apiConfigs) : null,
        visualStyleId,
        theme,
      };

      // Upload to cloud
      const response = await fetch('/api/sync/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(settingsData),
      });

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      return {
        success: true,
        settingsSynced: 1,
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步失败';
      console.error('[CloudSync] Settings sync failed:', error);
      return { success: false, error: errorMessage, timestamp: Date.now() };
    }
  }

  /**
   * Fetch projects from cloud
   */
  public async fetchProjectsFromCloud(): Promise<{ success: boolean; projects?: ProjectData[]; error?: string }> {
    const headers = this.getAuthHeader();
    if (!headers) {
      return { success: false, error: '未登录' };
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
      return { success: true, projects: Array.isArray(data) ? data as ProjectData[] : [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取失败';
      console.error('[CloudSync] Fetch projects failed:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Fetch settings from cloud
   */
  public async fetchSettingsFromCloud(): Promise<{ success: boolean; settings?: Record<string, unknown>; error?: string }> {
    const headers = this.getAuthHeader();
    if (!headers) {
      return { success: false, error: '未登录' };
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
      return { success: true, settings: data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取失败';
      console.error('[CloudSync] Fetch settings failed:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Perform full sync (upload + download merge)
   */
  public async performFullSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, error: '同步进行中', timestamp: Date.now() };
    }

    this.isSyncing = true;

    try {
      // First, upload local data to cloud
      const uploadResult = await this.syncProjects();
      if (!uploadResult.success) {
        this.isSyncing = false;
        return uploadResult;
      }

      // Then fetch cloud data for merging (for future merge logic)
      await this.fetchProjectsFromCloud();
      
      const result: SyncResult = {
        success: true,
        projectsSynced: uploadResult.projectsSynced || 0,
        settingsSynced: uploadResult.settingsSynced || 0,
        timestamp: Date.now(),
      };

      // Save sync time
      this.saveLastSyncTime(Date.now());
      this.lastSyncResult = result;

      // Silent log only in development
      if (import.meta.env.DEV) {
        console.log('[CloudSync] Full sync completed:', result);
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步失败';
      // Silent fail - don't log errors in production
      if (import.meta.env.DEV) {
        console.error('[CloudSync] Sync failed:', errorMessage);
      }
      return { success: false, error: errorMessage, timestamp: Date.now() };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Silent sync - performs sync without any user feedback
   * Used for automatic background syncs
   */
  public async silentSync(): Promise<void> {
    if (!this.isAutoSyncEnabled()) return;
    
    try {
      await this.performFullSync();
    } catch {
      // Silent fail - no user notification
    }
  }

  /**
   * Debounced silent sync - prevents rapid successive syncs
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
   * Initialize auto-sync
   */
  public initAutoSync(): void {
    // Check if user is already logged in
    const token = localStorage.getItem('jubuai_jwt_token');
    if (token && this.isAutoSyncEnabled()) {
      // Silent sync on page load
      this.silentSync();
      this.startAutoSync();
    }
  }

  /**
   * Start auto-sync timer
   */
  public startAutoSync(): void {
    // Stop any existing timer
    this.stopAutoSync();

    const frequency = this.getSyncFrequency();
    if (frequency === 'manual') {
      return;
    }

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
      console.log('[CloudSync] Auto-sync stopped');
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
   * Get last sync result
   */
  public getLastSyncResult(): SyncResult | null {
    return this.lastSyncResult;
  }

  /**
   * Check if currently syncing
   */
  public getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

// Export singleton instance
export const cloudSyncService = CloudSyncService.getInstance();

// Export types
export type { SyncResult, SyncFrequency };
