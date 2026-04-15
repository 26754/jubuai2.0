// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端项目管理器
 * 实现用户项目的云端存储和同步
 */

import { createSupabaseClient } from '@/storage/database/supabase-client';
import type { User } from '@supabase/supabase-js';

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

/**
 * 云端项目管理器类
 */
export class CloudProjectManager {
  private supabase = createSupabaseClient();

  /**
   * 获取用户所有项目
   */
  async getProjects(userId: string): Promise<CloudProject[]> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[CloudProject] 获取项目列表失败:', error);
        throw error;
      }

      return data.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        name: p.name,
        description: p.description,
        visualStyleId: p.visual_style_id,
        metadata: p.metadata,
        createdAt: new Date(p.created_at).getTime(),
        updatedAt: new Date(p.updated_at).getTime(),
      }));
    } catch (error: any) {
      console.error('[CloudProject] 获取项目列表异常:', error);
      throw error;
    }
  }

  /**
   * 创建新项目
   */
  async createProject(userId: string, name: string, visualStyleId?: string): Promise<CloudProject> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .insert({
          user_id: userId,
          name,
          visual_style_id: visualStyleId,
          metadata: {},
        })
        .select()
        .single();

      if (error) {
        console.error('[CloudProject] 创建项目失败:', error);
        throw error;
      }

      return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        visualStyleId: data.visual_style_id,
        metadata: data.metadata,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
      };
    } catch (error: any) {
      console.error('[CloudProject] 创建项目异常:', error);
      throw error;
    }
  }

  /**
   * 更新项目
   */
  async updateProject(projectId: string, updates: Partial<CloudProject>): Promise<void> {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.visualStyleId !== undefined) updateData.visual_style_id = updates.visualStyleId;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
      updateData.updated_at = new Date().toISOString();

      const { error } = await this.supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId);

      if (error) {
        console.error('[CloudProject] 更新项目失败:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('[CloudProject] 更新项目异常:', error);
      throw error;
    }
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        console.error('[CloudProject] 删除项目失败:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('[CloudProject] 删除项目异常:', error);
      throw error;
    }
  }

  /**
   * 保存项目数据
   */
  async saveProjectData(projectId: string, dataType: string, data: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('project_data')
        .upsert({
          project_id: projectId,
          data_type: dataType,
          data,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id,data_type',
        });

      if (error) {
        console.error('[CloudProject] 保存项目数据失败:', error);
        throw error;
      }

      // 更新项目的更新时间
      await this.updateProject(projectId, {});
    } catch (error: any) {
      console.error('[CloudProject] 保存项目数据异常:', error);
      throw error;
    }
  }

  /**
   * 加载项目数据
   */
  async loadProjectData(projectId: string, dataType?: string): Promise<ProjectData[]> {
    try {
      let query = this.supabase
        .from('project_data')
        .select('*')
        .eq('project_id', projectId);

      if (dataType) {
        query = query.eq('data_type', dataType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[CloudProject] 加载项目数据失败:', error);
        throw error;
      }

      return data.map((d: any) => ({
        projectId: d.project_id,
        dataType: d.data_type,
        data: d.data,
        version: d.version,
        updatedAt: new Date(d.updated_at).getTime(),
      }));
    } catch (error: any) {
      console.error('[CloudProject] 加载项目数据异常:', error);
      throw error;
    }
  }

  /**
   * 批量同步项目（从本地到云端）
   */
  async syncProjectsToCloud(userId: string, localProjects: CloudProject[]): Promise<void> {
    try {
      for (const project of localProjects) {
        await this.createProject(userId, project.name, project.visualStyleId);
      }
    } catch (error: any) {
      console.error('[CloudProject] 批量同步失败:', error);
      throw error;
    }
  }

  /**
   * 批量同步项目数据（从云端到本地）
   */
  async syncProjectsFromCloud(userId: string): Promise<CloudProject[]> {
    try {
      return await this.getProjects(userId);
    } catch (error: any) {
      console.error('[CloudProject] 从云端同步失败:', error);
      throw error;
    }
  }
}

// 导出单例
export const cloudProjectManager = new CloudProjectManager();
