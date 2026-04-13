// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * ProjectHeader - Top bar showing project name and save status
 * Based on CineGen-AI App.tsx auto-save pattern
 */

import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useScriptStore } from "@/stores/script-store";
import { useMediaPanelStore, stages } from "@/stores/media-panel-store";
import { useAuthStore } from "@/stores/auth-store";
import { Cloud, CloudOff, Loader2, Check, ChevronRight, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type SaveStatus = "saved" | "saving" | "unsaved";

export function ProjectHeader() {
  const { activeProject } = useProjectStore();
  const { activeStage, activeEpisodeIndex, backToSeries } = useMediaPanelStore();
  const scriptStore = useScriptStore();
  const { currentUser, logout } = useAuthStore();
  
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Get current project data for change detection
  const projectId = activeProject?.id;
  const scriptProject = projectId ? scriptStore.projects[projectId] : null;
  const currentUpdatedAt = scriptProject?.updatedAt || 0;

  // Auto-save effect with 1s debounce
  useEffect(() => {
    if (!projectId || currentUpdatedAt === 0) return;
    
    // Skip if this is the first mount or no actual change
    if (lastUpdateRef.current === currentUpdatedAt) return;
    
    // Mark as unsaved
    setSaveStatus("unsaved");
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for saving
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus("saving");
      
      // Simulate save (Zustand persist handles actual storage)
      setTimeout(() => {
        setSaveStatus("saved");
        lastUpdateRef.current = currentUpdatedAt;
      }, 300);
    }, 1000); // 1s debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [projectId, currentUpdatedAt]);

  // Get current stage info
  const currentStageConfig = stages.find(s => s.id === activeStage);

  return (
    <div className="h-10 bg-[#0f0f0f] border-b border-zinc-800 px-4 flex items-center justify-between shrink-0">
      {/* Left: Project Name + Stage + Episode Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-white truncate max-w-[200px]">
          {activeProject?.name || "未命名项目"}
        </span>
        {activeEpisodeIndex != null && (
          <>
            <ChevronRight className="h-3 w-3 text-zinc-600" />
            <button
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              onClick={backToSeries}
              title="返回全剧视图"
            >
              第{activeEpisodeIndex}集
            </button>
          </>
        )}
        {currentStageConfig && (
          <>
            <span className="text-zinc-700">/</span>
            <span className="text-xs text-zinc-500 font-mono">
              {currentStageConfig.phase}
            </span>
            <span className="text-xs text-zinc-400">
              {currentStageConfig.label}
            </span>
          </>
        )}
      </div>

      {/* Right: Save Status + User Menu */}
      <div className="flex items-center gap-3">
        <SaveStatusIndicator status={saveStatus} />
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-2 text-zinc-400 hover:text-white"
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium">{currentUser?.username || '用户'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{currentUser?.username}</p>
              <p className="text-[10px]">{currentUser?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-colors",
        status === "saved" && "text-green-500/70 bg-green-500/5",
        status === "saving" && "text-yellow-500/70 bg-yellow-500/5",
        status === "unsaved" && "text-zinc-500 bg-zinc-800/50"
      )}
    >
      {status === "saved" && (
        <>
          <Check className="w-3 h-3" />
          <span>Saved</span>
        </>
      )}
      {status === "saving" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === "unsaved" && (
        <>
          <CloudOff className="w-3 h-3" />
          <span>Unsaved</span>
        </>
      )}
    </div>
  );
}
