// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * Cloud Sync Tab Component
 * Manages cloud synchronization settings and manual sync operations
 */

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Clock,
  User,
  Shield,
  Upload,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Sync status types
type SyncStatus = "idle" | "syncing" | "success" | "error";

interface SyncState {
  status: SyncStatus;
  lastSyncTime: number | null;
  projectsCount: number;
  settingsCount: number;
  error?: string;
}

interface CloudSyncSettings {
  autoSync: boolean;
  syncProjects: boolean;
  syncSettings: boolean;
  syncFrequency: "manual" | "5min" | "15min" | "30min" | "1hour";
  syncOnStartup: boolean;
  syncOnChange: boolean;
  notifyOnSync: boolean;
}

const DEFAULT_SETTINGS: CloudSyncSettings = {
  autoSync: false,
  syncProjects: true,
  syncSettings: true,
  syncFrequency: "manual",
  syncOnStartup: false,
  syncOnChange: true,
  notifyOnSync: true,
};

const STORAGE_KEY = "jubuai_cloud_sync_settings";

export function CloudSyncTab() {
  const { user, isAuthenticated, token } = useAuthStore();
  
  // Sync state
  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
    lastSyncTime: null,
    projectsCount: 0,
    settingsCount: 0,
  });
  
  // Settings
  const [settings, setSettings] = useState<CloudSyncSettings>(DEFAULT_SETTINGS);
  
  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.error("[CloudSync] Failed to load settings:", e);
    }
  }, []);
  
  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: CloudSyncSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    toast.success("设置已保存");
  }, []);
  
  // Sync projects to cloud
  const syncProjectsToCloud = useCallback(async () => {
    if (!isAuthenticated || !token) {
      toast.error("请先登录");
      return;
    }
    
    setSyncState(prev => ({ ...prev, status: "syncing" }));
    
    try {
      const response = await fetch("/api/sync/projects", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }
      
      const data = await response.json();
      
      setSyncState(prev => ({
        ...prev,
        status: "success",
        lastSyncTime: Date.now(),
        projectsCount: Array.isArray(data) ? data.length : 0,
        error: undefined,
      }));
      
      toast.success("项目同步成功");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "同步失败";
      setSyncState(prev => ({
        ...prev,
        status: "error",
        error: errorMessage,
      }));
      toast.error("项目同步失败", { description: errorMessage });
    }
  }, [isAuthenticated, token]);
  
  // Sync settings to cloud
  const syncSettingsToCloud = useCallback(async () => {
    if (!isAuthenticated || !token) {
      toast.error("请先登录");
      return;
    }
    
    setSyncState(prev => ({ ...prev, status: "syncing" }));
    
    try {
      const response = await fetch("/api/sync/settings", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }
      
      const data = await response.json();
      
      setSyncState(prev => ({
        ...prev,
        status: "success",
        lastSyncTime: Date.now(),
        settingsCount: data ? 1 : 0,
        error: undefined,
      }));
      
      toast.success("设置同步成功");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "同步失败";
      setSyncState(prev => ({
        ...prev,
        status: "error",
        error: errorMessage,
      }));
      toast.error("设置同步失败", { description: errorMessage });
    }
  }, [isAuthenticated, token]);
  
  // Manual full sync
  const performFullSync = useCallback(async () => {
    if (!isAuthenticated || !token) {
      toast.error("请先登录");
      return;
    }
    
    setSyncState(prev => ({ ...prev, status: "syncing" }));
    
    try {
      // Sync projects
      const projectsRes = await fetch("/api/sync/projects", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      // Sync settings
      const settingsRes = await fetch("/api/sync/settings", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!projectsRes.ok || !settingsRes.ok) {
        throw new Error("部分同步失败");
      }
      
      const projectsData = await projectsRes.json();
      const settingsData = await settingsRes.json();
      
      setSyncState(prev => ({
        ...prev,
        status: "success",
        lastSyncTime: Date.now(),
        projectsCount: Array.isArray(projectsData) ? projectsData.length : 0,
        settingsCount: settingsData ? 1 : 0,
        error: undefined,
      }));
      
      toast.success("全量同步完成");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "同步失败";
      setSyncState(prev => ({
        ...prev,
        status: "error",
        error: errorMessage,
      }));
      toast.error("同步失败", { description: errorMessage });
    }
  }, [isAuthenticated, token]);
  
  // Format last sync time
  const formatLastSyncTime = (timestamp: number | null): string => {
    if (!timestamp) return "从未同步";
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return new Date(timestamp).toLocaleString("zh-CN");
  };
  
  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-muted">
              <CloudOff className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>未登录</CardTitle>
            <CardDescription>
              请先在「用户中心」登录账号，然后才能使用云端同步功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" disabled>
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              云端账号信息
            </CardTitle>
            <CardDescription>
              当前登录的云端账号详情
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">用户邮箱</Label>
                <p className="text-sm font-medium">{user?.email || "未知"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">用户 ID</Label>
                <p className="text-sm font-medium font-mono truncate" title={user?.id}>
                  {user?.id?.slice(0, 12)}...
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">注册时间</Label>
                <p className="text-sm font-medium">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("zh-CN") : "未知"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">同步状态</Label>
                <div className="flex items-center gap-2">
                  {syncState.status === "success" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-500">已同步</span>
                    </>
                  ) : syncState.status === "syncing" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-primary">同步中...</span>
                    </>
                  ) : syncState.status === "error" ? (
                    <>
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-destructive">同步失败</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">未同步</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Last Sync Time */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">上次同步</span>
              </div>
              <span className="text-sm font-medium">
                {formatLastSyncTime(syncState.lastSyncTime)}
              </span>
            </div>
            
            {/* Sync Stats */}
            {(syncState.projectsCount > 0 || syncState.settingsCount > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{syncState.projectsCount}</p>
                  <p className="text-xs text-muted-foreground">已同步项目</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{syncState.settingsCount}</p>
                  <p className="text-xs text-muted-foreground">已同步设置</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Manual Sync Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              手动同步
            </CardTitle>
            <CardDescription>
              点击按钮立即同步数据到云端
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={syncProjectsToCloud}
                disabled={syncState.status === "syncing"}
              >
                <Upload className="h-4 w-4 mr-2" />
                同步项目
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={syncSettingsToCloud}
                disabled={syncState.status === "syncing"}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                同步设置
              </Button>
            </div>
            
            <Button
              className="w-full"
              onClick={performFullSync}
              disabled={syncState.status === "syncing"}
            >
              {syncState.status === "syncing" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  同步中...
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4 mr-2" />
                  全量同步
                </>
              )}
            </Button>
            
            {syncState.error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{syncState.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Sync Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              同步偏好设置
            </CardTitle>
            <CardDescription>
              配置自动同步行为和通知选项
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto Sync Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>启用自动同步</Label>
                <p className="text-sm text-muted-foreground">
                  自动将数据同步到云端
                </p>
              </div>
              <Switch
                checked={settings.autoSync}
                onCheckedChange={(checked) => saveSettings({ ...settings, autoSync: checked })}
              />
            </div>
            
            <Separator />
            
            {/* Sync Options */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">同步内容</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">同步项目</Label>
                  <p className="text-xs text-muted-foreground">
                    包括剧本、角色、场景、分镜等
                  </p>
                </div>
                <Switch
                  checked={settings.syncProjects}
                  onCheckedChange={(checked) => saveSettings({ ...settings, syncProjects: checked })}
                  disabled={!settings.autoSync}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">同步设置</Label>
                  <p className="text-xs text-muted-foreground">
                    包括 API 配置、界面偏好等
                  </p>
                </div>
                <Switch
                  checked={settings.syncSettings}
                  onCheckedChange={(checked) => saveSettings({ ...settings, syncSettings: checked })}
                  disabled={!settings.autoSync}
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Sync Frequency */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">同步频率</Label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: "manual", label: "手动" },
                  { value: "5min", label: "5分钟" },
                  { value: "15min", label: "15分钟" },
                  { value: "30min", label: "30分钟" },
                  { value: "1hour", label: "1小时" },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={settings.syncFrequency === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => saveSettings({ ...settings, syncFrequency: option.value })}
                    disabled={!settings.autoSync}
                    className={cn(settings.syncFrequency === option.value && "pointer-events-none")}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <Separator />
            
            {/* Additional Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">启动时同步</Label>
                  <p className="text-xs text-muted-foreground">
                    打开应用时自动同步云端数据
                  </p>
                </div>
                <Switch
                  checked={settings.syncOnStartup}
                  onCheckedChange={(checked) => saveSettings({ ...settings, syncOnStartup: checked })}
                  disabled={!settings.autoSync}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">变更时同步</Label>
                  <p className="text-xs text-muted-foreground">
                    数据变更时自动同步到云端
                  </p>
                </div>
                <Switch
                  checked={settings.syncOnChange}
                  onCheckedChange={(checked) => saveSettings({ ...settings, syncOnChange: checked })}
                  disabled={!settings.autoSync}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">同步通知</Label>
                  <p className="text-xs text-muted-foreground">
                    同步完成后显示通知
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnSync}
                  onCheckedChange={(checked) => saveSettings({ ...settings, notifyOnSync: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Security Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              安全说明
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                所有数据传输使用 HTTPS 加密
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                您的密码使用 JWT Token 安全认证
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                API Key 仅存储在本地浏览器，不会上传
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                您可以随时在「用户中心」退出登录清除本地数据
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

export default CloudSyncTab;
