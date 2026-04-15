/**
 * 服务端直连数据库云存储模块
 * 通过 Express API Server 访问 Supabase PostgreSQL 数据库
 */

import type { Project, Shot } from '@/types';

// API 基础 URL（服务端运行在 5000 端口）
const getApiBaseUrl = () => {
  // 在浏览器环境中使用相对路径（通过 Vite 代理或生产环境服务器）
  if (typeof window !== 'undefined') {
    return '';
  }
  return 'http://localhost:5000';
};

/**
 * 获取认证头
 */
const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // 从 localStorage 获取用户 ID
  if (typeof window !== 'undefined') {
    const userId = localStorage.getItem('jubuai-user-id');
    if (userId) {
      headers['X-User-Id'] = userId;
    }
  }
  
  return headers;
};

/**
 * API 请求封装
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
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

// ==================== Projects API ====================

/**
 * 获取所有项目
 */
export async function fetchProjects(): Promise<Project[]> {
  return apiRequest<Project[]>('/api/sync/projects');
}

/**
 * 获取单个项目
 */
export async function fetchProject(id: string): Promise<Project | null> {
  try {
    return await apiRequest<Project>(`/api/sync/projects/${id}`);
  } catch {
    return null;
  }
}

/**
 * 保存项目（创建或更新）
 */
export async function saveProject(project: Project): Promise<Project> {
  return apiRequest<Project>('/api/sync/projects', {
    method: 'POST',
    body: JSON.stringify({
      id: project.id,
      name: project.name,
      script_data: project.scriptData || project.script_data || {},
      created_at: project.createdAt || project.created_at,
      updated_at: project.updatedAt || project.updated_at || new Date().toISOString(),
    }),
  });
}

/**
 * 删除项目
 */
export async function deleteProject(id: string): Promise<void> {
  await apiRequest(`/api/sync/projects/${id}`, {
    method: 'DELETE',
  });
}

// ==================== Shots API ====================

/**
 * 获取项目的所有分镜
 */
export async function fetchShots(projectId?: string): Promise<Shot[]> {
  const query = projectId ? `?project_id=${projectId}` : '';
  return apiRequest<Shot[]>(`/api/sync/shots${query}`);
}

/**
 * 保存分镜（创建或更新）
 */
export async function saveShot(shot: Shot): Promise<Shot> {
  return apiRequest<Shot>('/api/sync/shots', {
    method: 'POST',
    body: JSON.stringify({
      id: shot.id,
      project_id: shot.projectId || shot.project_id,
      episode_id: shot.episodeId || shot.episode_id,
      scene_id: shot.sceneId || shot.scene_id,
      index_data: shot.indexData || shot.index_data || {},
      content: shot.content || {},
      camera: shot.camera || {},
      status: shot.status || 'draft',
      created_at: shot.createdAt || shot.created_at,
      updated_at: shot.updatedAt || shot.updated_at || new Date().toISOString(),
    }),
  });
}

/**
 * 批量保存分镜
 */
export async function saveShotsBatch(shots: Shot[]): Promise<Shot[]> {
  return apiRequest<Shot[]>('/api/sync/shots/batch', {
    method: 'POST',
    body: JSON.stringify({ shots }),
  });
}

/**
 * 删除分镜
 */
export async function deleteShot(id: string): Promise<void> {
  await apiRequest(`/api/sync/shots/${id}`, {
    method: 'DELETE',
  });
}

// ==================== User Settings API ====================

export interface UserSettings {
  theme?: string;
  language?: string;
  api_configs?: Record<string, any>;
  editor_settings?: Record<string, any>;
  sync_preferences?: Record<string, any>;
  user_id?: string;
}

/**
 * 获取用户设置
 */
export async function fetchUserSettings(): Promise<UserSettings | null> {
  return apiRequest<UserSettings | null>('/api/sync/settings');
}

/**
 * 保存用户设置
 */
export async function saveUserSettings(settings: UserSettings): Promise<UserSettings> {
  return apiRequest<UserSettings>('/api/sync/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

// ==================== 批量同步 ====================

export interface SyncResult {
  projects: { uploaded: number; downloaded: number };
  shots: { uploaded: number; downloaded: number };
  settings: { uploaded: boolean };
}

/**
 * 批量同步所有数据
 */
export async function syncAllData(
  localProjects: Project[],
  localShots: Shot[],
  localSettings: UserSettings
): Promise<SyncResult> {
  const result: SyncResult = {
    projects: { uploaded: 0, downloaded: 0 },
    shots: { uploaded: 0, downloaded: 0 },
    settings: { uploaded: false },
  };
  
  // 1. 同步设置
  try {
    await saveUserSettings(localSettings);
    result.settings.uploaded = true;
  } catch (error) {
    console.error('[CloudSync] Failed to sync settings:', error);
  }
  
  // 2. 同步项目
  try {
    const cloudProjects = await fetchProjects();
    const cloudProjectMap = new Map(cloudProjects.map(p => [p.id, p]));
    
    // 上传本地项目
    for (const project of localProjects) {
      const cloudProject = cloudProjectMap.get(project.id);
      
      // 比较更新时间，本地较新则上传
      const localTime = new Date(project.updatedAt || project.updated_at || 0).getTime();
      const cloudTime = new Date(cloudProject?.updatedAt || cloudProject?.updated_at || 0).getTime();
      
      if (!cloudProject || localTime > cloudTime) {
        await saveProject(project);
        result.projects.uploaded++;
      } else if (localTime < cloudTime) {
        result.projects.downloaded++;
      }
    }
    
    // 下载云端独有的项目
    for (const cloudProject of cloudProjects) {
      const localExists = localProjects.some(p => p.id === cloudProject.id);
      if (!localExists) {
        result.projects.downloaded++;
      }
    }
  } catch (error) {
    console.error('[CloudSync] Failed to sync projects:', error);
  }
  
  // 3. 同步分镜
  try {
    const cloudShots = await fetchShots();
    const cloudShotsMap = new Map(cloudShots.map(s => [s.id, s]));
    
    // 上传本地分镜
    for (const shot of localShots) {
      const cloudShot = cloudShotsMap.get(shot.id);
      
      const localTime = new Date(shot.updatedAt || shot.updated_at || 0).getTime();
      const cloudTime = new Date(cloudShot?.updatedAt || cloudShot?.updated_at || 0).getTime();
      
      if (!cloudShot || localTime > cloudTime) {
        await saveShot(shot);
        result.shots.uploaded++;
      } else if (localTime < cloudTime) {
        result.shots.downloaded++;
      }
    }
  } catch (error) {
    console.error('[CloudSync] Failed to sync shots:', error);
  }
  
  return result;
}

/**
 * 检查服务是否可用
 */
export async function checkServiceHealth(): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}
