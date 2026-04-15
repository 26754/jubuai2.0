// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * Context Navigation Component
 * 
 * 上下文导航增强 - 显示来源信息并提供快速导航
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FileText,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  Info,
  Clock,
  Hash,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ==================== 类型定义 ====================

/** 资源同步状态 */
export type SyncStatus = "synced" | "pending" | "modified" | "conflict" | "unknown";

/** 来源类型 */
export type SourceType = "character" | "scene" | "episode" | "project";

/** 上下文信息 */
export interface ContextInfo {
  /** 来源类型 */
  sourceType: SourceType;
  /** 剧本资源ID */
  scriptId: string;
  /** 资源名称 */
  name: string;
  /** 所属剧本名称 */
  projectName?: string;
  /** 所属集数（如果有） */
  episodeIndex?: number;
  /** 关联的角色库ID */
  linkedLibraryId?: string;
  /** 同步状态 */
  syncStatus?: SyncStatus;
  /** 最后修改时间 */
  lastModified?: Date;
  /** 关联的视觉风格 */
  styleId?: string;
  /** 关联的提示词语言 */
  promptLanguage?: string;
}

/** 面包屑项 */
interface BreadcrumbItemData {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

// ==================== 同步状态指示器 ====================

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const SYNC_STATUS_CONFIG = {
  synced: {
    icon: CheckCircle2,
    label: "已同步",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  pending: {
    icon: Clock,
    label: "待同步",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  modified: {
    icon: AlertTriangle,
    label: "已修改",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  conflict: {
    icon: AlertTriangle,
    label: "冲突",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  unknown: {
    icon: Info,
    label: "未关联",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-muted",
  },
};

export function SyncStatusIndicator({ status, showLabel = false, size = "sm" }: SyncStatusIndicatorProps) {
  const config = SYNC_STATUS_CONFIG[status];
  const Icon = config.icon;
  
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const badgeClass = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs";
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={`${config.bgColor} ${config.borderColor} ${config.color} ${badgeClass}`}
        >
          <Icon className={`${iconSize} mr-1`} />
          {showLabel && config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{config.label}</p>
        {status === "synced" && <p className="text-xs text-muted-foreground">资源已与剧本同步</p>}
        {status === "pending" && <p className="text-xs text-muted-foreground">资源已创建，待关联回剧本</p>}
        {status === "modified" && <p className="text-xs text-muted-foreground">剧本或资源有修改未同步</p>}
        {status === "conflict" && <p className="text-xs text-muted-foreground">存在同步冲突，需手动处理</p>}
        {status === "unknown" && <p className="text-xs text-muted-foreground">资源未关联到剧本</p>}
      </TooltipContent>
    </Tooltip>
  );
}

// ==================== 批量同步状态 ====================

interface BatchSyncStatusProps {
  syncedCount: number;
  totalCount: number;
  onViewDetails?: () => void;
}

export function BatchSyncStatus({ syncedCount, totalCount, onViewDetails }: BatchSyncStatusProps) {
  const percentage = totalCount > 0 ? Math.round((syncedCount / totalCount) * 100) : 0;
  const remaining = totalCount - syncedCount;
  
  if (totalCount === 0) {
    return null;
  }
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1">
          <SyncStatusIndicator status={remaining === 0 ? "synced" : "pending" } />
          <span className="text-xs text-muted-foreground">
            {syncedCount}/{totalCount}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">同步状态</span>
            <SyncStatusIndicator status={remaining === 0 ? "synced" : "pending" } showLabel />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>已同步</span>
              <span>{syncedCount}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>未同步</span>
              <span>{remaining}</span>
            </div>
          </div>
          
          {onViewDetails && (
            <Button variant="outline" size="sm" className="w-full" onClick={onViewDetails}>
              查看详情
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ==================== 来源信息卡片 ====================

interface SourceInfoCardProps {
  context: ContextInfo;
  onNavigate?: (context: ContextInfo) => void;
  onSync?: (context: ContextInfo) => void;
  compact?: boolean;
}

export function SourceInfoCard({ context, onNavigate, onSync, compact = false }: SourceInfoCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const Icon = context.sourceType === "character" ? Hash : FileText;
  const typeLabel = context.sourceType === "character" ? "角色" : "场景";
  
  return (
    <Card className={`${compact ? 'py-2' : ''} bg-gradient-to-r from-muted/50 to-transparent`}>
      <CardContent className={`${compact ? 'px-3 py-1' : 'p-3'} space-y-2`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">来自剧本</span>
            <Badge variant="outline" className="text-xs shrink-0">
              {typeLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {context.syncStatus && (
              <SyncStatusIndicator status={context.syncStatus} />
            )}
            {!compact && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => setExpanded(!expanded)}
              >
                <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </Button>
            )}
          </div>
        </div>
        
        {/* 主要信息 */}
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium text-sm truncate" title={context.name}>
            {context.name}
          </span>
        </div>
        
        {/* 面包屑导航 */}
        {!compact && (
          <Breadcrumb>
            <BreadcrumbList>
              {context.projectName && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink className="text-xs" onClick={() => onNavigate?.(context)}>
                      {context.projectName}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              {context.episodeIndex !== undefined && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink className="text-xs">
                      第{context.episodeIndex}集
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs font-medium">
                  {typeLabel}: {context.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}
        
        {/* 扩展信息 */}
        {expanded && !compact && (
          <div className="pt-2 border-t space-y-1.5">
            {context.projectName && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">剧本项目</span>
                <span>{context.projectName}</span>
              </div>
            )}
            {context.episodeIndex !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">所属集数</span>
                <span>第{context.episodeIndex}集</span>
              </div>
            )}
            {context.styleId && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">视觉风格</span>
                <Badge variant="secondary" className="text-[10px]">{context.styleId}</Badge>
              </div>
            )}
            {context.promptLanguage && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">提示词语言</span>
                <span>{context.promptLanguage === 'zh' ? '中文' : context.promptLanguage === 'en' ? '英文' : '中英双语'}</span>
              </div>
            )}
            {context.lastModified && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">最后修改</span>
                <span>{context.lastModified.toLocaleString()}</span>
              </div>
            )}
            
            {/* 操作按钮 */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-8"
                onClick={() => onNavigate?.(context)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                跳转剧本
              </Button>
              {context.syncStatus !== "synced" && onSync && (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex-1 h-8"
                  onClick={() => onSync(context)}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  同步
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* 紧凑模式下的快捷操作 */}
        {compact && onNavigate && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full h-6 text-xs"
            onClick={() => onNavigate(context)}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            跳转剧本
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 上下文导航栏 ====================

interface ContextNavBarProps {
  contexts: ContextInfo[];
  currentContext?: ContextInfo;
  onSelectContext?: (context: ContextInfo) => void;
  onBackToScript?: () => void;
  title?: string;
}

export function ContextNavBar({
  contexts,
  currentContext,
  onSelectContext,
  onBackToScript,
  title,
}: ContextNavBarProps) {
  const [open, setOpen] = useState(false);
  
  if (contexts.length === 0 && !currentContext) {
    return null;
  }
  
  const displayContext = currentContext || contexts[0];
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 gap-1"
        onClick={onBackToScript}
      >
        <ArrowLeft className="h-4 w-4" />
        返回剧本
      </Button>
      
      <div className="h-4 w-px bg-border" />
      
      <Breadcrumb>
        <BreadcrumbList>
          {displayContext.projectName && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink className="text-xs" onClick={() => onBackToScript?.()}>
                  {displayContext.projectName}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {displayContext.episodeIndex !== undefined && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink className="text-xs">
                  第{displayContext.episodeIndex}集
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs font-medium flex items-center gap-1">
              {displayContext.sourceType === "character" ? (
                <Hash className="h-3 w-3" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              {displayContext.name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      {displayContext.syncStatus && (
        <SyncStatusIndicator status={displayContext.syncStatus} />
      )}
      
      {contexts.length > 1 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7">
              <span className="text-xs text-muted-foreground">
                +{contexts.length - 1} 更多
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <div className="space-y-1">
              {contexts.map((ctx, idx) => (
                <Button
                  key={ctx.scriptId}
                  variant={ctx.scriptId === currentContext?.scriptId ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    onSelectContext?.(ctx);
                    setOpen(false);
                  }}
                >
                  <FileText className="h-3 w-3 mr-2" />
                  <span className="truncate">{ctx.name}</span>
                  {ctx.episodeIndex !== undefined && (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      第{ctx.episodeIndex}集
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// ==================== 导出 ====================

export type { ContextInfo, BreadcrumbItemData };
