// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 撤销/重做管理器
 * 支持多层级撤销/重做
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from '@/hooks/use-keyboard-shortcuts';

// ==================== 状态类型定义 ====================

export interface UndoableState<T> {
  past: T[];
  present: T;
  future: T[];
}

// ==================== 历史记录管理器 ====================

type HistoryCallback<T> = (state: UndoableState<T>) => void;

class HistoryManager<T> {
  private history: UndoableState<T>;
  private limit: number;
  private listeners: Set<HistoryCallback<T>> = new Set();
  private lastSavedPresent: T | null = null;
  
  constructor(initialPresent: T, limit = 50) {
    this.history = {
      past: [],
      present: initialPresent,
      future: [],
    };
    this.limit = limit;
    this.lastSavedPresent = initialPresent;
  }
  
  getState(): UndoableState<T> {
    return this.history;
  }
  
  push(newPresent: T, skipIfEqual = true): void {
    // 如果新状态与当前状态相等，跳过
    if (skipIfEqual && this.isEqual(newPresent, this.history.present)) {
      return;
    }
    
    this.history = {
      past: [...this.history.past, this.history.present].slice(-this.limit),
      present: newPresent,
      future: [],
    };
    
    this.lastSavedPresent = newPresent;
    this.notify();
  }
  
  undo(): boolean {
    if (this.history.past.length === 0) {
      return false;
    }
    
    const previous = this.history.past[this.history.past.length - 1];
    this.history = {
      past: this.history.past.slice(0, -1),
      present: previous,
      future: [this.history.present, ...this.history.future],
    };
    
    this.notify();
    return true;
  }
  
  redo(): boolean {
    if (this.history.future.length === 0) {
      return false;
    }
    
    const next = this.history.future[0];
    this.history = {
      past: [...this.history.past, this.history.present],
      present: next,
      future: this.history.future.slice(1),
    };
    
    this.notify();
    return true;
  }
  
  replace(present: T): void {
    this.history = {
      ...this.history,
      present,
    };
    this.lastSavedPresent = present;
    this.notify();
  }
  
  clear(): void {
    this.history = {
      past: [],
      present: this.history.present,
      future: [],
    };
    this.notify();
  }
  
  reset(present: T): void {
    this.history = {
      past: [],
      present,
      future: [],
    };
    this.lastSavedPresent = present;
    this.notify();
  }
  
  canUndo(): boolean {
    return this.history.past.length > 0;
  }
  
  canRedo(): boolean {
    return this.history.future.length > 0;
  }
  
  hasUnsavedChanges(): boolean {
    if (!this.lastSavedPresent) return false;
    return !this.isEqual(this.lastSavedPresent, this.history.present);
  }
  
  subscribe(listener: HistoryCallback<T>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  private notify(): void {
    this.listeners.forEach(listener => {
      listener(this.history);
    });
  }
  
  private isEqual(a: T, b: T): boolean {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
}

// ==================== React Hook ====================

export function useHistoryManager<T>(initialPresent: T, limit = 50) {
  const managerRef = useRef<HistoryManager<T> | null>(null);
  const [state, setState] = useState<UndoableState<T>>(() => {
    const manager = new HistoryManager<T>(initialPresent, limit);
    managerRef.current = manager;
    return manager.getState();
  });
  
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;
    
    const unsubscribe = manager.subscribe(setState);
    return unsubscribe;
  }, []);
  
  const push = useCallback((newPresent: T) => {
    managerRef.current?.push(newPresent);
  }, []);
  
  const undo = useCallback(() => {
    return managerRef.current?.undo() ?? false;
  }, []);
  
  const redo = useCallback(() => {
    return managerRef.current?.redo() ?? false;
  }, []);
  
  const replace = useCallback((present: T) => {
    managerRef.current?.replace(present);
  }, []);
  
  const clear = useCallback(() => {
    managerRef.current?.clear();
  }, []);
  
  const reset = useCallback((present: T) => {
    managerRef.current?.reset(present);
  }, []);
  
  return {
    state,
    present: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    hasUnsavedChanges: managerRef.current?.hasUnsavedChanges() ?? false,
    push,
    undo,
    redo,
    replace,
    clear,
    reset,
  };
}

// ==================== 批量操作支持 ====================

export function useBatchHistory<T>(initialPresent: T, limit = 50) {
  const managerRef = useRef<HistoryManager<T> | null>(null);
  const batchRef = useRef<{ inBatch: boolean; updates: T[] }>({
    inBatch: false,
    updates: [],
  });
  
  const [state, setState] = useState<UndoableState<T>>(() => {
    const manager = new HistoryManager<T>(initialPresent, limit);
    managerRef.current = manager;
    return manager.getState();
  });
  
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;
    
    const unsubscribe = manager.subscribe(setState);
    return unsubscribe;
  }, []);
  
  const startBatch = useCallback(() => {
    batchRef.current = { inBatch: true, updates: [] };
  }, []);
  
  const addToBatch = useCallback((update: T) => {
    if (batchRef.current.inBatch) {
      batchRef.current.updates.push(update);
    }
  }, []);
  
  const commitBatch = useCallback(() => {
    if (batchRef.current.inBatch && batchRef.current.updates.length > 0) {
      const lastUpdate = batchRef.current.updates[batchRef.current.updates.length - 1];
      managerRef.current?.push(lastUpdate, false);
    }
    batchRef.current = { inBatch: false, updates: [] };
  }, []);
  
  const discardBatch = useCallback(() => {
    batchRef.current = { inBatch: false, updates: [] };
  }, []);
  
  const push = useCallback((newPresent: T) => {
    if (batchRef.current.inBatch) {
      addToBatch(newPresent);
    } else {
      managerRef.current?.push(newPresent);
    }
  }, [addToBatch]);
  
  const undo = useCallback(() => {
    return managerRef.current?.undo() ?? false;
  }, []);
  
  const redo = useCallback(() => {
    return managerRef.current?.redo() ?? false;
  }, []);
  
  const replace = useCallback((present: T) => {
    managerRef.current?.replace(present);
  }, []);
  
  const clear = useCallback(() => {
    managerRef.current?.clear();
  }, []);
  
  const reset = useCallback((present: T) => {
    managerRef.current?.reset(present);
  }, []);
  
  return {
    state,
    present: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    hasUnsavedChanges: managerRef.current?.hasUnsavedChanges() ?? false,
    push,
    undo,
    redo,
    replace,
    clear,
    reset,
    startBatch,
    commitBatch,
    discardBatch,
    isInBatch: batchRef.current.inBatch,
  };
}

// ==================== 撤销/重做按钮组件 ====================

import { Undo2, Redo2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UndoRedoButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  hasUnsavedChanges?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave?: () => void;
}

export function UndoRedoButtons({
  canUndo,
  canRedo,
  hasUnsavedChanges,
  onUndo,
  onRedo,
  onSave,
}: UndoRedoButtonsProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
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
            <p>撤销 (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>
        
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
            <p>重做 (Ctrl+Shift+Z)</p>
          </TooltipContent>
        </Tooltip>
        
        {onSave && (
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
              <p>保存 (Ctrl+S)</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// ==================== 撤销/重做状态指示器 ====================

interface UndoRedoIndicatorProps {
  pastCount: number;
  futureCount: number;
}

export function UndoRedoIndicator({ pastCount, futureCount }: UndoRedoIndicatorProps) {
  if (pastCount === 0 && futureCount === 0) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{pastCount} 步可撤销</span>
      <span>|</span>
      <span>{futureCount} 步可重做</span>
    </div>
  );
}
