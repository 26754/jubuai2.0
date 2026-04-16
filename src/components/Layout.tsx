// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
import { Suspense, lazy } from "react";
import { TabBar } from "./TabBar";
import { PreviewPanel } from "./PreviewPanel";
import { RightPanel } from "./RightPanel";
import { SimpleTimeline } from "./SimpleTimeline";
import { Dashboard } from "./Dashboard";
import { ProjectHeader } from "./ProjectHeader";
import { useMediaPanelStore } from "@/stores/media-panel-store";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Loader2 } from "lucide-react";

// Panel imports - 核心面板静态导入
import { ScriptView } from "@/components/panels/script";
import { DirectorView } from "@/components/panels/director";
import { SClassView } from "@/components/panels/sclass";
import { CharactersView } from "@/components/panels/characters";
import { ScenesView } from "@/components/panels/scenes";
import { FreedomView } from "@/components/panels/freedom";
import { MediaView } from "@/components/panels/media";
import { ExportView } from "@/components/panels/export";
import { OverviewPanel } from "@/components/panels/overview";
import { AssetsView } from "@/components/panels/assets";
import { AIAssistantPanel } from "./AIAssistant";
import { UserCenter } from "./UserCenter";

// 大型组件懒加载 - 代码分割优化
const SettingsPanel = lazy(() => import("@/components/panels/SettingsPanel").then(m => ({ default: m.SettingsPanel })));

// 加载占位符组件
function PanelLoader() {
  return (
    <div className="h-full flex items-center justify-center bg-panel">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">加载中...</span>
      </div>
    </div>
  );
}

export function Layout() {
  const { activeTab, inProject } = useMediaPanelStore();

  // Dashboard mode - show full-screen dashboard or settings
  if (!inProject) {
    return (
      <div className="h-full flex bg-background">
        <TabBar />
        <div className="flex-1">
          {activeTab === "settings" ? (
            <Suspense fallback={<PanelLoader />}>
              <SettingsPanel />
            </Suspense>
          ) : (
            <Dashboard />
          )}
        </div>
      </div>
    );
  }

  // Full-screen views (no resizable panels)
  // 这些板块有自己的多栏布局，不需要全局的预览和属性面板
  const fullScreenTabs = ["export", "settings", "overview", "script", "characters", "scenes", "freedom", "assets", "ai-assistant", "user-center"];
  if (fullScreenTabs.includes(activeTab)) {
    return (
      <div className="h-full flex bg-background">
        <TabBar />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <ProjectHeader />
          {activeTab === "export" && <ExportView />}
          {activeTab === "settings" && (
            <Suspense fallback={<PanelLoader />}>
              <SettingsPanel />
            </Suspense>
          )}
          {activeTab === "overview" && <OverviewPanel />}
          {activeTab === "script" && <ScriptView />}
          {activeTab === "characters" && <CharactersView />}
          {activeTab === "scenes" && <ScenesView />}
          {activeTab === "freedom" && <FreedomView />}
          {activeTab === "assets" && <AssetsView />}
          {activeTab === "ai-assistant" && (
            <Suspense fallback={<PanelLoader />}>
              <AIAssistantPanel />
            </Suspense>
          )}
          {activeTab === "user-center" && (
            <Suspense fallback={<PanelLoader />}>
              <UserCenter />
            </Suspense>
          )}
        </div>
      </div>
    );
  }

  // Only show timeline for director and media tabs
  const showTimeline = activeTab === "director" || activeTab === "sclass" || activeTab === "media";

  // Left panel content based on active tab
  const renderLeftPanel = () => {
    switch (activeTab) {
      case "script":
        return <ScriptView />;
      case "director":
        // 保持原有 AI 导演功能
        return <DirectorView />;
      case "sclass":
        return <SClassView />;
      case "characters":
        return <CharactersView />;
      case "scenes":
        return <ScenesView />;
      case "media":
        return <MediaView />;
      case "settings":
        return <SettingsPanel />;
      default:
        return <ScriptView />;
    }
  };

  // Right panel content based on active tab
  const renderRightPanel = () => {
    return <RightPanel />;
  };

  return (
    <div className="h-full flex bg-background">
      {/* Left: TabBar - full height */}
      <TabBar />

      {/* Right content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top: Project Header with save status */}
        <ProjectHeader />
        
        {/* Main content with resizable panels */}
        <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0 min-w-0">
        {/* Main content row */}
        <ResizablePanel defaultSize={85} minSize={50} className="min-h-0 min-w-0">
          <ResizablePanelGroup direction="horizontal" className="min-h-0 min-w-0">
            {/* Left Panel: Content based on active tab */}
            <ResizablePanel defaultSize={26} minSize={18} maxSize={40} className="min-w-0">
              <div className="h-full min-w-0 overflow-hidden bg-panel border-r border-border">
                {renderLeftPanel()}
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Center: Preview */}
            <ResizablePanel defaultSize={54} minSize={28} className="min-w-0">
              <div className="h-full min-w-0 overflow-hidden">
                <PreviewPanel />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Right: Properties */}
            <ResizablePanel defaultSize={20} minSize={15} maxSize={32} className="min-w-0">
              <div className="h-full min-w-0 overflow-hidden border-l border-border">
                {renderRightPanel()}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

          {/* Bottom: Timeline - only for director and media tabs */}
          {showTimeline && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={15} minSize={10} maxSize={40}>
                <SimpleTimeline />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
