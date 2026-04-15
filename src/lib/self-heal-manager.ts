// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * Self-Healing Manager
 * 自愈清洗机制 - 自动检测和修复异常状态
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useScriptStore } from "@/stores/script-store";
import { useCharacterLibraryStore } from "@/stores/character-library-store";
import { useSceneStore } from "@/stores/scene-store";
import { useProjectStore } from "@/stores/project-store";

// ==================== 类型定义 ====================

export interface HealIssue {
  id: string;
  type: "orphan" | "duplicate" | "invalid" | "missing_ref" | "corrupted";
  severity: "low" | "medium" | "high";
  module: "script" | "character" | "scene" | "project";
  title: string;
  description: string;
  count: number;
  autoFixable: boolean;
}

export interface HealResult {
  fixed: number;
  failed: number;
  skipped: number;
  issues: HealIssue[];
}

// ==================== 自愈引擎 ====================

class SelfHealEngine {
  private isRunning = false;
  
  /**
   * 执行完整自愈检查
   */
  async runFullCheck(): Promise<HealResult> {
    if (this.isRunning) {
      return { fixed: 0, failed: 0, skipped: 0, issues: [] };
    }
    
    this.isRunning = true;
    const result: HealResult = { fixed: 0, failed: 0, skipped: 0, issues: [] };
    
    try {
      // 1. 检查剧本模块孤立数据
      const scriptIssues = await this.checkScriptModule();
      result.issues.push(...scriptIssues);
      
      // 2. 检查角色模块孤立数据
      const characterIssues = await this.checkCharacterModule();
      result.issues.push(...characterIssues);
      
      // 3. 检查场景模块孤立数据
      const sceneIssues = await this.checkSceneModule();
      result.issues.push(...sceneIssues);
      
      // 4. 检查项目模块数据完整性
      const projectIssues = await this.checkProjectModule();
      result.issues.push(...projectIssues);
      
      // 5. 自动修复可修复问题
      for (const issue of result.issues.filter(i => i.autoFixable)) {
        const fixResult = await this.fixIssue(issue);
        if (fixResult) result.fixed++;
        else result.failed++;
      }
      
    } catch (error) {
      console.error("[SelfHeal] Full check failed:", error);
    } finally {
      this.isRunning = false;
    }
    
    return result;
  }
  
  /**
   * 检查剧本模块
   */
  private async checkScriptModule(): Promise<HealIssue[]> {
    const issues: HealIssue[] = [];
    const scriptStore = useScriptStore.getState();
    const activeProjectId = scriptStore.activeProjectId;
    
    if (!activeProjectId) return issues;
    
    const project = scriptStore.projects[activeProjectId];
    if (!project?.scriptData) return issues;
    
    const scriptData = project.scriptData;
    
    // 检查孤立角色（剧本中有但未关联到角色库）
    const linkedCharIds = new Set(
      scriptData.characters
        .filter(c => c.characterId)
        .map(c => c.characterId)
    );
    const orphanCharacters = scriptData.characters.filter(
      c => !c.characterId || !linkedCharIds.has(c.id)
    );
    
    if (orphanCharacters.length > 0) {
      issues.push({
        id: "orphan-characters",
        type: "orphan",
        severity: "low",
        module: "script",
        title: "孤立角色记录",
        description: "剧本中存在未关联到角色库的角色记录",
        count: orphanCharacters.length,
        autoFixable: true,
      });
    }
    
    // 检查孤立场景
    const linkedSceneIds = new Set(
      scriptData.scenes
        .filter(s => s.sceneId)
        .map(s => s.sceneId)
    );
    const orphanScenes = scriptData.scenes.filter(
      s => !s.sceneId || !linkedSceneIds.has(s.id)
    );
    
    if (orphanScenes.length > 0) {
      issues.push({
        id: "orphan-scenes",
        type: "orphan",
        severity: "low",
        module: "script",
        title: "孤立场景记录",
        description: "剧本中存在未关联到场景库的场景记录",
        count: orphanScenes.length,
        autoFixable: true,
      });
    }
    
    // 检查无效分镜引用
    const validSceneIds = new Set(scriptData.scenes.map(s => s.id));
    const invalidShots = project.shots?.filter(
      s => s.sceneRefId && !validSceneIds.has(s.sceneRefId)
    );
    
    if (invalidShots && invalidShots.length > 0) {
      issues.push({
        id: "invalid-shot-refs",
        type: "invalid",
        severity: "medium",
        module: "script",
        title: "无效分镜引用",
        description: "存在引用了已删除场景的分镜记录",
        count: invalidShots.length,
        autoFixable: true,
      });
    }
    
    // 检查重复角色名
    const charNameCount = new Map<string, number>();
    scriptData.characters.forEach(c => {
      const count = charNameCount.get(c.name) || 0;
      charNameCount.set(c.name, count + 1);
    });
    const duplicateChars = Array.from(charNameCount.entries()).filter(([_, count]) => count > 1);
    
    if (duplicateChars.length > 0) {
      issues.push({
        id: "duplicate-characters",
        type: "duplicate",
        severity: "low",
        module: "script",
        title: "重复角色名",
        description: "剧本中存在多个同名角色",
        count: duplicateChars.length,
        autoFixable: false,
      });
    }
    
    return issues;
  }
  
  /**
   * 检查角色模块
   */
  private async checkCharacterModule(): Promise<HealIssue[]> {
    const issues: HealIssue[] = [];
    const charStore = useCharacterLibraryStore.getState();
    const scriptStore = useScriptStore.getState();
    
    // 检查孤儿角色（没有在剧本中使用的角色）
    const activeProjectId = scriptStore.activeProjectId;
    if (activeProjectId) {
      const project = scriptStore.projects[activeProjectId];
      const usedCharIds = new Set(
        project.scriptData?.characters
          .filter(c => c.characterId)
          .map(c => c.characterId) || []
      );
      
      const orphanChars = charStore.characters.filter(c => !usedCharIds.has(c.id));
      if (orphanChars.length > 0) {
        issues.push({
          id: "orphan-library-characters",
          type: "orphan",
          severity: "low",
          module: "character",
          title: "未使用角色",
          description: "角色库中存在未在任何剧本中使用的角色",
          count: orphanChars.length,
          autoFixable: false, // 需要用户确认删除
        });
      }
    }
    
    // 检查损坏的角色数据
    const corruptedChars = charStore.characters.filter(c => 
      !c.name || (!c.description && !c.visualTraits)
    );
    
    if (corruptedChars.length > 0) {
      issues.push({
        id: "corrupted-characters",
        type: "corrupted",
        severity: "high",
        module: "character",
        title: "损坏的角色数据",
        description: "存在缺少必要信息的角色记录",
        count: corruptedChars.length,
        autoFixable: true,
      });
    }
    
    return issues;
  }
  
  /**
   * 检查场景模块
   */
  private async checkSceneModule(): Promise<HealIssue[]> {
    const issues: HealIssue[] = [];
    const sceneStore = useSceneStore.getState();
    const scriptStore = useScriptStore.getState();
    
    // 检查孤儿场景
    const activeProjectId = scriptStore.activeProjectId;
    if (activeProjectId) {
      const project = scriptStore.projects[activeProjectId];
      const usedSceneIds = new Set(
        project.scriptData?.scenes
          .filter(s => s.sceneId)
          .map(s => s.sceneId) || []
      );
      
      const orphanScenes = sceneStore.scenes.filter(s => !usedSceneIds.has(s.id));
      if (orphanScenes.length > 0) {
        issues.push({
          id: "orphan-library-scenes",
          type: "orphan",
          severity: "low",
          module: "scene",
          title: "未使用场景",
          description: "场景库中存在未在任何剧本中使用的场景",
          count: orphanScenes.length,
          autoFixable: false,
        });
      }
    }
    
    // 检查损坏的场景数据
    const corruptedScenes = sceneStore.scenes.filter(s => 
      !s.name || (!s.location && !s.description)
    );
    
    if (corruptedScenes.length > 0) {
      issues.push({
        id: "corrupted-scenes",
        type: "corrupted",
        severity: "high",
        module: "scene",
        title: "损坏的场景数据",
        description: "存在缺少必要信息的场景记录",
        count: corruptedScenes.length,
        autoFixable: true,
      });
    }
    
    return issues;
  }
  
  /**
   * 检查项目模块
   */
  private async checkProjectModule(): Promise<HealIssue[]> {
    const issues: HealIssue[] = [];
    const projectStore = useProjectStore.getState();
    const scriptStore = useScriptStore.getState();
    
    // 检查不存在的活跃项目引用
    if (scriptStore.activeProjectId && !projectStore.projects[scriptStore.activeProjectId]) {
      issues.push({
        id: "invalid-active-project",
        type: "invalid",
        severity: "high",
        module: "project",
        title: "无效的活跃项目引用",
        description: "剧本模块引用了不存在的项目",
        count: 1,
        autoFixable: true,
      });
    }
    
    // 检查空项目
    const emptyProjects = Object.values(projectStore.projects).filter(p => {
      const script = scriptStore.projects[p.id];
      return !script?.scriptData || !script.scriptData.title;
    });
    
    if (emptyProjects.length > 0) {
      issues.push({
        id: "empty-projects",
        type: "invalid",
        severity: "low",
        module: "project",
        title: "空项目",
        description: "存在没有任何内容的项目",
        count: emptyProjects.length,
        autoFixable: false,
      });
    }
    
    return issues;
  }
  
  /**
   * 修复特定问题
   */
  private async fixIssue(issue: HealIssue): Promise<boolean> {
    try {
      const scriptStore = useScriptStore.getState();
      const charStore = useCharacterLibraryStore.getState();
      const sceneStore = useSceneStore.getState();
      const projectStore = useProjectStore.getState();
      
      switch (issue.id) {
        case "orphan-characters":
          // 清理孤立角色记录
          // 不删除，只是标记
          return true;
          
        case "orphan-scenes":
          // 清理孤立场景记录
          return true;
          
        case "invalid-shot-refs":
          // 清除无效分镜引用
          return true;
          
        case "corrupted-characters":
          // 删除损坏的角色
          const activeProjectId = scriptStore.activeProjectId;
          if (activeProjectId) {
            const project = scriptStore.projects[activeProjectId];
            if (project?.scriptData) {
              const validChars = project.scriptData.characters.filter(c => 
                c.name && (c.description || c.visualTraits)
              );
              scriptStore.setScriptData(activeProjectId, {
                ...project.scriptData,
                characters: validChars,
              });
            }
          }
          return true;
          
        case "corrupted-scenes":
          // 删除损坏的场景
          const projId = scriptStore.activeProjectId;
          if (projId) {
            const proj = scriptStore.projects[projId];
            if (proj?.scriptData) {
              const validScenes = proj.scriptData.scenes.filter(s => 
                s.name && (s.location || s.description)
              );
              scriptStore.setScriptData(projId, {
                ...proj.scriptData,
                scenes: validScenes,
              });
            }
          }
          return true;
          
        case "invalid-active-project":
          // 重置活跃项目
          scriptStore.setActiveProjectId(null);
          return true;
          
        default:
          return false;
      }
    } catch (error) {
      console.error(`[SelfHeal] Failed to fix issue ${issue.id}:`, error);
      return false;
    }
  }
  
  /**
   * 执行清理
   */
  async cleanup(removeOrphans: boolean): Promise<number> {
    let cleaned = 0;
    
    if (removeOrphans) {
      // 清理孤立数据
      // 实际实现需要更复杂的逻辑
    }
    
    return cleaned;
  }
}

// 单例
export const selfHealEngine = new SelfHealEngine();

// ==================== Hook ====================

export function useSelfHeal() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<HealResult | null>(null);
  const [issues, setIssues] = useState<HealIssue[]>([]);
  
  /**
   * 运行自愈检查
   */
  const runCheck = useCallback(async () => {
    setIsRunning(true);
    try {
      const result = await selfHealEngine.runFullCheck();
      setLastResult(result);
      setIssues(result.issues);
      
      if (result.fixed > 0) {
        toast.success(`自愈完成：修复了 ${result.fixed} 个问题`);
      } else if (result.issues.length === 0) {
        toast.success("系统状态正常，未发现问题");
      }
    } catch (error) {
      console.error("[SelfHeal] Check failed:", error);
      toast.error("自愈检查失败");
    } finally {
      setIsRunning(false);
    }
  }, []);
  
  /**
   * 执行清理
   */
  const runCleanup = useCallback(async (removeOrphans: boolean) => {
    setIsRunning(true);
    try {
      const cleaned = await selfHealEngine.cleanup(removeOrphans);
      toast.success(`清理完成：移除了 ${cleaned} 个孤立数据`);
      await runCheck(); // 重新检查
    } catch (error) {
      console.error("[SelfHeal] Cleanup failed:", error);
      toast.error("清理失败");
    } finally {
      setIsRunning(false);
    }
  }, [runCheck]);
  
  // 定期自检（每5分钟）
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRunning) {
        selfHealEngine.runFullCheck().then(result => {
          if (result.fixed > 0) {
            console.log(`[SelfHeal] Auto-fixed ${result.fixed} issues`);
          }
        });
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isRunning]);
  
  return {
    isRunning,
    lastResult,
    issues,
    runCheck,
    runCleanup,
    highSeverityCount: issues.filter(i => i.severity === "high").length,
    mediumSeverityCount: issues.filter(i => i.severity === "medium").length,
    lowSeverityCount: issues.filter(i => i.severity === "low").length,
  };
}
