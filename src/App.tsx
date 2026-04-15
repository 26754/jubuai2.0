// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { UpdateDialog } from "@/components/UpdateDialog";
import { useThemeStore } from "@/stores/theme-store";
import { useAPIConfigStore } from "@/stores/api-config-store";
import { useAppSettingsStore } from "@/stores/app-settings-store";
import { parseApiKeys } from "@/lib/api-key-manager";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { migrateToProjectStorage, recoverFromLegacy } from "@/lib/storage-migration";
import type { AvailableUpdateInfo } from "@/types/update";
import { useAuthStore } from "@/stores/auth-store";
import { AuthPage } from "@/components/auth/AuthPage";
import { SplashScreen } from "@/components/SplashScreen";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { GlobalSearchDialog } from "@/components/GlobalSearch";
import { KeyboardShortcutsPanel, KeyboardShortcutIndicator } from "@/components/KeyboardShortcutsPanel";
import { useMediaPanelStore } from "@/stores/media-panel-store";
import { shortcutExecutor, registerShortcutActions, PRESET_SHORTCUTS } from "@/lib/keyboard-shortcuts";

let hasTriggeredStartupUpdateCheck = false;

// Auth Callback 组件 - 简化版（不再使用 Supabase OAuth）
function AuthCallbackHandler() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 解析 hash 参数
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const error = params.get("error");
        
        console.log("[AuthCallback] Processing auth callback");

        if (error) {
          setStatus("error");
          setErrorMessage(decodeURIComponent(error));
          return;
        }

        // 认证回调处理完成
        setStatus("success");
        setTimeout(() => {
          window.location.hash = "";
          window.location.reload();
        }, 2000);
      } catch (err: any) {
        console.error("[AuthCallback] Error:", err);
        setStatus("error");
        setErrorMessage(err.message || "验证失败");
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 p-8 max-w-md text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">正在处理认证...</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-lg text-foreground font-medium">认证成功！</p>
            <p className="text-sm text-muted-foreground">正在跳转...</p>
          </>
        )}
        
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="text-lg text-destructive font-medium">认证失败</p>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <button 
              onClick={() => window.location.hash = ""}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              返回首页
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const { theme } = useThemeStore();
  const { updateSettings, setUpdateSettings } = useAppSettingsStore();
  const [isMigrating, setIsMigrating] = useState(true);
  const [startupUpdate, setStartupUpdate] = useState<AvailableUpdateInfo | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  
  // 认证状态
  const { isAuthenticated, initialize } = useAuthStore();

  // 媒体面板状态
  const { setActiveTab } = useMediaPanelStore();

  // 初始化认证状态
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 注册全局快捷键
  useEffect(() => {
    const actions = [
      // 全局搜索
      {
        id: 'global-search',
        name: '全局搜索',
        description: '打开全局搜索面板',
        category: 'system' as const,
        keys: [PRESET_SHORTCUTS.SYSTEM_SEARCH[0]],
        action: () => setSearchOpen(true),
      },
      // 快捷键帮助
      {
        id: 'show-shortcuts',
        name: '显示快捷键',
        description: '显示快捷键帮助面板',
        category: 'system' as const,
        keys: ['?'],
        action: () => setShortcutsOpen(true),
      },
      // 面板导航
      {
        id: 'nav-dashboard',
        name: '导航：总览',
        description: '切换到总览面板',
        category: 'navigation' as const,
        keys: [PRESET_SHORTCUTS.NAV_DASHBOARD[0]],
        action: () => setActiveTab('dashboard' as any),
      },
      {
        id: 'nav-overview',
        name: '导航：概览',
        description: '切换到概览面板',
        category: 'navigation' as const,
        keys: [PRESET_SHORTCUTS.NAV_OVERVIEW[0]],
        action: () => setActiveTab('overview' as any),
      },
      {
        id: 'nav-script',
        name: '导航：剧本',
        description: '切换到剧本面板',
        category: 'navigation' as const,
        keys: [PRESET_SHORTCUTS.NAV_SCRIPT[0]],
        action: () => setActiveTab('script' as any),
      },
      {
        id: 'nav-characters',
        name: '导航：角色库',
        description: '切换到角色库面板',
        category: 'navigation' as const,
        keys: [PRESET_SHORTCUTS.NAV_CHARACTERS[0]],
        action: () => setActiveTab('characters' as any),
      },
      {
        id: 'nav-scenes',
        name: '导航：场景库',
        description: '切换到场景库面板',
        category: 'navigation' as const,
        keys: [PRESET_SHORTCUTS.NAV_SCENES[0]],
        action: () => setActiveTab('scenes' as any),
      },
      {
        id: 'nav-director',
        name: '导航：导演',
        description: '切换到导演面板',
        category: 'navigation' as const,
        keys: [PRESET_SHORTCUTS.NAV_DIRECTOR[0]],
        action: () => setActiveTab('director' as any),
      },
      {
        id: 'nav-assets',
        name: '导航：素材库',
        description: '切换到素材库面板',
        category: 'navigation' as const,
        keys: [PRESET_SHORTCUTS.NAV_ASSETS[0]],
        action: () => setActiveTab('assets' as any),
      },
      {
        id: 'nav-export',
        name: '导航：导出',
        description: '切换到导出面板',
        category: 'navigation' as const,
        keys: [PRESET_SHORTCUTS.NAV_EXPORT[0]],
        action: () => setActiveTab('export' as any),
      },
      // ESC 关闭弹窗
      {
        id: 'close-dialogs',
        name: '关闭弹窗',
        description: '关闭当前弹窗',
        category: 'system' as const,
        keys: ['esc'],
        action: () => {
          if (searchOpen) setSearchOpen(false);
          else if (shortcutsOpen) setShortcutsOpen(false);
        },
      },
    ];

    registerShortcutActions(() => actions);

    // 注册快捷键
    actions.forEach(action => {
      shortcutExecutor.register(action);
    });

    return () => {
      actions.forEach(action => {
        shortcutExecutor.unregister(action.keys);
      });
    };
  }, [setActiveTab, searchOpen, shortcutsOpen]);

  // 使用快捷键 Hook
  useKeyboardShortcuts();

  // 启动时运行存储迁移 + 数据恢复
  useEffect(() => {
    (async () => {
      try {
        await useAppSettingsStore.persist.rehydrate();
        await migrateToProjectStorage();
        await recoverFromLegacy();
      } catch (err) {
        console.error('[App] Migration/recovery error:', err);
      } finally {
        setIsMigrating(false);
        // 迁移完成后显示启动页
        setShowSplash(true);
      }
    })();
  }, []);

  // 启动时自动同步所有已配置 API Key 的供应商模型元数据
  useEffect(() => {
    if (isMigrating) return;
    let cancelled = false;

    const runStartupSync = async () => {
      const { providers, syncProviderModels } = useAPIConfigStore.getState();
      const configuredProviders = providers
        .filter((p) => parseApiKeys(p.apiKey).length > 0)
        .sort((a, b) => Number(b.platform === 'memefast') - Number(a.platform === 'memefast'));

      for (const p of configuredProviders) {
        if (cancelled) return;
        try {
          const result = await syncProviderModels(p.id);
          if (cancelled) return;
          if (result.success) {
            console.log(`[App] Auto-synced ${p.name}: ${result.count} models`);
          } else {
            console.warn(`[App] Auto-sync skipped for ${p.name}: ${result.error || 'unknown error'}`);
          }
        } catch (error) {
          if (!cancelled) {
            console.warn(`[App] Auto-sync failed for ${p.name}:`, error);
          }
        }
      }
    };

    void runStartupSync();

    return () => {
      cancelled = true;
    };
  }, [isMigrating]);

  // 同步主题到 html 元素
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    if (
      isMigrating ||
      hasTriggeredStartupUpdateCheck ||
      !updateSettings.autoCheckEnabled ||
      !window.appUpdater
    ) {
      return;
    }

    hasTriggeredStartupUpdateCheck = true;
    let cancelled = false;

    (async () => {
      const result = await window.appUpdater?.checkForUpdates();
      if (
        cancelled ||
        !result ||
        !result.success ||
        !result.hasUpdate ||
        !result.update ||
        result.update.latestVersion === updateSettings.ignoredVersion
      ) {
        return;
      }

      setStartupUpdate(result.update);
      setUpdateDialogOpen(true);
    })().catch((error) => {
      console.warn("[App] Auto update check failed:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [isMigrating, updateSettings.autoCheckEnabled, updateSettings.ignoredVersion]);

  // 迁移中显示加载界面
  if (isMigrating) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">正在初始化...</p>
        </div>
      </div>
    );
  }

  // 检测 auth callback 路由
  const hash = window.location.hash;
  if (hash.startsWith('#auth/callback')) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <AuthCallbackHandler />
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // 已登录用户直接显示主界面（跳过 SplashScreen）
  if (isAuthenticated) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <Layout />
        <UpdateDialog
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
          updateInfo={startupUpdate}
          onIgnoreVersion={(version) => {
            setUpdateSettings({ ignoredVersion: version });
            setStartupUpdate(null);
          }}
        />
        {/* 全局搜索面板 */}
        <GlobalSearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
        />
        {/* 快捷键帮助面板 */}
        <KeyboardShortcutsPanel
          open={shortcutsOpen}
          onOpenChange={setShortcutsOpen}
        />
        {/* 快捷键指示器 */}
        <KeyboardShortcutIndicator />
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // 显示启动页（仅未登录用户）
  if (showSplash) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <SplashScreen onEnter={() => setShowSplash(false)} />
        <Toaster richColors position="top-center" />
      </div>
    );
  }

  // 未登录用户显示登录页面
  return (
    <div className="h-screen w-screen overflow-hidden">
      <AuthPage />
      <Toaster richColors position="top-center" />
    </div>
  );
}

export default App;
