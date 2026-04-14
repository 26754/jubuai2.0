// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 数据导出/导入工具
 * 用于导出本地数据到文件，以及从文件导入数据
 */

import { useProjectStore, Project } from '@/stores/project-store';
import { useScriptStore, ScriptProjectData } from '@/stores/script-store';
import { useCharacterLibraryStore } from '@/stores/character-library-store';
import { useSceneStore } from '@/stores/scene-store';
import { useDirectorStore } from '@/stores/director-store';

export interface ExportData {
  version: string;
  exportedAt: string;
  appVersion: string;
  projects: {
    list: Project[];
    scripts: Record<string, ScriptProjectData>;
  };
  characters: any;
  scenes: any;
  director: any;
}

/**
 * 导出所有本地数据
 */
export async function exportAllData(): Promise<ExportData> {
  const projectStore = useProjectStore.getState();
  const scriptStore = useScriptStore.getState();
  const characterStore = useCharacterLibraryStore.getState();
  const sceneStore = useSceneStore.getState();
  const directorStore = useDirectorStore.getState();

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    projects: {
      list: projectStore.projects,
      scripts: scriptStore.projects,
    },
    characters: characterStore,
    scenes: sceneStore,
    director: directorStore,
  };
}

/**
 * 下载数据为 JSON 文件
 */
export async function downloadDataAsFile(): Promise<void> {
  const data = await exportAllData();
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `jubu-ai-backup-${timestamp}.json`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 从文件导入数据
 */
export async function importDataFromFile(file: File): Promise<{
  success: boolean;
  data?: ExportData;
  error?: string;
}> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as ExportData;
    
    // 验证数据格式
    if (!data.version || !data.projects || !data.projects.list) {
      return { success: false, error: '无效的数据格式' };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || '解析文件失败' };
  }
}

/**
 * 应用导入的数据
 */
export function applyImportedData(data: ExportData): {
  success: boolean;
  projectsImported: number;
  error?: string;
} {
  try {
    const projectStore = useProjectStore.getState();
    const scriptStore = useScriptStore.getState();
    
    let projectsImported = 0;
    
    // 导入项目列表
    for (const project of data.projects.list) {
      // 跳过默认项目
      if (project.id === 'default-project') continue;
      
      // 检查是否已存在
      const exists = projectStore.projects.some(p => p.id === project.id);
      if (!exists) {
        projectStore.createProject(project.name);
        const newProject = projectStore.projects[projectStore.projects.length - 1];
        
        // 如果有剧本数据，导入
        if (data.projects.scripts && data.projects.scripts[project.id]) {
          scriptStore.setScriptData(newProject.id, data.projects.scripts[project.id]);
        }
        
        projectsImported++;
      }
    }
    
    return { success: true, projectsImported };
  } catch (error: any) {
    return { success: false, projectsImported: 0, error: error.message || '导入失败' };
  }
}
