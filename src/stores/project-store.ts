// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { fileStorage } from "@/lib/indexed-db-storage";
import { generateUUID } from "@/lib/utils";

export const DEFAULT_FPS = 30;

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  // 全局视觉风格（剧本模块设置，其他模块可跟随）
  visualStyleId?: string;
}

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
  // 视觉风格锁定状态（锁定后跟随剧本自动调整）
  visualStyleLocked: boolean;
  // 智能跟随模式：自动跟随剧本风格，无需手动锁定
  visualStyleAutoFollow: boolean;
  // 记住上次选择：首次选择后自动应用到后续新建
  rememberLastStyle: boolean;
  lastSelectedStyleId: string | null; // 上次选择的风格ID
  createProject: (name?: string) => Project;
  createDemoProject: () => Project;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  ensureDefaultProject: () => void;
  // 设置项目视觉风格（同时触发智能跟随逻辑）
  setProjectVisualStyle: (id: string, styleId: string) => void;
  // 视觉风格锁定/解锁
  setVisualStyleLocked: (locked: boolean) => void;
  // 智能跟随模式开关
  setVisualStyleAutoFollow: (enabled: boolean) => void;
  // 记住上次选择开关
  setRememberLastStyle: (enabled: boolean) => void;
  // 从模板创建/应用模板
  setProjectFromTemplate: (template: any) => void;
}

// Default project for desktop app
const DEFAULT_PROJECT: Project = {
  id: "default-project",
  name: "JuBu AI项目",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  visualStyleId: "2d_ghibli", // 默认视觉风格
};

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [DEFAULT_PROJECT],
      activeProjectId: DEFAULT_PROJECT.id,
      activeProject: DEFAULT_PROJECT,
      // 默认不锁定视觉风格，但启用智能跟随
      visualStyleLocked: false,
      visualStyleAutoFollow: true, // 新建项目默认启用智能跟随
      rememberLastStyle: true,     // 默认记住上次选择的风格
      lastSelectedStyleId: null,   // 初始为空

      ensureDefaultProject: () => {
        const { projects, activeProjectId } = get();
        if (projects.length === 0) {
          set({
            projects: [DEFAULT_PROJECT],
            activeProjectId: DEFAULT_PROJECT.id,
            activeProject: DEFAULT_PROJECT,
          });
          return;
        }
        if (!activeProjectId) {
          set({
            activeProjectId: projects[0].id,
            activeProject: projects[0],
          });
        }
      },

      createProject: (name) => {
        const newProject: Project = {
          id: generateUUID(),
          name: name?.trim() || `新项目 ${new Date().toLocaleDateString('zh-CN')}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          projects: [newProject, ...state.projects],
          // 不在这里设置 activeProjectId —— 由 switchProject() 统一处理
          // 避免 switchProject 因 ID 已相同而跳过 rehydration
        }));
        return newProject;
      },

      createDemoProject: () => {
        const demoProject: Project = {
          id: 'demo-project',
          name: '星际探险 - 演示项目',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          visualStyleId: 'sci-fi',
        };
        set({
          projects: [demoProject],
          activeProjectId: demoProject.id,
          activeProject: demoProject,
        });
        console.log('[Demo] Demo project created');
        return demoProject;
      },

      renameProject: (id, name) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p
          ),
          activeProject:
            state.activeProject?.id === id
              ? { ...state.activeProject, name, updatedAt: Date.now() }
              : state.activeProject,
        }));
      },

      deleteProject: (id) => {
        set((state) => {
          const remaining = state.projects.filter((p) => p.id !== id);
          const nextActive =
            state.activeProjectId === id ? remaining[0] || null : state.activeProject;
          return {
            projects: remaining,
            activeProjectId: nextActive?.id || null,
            activeProject: nextActive,
          };
        });
        // Clean up per-project storage directory
        if (window.fileStorage?.removeDir) {
          window.fileStorage.removeDir(`_p/${id}`).catch((err: any) =>
            console.warn(`[ProjectStore] Failed to remove project dir _p/${id}:`, err)
          );
        }
      },

      setActiveProject: (id) => {
        set((state) => {
          const project = state.projects.find((p) => p.id === id) || null;
          return {
            activeProjectId: project?.id || null,
            activeProject: project,
          };
        });
      },

      setProjectVisualStyle: (id, styleId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, visualStyleId: styleId, updatedAt: Date.now() } : p
          ),
          activeProject:
            state.activeProject?.id === id
              ? { ...state.activeProject, visualStyleId: styleId, updatedAt: Date.now() }
              : state.activeProject,
          // 记住这次选择的风格，用于后续新建时自动应用
          lastSelectedStyleId: state.rememberLastStyle ? styleId : state.lastSelectedStyleId,
        }));
        console.log('[ProjectStore] Visual style set to:', styleId);
      },

      setVisualStyleLocked: (locked) => {
        set({ visualStyleLocked: locked });
        console.log('[ProjectStore] Visual style locked:', locked);
      },

      setVisualStyleAutoFollow: (enabled) => {
        set({ visualStyleAutoFollow: enabled });
        console.log('[ProjectStore] Visual style auto-follow:', enabled);
      },

      setRememberLastStyle: (enabled) => {
        set({ rememberLastStyle: enabled });
        console.log('[ProjectStore] Remember last style:', enabled);
      },

      setProjectFromTemplate: (template) => {
        const { activeProjectId, projects } = get();
        
        if (!activeProjectId) return;
        
        // 从模板内容中提取设置
        const content = template.content || {};
        
        // 更新项目属性
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== activeProjectId) return p;
            
            return {
              ...p,
              name: content.project?.name || p.name,
              visualStyleId: content.style?.visualStyle || p.visualStyleId,
              updatedAt: Date.now(),
            };
          }),
          activeProject: state.activeProject?.id === activeProjectId
            ? {
                ...state.activeProject,
                name: content.project?.name || state.activeProject.name,
                visualStyleId: content.style?.visualStyle || state.activeProject.visualStyleId,
                updatedAt: Date.now(),
              }
            : state.activeProject,
        }));
        
        console.log('[ProjectStore] Applied template:', template.name);
      },
    }),
    {
      name: "jubuai-project-store",
      storage: createJSONStorage(() => fileStorage),
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        visualStyleLocked: state.visualStyleLocked,
        visualStyleAutoFollow: state.visualStyleAutoFollow,
        rememberLastStyle: state.rememberLastStyle,
        lastSelectedStyleId: state.lastSelectedStyleId,
      }),
      migrate: (persisted: any) => {
        if (persisted?.projects && persisted.projects.length > 0) {
          return persisted;
        }
        return {
          projects: [DEFAULT_PROJECT],
          activeProjectId: DEFAULT_PROJECT.id,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        console.log('[ProjectStore] Rehydrated, projects count:', state.projects?.length || 0);
        if (state.projects?.length > 0) {
          console.log('[ProjectStore] Loaded projects:', state.projects.map(p => ({ id: p.id.substring(0, 8), name: p.name })));
        }
        const project =
          state.projects.find((p) => p.id === state.activeProjectId) ||
          state.projects[0] ||
          null;
        state.activeProjectId = project?.id || null;
        state.activeProject = project;

        // 异步扫描磁盘上 _p/ 目录，将遗漏的项目恢复到列表中
        // 解决路径切换/导入/迁移后项目列表为空的问题
        discoverProjectsFromDisk().catch((err) =>
          console.warn('[ProjectStore] Disk discovery failed:', err)
        );
      },
    }
  )
);

/**
 * 扫描磁盘上 _p/ 目录下的实际项目文件夹，
 * 将未在 projects 列表中注册的项目自动恢复。
 * 
 * 解决以下场景：
 * - 更改存储路径并迁移数据后，前端 store 未 reload，或 jubuai-project-store.json
 *   中的 projects 列表不完整（旧版本、手动复制等）
 * - 导入数据后 jubuai-project-store.json 缺失或不含新项目
 * - 换电脑后指向旧数据目录，projects 列表为空
 */
async function discoverProjectsFromDisk(): Promise<void> {
  let diskProjectIds: string[] = [];

  // Electron 环境：使用 fileStorage.listDirs
  if (window.fileStorage?.listDirs) {
    try {
      const dirs = await window.fileStorage.listDirs('_p');
      if (dirs && dirs.length > 0) {
        diskProjectIds = dirs;
        console.log(`[ProjectStore] Discovered ${diskProjectIds.length} projects from disk (Electron):`, diskProjectIds.map(id => id.substring(0, 8)));
      }
    } catch (err) {
      console.warn('[ProjectStore] listDirs failed:', err);
    }
  } else {
    // 浏览器环境：尝试从 localStorage 扫描所有 key
    // localStorage 的 key 格式：_p/{projectId}/script, _p/{projectId}/director, ...
    console.log('[ProjectStore] Browser environment, scanning localStorage for projects...');
    try {
      const projectIdsSet = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        // 匹配 _p/{projectId}/script 或 _p/{projectId}/director 等格式
        const match = key.match(/^_p\/([^/]+)\/(script|director|media|characters|scenes|timeline|sclass)$/);
        if (match) {
          projectIdsSet.add(match[1]);
        }
      }
      diskProjectIds = Array.from(projectIdsSet);
      console.log(`[ProjectStore] Found ${diskProjectIds.length} projects in localStorage:`, diskProjectIds.map(id => id.substring(0, 8)));
    } catch (err) {
      console.warn('[ProjectStore] localStorage scan failed:', err);
    }
  }

  if (diskProjectIds.length === 0) return;

  try {
    const { projects } = useProjectStore.getState();
    const knownIds = new Set(projects.map((p) => p.id));

    const missingIds = diskProjectIds.filter((id) => !knownIds.has(id));
    if (missingIds.length === 0) return;

    console.log(
      `[ProjectStore] Found ${missingIds.length} projects on disk not in store:`,
      missingIds.map((id) => id.substring(0, 8))
    );

    // 尝试从每个遗漏项目的 director / script store 文件中提取项目名
    const recoveredProjects: Project[] = [];
    for (const pid of missingIds) {
      let name = `恢复的项目 (${pid.substring(0, 8)})`;
      const createdAt = Date.now();

      // 尝试从 script store 获取名称（注意：storeName 是 'script'，不是 'script-store'）
      try {
        const scriptRaw = await window.fileStorage.getItem(`_p/${pid}/script`);
        if (scriptRaw) {
          const parsed = JSON.parse(scriptRaw);
          const state = parsed?.state ?? parsed;
          // script-store 的 projects 字段中可能有项目信息
          if (state?.projects?.[pid]?.title) {
            name = state.projects[pid].title;
          } else if (state?.projectData?.title) {
            name = state.projectData.title;
          } else if (state?.projectData?.seriesMeta?.title) {
            name = state.projectData.seriesMeta.title;
          }
        }
      } catch { /* ignore */ }

      // 尝试从 director store 获取创建时间等信息
      try {
        const directorRaw = await window.fileStorage.getItem(`_p/${pid}/director`);
        if (directorRaw) {
          const parsed = JSON.parse(directorRaw);
          const state = parsed?.state ?? parsed;
          if (state?.projects?.[pid]?.screenplay) {
            // 有剧本内容，说明确实是有效项目
            const screenplay = state.projects[pid].screenplay;
            if (!name.includes('恢复的项目')) {
              // 已经有名称了，不覆盖
            } else if (screenplay) {
              // 用剧本前几个字做临时名称
              const preview = screenplay.substring(0, 20).replace(/\n/g, ' ').trim();
              if (preview) name = preview + '...';
            }
          } else if (state?.projectData?.screenplay) {
            const screenplay = state.projectData.screenplay;
            if (!name.includes('恢复的项目') && name.includes('恢复的项目')) {
              const preview = screenplay.substring(0, 20).replace(/\n/g, ' ').trim();
              if (preview) name = preview + '...';
            }
          }
        }
      } catch { /* ignore */ }

      recoveredProjects.push({
        id: pid,
        name,
        createdAt,
        updatedAt: Date.now(),
      });
    }

    if (recoveredProjects.length > 0) {
      useProjectStore.setState((state) => ({
        projects: [...state.projects, ...recoveredProjects],
      }));
      console.log(
        `[ProjectStore] Recovered ${recoveredProjects.length} projects from disk:`,
        recoveredProjects.map((p) => `${p.id.substring(0, 8)}:${p.name}`)
      );
    }
  } catch (err) {
    console.error('[ProjectStore] discoverProjectsFromDisk error:', err);
  }
}
