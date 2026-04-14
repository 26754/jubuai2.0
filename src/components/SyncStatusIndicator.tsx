// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
/**
 * 同步状态指示器组件
 * 显示当前云端同步状态
 */

import { useCloudSync, formatSyncTime } from '@/hooks/use-cloud-sync';
import { useAuthStore } from '@/stores/auth-store';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function SyncStatusIndicator() {
  const { isAuthenticated } = useAuthStore();
  const { 
    isSyncing, 
    lastSyncedAt, 
    error, 
    pendingChanges,
    syncNow,
    canSync
  } = useCloudSync();
  
  // 未登录用户不显示同步状态
  if (!isAuthenticated) {
    return null;
  }
  
  const getSyncIcon = () => {
    if (isSyncing) {
      return <RefreshCw className="h-4 w-4 animate-spin text-primary" />;
    }
    if (error) {
      return <CloudOff className="h-4 w-4 text-destructive" />;
    }
    if (pendingChanges > 0) {
      return <Cloud className="h-4 w-4 text-amber-500" />;
    }
    return <Cloud className="h-4 w-4 text-green-500" />;
  };
  
  const getSyncText = () => {
    if (isSyncing) {
      return '同步中...';
    }
    if (error) {
      return '同步失败';
    }
    if (pendingChanges > 0) {
      return `待同步 (${pendingChanges})`;
    }
    return '已同步';
  };
  
  const getSyncTooltip = () => {
    if (error) {
      return `同步失败: ${error}`;
    }
    if (lastSyncedAt) {
      return `上次同步: ${formatSyncTime(lastSyncedAt)}`;
    }
    return '尚未同步';
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-2 text-muted-foreground hover:text-foreground",
            error && "text-destructive"
          )}
          title={getSyncTooltip()}
        >
          {getSyncIcon()}
          <span className="hidden sm:inline text-xs">{getSyncText()}</span>
          {pendingChanges > 0 && !isSyncing && (
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
          云端同步状态
        </div>
        
        <DropdownMenuItem className="gap-2 cursor-default">
          {getSyncIcon()}
          <div className="flex flex-col">
            <span className="font-medium">{getSyncText()}</span>
            {lastSyncedAt && (
              <span className="text-xs text-muted-foreground">
                {formatSyncTime(lastSyncedAt)}
              </span>
            )}
          </div>
        </DropdownMenuItem>
        
        {error && (
          <div className="px-2 py-1.5 text-xs text-destructive">
            <AlertCircle className="h-3 w-3 inline mr-1" />
            {error}
          </div>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => syncNow()}
          disabled={!canSync || isSyncing}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          立即同步
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {pendingChanges > 0 ? (
            <span>{pendingChanges} 个待同步的更改</span>
          ) : (
            <span>所有数据已同步</span>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * 同步状态徽章组件（用于显示在界面上）
 */
export function SyncBadge() {
  const { isSyncing, error, pendingChanges } = useCloudSync();
  
  if (isSyncing) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
        <RefreshCw className="h-3 w-3 animate-spin" />
        同步中
      </span>
    );
  }
  
  if (error) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs">
        <AlertCircle className="h-3 w-3" />
        同步失败
      </span>
    );
  }
  
  if (pendingChanges > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs">
        <Cloud className="h-3 w-3" />
        待同步
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs">
      <Check className="h-3 w-3" />
      已同步
    </span>
  );
}
