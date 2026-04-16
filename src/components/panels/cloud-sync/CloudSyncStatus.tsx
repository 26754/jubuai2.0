// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端同步状态组件 (新版)
 * 用于在用户中心显示同步状态和快捷操作
 */

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useCloudSyncV2, useSyncStatusV2, useSyncStatsV2 } from "@/hooks/use-cloud-sync-v2";
import { cloudSyncEngine, type SyncStatus, type SyncEvent } from "@/lib/cloud-sync-engine";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Cloud,
  CloudOff,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Clock,
  Upload,
  RefreshCw,
  Radio,
  Wifi,
  WifiOff,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { cloudAuth } from "@/lib/cloud-auth";

// ==================== 类型 ====================

interface CloudSyncStatusProps {
  compact?: boolean; // 紧凑模式
  showSettings?: boolean; // 显示设置选项
}

// ==================== 本地 useSyncLogs Hook ====================

function useSyncLogsLocal(limit = 50) {
  const [logs, setLogs] = useState<SyncEvent[]>([]);

  useEffect(() => {
    setLogs(cloudSyncEngine.getLogs(limit));
    
    const unsub = cloudSyncEngine.subscribeLogs((event) => {
      setLogs(prev => [...prev.slice(-(limit - 1)), event]);
    });

    return () => unsub();
  }, [limit]);

  const clear = useCallback(() => {
    cloudSyncEngine.clearLogs();
    setLogs([]);
  }, []);

  return { logs, clear };
}

// ==================== 状态徽章 ====================

function StatusBadge({ status }: { status: SyncStatus }) {
  const config = {
    idle: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: '就绪' },
    syncing: { icon: Loader2, color: 'text-primary animate-spin', bg: 'bg-primary/10', label: '同步中' },
    paused: { icon: WifiOff, color: 'text-amber-500', bg: 'bg-amber-500/10', label: '已暂停' },
    error: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: '错误' },
    offline: { icon: CloudOff, color: 'text-muted-foreground', bg: 'bg-muted', label: '离线' },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full", bg)}>
      <Icon className={cn("h-4 w-4", color)} />
      <span className={cn("text-sm font-medium", color)}>{label}</span>
    </div>
  );
}

// ==================== 主组件 ====================

export function CloudSyncStatus({ compact = false, showSettings = false }: CloudSyncStatusProps) {
  const { currentUser, isAuthenticated } = useAuthStore();
  const { 
    isSyncing, 
    settings, 
    stats,
    sync,
    updateSettings,
  } = useCloudSyncV2();
  
  const { status } = useSyncStatusV2();
  const syncStats = useSyncStatsV2();

  // 本地状态
  const [localAutoSync, setLocalAutoSync] = useState(() => cloudSyncEngine.getSettings().autoSync);
  const [isValidatingSession, setIsValidatingSession] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'valid' | 'expired' | 'checking'>('checking');

  // 会话验证
  useEffect(() => {
    if (!isAuthenticated) {
      setSessionStatus('expired');
      return;
    }

    const validateSession = async () => {
      setIsValidatingSession(true);
      try {
        const result = await cloudAuth.validateSession();
        setSessionStatus(result.valid ? 'valid' : 'expired');
      } catch {
        setSessionStatus('checking');
      } finally {
        setIsValidatingSession(false);
      }
    };

    validateSession();
    const interval = setInterval(validateSession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // 同步设置状态
  useEffect(() => {
    setLocalAutoSync(settings.autoSync);
  }, [settings.autoSync]);

  // 格式化上次同步时间
  const formatLastSyncTime = useCallback((timestamp: number | null): string => {
    if (!timestamp) return '从未同步';
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return new Date(timestamp).toLocaleString('zh-CN');
  }, []);

  // 处理自动同步开关
  const handleAutoSyncToggle = useCallback((checked: boolean) => {
    setLocalAutoSync(checked);
    updateSettings({ autoSync: checked });
    if (checked) {
      toast.success('已启用自动同步');
      // 立即触发一次同步
      cloudSyncEngine.sync();
    } else {
      toast.info('已关闭自动同步');
    }
  }, [updateSettings]);

  // 手动同步
  const handleManualSync = useCallback(async () => {
    toast.info('正在同步...');
    await sync();
    toast.success('同步完成');
  }, [sync]);

  // 验证会话
  const handleValidateSession = useCallback(async () => {
    setIsValidatingSession(true);
    try {
      const result = await cloudAuth.validateSession();
      if (result.valid) {
        toast.success('会话有效');
        setSessionStatus('valid');
      } else {
        toast.error('会话已过期，请重新登录');
        setSessionStatus('expired');
      }
    } catch {
      toast.error('验证失败');
    } finally {
      setIsValidatingSession(false);
    }
  }, []);

  // 获取同步状态配置
  const getSyncStatusConfig = () => {
    if (isSyncing || status === 'syncing') {
      return {
        icon: Loader2,
        iconClass: 'animate-spin text-primary',
        bgClass: 'bg-primary/10',
        badge: 'bg-primary/10 text-primary border-primary/20',
        label: '同步中...',
      };
    }
    if (syncStats.lastError || status === 'error') {
      return {
        icon: XCircle,
        iconClass: 'text-destructive',
        bgClass: 'bg-destructive/10',
        badge: 'bg-destructive/10 text-destructive border-destructive/20',
        label: '同步失败',
      };
    }
    if (localAutoSync && syncStats.lastSyncAt) {
      return {
        icon: CheckCircle2,
        iconClass: 'text-green-500',
        bgClass: 'bg-green-500/10',
        badge: 'bg-green-500/10 text-green-600 border-green-500/20',
        label: '已同步',
      };
    }
    return {
      icon: Cloud,
      iconClass: 'text-muted-foreground',
      bgClass: 'bg-muted',
      badge: 'bg-muted text-muted-foreground',
      label: syncStats.lastSyncAt ? '已同步' : '未同步',
    };
  };

  const syncConfig = getSyncStatusConfig();
  const StatusIcon = syncConfig.icon;

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/50",
        compact ? "p-3" : ""
      )}>
        <div className="p-2 rounded-lg bg-destructive/10">
          <CloudOff className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">云端同步</span>
            <Badge variant="outline" className="text-xs">未登录</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            登录后启用云端同步，跨设备同步数据
          </p>
        </div>
      </div>
    );
  }

  // 紧凑模式 - 只显示状态
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={cn("p-2 rounded-lg", syncConfig.bgClass)}>
          <StatusIcon className={cn("h-4 w-4", syncConfig.iconClass)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{syncConfig.label}</span>
            {sessionStatus === 'expired' && (
              <Badge variant="destructive" className="text-xs">会话过期</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatLastSyncTime(syncStats.lastSyncAt)}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleManualSync}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
        </Button>
      </div>
    );
  }

  // 完整模式
  return (
    <div className="space-y-4">
      {/* 状态卡片 */}
      <div className={cn(
        "flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/50"
      )}>
        <div className={cn("p-3 rounded-lg", syncConfig.bgClass)}>
          <StatusIcon className={cn("h-6 w-6", syncConfig.iconClass)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">{syncConfig.label}</span>
            <Badge className={syncConfig.badge}>
              {sessionStatus === 'valid' ? '已验证' : 
               sessionStatus === 'expired' ? '会话过期' : '验证中...'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentUser?.email}
          </p>
          <p className="text-xs text-muted-foreground">
            上次同步: {formatLastSyncTime(syncStats.lastSyncAt)}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualSync}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isSyncing && "animate-spin")} />
            同步
          </Button>
          {sessionStatus === 'expired' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleValidateSession}
              disabled={isValidatingSession}
            >
              {isValidatingSession ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-lg bg-muted/30 border border-border/30 text-center">
          <div className="text-lg font-bold">{syncStats.totalSyncs}</div>
          <div className="text-xs text-muted-foreground">同步次数</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border/30 text-center">
          <div className="text-lg font-bold text-green-500">{syncStats.totalUploaded}</div>
          <div className="text-xs text-muted-foreground">上传</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border/30 text-center">
          <div className="text-lg font-bold text-purple-500">{syncStats.totalDownloaded}</div>
          <div className="text-xs text-muted-foreground">下载</div>
        </div>
      </div>

      {/* 控制选项 */}
      {showSettings && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <span className="text-sm">自动同步</span>
            </div>
            <Switch 
              checked={localAutoSync} 
              onCheckedChange={handleAutoSyncToggle}
            />
          </div>
          
          {settings.wifiOnly && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wifi className="h-3 w-3" />
              <span>仅在 WiFi 下同步</span>
            </div>
          )}

          {syncStats.lastError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-destructive font-medium">同步错误</div>
                <div className="text-xs text-destructive/80">{syncStats.lastError}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 进度条 */}
      {(isSyncing || status === 'syncing') && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">正在同步...</span>
            <span className="text-primary">100%</span>
          </div>
          <Progress value={100} className="h-1" />
        </div>
      )}
    </div>
  );
}

// ==================== 同步历史组件 ====================

export function CloudSyncHistory({ limit = 5 }: { limit?: number }) {
  const { logs, clear } = useSyncLogsLocal(limit);
  const [showLogs, setShowLogs] = useState(false);

  if (logs.length === 0) {
    return null;
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error': return <XCircle className="h-3 w-3 text-destructive" />;
      case 'conflict': return <AlertCircle className="h-3 w-3 text-amber-500" />;
      default: return <RefreshCw className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">最近 {Math.min(logs.length, limit)} 条记录</span>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowLogs(!showLogs)}>
          {showLogs ? '收起' : '查看全部'}
        </Button>
      </div>
      
      <div className="space-y-1">
        {(showLogs ? logs : logs.slice(0, limit)).map((log, index) => (
          <div key={log.id || index} className="flex items-center gap-2 text-xs">
            {getLogIcon(log.type)}
            <span className="flex-1 truncate">{log.message}</span>
            <span className="text-muted-foreground shrink-0">{formatTime(log.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
