// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端用户设置存储模块
 * 处理用户设置数据的云端同步
 */

import { getSupabaseClient } from './supabase-client';

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
    syncInterval: 30000, // 30秒
  },
};

/**
 * 获取云端用户设置
 */
export async function getCloudUserSettings(): Promise<UserSettings | null> {
  const supabase = getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // 没有找到记录，返回 null
      return null;
    }
    console.error('[CloudSettings] Failed to get settings:', error);
    return null;
  }
  
  return data as UserSettings;
}

/**
 * 创建云端用户设置
 */
export async function createCloudUserSettings(settings: Partial<UserSettings>): Promise<UserSettings | null> {
  const supabase = getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  
  const now = new Date().toISOString();
  const newSettings = {
    user_id: user.id,
    theme: settings.theme || DEFAULT_SETTINGS.theme,
    language: settings.language || DEFAULT_SETTINGS.language,
    api_configs: settings.api_configs || DEFAULT_SETTINGS.api_configs,
    editor_settings: settings.editor_settings || DEFAULT_SETTINGS.editor_settings,
    sync_preferences: settings.sync_preferences || DEFAULT_SETTINGS.sync_preferences,
    created_at: now,
    updated_at: now,
  };
  
  const { data, error } = await supabase
    .from('user_settings')
    .insert(newSettings)
    .select()
    .single();
  
  if (error) {
    console.error('[CloudSettings] Failed to create settings:', error);
    return null;
  }
  
  console.log('[CloudSettings] Settings created for user:', user.id);
  return data as UserSettings;
}

/**
 * 更新云端用户设置
 */
export async function updateCloudUserSettings(updates: Partial<UserSettings>): Promise<UserSettings | null> {
  const supabase = getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  
  if (updates.theme !== undefined) updateData.theme = updates.theme;
  if (updates.language !== undefined) updateData.language = updates.language;
  if (updates.api_configs !== undefined) updateData.api_configs = updates.api_configs;
  if (updates.editor_settings !== undefined) updateData.editor_settings = updates.editor_settings;
  if (updates.sync_preferences !== undefined) updateData.sync_preferences = updates.sync_preferences;
  
  const { data, error } = await supabase
    .from('user_settings')
    .update(updateData)
    .eq('user_id', user.id)
    .select()
    .single();
  
  if (error) {
    console.error('[CloudSettings] Failed to update settings:', error);
    return null;
  }
  
  console.log('[CloudSettings] Settings updated for user:', user.id);
  return data as UserSettings;
}

/**
 * 同步用户设置到云端
 * 如果云端没有设置，则创建；否则更新
 */
export async function syncSettingsToCloud(settings: Partial<UserSettings>): Promise<UserSettings | null> {
  const existing = await getCloudUserSettings();
  
  if (existing) {
    return await updateCloudUserSettings(settings);
  } else {
    return await createCloudUserSettings(settings);
  }
}
