// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端项目存储模块
 * 使用自定义 JWT 认证实现项目数据的云端同步
 */

import { cloudAuth } from '@/lib/cloud-auth';
import type { Project } from '@/stores/project-store';
import type { ScriptData } from '@/types/script';

// ==================== API 基础 URL ====================

const getApiBaseUrl = (): string => {
  // 使用相对路径，由服务器处理
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

// ==================== 项目 CRUD ====================

/**
 * 获取用户的云端项目列表
 */
export async function getCloudProjects(): Promise<Project[]> {
  try {
    const projects = await apiRequest<any[]>('/api/sync/projects', {});
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
  try {
    const project = await apiRequest<any>(`/api/sync/projects/${projectId}`, {});
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
  });

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
  await apiRequest(`/api/sync/projects/${projectId}`, {
    method: 'DELETE',
  });
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
    });
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
      });
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
  const [projects, shots, settings] = await Promise.all([
    getCloudProjects(),
    apiRequest<any[]>('/api/sync/shots', {}).catch(() => []),
    apiRequest<any>('/api/sync/settings', {}).catch(() => null),
  ]);

  return {
    projects,
    shots,
    settings,
  };
}
