// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 全局搜索系统
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search,
  SearchX,
  History,
  Clock,
  FileText,
  Users,
  Grid3X3,
  FolderOpen,
  Sparkles,
  Filter,
  X,
  TrendingUp,
  ChevronRight,
  Loader2,
  Command,
  Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export type SearchScope = 
  | 'all'           // 全部
  | 'projects'      // 项目
  | 'scripts'       // 剧本
  | 'characters'    // 角色
  | 'scenes'        // 场景
  | 'media';        // 素材

export type SearchResultType = 
  | 'project'
  | 'script'
  | 'character'
  | 'scene'
  | 'media'
  | 'shot';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string;
  icon: React.ReactNode;
  color: string;
  matchField?: string;    // 匹配字段
  matchText?: string;     // 匹配文本片段
  relevance: number;      // 相关度 (0-100)
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SearchHistory {
  id: string;
  query: string;
  scope?: SearchScope;
  timestamp: Date;
  resultCount: number;
}

export interface SearchFilters {
  scope?: SearchScope;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  tags?: string[];
  sortBy?: 'relevance' | 'date' | 'name';
}

// ==================== 搜索存储 ====================

const SEARCH_HISTORY_KEY = 'jubuai-search-history';
const SEARCH_HISTORY_LIMIT = 20;

// ==================== 搜索 Hook ====================

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [history, setHistory] = useState<SearchHistory[]>([]);
  
  // 加载搜索历史
  const loadHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored).map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp),
        }));
        setHistory(parsed);
      }
    } catch (error) {
      console.error('[Search] Failed to load history:', error);
    }
  }, []);
  
  // 保存搜索历史
  const saveHistory = useCallback((searchHistory: SearchHistory[]) => {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
    } catch (error) {
      console.error('[Search] Failed to save history:', error);
    }
  }, []);
  
  // 添加到历史
  const addToHistory = useCallback((searchQuery: string, scope?: SearchScope, resultCount: number = 0) => {
    if (!searchQuery.trim()) return;
    
    const newEntry: SearchHistory = {
      id: crypto.randomUUID(),
      query: searchQuery.trim(),
      scope,
      timestamp: new Date(),
      resultCount,
    };
    
    // 去除重复
    const filtered = history.filter(h => h.query.toLowerCase() !== searchQuery.toLowerCase());
    const updated = [newEntry, ...filtered].slice(0, SEARCH_HISTORY_LIMIT);
    
    saveHistory(updated);
    setHistory(updated);
  }, [history, saveHistory]);
  
  // 清空历史
  const clearHistory = useCallback(() => {
    saveHistory([]);
    setHistory([]);
  }, [saveHistory]);
  
  // 删除单条历史
  const deleteHistory = useCallback((id: string) => {
    const updated = history.filter(h => h.id !== id);
    saveHistory(updated);
    setHistory(updated);
  }, [history, saveHistory]);
  
  // 加载初始数据
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);
  
  return {
    query,
    setQuery,
    results,
    setResults,
    isSearching,
    setIsSearching,
    filters,
    setFilters,
    history,
    addToHistory,
    clearHistory,
    deleteHistory,
  };
}

// ==================== 高级搜索语法解析 ====================

interface ParsedQuery {
  keywords: string[];
  filters: {
    type?: string;
    tag?: string;
    date?: string;
    author?: string;
  };
  exclude: string[];
}

export function parseSearchQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    keywords: [],
    filters: {},
    exclude: [],
  };
  
  // 匹配过滤器语法: type:project, tag:动作, date:2024, author:xxx
  const filterRegex = /(\w+):(\S+)/g;
  let match;
  
  while ((match = filterRegex.exec(query)) !== null) {
    const [, key, value] = match;
    switch (key.toLowerCase()) {
      case 'type':
        result.filters.type = value;
        break;
      case 'tag':
        result.filters.tag = value;
        break;
      case 'date':
        result.filters.date = value;
        break;
      case 'author':
        result.filters.author = value;
        break;
    }
  }
  
  // 移除过滤器部分
  let cleanQuery = query.replace(filterRegex, '').trim();
  
  // 处理排除: -exclude
  const excludeRegex = /-(\S+)/g;
  while ((match = excludeRegex.exec(cleanQuery)) !== null) {
    result.exclude.push(match[1]);
  }
  
  // 清理后的查询作为关键词
  cleanQuery = cleanQuery.replace(excludeRegex, '').trim();
  
  // 分割关键词
  if (cleanQuery) {
    result.keywords = cleanQuery.split(/\s+/).filter(Boolean);
  }
  
  return result;
}

// ==================== 全局搜索对话框 ====================

// 注意：App.tsx 期望导入 GlobalSearchDialog

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: SearchResult) => void;
  scopes?: SearchScope[];
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
  onSelect,
  scopes = ['all'],
}: GlobalSearchDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    query,
    setQuery,
    results,
    setResults,
    isSearching,
    setIsSearching,
    filters,
    setFilters,
    history,
    addToHistory,
    clearHistory,
    deleteHistory,
  } = useGlobalSearch();
  
  const [activeScope, setActiveScope] = useState<SearchScope>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // 自动聚焦
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open, setQuery]);
  
  // 执行搜索
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      // 解析高级语法
      const parsed = parseSearchQuery(searchQuery);
      
      // 模拟搜索延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // TODO: 实际搜索实现，连接各个 store
      // 这里返回空结果，实际使用时连接项目数据
      const searchResults: SearchResult[] = [];
      
      // 根据范围过滤
      let filtered = searchResults;
      if (activeScope !== 'all') {
        filtered = searchResults.filter(r => {
          switch (activeScope) {
            case 'projects': return r.type === 'project';
            case 'scripts': return r.type === 'script';
            case 'characters': return r.type === 'character';
            case 'scenes': return r.type === 'scene' || r.type === 'shot';
            case 'media': return r.type === 'media';
            default: return true;
          }
        });
      }
      
      setResults(filtered);
      
      // 添加到历史
      addToHistory(searchQuery, activeScope, filtered.length);
    } finally {
      setIsSearching(false);
    }
  }, [activeScope, addToHistory]);
  
  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query, performSearch]);
  
  // 处理选择结果
  const handleSelect = (result: SearchResult) => {
    onSelect(result);
    onOpenChange(false);
  };
  
  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };
  
  // 快捷键提示
  const shortcutHints = [
    { key: '↵', action: '选择' },
    { key: '↑↓', action: '导航' },
    { key: 'Esc', action: '关闭' },
  ];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-muted-foreground" />
            <DialogTitle className="text-lg">全局搜索</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            搜索项目、剧本、角色、场景和素材
          </DialogDescription>
        </DialogHeader>
        
        {/* 搜索输入 */}
        <div className="px-4 py-2 border-b">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索... (支持 type:项目 tag:动作 等语法)"
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuery('')}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={cn('h-8 w-8', showFilters && 'bg-muted')}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          
          {/* 范围切换 */}
          <div className="flex items-center gap-1 mt-2 overflow-x-auto">
            {scopes.includes('all') && (
              <Button
                variant={activeScope === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveScope('all')}
                className="text-xs"
              >
                全部
              </Button>
            )}
            {scopes.includes('projects') && (
              <Button
                variant={activeScope === 'projects' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveScope('projects')}
                className="text-xs"
              >
                <FolderOpen className="w-3 h-3 mr-1" />
                项目
              </Button>
            )}
            {scopes.includes('scripts') && (
              <Button
                variant={activeScope === 'scripts' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveScope('scripts')}
                className="text-xs"
              >
                <FileText className="w-3 h-3 mr-1" />
                剧本
              </Button>
            )}
            {scopes.includes('characters') && (
              <Button
                variant={activeScope === 'characters' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveScope('characters')}
                className="text-xs"
              >
                <Users className="w-3 h-3 mr-1" />
                角色
              </Button>
            )}
            {scopes.includes('scenes') && (
              <Button
                variant={activeScope === 'scenes' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveScope('scenes')}
                className="text-xs"
              >
                <Grid3X3 className="w-3 h-3 mr-1" />
                场景
              </Button>
            )}
            {scopes.includes('media') && (
              <Button
                variant={activeScope === 'media' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveScope('media')}
                className="text-xs"
              >
                <Image className="w-3 h-3 mr-1" />
                素材
              </Button>
            )}
          </div>
        </div>
        
        {/* 结果区域 */}
        <div className="max-h-[400px] overflow-y-auto">
          {/* 搜索中 */}
          {isSearching && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              搜索中...
            </div>
          )}
          
          {/* 无结果 */}
          {!isSearching && query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <SearchX className="w-10 h-10 mb-2 opacity-50" />
              <p>未找到相关结果</p>
              <p className="text-sm mt-1">尝试其他关键词或调整搜索范围</p>
            </div>
          )}
          
          {/* 搜索结果 */}
          {!isSearching && results.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs text-muted-foreground">
                找到 {results.length} 个结果
              </div>
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    'w-full p-3 rounded-lg text-left hover:bg-muted/50 transition-colors flex items-center gap-3',
                  )}
                >
                  <div className={cn('p-2 rounded-lg', result.color)}>
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{result.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {result.type}
                      </Badge>
                    </div>
                    {result.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {result.description}
                      </p>
                    )}
                    {result.matchText && (
                      <p className="text-xs text-muted-foreground mt-1">
                        匹配: {result.matchText}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {result.relevance}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* 搜索历史 */}
          {!query && history.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <History className="w-3 h-3" />
                  最近搜索
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="h-6 text-xs"
                >
                  清空
                </Button>
              </div>
              {history.slice(0, 5).map(item => (
                <button
                  key={item.id}
                  onClick={() => setQuery(item.query)}
                  className="w-full p-2 rounded-lg text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                >
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{item.query}</span>
                  {item.resultCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {item.resultCount}
                    </Badge>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistory(item.id);
                    }}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </button>
              ))}
            </div>
          )}
          
          {/* 空状态 */}
          {!query && history.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="w-10 h-10 mb-2 opacity-50" />
              <p>输入关键词开始搜索</p>
              <div className="flex items-center gap-4 mt-4 text-xs">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded">type:</kbd> 按类型
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded">tag:</kbd> 按标签
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded">-词</kbd> 排除
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* 底部快捷键提示 */}
        <div className="p-2 border-t flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {shortcutHints.map(({ key, action }) => (
              <span key={key} className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">{key}</kbd>
                {action}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">K</kbd>
            <span>快速打开</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 搜索触发器按钮 ====================

interface SearchTriggerProps {
  onClick: () => void;
  className?: string;
}

export function SearchTrigger({ onClick, className }: SearchTriggerProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            onClick={onClick}
            className={cn('gap-2 text-muted-foreground', className)}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">搜索...</span>
            <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-muted rounded text-xs">
              <Command className="w-3 h-3" />K
            </kbd>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          全局搜索 (⌘K)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ==================== 高级搜索面板 ====================

interface AdvancedSearchPanelProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  initialQuery?: string;
  initialFilters?: SearchFilters;
}

export function AdvancedSearchPanel({
  onSearch,
  initialQuery = '',
  initialFilters = {},
}: AdvancedSearchPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  
  const handleSearch = () => {
    const searchFilters: SearchFilters = {
      ...filters,
      dateRange: (dateStart || dateEnd) ? {
        start: dateStart ? new Date(dateStart) : undefined,
        end: dateEnd ? new Date(dateEnd) : undefined,
      } : undefined,
    };
    onSearch(query, searchFilters);
  };
  
  // 快捷筛选
  const quickFilters = [
    { label: '今天', action: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setDateStart(today.toISOString().split('T')[0]);
      setDateEnd(new Date().toISOString().split('T')[0]);
    }},
    { label: '本周', action: () => {
      const week = new Date();
      week.setDate(week.getDate() - week.getDay());
      setDateStart(week.toISOString().split('T')[0]);
    }},
    { label: '本月', action: () => {
      const month = new Date();
      month.setDate(1);
      setDateStart(month.toISOString().split('T')[0]);
    }},
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          高级搜索
        </CardTitle>
        <CardDescription>
          使用筛选条件精确查找内容
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 关键词搜索 */}
        <div className="space-y-2">
          <Label>关键词</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入搜索关键词..."
              className="pl-9"
            />
          </div>
        </div>
        
        {/* 搜索范围 */}
        <div className="space-y-2">
          <Label>搜索范围</Label>
          <Select 
            value={filters.scope || 'all'} 
            onValueChange={(v) => setFilters({ ...filters, scope: v as SearchScope })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="projects">项目</SelectItem>
              <SelectItem value="scripts">剧本</SelectItem>
              <SelectItem value="characters">角色</SelectItem>
              <SelectItem value="scenes">场景</SelectItem>
              <SelectItem value="media">素材</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* 日期范围 */}
        <div className="space-y-2">
          <Label>日期范围</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              placeholder="开始日期"
            />
            <span className="text-muted-foreground self-center">至</span>
            <Input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              placeholder="结束日期"
            />
          </div>
          <div className="flex gap-1">
            {quickFilters.map(({ label, action }) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                onClick={action}
                className="text-xs"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* 排序方式 */}
        <div className="space-y-2">
          <Label>排序方式</Label>
          <Select 
            value={filters.sortBy || 'relevance'} 
            onValueChange={(v) => setFilters({ ...filters, sortBy: v as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  相关度
                </span>
              </SelectItem>
              <SelectItem value="date">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  最近更新
                </span>
              </SelectItem>
              <SelectItem value="name">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  名称
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* 搜索按钮 */}
        <Button onClick={handleSearch} className="w-full">
          <Search className="w-4 h-4 mr-2" />
          搜索
        </Button>
        
        {/* 搜索语法帮助 */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">搜索语法</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><code className="px-1 bg-muted rounded">type:project</code> - 按类型筛选</p>
            <p><code className="px-1 bg-muted rounded">tag:动作</code> - 按标签筛选</p>
            <p><code className="px-1 bg-muted rounded">-关键词</code> - 排除关键词</p>
            <p><code className="px-1 bg-muted rounded">关键词1 关键词2</code> - 多关键词</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Label 组件
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {children}
    </label>
  );
}
