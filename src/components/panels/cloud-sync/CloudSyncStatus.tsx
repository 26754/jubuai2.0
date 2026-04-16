// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端同步状态组件
 * 用于在用户中心显示同步状态和快捷操作
 */

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useCloudSync, useSyncStatus } from "@/hooks/use-cloud-sync";
import { smartSyncService } from "@/lib/smart-sync-service";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { cloudAuth } from "@/lib/cloud-auth";

// 云端同步状态组件 - 用于用户中心显示
interface CloudSyncStatusProps {
  compact?: boolean; // 紧凑模式
  showSettings?: boolean; // 显示设置选项
}

export function CloudSyncStatus({ compact = false, showSettings = false }: CloudSyncStatusProps) {
  const { currentUser, isAuthenticated } = useAuthStore();
  const {
    isSyncing,
    lastSyncTime,
    setAutoSyncEnabled,
    lastResult,
  } = useCloudSync();
  
  const { status, lastError, progress, message } = useSyncStatus();

  // 本地同步设置
  const [localAutoSync, setLocalAutoSync] = useState(() => smartSyncService.isAutoSyncEnabled());
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
    setAutoSyncEnabled(checked);
    if (checked) {
      toast.success('已启用自动同步');
      // 立即触发一次同步
      smartSyncService.performFullSync();
    } else {
      toast.info('已关闭自动同步');
    }
  }, [setAutoSyncEnabled]);

  // 手动同步
  const handleManualSync = useCallback(() => {
    smartSyncService.performFullSync();
    toast.info('正在同步...');
  }, []);

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

  // 获取同步状态图标和颜色
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
    if (lastError || status === 'error') {
      return {
        icon: XCircle,
        iconClass: 'text-destructive',
        bgClass: 'bg-destructive/10',
        badge: 'bg-destructive/10 text-destructive border-destructive/20',
        label: '同步失败',
      };
    }
    if (localAutoSync && lastResult?.success) {
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
      label: lastResult ? '已同步' : '未同步',
    };
  };

  const syncConfig = getSyncStatusConfig();
  const StatusIcon = syncConfig.icon;

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
            <Badge variant="outline" className={cn("text-xs", syncConfig.badge)}>
              {sessionStatus === 'valid' ? '在线' : sessionStatus === 'expired' ? '离线' : '验证中'}
            </Badge>
          </div>
          {isSyncing && (
            <Progress value={progress} className="h-1 mt-1" />
          )}
        </div>
        {lastError && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualSync}
            className="h-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // 完整模式 - 显示更多信息
  return (
    <div className={cn(
      "rounded-lg border border-border/50 bg-gradient-to-br from-card to-muted/30",
      compact ? "p-3" : "p-4"
    )}>
      {/* 同步状态头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-lg", syncConfig.bgClass)}>
            <StatusIcon className={cn("h-5 w-5", syncConfig.iconClass)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">云端同步</span>
              <Badge variant="outline" className={cn("text-xs", syncConfig.badge)}>
                {localAutoSync ? '自动' : '手动'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSyncing ? message : `上次同步: ${formatLastSyncTime(lastResult?.timestamp || lastSyncTime)}`}
            </p>
          </div>
        </div>
        
        {/* 同步按钮 */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="gap-1.5"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          同步
        </Button>
      </div>

      {/* 同步进度 */}
      {isSyncing && (
        <div className="mb-4">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-center">{progress}%</p>
        </div>
      )}

      {/* 错误提示 */}
      {lastError && (
        <div className="flex items-center gap-2 p-2 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{lastError}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualSync}
            className="h-6 text-xs"
          >
            重试
          </Button>
        </div>
      )}

      {/* 会话状态 */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <Radio className={cn(
            "h-3.5 w-3.5",
            sessionStatus === 'valid' ? 'text-green-500' : 
            sessionStatus === 'expired' ? 'text-destructive' : 'text-muted-foreground animate-pulse'
          )} />
          <span className="text-xs text-muted-foreground">
            {sessionStatus === 'valid' ? '会话有效' : 
             sessionStatus === 'expired' ? '会话已过期' : '正在验证...'}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleValidateSession}
          disabled={isValidatingSession}
          className="h-6 text-xs"
        >
          {isValidatingSession && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          验证
        </Button>
      </div>

      {/* 设置选项 */}
      {showSettings && (
        <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">自动同步</Label>
              <p className="text-xs text-muted-foreground">每 10 秒自动检查并同步数据</p>
            </div>
            <Switch
              checked={localAutoSync}
              onCheckedChange={handleAutoSyncToggle}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// 云端同步历史记录组件
interface CloudSyncHistoryProps {
  limit?: number;
}

export function CloudSyncHistory({ limit = 5 }: CloudSyncHistoryProps) {
  const { lastResult } = useCloudSync();
  const { status } = useSyncStatus();

  if (!lastResult) return null;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">同步历史</span>
        {lastResult && (
          <span className="text-xs text-muted-foreground">
            {formatTime(lastResult.timestamp)}
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            {lastResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm">
              {lastResult.success ? '同步成功' : '同步失败'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>上传 {lastResult.uploaded}</span>
            <span>下载 {lastResult.downloaded}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CloudSyncStatus;
