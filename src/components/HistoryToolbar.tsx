// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 撤销/重做工具条组件
 */

import React, { useCallback } from 'react';
import { Undo2, Redo2, Save, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface HistoryToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  pastCount: number;
  futureCount: number;
  hasUnsavedChanges?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave?: () => void;
  onClearHistory?: () => void;
  showHistory?: boolean;
  className?: string;
}

export function HistoryToolbar({
  canUndo,
  canRedo,
  pastCount,
  futureCount,
  hasUnsavedChanges,
  onUndo,
  onRedo,
  onSave,
  onClearHistory,
  showHistory = true,
  className = '',
}: HistoryToolbarProps) {
  return (
    <TooltipProvider>
      <div className={`flex items-center gap-1 ${className}`}>
        {/* 撤销 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              className="h-8 w-8"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>撤销 {canUndo && pastCount > 0 && `(${pastCount} 步)`}</p>
          </TooltipContent>
        </Tooltip>
        
        {/* 重做 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              className="h-8 w-8"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>重做 {canRedo && futureCount > 0 && `(${futureCount} 步)`}</p>
          </TooltipContent>
        </Tooltip>
        
        {/* 历史记录下拉菜单 */}
        {showHistory && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canUndo && !canRedo}
                    className="h-8 w-8"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>历史记录</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                历史记录
              </div>
              <DropdownMenuSeparator />
              {canUndo ? (
                <>
                  <DropdownMenuItem disabled className="text-xs">
                    可撤销: {pastCount} 步
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-xs">
                    可重做: {futureCount} 步
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  暂无历史记录
                </DropdownMenuItem>
              )}
              {onClearHistory && (canUndo || canRedo) && (
                <DropdownMenuItem
                  onClick={onClearHistory}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  清除历史
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {/* 保存按钮 */}
        {onSave && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={hasUnsavedChanges ? 'default' : 'ghost'}
                  size="icon"
                  onClick={onSave}
                  disabled={!hasUnsavedChanges}
                  className="h-8 w-8"
                >
                  <Save className={`h-4 w-4 ${hasUnsavedChanges ? 'animate-pulse' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>保存 {hasUnsavedChanges ? '(有未保存的更改)' : ''}</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

// ==================== 撤销/重做状态标签 ====================

interface HistoryStatusBadgeProps {
  pastCount: number;
  futureCount: number;
  className?: string;
}

export function HistoryStatusBadge({ pastCount, futureCount, className = '' }: HistoryStatusBadgeProps) {
  if (pastCount === 0 && futureCount === 0) {
    return null;
  }
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {pastCount > 0 && (
        <Badge variant="outline" className="text-xs">
          {pastCount} 可撤销
        </Badge>
      )}
      {futureCount > 0 && (
        <Badge variant="outline" className="text-xs">
          {futureCount} 可重做
        </Badge>
      )}
    </div>
  );
}

// ==================== 撤销/重做快捷键提示 ====================

export function UndoRedoShortcutHint({ className = '' }: { className?: string }) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  
  return (
    <div className={`flex items-center gap-4 text-xs text-muted-foreground ${className}`}>
      <span>
        撤销: <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono text-[10px]">
          {isMac ? '⌘Z' : 'Ctrl+Z'}
        </kbd>
      </span>
      <span>
        重做: <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono text-[10px]">
          {isMac ? '⌘⇧Z' : 'Ctrl+Shift+Z'}
        </kbd>
      </span>
    </div>
  );
}

// ==================== 撤销/重做状态指示器 ====================

interface UndoRedoIndicatorProps {
  actionName: string;
  direction: 'undo' | 'redo';
  visible: boolean;
}

export function UndoRedoIndicator({ actionName, direction, visible }: UndoRedoIndicatorProps) {
  if (!visible) return null;
  
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-muted/90 backdrop-blur-sm rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          {direction === 'undo' ? '已撤销' : '已重做'}:
        </span>
        <span className="font-medium">{actionName}</span>
      </div>
    </div>
  );
}

// ==================== 批量操作撤销支持 ====================

import { useRef, useCallback } from 'react';

interface BatchOperation<T> {
  id: string;
  name: string;
  execute: () => T;
  undo: () => void;
}

export function useBatchOperations<T>() {
  const operationsRef = useRef<BatchOperation<T>[]>([]);
  const currentIndexRef = useRef(-1);
  
  const addOperation = useCallback((operation: BatchOperation<T>) => {
    // 删除当前位置之后的所有操作
    operationsRef.current = operationsRef.current.slice(0, currentIndexRef.current + 1);
    // 添加新操作
    operationsRef.current.push(operation);
    currentIndexRef.current = operationsRef.current.length - 1;
  }, []);
  
  const executeOperation = useCallback((id: string) => {
    const operation = operationsRef.current.find(op => op.id === id);
    if (operation) {
      const result = operation.execute();
      currentIndexRef.current = operationsRef.current.findIndex(op => op.id === id);
      return result;
    }
    return null;
  }, []);
  
  const undo = useCallback(() => {
    if (currentIndexRef.current >= 0) {
      const operation = operationsRef.current[currentIndexRef.current];
      operation.undo();
      currentIndexRef.current--;
      return operation.name;
    }
    return null;
  }, []);
  
  const redo = useCallback(() => {
    if (currentIndexRef.current < operationsRef.current.length - 1) {
      currentIndexRef.current++;
      const operation = operationsRef.current[currentIndexRef.current];
      operation.execute();
      return operation.name;
    }
    return null;
  }, []);
  
  const canUndo = useCallback(() => currentIndexRef.current >= 0, []);
  const canRedo = useCallback(() => currentIndexRef.current < operationsRef.current.length - 1, []);
  
  const clear = useCallback(() => {
    operationsRef.current = [];
    currentIndexRef.current = -1;
  }, []);
  
  return {
    operations: operationsRef.current,
    currentIndex: currentIndexRef.current,
    addOperation,
    executeOperation,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
  };
}
