// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 同步状态指示器组件
 * 显示实时同步状态，支持跨平台、跨浏览器同步
 */

import React, { useEffect, useState } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  Check,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  useRealtimeSync,
  useSyncIndicator,
} from '@/hooks/use-realtime-sync';

interface SyncStatusIndicatorProps {
  /** 是否显示文字 */
  showText?: boolean;
  /** 是否显示待处理数量 */
  showCount?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 点击时触发的操作 */
  onClick?: () => void;
}

export function SyncStatusIndicator({
  showText = true,
  showCount = true,
  className,
  onClick,
}: SyncStatusIndicatorProps) {
  const { isConnected, isSyncing, status, offlineQueueCount } = useRealtimeSync({ autoStart: true });
  const { statusText, statusType } = useSyncIndicator();

  // 渲染图标
  const renderIcon = () => {
    switch (statusType) {
      case 'connected':
        return <Cloud className="h-4 w-4 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Cloud className="h-4 w-4" />;
    }
  };

  // 渲染计数徽章
  const renderBadge = () => {
    if (!showCount) return null;
    
    const count = status.pendingChanges + offlineQueueCount;
    if (count === 0 && statusType === 'connected') return null;

    return (
      <Badge
        variant={statusType === 'error' ? 'destructive' : 'secondary'}
        className="h-5 min-w-5 px-1 text-[10px]"
      >
        {count}
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity',
              className
            )}
            onClick={onClick}
          >
            {renderIcon()}
            {showText && (
              <span className="text-xs text-muted-foreground">
                {statusText}
              </span>
            )}
            {renderBadge()}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1.5">
            <p className="font-medium">实时同步状态</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>连接状态: {isConnected ? '已连接' : '未连接'}</p>
              <p>待同步操作: {status.pendingChanges}</p>
              <p>离线队列: {offlineQueueCount}</p>
              {status.lastEventAt && (
                <p>最后同步: {new Date(status.lastEventAt).toLocaleTimeString()}</p>
              )}
              {status.error && (
                <p className="text-red-500">错误: {status.error}</p>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ==================== 紧凑版同步状态 ====================

interface CompactSyncStatusProps {
  className?: string;
}

export function CompactSyncStatus({ className }: CompactSyncStatusProps) {
  const { isConnected, isSyncing, status, offlineQueueCount } = useRealtimeSync({ autoStart: true });

  const getColor = () => {
    if (!isConnected) return 'bg-amber-500';
    if (isSyncing) return 'bg-blue-500';
    if (offlineQueueCount > 0) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1.5', className)}>
            <div className={cn('w-2 h-2 rounded-full', getColor())} />
            {(isSyncing || offlineQueueCount > 0) && (
              <span className="text-[10px] text-muted-foreground">
                {status.pendingChanges + offlineQueueCount}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            {isConnected ? '实时同步已连接' : '同步未连接'}
            {offlineQueueCount > 0 && ` · ${offlineQueueCount} 待同步`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ==================== 同步状态横幅 ====================

interface SyncBannerProps {
  className?: string;
}

export function SyncBanner({ className }: SyncBannerProps) {
  const { isConnected, isSyncing, status, offlineQueueCount } = useRealtimeSync({ autoStart: true });
  const [dismissed, setDismissed] = useState(false);

  // 如果已连接且没有待处理操作，不显示
  if (isConnected && status.pendingChanges === 0 && offlineQueueCount === 0 && !status.error) {
    return null;
  }

  // 如果用户已关闭
  if (dismissed) return null;

  // 确定消息和样式
  let message = '';
  let bgColor = 'bg-muted';
  let icon = <Cloud className="h-4 w-4" />;

  if (!isConnected && offlineQueueCount === 0) {
    message = '正在连接实时同步服务...';
    bgColor = 'bg-blue-500/10 border-blue-500/30';
    icon = <Loader2 className="h-4 w-4 animate-spin" />;
  } else if (!isConnected) {
    message = `网络离线，${offlineQueueCount} 个操作等待同步`;
    bgColor = 'bg-amber-500/10 border-amber-500/30';
    icon = <WifiOff className="h-4 w-4 text-amber-500" />;
  } else if (status.error) {
    message = `同步错误: ${status.error}`;
    bgColor = 'bg-red-500/10 border-red-500/30';
    icon = <AlertCircle className="h-4 w-4 text-red-500" />;
  } else if (isSyncing) {
    message = `正在同步 ${status.pendingChanges} 个更改...`;
    bgColor = 'bg-blue-500/10 border-blue-500/30';
    icon = <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 border rounded-lg',
        bgColor,
        className
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm">{message}</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <AlertCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

// ==================== 同步状态面板 ====================

interface SyncStatusPanelProps {
  className?: string;
}

export function SyncStatusPanel({ className }: SyncStatusPanelProps) {
  const { isConnected, isSyncing, status, offlineQueueCount, triggerSync } = useRealtimeSync({ autoStart: true });

  return (
    <div className={cn('p-4 border rounded-lg bg-card', className)}>
      <h3 className="font-medium mb-4 flex items-center gap-2">
        <Cloud className="h-4 w-4" />
        实时同步状态
      </h3>

      <div className="space-y-3">
        {/* 连接状态 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">连接状态</span>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-amber-500'
              )}
            />
            <span className="text-sm">
              {isConnected ? '已连接' : '未连接'}
            </span>
          </div>
        </div>

        {/* 待同步操作 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">待同步操作</span>
          <span className="text-sm font-mono">{status.pendingChanges}</span>
        </div>

        {/* 离线队列 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">离线队列</span>
          <span className="text-sm font-mono">{offlineQueueCount}</span>
        </div>

        {/* 最后同步时间 */}
        {status.lastEventAt && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">最后同步</span>
            <span className="text-sm">
              {new Date(status.lastEventAt).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* 错误信息 */}
        {status.error && (
          <div className="p-2 rounded bg-red-500/10 border border-red-500/30">
            <p className="text-xs text-red-500">{status.error}</p>
          </div>
        )}

        {/* 手动同步按钮 */}
        <button
          onClick={triggerSync}
          disabled={!isConnected || isSyncing}
          className="w-full mt-2 px-3 py-2 text-sm border rounded hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              同步中...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              手动同步
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default SyncStatusIndicator;
