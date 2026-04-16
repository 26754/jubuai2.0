// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * Cloud Sync Tab Component
 * Manages cloud synchronization settings and manual sync operations
 * Enhanced with real-time sync support
 */

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useCloudSync, useSyncStatus, useSyncHistory } from "@/hooks/use-cloud-sync";
import { smartSyncService } from "@/lib/smart-sync-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
  Download,
  Zap,
  Radio,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Sync status component
function SyncStatusBadge({ status }: { status: 'idle' | 'syncing' | 'success' | 'error' }) {
  const config = {
    idle: { icon: Clock, color: 'text-muted-foreground', label: '未同步', bg: 'bg-muted' },
    syncing: { icon: Loader2, color: 'text-primary animate-spin', label: '同步中...', bg: 'bg-primary/10' },
    success: { icon: CheckCircle2, color: 'text-green-500', label: '已同步', bg: 'bg-green-500/10' },
    error: { icon: XCircle, color: 'text-destructive', label: '同步失败', bg: 'bg-destructive/10' },
  };

  const { icon: Icon, color, label, bg } = config[status];

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full", bg)}>
      <Icon className={cn("h-4 w-4", color)} />
      <span className={cn("text-sm font-medium", color)}>{label}</span>
    </div>
  );
}

// Real-time sync indicator
function RealtimeSyncIndicator({ 
  isSyncing, 
  progress, 
  message 
}: { 
  isSyncing: boolean; 
  progress: number; 
  message: string;
}) {
  if (!isSyncing && progress === 0) return null;

  return (
    <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className={cn("h-4 w-4 text-primary", isSyncing && "animate-pulse")} />
          <span className="text-sm font-medium text-primary">实时同步中</span>
        </div>
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

// Sync history item
function SyncHistoryItem({ result }: { result: any }) {
  const time = new Date(result.timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        {result.success ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {result.success ? '同步成功' : '同步失败'}
          </p>
          <p className="text-xs text-muted-foreground">
            上传 {result.uploaded} | 下载 {result.downloaded}
          </p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{time}</span>
    </div>
  );
}

// Sync stats card
function SyncStatsCard({ result }: { result: any }) {
  if (!result) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="p-3 bg-muted/50 rounded-lg text-center">
        <Upload className="h-4 w-4 mx-auto mb-1 text-primary" />
        <p className="text-lg font-bold">{result.uploaded}</p>
        <p className="text-xs text-muted-foreground">已上传</p>
      </div>
      <div className="p-3 bg-muted/50 rounded-lg text-center">
        <Download className="h-4 w-4 mx-auto mb-1 text-blue-500" />
        <p className="text-lg font-bold">{result.downloaded}</p>
        <p className="text-xs text-muted-foreground">已下载</p>
      </div>
      <div className="p-3 bg-muted/50 rounded-lg text-center">
        <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
        <p className="text-lg font-bold">{result.settingsUploaded + result.settingsDownloaded}</p>
        <p className="text-xs text-muted-foreground">设置变更</p>
      </div>
      <div className="p-3 bg-muted/50 rounded-lg text-center">
        <AlertCircle className={cn("h-4 w-4 mx-auto mb-1", result.conflicts > 0 ? "text-yellow-500" : "text-muted-foreground")} />
        <p className="text-lg font-bold">{result.conflicts}</p>
        <p className="text-xs text-muted-foreground">冲突</p>
      </div>
    </div>
  );
}

export function CloudSyncTab() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    isSyncing,
    lastSyncTime,
    isAutoSyncEnabled,
    performSync,
    fetchFromCloud,
    setAutoSyncEnabled,
    syncProgress,
    syncMessage,
    lastResult,
  } = useCloudSync();
  
  const { status, lastError, progress: realtimeProgress, message: realtimeMessage } = useSyncStatus();
  const syncHistory = useSyncHistory(5);

  // Use real-time values when available
  const currentProgress = realtimeProgress || syncProgress;
  const currentMessage = realtimeMessage || syncMessage;

  // Local sync settings
  const [localAutoSync, setLocalAutoSync] = useState(isAutoSyncEnabled);
  const [syncOnStartup, setSyncOnStartup] = useState(true);
  const [syncOnChange, setSyncOnChange] = useState(true);
  const [notifyOnSync, setNotifyOnSync] = useState(true);

  // Sync settings to localStorage
  useEffect(() => {
    localStorage.setItem('jubuai_sync_settings', JSON.stringify({
      autoSync: localAutoSync,
      syncOnStartup,
      syncOnChange,
      notifyOnSync,
    }));
  }, [localAutoSync, syncOnStartup, syncOnChange, notifyOnSync]);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('jubuai_sync_settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setLocalAutoSync(settings.autoSync ?? true);
        setSyncOnStartup(settings.syncOnStartup ?? true);
        setSyncOnChange(settings.syncOnChange ?? true);
        setNotifyOnSync(settings.notifyOnSync ?? true);
        
        // Apply auto-sync setting to service
        smartSyncService.setAutoSyncEnabled(settings.autoSync ?? true);
      } catch (e) {
        console.error('[CloudSync] Failed to load settings:', e);
      }
    }
  }, []);

  // Handle auto-sync toggle
  const handleAutoSyncToggle = useCallback((checked: boolean) => {
    setLocalAutoSync(checked);
    setAutoSyncEnabled(checked);
    if (checked) {
      toast.success('已启用自动同步');
    } else {
      toast.info('已关闭自动同步');
    }
  }, [setAutoSyncEnabled]);

  // Handle manual sync
  const handleManualSync = useCallback(async () => {
    if (isSyncing) {
      toast.warning('同步进行中，请稍候');
      return;
    }
    
    const result = await performSync();
    if (result.success) {
      toast.success('同步成功', {
        description: `已上传 ${result.uploaded} 个项目，已下载 ${result.downloaded} 个项目`,
      });
    } else {
      toast.error('同步失败', {
        description: result.error,
      });
    }
  }, [isSyncing, performSync]);

  // Handle download from cloud
  const handleDownloadFromCloud = useCallback(async () => {
    if (isSyncing) return;
    
    const result = await fetchFromCloud();
    if (result.success && result.projects) {
      toast.success(`从云端获取了 ${result.projects.length} 个项目`);
    } else {
      toast.error('获取失败');
    }
  }, [isSyncing, fetchFromCloud]);

  // Format last sync time
  const formatLastSyncTime = (timestamp: number | null): string => {
    if (!timestamp) return '从未同步';
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return new Date(timestamp).toLocaleString('zh-CN');
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
              请先在登录后使用云端同步功能
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Real-time Sync Status */}
        <RealtimeSyncIndicator 
          isSyncing={isSyncing || status === 'syncing'} 
          progress={currentProgress}
          message={currentMessage}
        />

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
                <p className="text-sm font-medium truncate" title={user?.email}>
                  {user?.email || '未知'}
                </p>
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
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '未知'}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">同步状态</Label>
                <SyncStatusBadge status={status} />
              </div>
            </div>
            
            {/* Last Sync Time */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">上次同步</span>
              </div>
              <span className="text-sm font-medium">
                {formatLastSyncTime(lastSyncTime)}
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Auto Sync Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              自动同步
            </CardTitle>
            <CardDescription>
              启用后，数据将自动同步到云端
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable Auto Sync */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>启用自动同步</Label>
                <p className="text-sm text-muted-foreground">
                  自动将数据同步到云端，无需手动操作
                </p>
              </div>
              <Switch
                checked={localAutoSync}
                onCheckedChange={handleAutoSyncToggle}
              />
            </div>
            
            {localAutoSync && (
              <>
                <Separator />
                
                {/* Sync Frequency Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <Radio className="h-5 w-5 text-primary animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">实时同步已启用</p>
                      <p className="text-xs text-muted-foreground">每 10 秒自动检查并同步数据</p>
                    </div>
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
                      checked={syncOnStartup}
                      onCheckedChange={setSyncOnStartup}
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
                      checked={syncOnChange}
                      onCheckedChange={setSyncOnChange}
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
                      checked={notifyOnSync}
                      onCheckedChange={setNotifyOnSync}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Last Sync Result */}
        {(lastResult || syncHistory.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                同步结果
              </CardTitle>
              <CardDescription>
                最近一次同步的详细信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <SyncStatsCard result={lastResult} />
              
              {/* Error message if any */}
              {lastError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{lastError}</p>
                </div>
              )}
              
              {/* Sync History */}
              {syncHistory.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">同步历史</Label>
                  <div className="border border-border rounded-lg p-2">
                    {syncHistory.map((item, index) => (
                      <SyncHistoryItem key={`${item.timestamp}-${index}`} result={item} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Manual Sync Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              手动同步
            </CardTitle>
            <CardDescription>
              手动将本地数据上传或从云端下载
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="h-auto py-4 flex-col gap-2"
              >
                {isSyncing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                <span className="text-sm">上传到云端</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadFromCloud}
                disabled={isSyncing}
                className="h-auto py-4 flex-col gap-2"
              >
                <Download className="h-5 w-5" />
                <span className="text-sm">从云端下载</span>
              </Button>
            </div>
            
            <Button
              className="w-full"
              onClick={handleManualSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  同步中 {currentProgress > 0 ? `(${currentProgress}%)` : ''}...
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4 mr-2" />
                  全量同步
                </>
              )}
            </Button>
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
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

export default CloudSyncTab;
