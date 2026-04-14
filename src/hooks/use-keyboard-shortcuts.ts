// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 快捷键 Hook
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import {
  shortcutExecutor,
  loadShortcutSettings,
  ShortcutSettings,
  getAllShortcutActions,
  ShortcutAction,
} from '@/lib/keyboard-shortcuts';

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  capturePhase?: boolean; // 是否在捕获阶段处理
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, capturePhase = false } = options;
  const [settings, setSettings] = useState<ShortcutSettings>(() => loadShortcutSettings());
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (capturePhase && event.eventPhase !== Event.CAPTURING_PHASE) {
        return;
      }
      shortcutExecutor.handleKeyboardEvent(event);
    };
    
    window.addEventListener('keydown', handleKeyDown, capturePhase);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, capturePhase);
    };
  }, [enabled, capturePhase]);
  
  const updateSettings = useCallback((newSettings: ShortcutSettings) => {
    setSettings(newSettings);
    shortcutExecutor.updateSettings(newSettings);
  }, []);
  
  return {
    settings,
    updateSettings,
  };
}

// ==================== 快捷键提示 Hook ====================

export function useShortcutHints(actionId: string): { show: boolean; shortcut: string | null } {
  const [show, setShow] = useState(false);
  const [shortcut, setShortcut] = useState<string | null>(null);
  
  useEffect(() => {
    const actions = getAllShortcutActions();
    const action = actions.find(a => a.id === actionId);
    
    if (action && action.keys.length > 0) {
      const { formatShortcut } = require('@/lib/keyboard-shortcuts');
      setShortcut(formatShortcut(action.keys[0]));
    }
  }, [actionId]);
  
  useEffect(() => {
    const handleMouseEnter = () => setShow(true);
    const handleMouseLeave = () => setShow(false);
    
    const element = document.querySelector(`[data-shortcut="${actionId}"]`);
    if (element) {
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        element.removeEventListener('mouseenter', handleMouseEnter);
        element.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [actionId]);
  
  return { show, shortcut };
}

// ==================== 撤销/重做 Hook ====================

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface UseHistoryOptions<T> {
  limit?: number; // 历史记录上限
  onChange?: (state: HistoryState<T>) => void;
}

export function useHistory<T>(initialPresent: T, options: UseHistoryOptions<T> = {}) {
  const { limit = 50, onChange } = options;
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });
  
  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;
  
  const set = useCallback((newPresent: T) => {
    setState(currentState => {
      const newState = {
        past: [...currentState.past, currentState.present].slice(-limit),
        present: newPresent,
        future: [],
      };
      onChange?.(newState);
      return newState;
    });
  }, [limit, onChange]);
  
  const undo = useCallback(() => {
    setState(currentState => {
      if (currentState.past.length === 0) return currentState;
      
      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, -1);
      const newState = {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
      onChange?.(newState);
      return newState;
    });
  }, [onChange]);
  
  const redo = useCallback(() => {
    setState(currentState => {
      if (currentState.future.length === 0) return currentState;
      
      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      const newState = {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
      onChange?.(newState);
      return newState;
    });
  }, [onChange]);
  
  const clear = useCallback(() => {
    setState({
      past: [],
      present: state.present,
      future: [],
    });
  }, [state.present]);
  
  const replace = useCallback((newPresent: T) => {
    setState(currentState => {
      const newState = {
        ...currentState,
        present: newPresent,
      };
      onChange?.(newState);
      return newState;
    });
  }, [onChange]);
  
  return {
    state,
    set,
    replace,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
  };
}

// ==================== 全局搜索 Hook ====================

export interface SearchResult {
  id: string;
  type: 'project' | 'script' | 'character' | 'scene' | 'shot';
  title: string;
  description?: string;
  matchedText: string;
  score: number;
}

export interface UseGlobalSearchOptions {
  debounceMs?: number;
  maxResults?: number;
}

export function useGlobalSearch(options: UseGlobalSearchOptions = {}) {
  const { debounceMs = 300, maxResults = 20 } = options;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const search = useCallback((searchQuery: string, data: {
    projects?: any[];
    scripts?: any[];
    characters?: any[];
    scenes?: any[];
    shots?: any[];
  }) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    setQuery(searchQuery);
    
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setIsSearching(true);
      const searchResults: SearchResult[] = [];
      const lowerQuery = searchQuery.toLowerCase();
      
      // 搜索项目
      data.projects?.forEach(project => {
        const nameMatch = project.name?.toLowerCase().includes(lowerQuery);
        const descMatch = project.description?.toLowerCase().includes(lowerQuery);
        if (nameMatch || descMatch) {
          searchResults.push({
            id: project.id,
            type: 'project',
            title: project.name,
            description: project.description,
            matchedText: nameMatch ? project.name : project.description,
            score: nameMatch ? 2 : 1,
          });
        }
      });
      
      // 搜索角色
      data.characters?.forEach(character => {
        const nameMatch = character.name?.toLowerCase().includes(lowerQuery);
        const descMatch = character.description?.toLowerCase().includes(lowerQuery);
        if (nameMatch || descMatch) {
          searchResults.push({
            id: character.id,
            type: 'character',
            title: character.name,
            description: character.description,
            matchedText: nameMatch ? character.name : character.description,
            score: nameMatch ? 2 : 1,
          });
        }
      });
      
      // 搜索场景
      data.scenes?.forEach(scene => {
        const nameMatch = scene.name?.toLowerCase().includes(lowerQuery);
        const descMatch = scene.description?.toLowerCase().includes(lowerQuery);
        if (nameMatch || descMatch) {
          searchResults.push({
            id: scene.id,
            type: 'scene',
            title: scene.name,
            description: scene.description,
            matchedText: nameMatch ? scene.name : scene.description,
            score: nameMatch ? 2 : 1,
          });
        }
      });
      
      // 搜索分镜
      data.shots?.forEach(shot => {
        const nameMatch = shot.name?.toLowerCase().includes(lowerQuery);
        const descMatch = shot.description?.toLowerCase().includes(lowerQuery);
        if (nameMatch || descMatch) {
          searchResults.push({
            id: shot.id,
            type: 'shot',
            title: shot.name || `分镜 ${shot.index}`,
            description: shot.description,
            matchedText: nameMatch ? shot.name : shot.description,
            score: nameMatch ? 2 : 1,
          });
        }
      });
      
      // 按分数排序并限制数量
      searchResults.sort((a, b) => b.score - a.score);
      setResults(searchResults.slice(0, maxResults));
      setIsSearching(false);
    }, debounceMs);
  }, [debounceMs, maxResults]);
  
  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);
  
  return {
    query,
    results,
    isSearching,
    search,
    clear,
  };
}

// ==================== 批量选择 Hook ====================

export interface UseBatchSelectionOptions<T> {
  onSelectionChange?: (selected: T[]) => void;
}

export function useBatchSelection<T extends { id: string }>(options: UseBatchSelectionOptions<T> = {}) {
  const { onSelectionChange } = options;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  
  const selectedCount = selectedIds.size;
  
  const select = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      onSelectionChange?.(Array.from(next) as unknown as T[]);
      return next;
    });
  }, [onSelectionChange]);
  
  const deselect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      onSelectionChange?.(Array.from(next) as unknown as T[]);
      return next;
    });
  }, [onSelectionChange]);
  
  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectionChange?.(Array.from(next) as unknown as T[]);
      return next;
    });
  }, [onSelectionChange]);
  
  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    onSelectionChange?.(ids as unknown as T[]);
  }, [onSelectionChange]);
  
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    onSelectionChange?.([]);
  }, [onSelectionChange]);
  
  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);
  
  const startSelecting = useCallback(() => setIsSelecting(true), []);
  const stopSelecting = useCallback(() => setIsSelecting(false), []);
  
  return {
    selectedIds: Array.from(selectedIds),
    selectedCount,
    isSelected,
    isSelecting,
    select,
    deselect,
    toggle,
    selectAll,
    clearSelection,
    startSelecting,
    stopSelecting,
  };
}
