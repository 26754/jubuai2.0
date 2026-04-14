// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 数据导出/导入工具
 * 用于导出本地数据到文件，以及从文件导入数据
 * 支持跨设备离线同步
 */

import { useProjectStore, Project } from '@/stores/project-store';
import { useScriptStore, ScriptProjectData } from '@/stores/script-store';
import { useCharacterLibraryStore } from '@/stores/character-library-store';
import { useSceneStore } from '@/stores/scene-store';
import { useDirectorStore } from '@/stores/director-store';
import { useAppSettingsStore } from '@/stores/app-settings-store';
import { useAPIConfigStore } from '@/stores/api-config-store';

export interface ExportData {
  version: string;
  exportedAt: string;
  appVersion: string;
  syncMode: 'full' | 'incremental';  // 完整备份 vs 增量备份
  userId?: string;  // 云端同步时的用户 ID
  projects: {
    list: Project[];
    scripts: Record<string, ScriptProjectData>;
  };
  characters: {
    characters: any[];
    selectedCharacterId: string | null;
    groups: any[];
  };
  scenes: {
    scenes: any[];
    activeSceneId: string | null;
  };
  director: {
    storyboardConfig: any;
    currentDirectorMode: string;
  };
  settings?: {
    theme: string;
    language: string;
  };
  apiConfigs?: {
    providers: any[];
  };
}

/**
 * 导出所有本地数据（支持跨设备同步）
 * @param options 可选配置
 * @param options.includeSettings 是否包含设置数据（API Key 等敏感数据默认不包含）
 * @param options.userId 用户 ID（用于标识来源设备）
 */
export async function exportAllData(options: {
  includeSettings?: boolean;
  userId?: string;
} = {}): Promise<ExportData> {
  const projectStore = useProjectStore.getState();
  const scriptStore = useScriptStore.getState();
  const characterStore = useCharacterLibraryStore.getState();
  const sceneStore = useSceneStore.getState();
  const directorStore = useDirectorStore.getState();
  const appSettings = useAppSettingsStore.getState();
  const apiConfig = useAPIConfigStore.getState();

  const exportData: ExportData = {
    version: '2.0',  // 升级版本号以支持新格式
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    syncMode: 'full',
    userId: options.userId,
    projects: {
      list: projectStore.projects,
      scripts: scriptStore.projects,
    },
    characters: {
      characters: characterStore.characters,
      selectedCharacterId: characterStore.selectedCharacterId,
      groups: characterStore.groups,
    },
    scenes: {
      scenes: sceneStore.scenes,
      activeSceneId: sceneStore.activeSceneId,
    },
    director: {
      storyboardConfig: directorStore.storyboardConfig,
      currentDirectorMode: directorStore.currentDirectorMode,
    },
  };

  // 可选包含设置数据
  if (options.includeSettings) {
    exportData.settings = {
      theme: appSettings.theme,
      language: appSettings.language,
    };
    
    // 包含 API 配置（但不包含 API Key）
    exportData.apiConfigs = {
      providers: apiConfig.providers.map(p => ({
        id: p.id,
        name: p.name,
        platform: p.platform,
        enabled: p.enabled,
      })),
    };
  }

  return exportData;
}

/**
 * 快速导出（用于跨设备同步，推荐）
 * 导出完整数据但不包含敏感信息
 */
export async function exportForSync(): Promise<ExportData> {
  return exportAllData({ includeSettings: true });
}

/**
 * 下载数据为 JSON 文件
 */
export async function downloadDataAsFile(data?: ExportData): Promise<void> {
  const exportData = data || await exportForSync();
  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `jubuai-sync-${timestamp}.json`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log('[DataExport] Backup downloaded:', filename);
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
    
    console.log('[DataExport] Backup file loaded:', {
      version: data.version,
      exportedAt: data.exportedAt,
      projects: data.projects.list.length,
    });
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || '解析文件失败' };
  }
}

/**
 * 应用导入的数据
 * @param data 导入的数据
 * @param options 导入选项
 */
export function applyImportedData(
  data: ExportData, 
  options: {
    mergeStrategy?: 'replace' | 'merge';  // 替换 vs 合并
    skipExisting?: boolean;  // 跳过已存在的项目
  } = {}
): {
  success: boolean;
  projectsImported: number;
  projectsSkipped: number;
  error?: string;
} {
  try {
    const projectStore = useProjectStore.getState();
    const scriptStore = useScriptStore.getState();
    const characterStore = useCharacterLibraryStore.getState();
    const sceneStore = useSceneStore.getState();
    const directorStore = useDirectorStore.getState();
    const appSettings = useAppSettingsStore.getState();
    const apiConfig = useAPIConfigStore.getState();
    
    let projectsImported = 0;
    let projectsSkipped = 0;
    const skipExisting = options.skipExisting ?? true;
    
    // 替换模式：先清空现有项目（保留默认项目）
    if (options.mergeStrategy === 'replace') {
      const existingProjectIds = projectStore.projects
        .filter(p => p.id !== 'default-project')
        .map(p => p.id);
      
      for (const projectId of existingProjectIds) {
        projectStore.deleteProject(projectId);
      }
    }
    
    // 导入项目列表
    for (const project of data.projects.list) {
      // 跳过默认项目
      if (project.id === 'default-project') continue;
      
      // 检查是否已存在
      const exists = projectStore.projects.some(p => p.id === project.id);
      if (exists && skipExisting) {
        projectsSkipped++;
        continue;
      }
      
      // 创建项目
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
    
    // 导入角色库
    if (data.characters) {
      if (data.characters.characters) {
        for (const character of data.characters.characters) {
          const exists = characterStore.characters.some(c => c.id === character.id);
          if (!exists) {
            characterStore.addCharacter(character);
          }
        }
      }
      if (data.characters.groups) {
        characterStore.setGroups(data.characters.groups);
      }
    }
    
    // 导入场景
    if (data.scenes) {
      if (data.scenes.scenes) {
        for (const scene of data.scenes.scenes) {
          const exists = sceneStore.scenes.some(s => s.id === scene.id);
          if (!exists) {
            sceneStore.addScene(scene);
          }
        }
      }
    }
    
    // 导入导演配置
    if (data.director) {
      if (data.director.storyboardConfig) {
        directorStore.setStoryboardConfig(data.director.storyboardConfig);
      }
      if (data.director.currentDirectorMode) {
        directorStore.setDirectorMode(data.director.currentDirectorMode);
      }
    }
    
    // 导入设置（可选）
    if (data.settings) {
      appSettings.setTheme(data.settings.theme);
      appSettings.setLanguage(data.settings.language);
    }
    
    // 导入 API 配置（不包含 Key）
    if (data.apiConfigs?.providers) {
      for (const provider of data.apiConfigs.providers) {
        const existing = apiConfig.providers.find(p => p.id === provider.id);
        if (existing) {
          apiConfig.updateProvider(provider.id, {
            enabled: provider.enabled,
          });
        }
      }
    }
    
    console.log('[DataExport] Data imported:', {
      projectsImported,
      projectsSkipped,
    });
    
    return { success: true, projectsImported, projectsSkipped };
  } catch (error: any) {
    return { success: false, projectsImported: 0, projectsSkipped: 0, error: error.message || '导入失败' };
  }
}
