// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 批量操作工具
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  MinusSquare,
  Tag,
  MoreVertical,
  X,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export interface SelectableItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  metadata?: Record<string, any>;
}

export interface BatchOperation<T extends SelectableItem> {
  id: string;
  name: string;
  icon?: React.ReactNode;
  description?: string;
  execute: (items: T[]) => Promise<void> | void;
  confirmRequired?: boolean;
  confirmMessage?: string;
}

export type SelectionMode = 'none' | 'single' | 'multiple';
export type SelectionState = 'none' | 'indeterminate' | 'all';

// ==================== 批量选择 Hook ====================

interface UseBatchSelectionOptions<T extends SelectableItem> {
  items: T[];
  onSelectionChange?: (selected: T[]) => void;
  maxSelection?: number;
}

export function useBatchSelection<T extends SelectableItem>({
  items,
  onSelectionChange,
  maxSelection = Infinity,
}: UseBatchSelectionOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // 计算选择状态
  const selectionState = useMemo<SelectionState>(() => {
    const selectableItems = items.filter(item => !item.disabled);
    if (selectableItems.length === 0) return 'none';
    if (selectedIds.size === 0) return 'none';
    if (selectedIds.size === selectableItems.length) return 'all';
    return 'indeterminate';
  }, [items, selectedIds]);
  
  const selectedCount = selectedIds.size;
  const selectedItems = useMemo(() => 
    items.filter(item => selectedIds.has(item.id)),
    [items, selectedIds]
  );
  
  // 选择操作
  const select = useCallback((id: string) => {
    if (selectedIds.size >= maxSelection) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, [selectedIds.size, maxSelection]);
  
  const deselect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);
  
  const toggle = useCallback((id: string) => {
    const item = items.find(i => i.id === id);
    if (item?.disabled) return;
    
    if (selectedIds.has(id)) {
      deselect(id);
    } else {
      if (selectedIds.size < maxSelection) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
    }
  }, [selectedIds, items, maxSelection, deselect]);
  
  const selectAll = useCallback(() => {
    const selectableItems = items.filter(item => !item.disabled);
    const idsToSelect = selectableItems.slice(0, maxSelection).map(item => item.id);
    setSelectedIds(new Set(idsToSelect));
  }, [items, maxSelection]);
  
  const selectRange = useCallback((startId: string, endId: string) => {
    const startIndex = items.findIndex(item => item.id === startId);
    const endIndex = items.findIndex(item => item.id === endId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const [from, to] = startIndex < endIndex 
      ? [startIndex, endIndex] 
      : [endIndex, startIndex];
    
    const selectableItems = items.filter(item => !item.disabled);
    const selectableInRange = selectableItems.slice(
      Math.max(0, from),
      Math.min(items.length, to + 1)
    );
    
    setSelectedIds(prev => {
      const next = new Set(prev);
      const availableSlots = maxSelection - next.size;
      
      for (const item of selectableInRange) {
        if (next.size >= maxSelection) break;
        next.add(item.id);
      }
      
      return next;
    });
  }, [items, maxSelection]);
  
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);
  
  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);
  
  // 通知选择变化
  useEffect(() => {
    onSelectionChange?.(selectedItems);
  }, [selectedItems, onSelectionChange]);
  
  return {
    selectedIds: Array.from(selectedIds),
    selectedItems,
    selectedCount,
    selectionState,
    isSelected,
    select,
    deselect,
    toggle,
    selectAll,
    selectRange,
    clearSelection,
  };
}

// ==================== 批量选择工具栏 ====================

interface BatchToolbarProps<T extends SelectableItem> {
  selectedCount: number;
  selectionState: SelectionState;
  operations: BatchOperation<T>[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  onOperation: (operation: BatchOperation<T>) => void;
  className?: string;
}

export function BatchToolbar<T extends SelectableItem>({
  selectedCount,
  selectionState,
  operations,
  onSelectAll,
  onClearSelection,
  onOperation,
  className,
}: BatchToolbarProps<T>) {
  if (selectedCount === 0) {
    return null;
  }
  
  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-2 bg-muted/50 rounded-lg border',
      className
    )}>
      <div className="flex items-center gap-4">
        {/* 全选控制 */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectionState === 'all'}
            ref={(el) => {
              if (el) el.indeterminate = selectionState === 'indeterminate';
            }}
            onCheckedChange={() => {
              if (selectionState === 'all') {
                onClearSelection();
              } else {
                onSelectAll();
              }
            }}
          />
          <span className="text-sm font-medium">
            已选择 {selectedCount} 项
          </span>
        </div>
        
        <Separator orientation="vertical" className="h-4" />
        
        {/* 批量操作 */}
        <div className="flex items-center gap-1">
          {operations.slice(0, 3).map(operation => (
            <TooltipProvider key={operation.id} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOperation(operation)}
                    className="h-8"
                  >
                    {operation.icon}
                    <span className="ml-1 hidden sm:inline">{operation.name}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{operation.description || operation.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          
          {operations.length > 3 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>更多操作</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {operations.slice(3).map(operation => (
                  <DropdownMenuItem
                    key={operation.id}
                    onClick={() => onOperation(operation)}
                  >
                    {operation.icon}
                    <span className="ml-2">{operation.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      {/* 清除选择 */}
      <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8">
        <X className="w-4 h-4 mr-1" />
        清除
      </Button>
    </div>
  );
}

// ==================== 可选择列表项 ====================

interface SelectableListItemProps {
  item: SelectableItem;
  isSelected: boolean;
  isSelectable: boolean;
  onToggle: () => void;
  onClick?: () => void;
  renderContent?: (item: SelectableItem) => React.ReactNode;
  className?: string;
}

export function SelectableListItem({
  item,
  isSelected,
  isSelectable,
  onToggle,
  onClick,
  renderContent,
  className,
}: SelectableListItemProps) {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };
  
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer',
        isSelected && 'bg-muted',
        item.disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={() => !item.disabled && onClick?.()}
    >
      {/* 选择框 */}
      <div 
        className="mt-1"
        onClick={handleCheckboxClick}
      >
        {item.disabled ? (
          <MinusSquare className="w-4 h-4 text-muted-foreground" />
        ) : isSelected ? (
          <CheckSquare className="w-4 h-4 text-primary" />
        ) : (
          <Square className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        )}
      </div>
      
      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {renderContent ? (
          renderContent(item)
        ) : (
          <>
            <div className="font-medium truncate">{item.title}</div>
            {item.description && (
              <div className="text-sm text-muted-foreground truncate mt-0.5">
                {item.description}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ==================== 批量操作对话框 ====================

interface BatchOperationDialogProps<T extends SelectableItem> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: BatchOperation<T> | null;
  selectedItems: T[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function BatchOperationDialog<T extends SelectableItem>({
  open,
  onOpenChange,
  operation,
  selectedItems,
  onConfirm,
  isLoading,
}: BatchOperationDialogProps<T>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{operation?.name}</DialogTitle>
          <DialogDescription>
            {operation?.confirmMessage || `确定要对选中的 ${selectedItems.length} 项执行此操作吗？`}
          </DialogDescription>
        </DialogHeader>
        
        {/* 影响范围预览 */}
        <div className="py-4">
          <div className="text-sm text-muted-foreground mb-2">将影响:</div>
          <ScrollArea className="max-h-40">
            <div className="space-y-1">
              {selectedItems.slice(0, 10).map(item => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="truncate">{item.title}</span>
                </div>
              ))}
              {selectedItems.length > 10 && (
                <div className="text-sm text-muted-foreground">
                  还有 {selectedItems.length - 10} 项...
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            确认操作
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 批量标签管理 ====================

interface BatchTagEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: SelectableItem[];
  existingTags: string[];
  onApplyTags: (itemIds: string[], tags: string[]) => void;
  onRemoveTags: (itemIds: string[], tags: string[]) => void;
}

export function BatchTagEditor({
  open,
  onOpenChange,
  selectedItems,
  existingTags,
  onApplyTags,
  onRemoveTags,
}: BatchTagEditorProps) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [newTag, setNewTag] = useState('');
  
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };
  
  const addNewTag = () => {
    if (newTag.trim()) {
      setSelectedTags(prev => new Set([...prev, newTag.trim()]));
      setNewTag('');
    }
  };
  
  const handleApply = () => {
    onApplyTags(selectedItems.map(i => i.id), Array.from(selectedTags));
    onOpenChange(false);
    setSelectedTags(new Set());
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>批量标签管理</DialogTitle>
          <DialogDescription>
            为选中的 {selectedItems.length} 项添加或移除标签
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 新建标签 */}
          <div className="flex gap-2">
            <Input
              placeholder="输入新标签..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNewTag()}
            />
            <Button variant="outline" onClick={addNewTag}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {/* 现有标签 */}
          <div>
            <div className="text-sm text-muted-foreground mb-2">现有标签</div>
            <ScrollArea className="max-h-40">
              <div className="flex flex-wrap gap-2">
                {existingTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.has(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {selectedTags.has(tag) && <Check className="w-3 h-3 mr-1" />}
                    {tag}
                  </Badge>
                ))}
                {existingTags.length === 0 && (
                  <span className="text-sm text-muted-foreground">暂无标签</span>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleApply} disabled={selectedTags.size === 0}>
            <Tag className="w-4 h-4 mr-2" />
            应用标签
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 批量操作进度 ====================

interface BatchProgressProps {
  current: number;
  total: number;
  itemName?: string;
  status?: 'running' | 'completed' | 'error';
  error?: string;
  onCancel?: () => void;
}

export function BatchProgress({
  current,
  total,
  itemName,
  status = 'running',
  error,
  onCancel,
}: BatchProgressProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {status === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === 'completed' && <Check className="w-4 h-4 text-green-500" />}
            {status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
            {status === 'running' && '正在处理...'}
            {status === 'completed' && '处理完成'}
            {status === 'error' && '处理出错'}
          </CardTitle>
          {status === 'running' && onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              取消
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 进度条 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>{itemName || '项目'}</span>
            <span>{current} / {total}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                status === 'running' && 'bg-primary',
                status === 'completed' && 'bg-green-500',
                status === 'error' && 'bg-red-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* 错误信息 */}
        {error && (
          <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 批量操作管理器 ====================

interface BatchOperationManagerOptions<T extends SelectableItem> {
  items: T[];
  operations: BatchOperation<T>[];
  onExecute: (operation: BatchOperation<T>, items: T[]) => Promise<void>;
}

export function useBatchOperations<T extends SelectableItem>({
  items,
  operations,
  onExecute,
}: BatchOperationManagerOptions<T>) {
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const [activeOperation, setActiveOperation] = useState<BatchOperation<T> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; status: 'running' | 'completed' | 'error'; error?: string } | null>(null);
  
  const { selectedIds, selectionState, isSelected, toggle, selectAll, clearSelection } = useBatchSelection({
    items,
    onSelectionChange: setSelectedItems,
  });
  
  const handleOperation = useCallback((operation: BatchOperation<T>) => {
    setActiveOperation(operation);
    if (operation.confirmRequired) {
      setDialogOpen(true);
    } else {
      executeOperation(operation, selectedItems);
    }
  }, [selectedItems]);
  
  const executeOperation = useCallback(async (operation: BatchOperation<T>, itemsToOperate: T[]) => {
    setDialogOpen(false);
    setProgress({ current: 0, total: itemsToOperate.length, status: 'running' });
    
    try {
      // 批量执行（带进度）
      const batchSize = 5;
      for (let i = 0; i < itemsToOperate.length; i += batchSize) {
        const batch = itemsToOperate.slice(i, i + batchSize);
        await operation.execute(batch);
        setProgress(prev => prev ? { ...prev, current: Math.min(i + batchSize, itemsToOperate.length) } : null);
      }
      
      setProgress(prev => prev ? { ...prev, status: 'completed' } : null);
      
      // 完成后清除选择
      setTimeout(() => {
        clearSelection();
        setProgress(null);
      }, 1500);
    } catch (error: any) {
      setProgress(prev => prev ? { ...prev, status: 'error', error: error.message } : null);
    }
  }, [clearSelection]);
  
  const confirmOperation = useCallback(() => {
    if (activeOperation) {
      executeOperation(activeOperation, selectedItems);
    }
  }, [activeOperation, selectedItems, executeOperation]);
  
  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedItems.length,
    selectionState,
    isSelected,
    toggle,
    selectAll,
    clearSelection,
    operations,
    handleOperation,
    activeOperation,
    dialogOpen,
    setDialogOpen,
    confirmOperation,
    progress,
  };
}

// ==================== 快捷键提示 ====================

export function SelectionShortcutHint({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 text-xs text-muted-foreground', className)}>
      <span>点击选择</span>
      <span>Shift+点击 范围选择</span>
      <span>Ctrl/Cmd+点击 多选</span>
    </div>
  );
}
