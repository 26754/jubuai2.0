// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端项目管理器
 * 使用自定义 JWT API 实现用户项目的云端存储和同步
 */

import { cloudAuth } from './cloud-auth';

export interface CloudProject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  visualStyleId?: string;
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectData {
  projectId: string;
  dataType: string;
  data: any;
  version: number;
  updatedAt: number;
}

// API 请求封装
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = cloudAuth.getAuthHeader();
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
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
 * 云端项目管理器类
 */
export class CloudProjectManager {
  /**
   * 获取用户所有项目
   */
  async getProjects(): Promise<CloudProject[]> {
    try {
      const projects = await apiRequest<any[]>('/api/sync/projects', {});
      
      return projects.map((p: any) => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        description: p.description,
        visualStyleId: p.visualStyleId,
        metadata: p.metadata || {},
        createdAt: new Date(p.createdAt).getTime(),
        updatedAt: new Date(p.updatedAt).getTime(),
      }));
    } catch (error: any) {
      console.error('[CloudProject] 获取项目列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个项目
   */
  async getProject(projectId: string): Promise<CloudProject | null> {
    try {
      const project = await apiRequest<any>(`/api/sync/projects/${projectId}`, {});
      
      if (!project) return null;
      
      return {
        id: project.id,
        userId: project.userId,
        name: project.name,
        description: project.description,
        visualStyleId: project.visualStyleId,
        metadata: project.metadata || {},
        createdAt: new Date(project.createdAt).getTime(),
        updatedAt: new Date(project.updatedAt).getTime(),
      };
    } catch (error: any) {
      console.error('[CloudProject] 获取项目失败:', error);
      return null;
    }
  }

  /**
   * 创建新项目
   */
  async createProject(name: string, visualStyleId?: string): Promise<CloudProject> {
    try {
      const id = `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const project = await apiRequest<any>('/api/sync/projects', {
        method: 'POST',
        body: JSON.stringify({
          id,
          name,
          visualStyleId,
          metadata: {},
        }),
      });

      return {
        id: project.id,
        userId: project.userId,
        name: project.name,
        description: project.description,
        visualStyleId: project.visualStyleId,
        metadata: project.metadata || {},
        createdAt: new Date(project.createdAt).getTime(),
        updatedAt: new Date(project.updatedAt).getTime(),
      };
    } catch (error: any) {
      console.error('[CloudProject] 创建项目失败:', error);
      throw error;
    }
  }

  /**
   * 更新项目
   */
  async updateProject(projectId: string, updates: Partial<CloudProject>): Promise<void> {
    try {
      await apiRequest(`/api/sync/projects`, {
        method: 'POST',
        body: JSON.stringify({
          id: projectId,
          name: updates.name,
          description: updates.description,
          visualStyleId: updates.visualStyleId,
          metadata: updates.metadata,
        }),
      });
    } catch (error: any) {
      console.error('[CloudProject] 更新项目失败:', error);
      throw error;
    }
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      await apiRequest(`/api/sync/projects/${projectId}`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      console.error('[CloudProject] 删除项目失败:', error);
      throw error;
    }
  }

  /**
   * 批量同步项目（从本地到云端）
   */
  async syncProjectsToCloud(localProjects: CloudProject[]): Promise<void> {
    try {
      for (const project of localProjects) {
        await this.createProject(project.name, project.visualStyleId);
      }
    } catch (error: any) {
      console.error('[CloudProject] 批量同步失败:', error);
      throw error;
    }
  }

  /**
   * 批量同步项目数据（从云端到本地）
   */
  async syncProjectsFromCloud(): Promise<CloudProject[]> {
    try {
      return await this.getProjects();
    } catch (error: any) {
      console.error('[CloudProject] 从云端同步失败:', error);
      throw error;
    }
  }
}

// 导出单例
export const cloudProjectManager = new CloudProjectManager();
