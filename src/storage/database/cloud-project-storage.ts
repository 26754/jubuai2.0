// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端项目存储模块
 * 使用 Express API Server 直连 Supabase PostgreSQL 实现项目数据的云端同步
 */

import { getSupabaseClient } from './supabase-client';
import type { Project } from '@/stores/project-store';
import type { ScriptData } from '@/types/script';

// ==================== API 基础 URL ====================

const getApiBaseUrl = (): string => {
  // 在开发环境中使用代理，在生产环境中使用相对路径
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  return '';
};

// ==================== 认证头 ====================

const getAuthHeaders = (userId: string): HeadersInit => {
  return {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
  };
};

// ==================== API 请求封装 ====================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  userId: string
): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(userId),
      ...options.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || `API request failed: ${response.status}`);
  }
  
  return data.data;
}

// ==================== 项目 CRUD ====================

/**
 * 获取用户的云端项目列表
 */
export async function getCloudProjects(): Promise<Project[]> {
  const supabase = getSupabaseClient();
  
  // 获取当前登录用户的 ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('[CloudStorage] User not logged in, skipping cloud fetch');
    return [];
  }
  
  try {
    const projects = await apiRequest<any[]>('/api/sync/projects', {}, user.id);
    return projects.map(mapCloudProjectToProject);
  } catch (error) {
    console.error('[CloudStorage] Failed to get projects:', error);
    return [];
  }
}

/**
 * 获取单个云端项目
 */
export async function getCloudProject(projectId: string): Promise<Project | null> {
  const supabase = getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('用户未登录');
  }
  
  try {
    const project = await apiRequest<any>(`/api/sync/projects/${projectId}`, {}, user.id);
    return project ? mapCloudProjectToProject(project) : null;
  } catch (error) {
    console.error('[CloudStorage] Failed to get project:', error);
    return null;
  }
}

/**
 * 获取云端项目的剧本数据
 */
export async function getCloudScriptData(projectId: string): Promise<ScriptData | null> {
  const project = await getCloudProject(projectId);
  return project?.scriptData || null;
}

/**
 * 创建云端项目
 */
export async function createCloudProject(project: Project, scriptData?: ScriptData): Promise<Project> {
  const supabase = getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('用户未登录，无法创建云端项目');
  }
  
  const cloudProject = {
    id: project.id,
    name: project.name,
    script_data: scriptData || project.scriptData || {},
    created_at: project.createdAt || new Date().toISOString(),
    updated_at: project.updatedAt || new Date().toISOString(),
  };
  
  const result = await apiRequest<any>('/api/sync/projects', {
    method: 'POST',
    body: JSON.stringify(cloudProject),
  }, user.id);
  
  return mapCloudProjectToProject(result);
}

/**
 * 更新云端项目
 */
export async function updateCloudProject(project: Project, scriptData?: ScriptData): Promise<Project> {
  return createCloudProject(project, scriptData); // upsert
}

/**
 * 删除云端项目
 */
export async function deleteCloudProject(projectId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('用户未登录');
  }
  
  await apiRequest(`/api/sync/projects/${projectId}`, {
    method: 'DELETE',
  }, user.id);
}

// ==================== 数据映射 ====================

function mapCloudProjectToProject(cloud: any): Project {
  return {
    id: cloud.id,
    name: cloud.name,
    scriptData: cloud.script_data || cloud.scriptData || null,
    createdAt: cloud.created_at || cloud.createdAt || new Date().toISOString(),
    updatedAt: cloud.updated_at || cloud.updatedAt || new Date().toISOString(),
  };
}

// ==================== 同步接口 ====================

export interface SyncResult {
  projects: { uploaded: number; downloaded: number };
  shots: { uploaded: number; downloaded: number };
  settings: { uploaded: boolean };
}

/**
 * 同步所有数据到云端
 */
export async function syncAllToCloud(
  localProjects: Project[],
  localShots: any[],
  localSettings: any
): Promise<SyncResult> {
  const supabase = getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('用户未登录');
  }
  
  const result: SyncResult = {
    projects: { uploaded: 0, downloaded: 0 },
    shots: { uploaded: 0, downloaded: 0 },
    settings: { uploaded: false },
  };
  
  // 同步设置
  try {
    await apiRequest('/api/sync/settings', {
      method: 'POST',
      body: JSON.stringify(localSettings),
    }, user.id);
    result.settings.uploaded = true;
  } catch (error) {
    console.error('[CloudStorage] Failed to sync settings:', error);
  }
  
  // 同步项目
  for (const project of localProjects) {
    try {
      await createCloudProject(project);
      result.projects.uploaded++;
    } catch (error) {
      console.error('[CloudStorage] Failed to sync project:', project.id, error);
    }
  }
  
  // 同步分镜
  for (const shot of localShots) {
    try {
      await apiRequest('/api/sync/shots', {
        method: 'POST',
        body: JSON.stringify(shot),
      }, user.id);
      result.shots.uploaded++;
    } catch (error) {
      console.error('[CloudStorage] Failed to sync shot:', shot.id, error);
    }
  }
  
  return result;
}

/**
 * 从云端下载所有数据
 */
export async function downloadAllFromCloud(): Promise<{
  projects: Project[];
  shots: any[];
  settings: any;
}> {
  const supabase = getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('用户未登录');
  }
  
  const [projects, shots, settings] = await Promise.all([
    getCloudProjects(),
    apiRequest<any[]>('/api/sync/shots', {}, user.id),
    apiRequest<any>('/api/sync/settings', {}, user.id).catch(() => null),
  ]);
  
  return { projects, shots, settings };
}

/**
 * 同步单个项目到云端
 */
export async function syncProjectToCloud(project: Project): Promise<Project | null> {
  const supabase = getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('用户未登录');
  }
  
  try {
    const result = await createCloudProject(project);
    return result;
  } catch (error) {
    console.error('[CloudStorage] Failed to sync project to cloud:', project.id, error);
    return null;
  }
}

/**
 * 从云端恢复项目
 */
export async function restoreProjectFromCloud(projectId: string): Promise<Project | null> {
  return getCloudProject(projectId);
}
