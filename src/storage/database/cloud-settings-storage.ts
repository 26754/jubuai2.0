// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端用户设置存储模块
 * 使用自定义 JWT 认证实现用户设置数据的云端同步
 */

import { cloudAuth } from '@/lib/cloud-auth';

export interface UserSettings {
  id?: string;
  user_id?: string;
  theme: string;
  language: string;
  api_configs: Record<string, any>;
  editor_settings: Record<string, any>;
  sync_preferences: {
    autoSync: boolean;
    syncInterval: number;
  };
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  language: 'zh-CN',
  api_configs: {},
  editor_settings: {},
  sync_preferences: {
    autoSync: true,
    syncInterval: 30000,
  },
};

// ==================== API 基础 URL ====================

const getApiBaseUrl = (): string => {
  return '';
};

// ==================== 认证头 ====================

const getAuthHeaders = (): HeadersInit => {
  return {
    'Content-Type': 'application/json',
    ...cloudAuth.getAuthHeader(),
  };
};

// ==================== API 请求封装 ====================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint}`;

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

/**
 * 获取云端用户设置
 */
export async function getCloudUserSettings(): Promise<UserSettings | null> {
  try {
    const settings = await apiRequest<UserSettings | null>('/api/sync/settings', {});
    return settings;
  } catch (error) {
    console.error('[CloudSettings] Failed to get settings:', error);
    return null;
  }
}

/**
 * 创建云端用户设置
 */
export async function createCloudUserSettings(settings: Partial<UserSettings>): Promise<UserSettings | null> {
  const now = new Date().toISOString();
  const newSettings = {
    theme: settings.theme || DEFAULT_SETTINGS.theme,
    language: settings.language || DEFAULT_SETTINGS.language,
    api_configs: settings.api_configs || DEFAULT_SETTINGS.api_configs,
    editor_settings: settings.editor_settings || DEFAULT_SETTINGS.editor_settings,
    sync_preferences: settings.sync_preferences || DEFAULT_SETTINGS.sync_preferences,
  };

  try {
    const result = await apiRequest<UserSettings>('/api/sync/settings', {
      method: 'POST',
      body: JSON.stringify(newSettings),
    });

    console.log('[CloudSettings] Settings created');
    return result;
  } catch (error) {
    console.error('[CloudSettings] Failed to create settings:', error);
    return null;
  }
}

/**
 * 更新云端用户设置
 */
export async function updateCloudUserSettings(updates: Partial<UserSettings>): Promise<UserSettings | null> {
  const updateData: Record<string, any> = {};

  if (updates.theme !== undefined) updateData.theme = updates.theme;
  if (updates.language !== undefined) updateData.language = updates.language;
  if (updates.api_configs !== undefined) updateData.api_configs = updates.api_configs;
  if (updates.editor_settings !== undefined) updateData.editor_settings = updates.editor_settings;
  if (updates.sync_preferences !== undefined) updateData.sync_preferences = updates.sync_preferences;

  try {
    const result = await apiRequest<UserSettings>('/api/sync/settings', {
      method: 'POST',
      body: JSON.stringify(updateData),
    });

    console.log('[CloudSettings] Settings updated');
    return result;
  } catch (error) {
    console.error('[CloudSettings] Failed to update settings:', error);
    return null;
  }
}

/**
 * 同步用户设置到云端
 */
export async function syncSettingsToCloud(settings: Partial<UserSettings>): Promise<UserSettings | null> {
  const existing = await getCloudUserSettings();

  if (existing) {
    return await updateCloudUserSettings(settings);
  } else {
    return await createCloudUserSettings(settings);
  }
}
