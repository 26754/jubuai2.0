// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端项目存储模块
 * 使用 Supabase 实现项目数据的云端同步
 */

import { getSupabaseClient } from './supabase-client';
import type { Project } from '@/stores/project-store';
import type { ScriptData } from '@/types/script';

// ==================== 类型定义 ====================

interface CloudProject {
  id: string;
  user_id: string;
  name: string;
  script_data: ScriptData | null;
  visual_style_id: string | null;
  raw_script: string | null;
  language: string | null;
  target_duration: string | null;
  style_id: string | null;
  parse_status: string | null;
  created_at: string;
  updated_at: string | null;
}

interface CloudShot {
  id: string;
  project_id: string;
  episode_id: string | null;
  scene_id: string | null;
  index_data: {
    shot_number: number;
    episode_index?: number;
    scene_index?: number;
  } | null;
  content: {
    action_summary: string;
    visual_description?: string;
    dialogue?: string;
    duration?: number;
  } | null;
  camera: {
    shot_size?: string;
    camera_movement?: string;
    camera_angle?: string;
    special_technique?: string;
    focal_length?: string;
  } | null;
  visual: {
    image_prompt?: string;
    image_prompt_zh?: string;
    video_prompt?: string;
    video_prompt_zh?: string;
    image_url?: string;
    video_url?: string;
    needs_end_frame?: boolean;
  } | null;
  characters: {
    character_ids: string[];
    character_variations: Record<string, string>;
  } | null;
  status: string;
  shot_status: string;
  created_at: string;
  updated_at: string | null;
}

// ==================== 项目 CRUD ====================

/**
 * 获取用户的云端项目列表
 */
export async function getCloudProjects(): Promise<Project[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (error) {
    console.error('[CloudStorage] Failed to get projects:', error);
    throw new Error(`获取项目列表失败: ${error.message}`);
  }
  
  return (data as CloudProject[]).map(mapCloudProjectToProject);
}

/**
 * 获取单个云端项目
 */
export async function getCloudProject(projectId: string): Promise<Project | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();
  
  if (error) {
    console.error('[CloudStorage] Failed to get project:', error);
    throw new Error(`获取项目失败: ${error.message}`);
  }
  
  if (!data) return null;
  
  return mapCloudProjectToProject(data as CloudProject);
}

/**
 * 获取云端项目的剧本数据
 */
export async function getCloudScriptData(projectId: string): Promise<ScriptData | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('projects')
    .select('script_data')
    .eq('id', projectId)
    .maybeSingle();
  
  if (error) {
    console.error('[CloudStorage] Failed to get script data:', error);
    throw new Error(`获取剧本数据失败: ${error.message}`);
  }
  
  return data?.script_data || null;
}

/**
 * 创建云端项目
 */
export async function createCloudProject(project: Project, scriptData?: ScriptData): Promise<Project> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('projects')
    .insert({
      id: project.id,
      name: project.name,
      visual_style_id: project.visualStyleId || null,
      script_data: scriptData || null,
      language: scriptData?.language || 'zh-CN',
      parse_status: scriptData ? 'completed' : 'pending',
      created_at: new Date(project.createdAt).toISOString(),
      updated_at: new Date(project.updatedAt).toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('[CloudStorage] Failed to create project:', error);
    throw new Error(`创建项目失败: ${error.message}`);
  }
  
  console.log('[CloudStorage] Project created:', project.id);
  return mapCloudProjectToProject(data as CloudProject);
}

/**
 * 更新云端项目
 */
export async function updateCloudProject(
  projectId: string, 
  updates: Partial<Project>,
  scriptData?: ScriptData
): Promise<Project> {
  const supabase = getSupabaseClient();
  
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.visualStyleId !== undefined) updateData.visual_style_id = updates.visualStyleId;
  if (scriptData !== undefined) {
    updateData.script_data = scriptData;
    updateData.raw_script = scriptData.rawScript || null;
    updateData.language = scriptData.language;
    updateData.target_duration = scriptData.targetDuration || null;
    updateData.style_id = scriptData.styleId || null;
    updateData.parse_status = scriptData.parseStatus || 'completed';
  }
  
  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', projectId)
    .select()
    .single();
  
  if (error) {
    console.error('[CloudStorage] Failed to update project:', error);
    throw new Error(`更新项目失败: ${error.message}`);
  }
  
  console.log('[CloudStorage] Project updated:', projectId);
  return mapCloudProjectToProject(data as CloudProject);
}

/**
 * 删除云端项目
 */
export async function deleteCloudProject(projectId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
  
  if (error) {
    console.error('[CloudStorage] Failed to delete project:', error);
    throw new Error(`删除项目失败: ${error.message}`);
  }
  
  console.log('[CloudStorage] Project deleted:', projectId);
}

// ==================== 分镜 CRUD ====================

/**
 * 获取项目的所有分镜
 */
export async function getCloudShots(projectId: string): Promise<CloudShot[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('shots')
    .select('*')
    .eq('project_id', projectId)
    .order('index_data', { ascending: true });
  
  if (error) {
    console.error('[CloudStorage] Failed to get shots:', error);
    throw new Error(`获取分镜列表失败: ${error.message}`);
  }
  
  return data as CloudShot[];
}

/**
 * 批量创建分镜
 */
export async function createCloudShots(
  shots: CloudShot[],
  projectId: string
): Promise<CloudShot[]> {
  const supabase = getSupabaseClient();
  
  const insertData = shots.map(shot => ({
    id: shot.id,
    project_id: projectId,
    episode_id: shot.episode_id,
    scene_id: shot.scene_id,
    index_data: shot.index_data,
    content: shot.content,
    camera: shot.camera,
    visual: shot.visual,
    characters: shot.characters,
    status: shot.status,
    shot_status: shot.shot_status,
  }));
  
  const { data, error } = await supabase
    .from('shots')
    .insert(insertData)
    .select();
  
  if (error) {
    console.error('[CloudStorage] Failed to create shots:', error);
    throw new Error(`创建分镜失败: ${error.message}`);
  }
  
  console.log('[CloudStorage] Shots created:', shots.length);
  return data as CloudShot[];
}

/**
 * 更新单个分镜
 */
export async function updateCloudShot(
  shotId: string,
  updates: Partial<CloudShot>
): Promise<CloudShot> {
  const supabase = getSupabaseClient();
  
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.camera !== undefined) updateData.camera = updates.camera;
  if (updates.visual !== undefined) updateData.visual = updates.visual;
  if (updates.characters !== undefined) updateData.characters = updates.characters;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.shot_status !== undefined) updateData.shot_status = updates.shot_status;
  
  const { data, error } = await supabase
    .from('shots')
    .update(updateData)
    .eq('id', shotId)
    .select()
    .single();
  
  if (error) {
    console.error('[CloudStorage] Failed to update shot:', error);
    throw new Error(`更新分镜失败: ${error.message}`);
  }
  
  return data as CloudShot;
}

/**
 * 删除项目的所有分镜
 */
export async function deleteCloudShots(projectId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('shots')
    .delete()
    .eq('project_id', projectId);
  
  if (error) {
    console.error('[CloudStorage] Failed to delete shots:', error);
    throw new Error(`删除分镜失败: ${error.message}`);
  }
  
  console.log('[CloudStorage] Shots deleted for project:', projectId);
}

// ==================== 同步工具 ====================

/**
 * 同步本地项目到云端
 */
export async function syncProjectToCloud(
  project: Project,
  scriptData?: ScriptData
): Promise<void> {
  try {
    const cloudProject = await getCloudProject(project.id);
    
    if (cloudProject) {
      await updateCloudProject(project.id, project, scriptData);
    } else {
      await createCloudProject(project, scriptData);
    }
  } catch (error) {
    console.error('[CloudStorage] Sync failed:', error);
    throw error;
  }
}

/**
 * 从云端恢复项目
 */
export async function restoreProjectFromCloud(projectId: string): Promise<{
  project: Project;
  scriptData: ScriptData | null;
} | null> {
  try {
    const project = await getCloudProject(projectId);
    if (!project) return null;
    
    const scriptData = await getCloudScriptData(projectId);
    
    return { project, scriptData };
  } catch (error) {
    console.error('[CloudStorage] Restore failed:', error);
    throw error;
  }
}

// ==================== 映射函数 ====================

function mapCloudProjectToProject(cloud: CloudProject): Project {
  return {
    id: cloud.id,
    name: cloud.name,
    createdAt: new Date(cloud.created_at).getTime(),
    updatedAt: cloud.updated_at ? new Date(cloud.updated_at).getTime() : new Date(cloud.created_at).getTime(),
    visualStyleId: cloud.visual_style_id || undefined,
  };
}
