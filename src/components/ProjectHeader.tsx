// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * ProjectHeader - Top bar showing project name and stage info
 */

import { useProjectStore } from "@/stores/project-store";
import { useMediaPanelStore, stages } from "@/stores/media-panel-store";
import { ChevronRight } from "lucide-react";

export function ProjectHeader() {
  const { activeProject } = useProjectStore();
  const { activeStage, activeEpisodeIndex, backToSeries } = useMediaPanelStore();

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

      {/* Right: Project Status */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500">
          {activeProject?.name}
        </span>
      </div>
    </div>
  );
}
