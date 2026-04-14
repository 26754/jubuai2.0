// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 全局搜索面板
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, File, User, Grid3X3, Camera, X, ChevronRight, Clock, Star, Filter } from 'lucide-react';
import { useGlobalSearch, SearchResult } from '@/hooks/use-keyboard-shortcuts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useProjectStore } from '@/stores/project-store';
import { useCharacterLibraryStore } from '@/stores/character-library-store';
import { useSceneStore } from '@/stores/scene-store';

// ==================== 类型定义 ====================

export type SearchResultType = SearchResult['type'];

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (result: SearchResult) => void;
}

interface SearchFilters {
  types: SearchResultType[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  favorites?: boolean;
}

// ==================== 图标映射 ====================

const typeIcons: Record<SearchResultType, React.ReactNode> = {
  project: <File className="w-4 h-4" />,
  script: <File className="w-4 h-4" />,
  character: <User className="w-4 h-4" />,
  scene: <Grid3X3 className="w-4 h-4" />,
  shot: <Camera className="w-4 h-4" />,
};

const typeLabels: Record<SearchResultType, string> = {
  project: '项目',
  script: '剧本',
  character: '角色',
  scene: '场景',
  shot: '分镜',
};

const typeColors: Record<SearchResultType, string> = {
  project: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  script: 'bg-green-500/10 text-green-500 border-green-500/20',
  character: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  scene: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  shot: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
};

// ==================== 搜索结果组件 ====================

interface SearchResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
  onHover: () => void;
}

function SearchResultItem({ result, isSelected, onClick, onHover }: SearchResultItemProps) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
      }`}
    >
      <div className={`mt-0.5 p-1.5 rounded-md ${typeColors[result.type]}`}>
        {typeIcons[result.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{result.title}</span>
          <Badge variant="outline" className={`text-xs ${typeColors[result.type]}`}>
            {typeLabels[result.type]}
          </Badge>
        </div>
        {result.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {result.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-1">
          匹配: <span className="underline decoration-dotted">{result.matchedText}</span>
        </p>
      </div>
      <ChevronRight className={`w-4 h-4 mt-3 text-muted-foreground transition-opacity ${
        isSelected ? 'opacity-100' : 'opacity-0'
      }`} />
    </button>
  );
}

// ==================== 全局搜索面板 ====================

export function GlobalSearch({ open, onOpenChange, onSelect }: GlobalSearchProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filters, setFilters] = useState<SearchFilters>({ types: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('jubuai-recent-searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 获取数据
  const projects = useProjectStore(state => state.projects);
  const characters = useCharacterLibraryStore(state => state.characters);
  const scenes = useSceneStore(state => state.scenes);
  
  // 全局搜索
  const { query, results, isSearching, search, clear } = useGlobalSearch({
    debounceMs: 200,
    maxResults: 30,
  });
  
  // 应用过滤器
  const filteredResults = useMemo(() => {
    if (filters.types.length === 0) return results;
    return results.filter(r => filters.types.includes(r.type));
  }, [results, filters.types]);
  
  // 搜索历史
  const saveSearchHistory = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== searchQuery);
      const next = [searchQuery, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('jubuai-recent-searches', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  
  // 处理输入变化
  const handleInputChange = useCallback((value: string) => {
    search(value, { projects, characters, scenes });
    setSelectedIndex(0);
  }, [search, projects, characters, scenes]);
  
  // 处理选择
  const handleSelect = useCallback((result: SearchResult) => {
    saveSearchHistory(query);
    onSelect?.(result);
    onOpenChange(false);
  }, [query, saveSearchHistory, onSelect, onOpenChange]);
  
  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  }, [filteredResults, selectedIndex, handleSelect, onOpenChange]);
  
  // 切换类型过滤器
  const toggleTypeFilter = useCallback((type: SearchResultType) => {
    setFilters(prev => {
      const types = prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type];
      return { ...prev, types };
    });
  }, []);
  
  // 清除历史
  const clearHistory = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('jubuai-recent-searches');
  }, []);
  
  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      clear();
      setSelectedIndex(0);
    }
  }, [open, clear]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>全局搜索</DialogTitle>
        </DialogHeader>
        
        {/* 搜索输入框 */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="搜索项目、剧本、角色、场景..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            className="border-0 focus-visible:ring-0 h-10 text-base"
            onKeyDown={handleKeyDown}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-muted' : ''}
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* 过滤器 */}
        {showFilters && (
          <div className="px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">类型:</span>
              {(Object.keys(typeLabels) as SearchResultType[]).map(type => (
                <Button
                  key={type}
                  variant={filters.types.includes(type) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleTypeFilter(type)}
                  className="h-6 text-xs"
                >
                  {typeIcons[type]}
                  <span className="ml-1">{typeLabels[type]}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* 结果列表 */}
        <ScrollArea className="max-h-[400px]">
          <div className="py-2">
            {isSearching && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full mx-auto mb-2" />
                <p>搜索中...</p>
              </div>
            )}
            
            {!isSearching && query && filteredResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>没有找到 "{query}" 相关的结果</p>
                <p className="text-sm mt-1">尝试其他关键词</p>
              </div>
            )}
            
            {!isSearching && filteredResults.length > 0 && (
              <div className="space-y-1 px-2">
                {filteredResults.map((result, index) => (
                  <SearchResultItem
                    key={`${result.type}-${result.id}`}
                    result={result}
                    isSelected={index === selectedIndex}
                    onClick={() => handleSelect(result)}
                    onHover={() => setSelectedIndex(index)}
                  />
                ))}
              </div>
            )}
            
            {/* 搜索历史 */}
            {!query && recentSearches.length > 0 && (
              <div className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>最近搜索</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearHistory} className="h-6 text-xs">
                    清除
                  </Button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => handleInputChange(term)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-muted/50"
                    >
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 空状态提示 */}
            {!query && recentSearches.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>输入关键词开始搜索</p>
                <p className="text-sm mt-1">支持搜索项目、剧本、角色、场景等</p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* 底部提示 */}
        <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>↑↓ 导航</span>
            <span>Enter 选择</span>
            <span>Esc 关闭</span>
          </div>
          <span>{filteredResults.length} 个结果</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 快捷搜索命令 ====================

export interface QuickCommand {
  id: string;
  name: string;
  category?: string;
  icon?: React.ReactNode;
  action: () => void;
}

interface QuickCommandsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: QuickCommand[];
}

export function QuickCommands({ open, onOpenChange, commands }: QuickCommandsProps) {
  const [search, setSearch] = useState('');
  
  const filteredCommands = search.trim()
    ? commands.filter(cmd =>
        cmd.name.toLowerCase().includes(search.toLowerCase()) ||
        cmd.category?.toLowerCase().includes(search.toLowerCase())
      )
    : commands;
  
  const groupedCommands = useMemo(() => {
    const groups: Record<string, QuickCommand[]> = {};
    filteredCommands.forEach(cmd => {
      const category = cmd.category || '其他';
      if (!groups[category]) groups[category] = [];
      groups[category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);
  
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-md gap-0 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="输入命令..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 h-10"
            autoFocus
          />
        </div>
        
        <ScrollArea className="max-h-[400px]">
          <div className="py-2">
            {Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-xs text-muted-foreground font-medium">
                  {category}
                </div>
                {cmds.map(cmd => (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      onOpenChange(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted/50"
                  >
                    {cmd.icon && (
                      <div className="text-muted-foreground">{cmd.icon}</div>
                    )}
                    <span>{cmd.name}</span>
                  </button>
                ))}
              </div>
            ))}
            
            {filteredCommands.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>没有找到匹配的命令</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
