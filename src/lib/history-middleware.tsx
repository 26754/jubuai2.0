// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 撤销/重做中间件
 * 用于 Zustand Store 的撤销/重做支持
 */

import { StateCreator } from 'zustand';

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface WithHistory<T> {
  _history: HistoryState<T>;
  pushHistory: (state: T) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

export type HistoryMiddleware<T> = (
  config: StateCreator<T>,
  options?: {
    limit?: number;
    equalityFn?: (a: T, b: T) => boolean;
  }
) => StateCreator<T & WithHistory<T>>;

export function createHistoryMiddleware<T>(
  initialPresent: T,
  options: {
    limit?: number;
    equalityFn?: (a: T, b: T) => boolean;
  } = {}
): {
  middleware: HistoryMiddleware<T>;
  getInitialHistory: () => HistoryState<T>;
} {
  const { limit = 50, equalityFn = (a, b) => JSON.stringify(a) === JSON.stringify(b) } = options;

  function getInitialHistory(): HistoryState<T> {
    return {
      past: [],
      present: initialPresent,
      future: [],
    };
  }

  const middleware: HistoryMiddleware<T> = (config) => (set, get, api) => {
    const store = config(
      (args) => {
        set(args);
      },
      get,
      api
    );

    // 初始化历史状态
    let history = getInitialHistory();

    return {
      ...store,
      _history: history,
      
      pushHistory: (newPresent: T) => {
        const currentPresent = history.present;
        
        // 如果新状态与当前状态相等，跳过
        if (equalityFn(newPresent, currentPresent)) {
          return;
        }
        
        history = {
          past: [...history.past, currentPresent].slice(-limit),
          present: newPresent,
          future: [],
        };
        
        // 更新 store 中的历史状态
        set({ _history: history });
        
        // 同时更新实际状态
        // 注意：这需要调用方显式调用状态更新
      },
      
      undo: () => {
        if (history.past.length === 0) {
          return false;
        }
        
        const previous = history.past[history.past.length - 1];
        history = {
          past: history.past.slice(0, -1),
          present: previous,
          future: [history.present, ...history.future],
        };
        
        set({ _history: history });
        return true;
      },
      
      redo: () => {
        if (history.future.length === 0) {
          return false;
        }
        
        const next = history.future[0];
        history = {
          past: [...history.past, history.present],
          present: next,
          future: history.future.slice(1),
        };
        
        set({ _history: history });
        return true;
      },
      
      canUndo: () => history.past.length > 0,
      
      canRedo: () => history.future.length > 0,
      
      clearHistory: () => {
        history = {
          past: [],
          present: history.present,
          future: [],
        };
        set({ _history: history });
      },
    };
  };

  return { middleware, getInitialHistory };
}

// ==================== 简化版撤销/重做 Hook ====================

import { useCallback, useEffect, useState, useRef } from 'react';

export interface UseUndoRedoOptions<T> {
  initialPresent: T;
  limit?: number;
  onChange?: (present: T) => void;
}

export function useUndoRedo<T>({
  initialPresent,
  limit = 50,
  onChange,
}: UseUndoRedoOptions<T>) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialPresent);
  const [future, setFuture] = useState<T[]>([]);
  
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  
  const push = useCallback((newPresent: T) => {
    setPast(prev => [...prev, present].slice(-limit));
    setPresent(newPresent);
    setFuture([]);
    onChange?.(newPresent);
  }, [present, limit, onChange]);
  
  const undo = useCallback(() => {
    if (past.length === 0) return false;
    
    const previous = past[past.length - 1];
    setFuture(prev => [present, ...prev]);
    setPast(prev => prev.slice(0, -1));
    setPresent(previous);
    onChange?.(previous);
    return true;
  }, [past, present, onChange]);
  
  const redo = useCallback(() => {
    if (future.length === 0) return false;
    
    const next = future[0];
    setPast(prev => [...prev, present]);
    setFuture(prev => prev.slice(1));
    setPresent(next);
    onChange?.(next);
    return true;
  }, [present, future, onChange]);
  
  const clear = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);
  
  return {
    present,
    pastCount: past.length,
    futureCount: future.length,
    canUndo,
    canRedo,
    push,
    undo,
    redo,
    clear,
    set: setPresent,
  };
}

// ==================== 撤销/重做上下文 ====================

import React, { createContext, useContext, useMemo, useCallback, useState, useRef, useEffect } from 'react';

interface HistoryContextType<T> {
  present: T;
  canUndo: boolean;
  canRedo: boolean;
  pastCount: number;
  futureCount: number;
  push: (newPresent: T) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

const createHistoryContext = <T,>() => createContext<HistoryContextType<T> | null>(null);

interface HistoryProviderProps<T> {
  initialPresent: T;
  limit?: number;
  children: React.ReactNode;
  onChange?: (present: T) => void;
}

export function createHistoryProvider<T>() {
  const Context = createHistoryContext<T>();
  
  return function HistoryProvider({ 
    initialPresent, 
    limit = 50, 
    children,
    onChange,
  }: HistoryProviderProps<T>) {
    const [past, setPast] = useState<T[]>([]);
    const [present, setPresent] = useState<T>(initialPresent);
    const [future, setFuture] = useState<T[]>([]);
    
    const canUndo = past.length > 0;
    const canRedo = future.length > 0;
    
    const push = useCallback((newPresent: T) => {
      setPast(prev => [...prev, present].slice(-limit));
      setPresent(newPresent);
      setFuture([]);
      onChange?.(newPresent);
    }, [present, limit, onChange]);
    
    const undo = useCallback(() => {
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      setFuture(prev => [present, ...prev]);
      setPast(prev => prev.slice(0, -1));
      setPresent(previous);
      onChange?.(previous);
    }, [past, present, onChange]);
    
    const redo = useCallback(() => {
      if (future.length === 0) return;
      const next = future[0];
      setPast(prev => [...prev, present]);
      setFuture(prev => prev.slice(1));
      setPresent(next);
      onChange?.(next);
    }, [present, future, onChange]);
    
    const clear = useCallback(() => {
      setPast([]);
      setFuture([]);
    }, []);
    
    const value = useMemo(() => ({
      present,
      canUndo,
      canRedo,
      pastCount: past.length,
      futureCount: future.length,
      push,
      undo,
      redo,
      clear,
    }), [present, canUndo, canRedo, past.length, future.length, push, undo, redo, clear]);
    
    return (
      <Context.Provider value={value}>
        {children}
      </Context.Provider>
    );
  };
}

export function useHistoryContext<T>() {
  const context = useContext(createHistoryContext<T>());
  if (!context) {
    throw new Error('useHistoryContext must be used within a HistoryProvider');
  }
  return context;
}

// ==================== 撤销/重做快捷键集成 ====================

export function useUndoRedoShortcuts(
  canUndo: boolean,
  canRedo: boolean,
  onUndo: () => void,
  onRedo: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.includes('Mac');
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifier && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canRedo) onRedo();
      } else if (modifier && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canUndo) onUndo();
      } else if (modifier && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) onRedo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, onUndo, onRedo]);
}
