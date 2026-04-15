// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 高级搜索功能
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, X, File, User, Grid3X3, Camera, Tag, Star, Clock, ChevronRight } from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export type SearchableType = 'project' | 'script' | 'character' | 'scene' | 'shot' | 'asset';

export interface SearchableItem {
  id: string;
  type: SearchableType;
  title: string;
  description?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  favorite?: boolean;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

export interface AdvancedSearchFilters {
  types: SearchableType[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  tags?: string[];
  favorites?: boolean;
  createdBy?: string;
}

export type SortField = 'relevance' | 'title' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

// ==================== 搜索配置 ====================

const TYPE_CONFIG: Record<SearchableType, { icon: React.ReactNode; label: string; color: string }> = {
  project: { icon: <File className="w-4 h-4" />, label: '项目', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  script: { icon: <File className="w-4 h-4" />, label: '剧本', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  character: { icon: <User className="w-4 h-4" />, label: '角色', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  scene: { icon: <Grid3X3 className="w-4 h-4" />, label: '场景', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  shot: { icon: <Camera className="w-4 h-4" />, label: '分镜', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  asset: { icon: <File className="w-4 h-4" />, label: '素材', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
};

// ==================== 搜索结果高亮 ====================

interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;
}

export function HighlightedText({ text, query, className = '' }: HighlightedTextProps) {
  if (!query.trim()) {
    return <span className={className}>{text}</span>;
  }
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span className={className}>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-500/30 text-foreground rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// ==================== 搜索过滤器面板 ====================

interface SearchFilterPanelProps {
  filters: AdvancedSearchFilters;
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
  allTags: string[];
}

export function SearchFilterPanel({ filters, onFiltersChange, allTags }: SearchFilterPanelProps) {
  const [dateOpen, setDateOpen] = useState(false);
  
  const toggleType = useCallback((type: SearchableType) => {
    const types = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types });
  }, [filters, onFiltersChange]);
  
  const toggleTag = useCallback((tag: string) => {
    const tags = filters.tags?.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...(filters.tags || []), tag];
    onFiltersChange({ ...filters, tags });
  }, [filters, onFiltersChange]);
  
  const clearFilters = useCallback(() => {
    onFiltersChange({ types: [] });
  }, [onFiltersChange]);
  
  const hasActiveFilters = filters.types.length > 0 || 
    filters.dateRange?.start || 
    filters.tags?.length ||
    filters.favorites;
  
  return (
    <div className="space-y-4">
      {/* 类型过滤器 */}
      <div>
        <h4 className="text-sm font-medium mb-2">类型</h4>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_CONFIG) as SearchableType[]).map(type => (
            <Button
              key={type}
              variant={filters.types.includes(type) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleType(type)}
              className="h-7 text-xs"
            >
              {TYPE_CONFIG[type].icon}
              <span className="ml-1">{TYPE_CONFIG[type].label}</span>
            </Button>
          ))}
        </div>
      </div>
      
      {/* 日期范围 */}
      <div>
        <h4 className="text-sm font-medium mb-2">日期范围</h4>
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Clock className="w-4 h-4 mr-2" />
              {filters.dateRange?.start && filters.dateRange?.end
                ? `${filters.dateRange.start.toLocaleDateString()} - ${filters.dateRange.end.toLocaleDateString()}`
                : filters.dateRange?.start
                ? `从 ${filters.dateRange.start.toLocaleDateString()}`
                : filters.dateRange?.end
                ? `至 ${filters.dateRange.end.toLocaleDateString()}`
                : '选择日期范围'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4">
              <Calendar
                mode="range"
                selected={{
                  from: filters.dateRange?.start,
                  to: filters.dateRange?.end,
                }}
                onSelect={(range) => {
                  onFiltersChange({
                    ...filters,
                    dateRange: range?.from && range?.to
                      ? { start: range.from, end: range.to }
                      : undefined,
                  });
                }}
                numberOfMonths={2}
              />
              {(filters.dateRange?.start || filters.dateRange?.end) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFiltersChange({ ...filters, dateRange: undefined })}
                  className="mt-2 w-full"
                >
                  清除日期
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* 标签过滤器 */}
      {allTags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">标签</h4>
          <div className="flex flex-wrap gap-1">
            {allTags.slice(0, 10).map(tag => (
              <Badge
                key={tag}
                variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => toggleTag(tag)}
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* 收藏过滤器 */}
      <div>
        <h4 className="text-sm font-medium mb-2">其他</h4>
        <Button
          variant={filters.favorites ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFiltersChange({ ...filters, favorites: !filters.favorites })}
          className="w-full justify-start"
        >
          <Star className={`w-4 h-4 mr-2 ${filters.favorites ? 'fill-current' : ''}`} />
          仅显示收藏
        </Button>
      </div>
      
      {/* 清除筛选 */}
      {hasActiveFilters && (
        <>
          <Separator />
          <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
            <X className="w-4 h-4 mr-2" />
            清除所有筛选
          </Button>
        </>
      )}
    </div>
  );
}

// ==================== 搜索结果项 ====================

interface SearchResultItemProps {
  item: SearchableItem;
  query: string;
  isSelected: boolean;
  onClick: () => void;
  onHover: () => void;
}

export function SearchResultItem({ item, query, isSelected, onClick, onHover }: SearchResultItemProps) {
  const config = TYPE_CONFIG[item.type];
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={cn(
        'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
      )}
    >
      {/* 类型图标 */}
      <div className={cn('mt-0.5 p-1.5 rounded-md', config.color)}>
        {config.icon}
      </div>
      
      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <HighlightedText
            text={item.title}
            query={query}
            className="font-medium truncate"
          />
          {item.favorite && (
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500 flex-shrink-0" />
          )}
        </div>
        
        {item.description && (
          <HighlightedText
            text={item.description}
            query={query}
            className="text-sm text-muted-foreground truncate mt-0.5"
          />
        )}
        
        {/* 标签 */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            {item.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{item.tags.length - 3}</span>
            )}
          </div>
        )}
        
        {/* 元信息 */}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          {item.createdAt && (
            <span>创建于 {item.createdAt.toLocaleDateString()}</span>
          )}
          {item.updatedAt && (
            <span>更新于 {item.updatedAt.toLocaleDateString()}</span>
          )}
        </div>
      </div>
      
      {/* 选中指示器 */}
      <ChevronRight className={cn(
        'w-4 h-4 mt-3 text-muted-foreground transition-opacity flex-shrink-0',
        isSelected ? 'opacity-100' : 'opacity-0'
      )} />
    </button>
  );
}

// ==================== 高级搜索面板 ====================

interface AdvancedSearchPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SearchableItem[];
  onSelect?: (item: SearchableItem) => void;
}

export function AdvancedSearchPanel({ open, onOpenChange, items, onSelect }: AdvancedSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<AdvancedSearchFilters>({ types: [] });
  const [sortField, setSortField] = useState<SortField>('relevance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('jubuai-recent-searches') || '[]');
    } catch {
      return [];
    }
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 获取所有标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach(item => {
      item.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [items]);
  
  // 搜索和过滤
  const filteredItems = useMemo(() => {
    let result = [...items];
    
    // 文本搜索
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description?.toLowerCase().includes(lowerQuery) ||
        item.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }
    
    // 类型过滤
    if (filters.types.length > 0) {
      result = result.filter(item => filters.types.includes(item.type));
    }
    
    // 日期过滤
    if (filters.dateRange?.start) {
      result = result.filter(item =>
        item.createdAt && item.createdAt >= filters.dateRange!.start!
      );
    }
    if (filters.dateRange?.end) {
      result = result.filter(item =>
        item.createdAt && item.createdAt <= filters.dateRange!.end!
      );
    }
    
    // 标签过滤
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter(item =>
        item.tags?.some(tag => filters.tags!.includes(tag))
      );
    }
    
    // 收藏过滤
    if (filters.favorites) {
      result = result.filter(item => item.favorite);
    }
    
    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'createdAt':
          comparison = (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
          break;
        case 'updatedAt':
          comparison = (a.updatedAt?.getTime() || 0) - (b.updatedAt?.getTime() || 0);
          break;
        case 'relevance':
        default:
          // 相关性：标题匹配优先
          if (query) {
            const aMatch = a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
            const bMatch = b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
            comparison = bMatch - aMatch;
          }
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [items, query, filters, sortField, sortOrder]);
  
  // 保存搜索历史
  const saveSearchHistory = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const filtered = recentSearches.filter(s => s !== searchQuery);
    const next = [searchQuery, ...filtered].slice(0, 10);
    setRecentSearches(next);
    localStorage.setItem('jubuai-recent-searches', JSON.stringify(next));
  }, [recentSearches]);
  
  // 处理选择
  const handleSelect = useCallback((item: SearchableItem) => {
    saveSearchHistory(query);
    onSelect?.(item);
    onOpenChange(false);
  }, [query, saveSearchHistory, onSelect, onOpenChange]);
  
  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  }, [filteredItems, selectedIndex, handleSelect, onOpenChange]);
  
  // 重置选择
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filters]);
  
  // 打开时聚焦
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);
  
  const hasActiveFilters = filters.types.length > 0 || 
    filters.dateRange?.start || 
    filters.tags?.length ||
    filters.favorites;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-3xl gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>高级搜索</DialogTitle>
        </DialogHeader>
        
        {/* 搜索输入框 */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="搜索项目、剧本、角色、场景..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 h-10 text-base flex-1"
            onKeyDown={handleKeyDown}
          />
          {query && (
            <Button variant="ghost" size="icon" onClick={() => setQuery('')} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={hasActiveFilters ? 'default' : 'ghost'} size="icon" className="h-8 w-8">
                <Filter className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>搜索过滤器</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-4">
                <SearchFilterPanel
                  filters={filters}
                  onFiltersChange={setFilters}
                  allTags={allTags}
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* 排序选项 */}
        {filteredItems.length > 0 && (
          <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              找到 {filteredItems.length} 个结果
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">排序:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-xs">
                    {sortField === 'relevance' && '相关性'}
                    {sortField === 'title' && '标题'}
                    {sortField === 'createdAt' && '创建时间'}
                    {sortField === 'updatedAt' && '更新时间'}
                    {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(['relevance', 'title', 'createdAt', 'updatedAt'] as SortField[]).map(field => (
                    <DropdownMenuCheckboxItem
                      key={field}
                      checked={sortField === field}
                      onCheckedChange={() => {
                        if (sortField === field) {
                          setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField(field);
                          setSortOrder('desc');
                        }
                      }}
                    >
                      {field === 'relevance' && '相关性'}
                      {field === 'title' && '标题'}
                      {field === 'createdAt' && '创建时间'}
                      {field === 'updatedAt' && '更新时间'}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
        
        {/* 结果列表 */}
        <ScrollArea className="max-h-[400px]">
          <div className="py-2">
            {filteredItems.length > 0 ? (
              <div className="space-y-1 px-2">
                {filteredItems.map((item, index) => (
                  <SearchResultItem
                    key={`${item.type}-${item.id}`}
                    item={item}
                    query={query}
                    isSelected={index === selectedIndex}
                    onClick={() => handleSelect(item)}
                    onHover={() => setSelectedIndex(index)}
                  />
                ))}
              </div>
            ) : query ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">没有找到结果</p>
                <p className="text-sm mt-1">尝试其他关键词或调整筛选条件</p>
              </div>
            ) : !query && hasActiveFilters ? (
              <div className="text-center py-12 text-muted-foreground">
                <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>调整筛选条件或清除筛选</p>
              </div>
            ) : null}
            
            {/* 搜索历史 */}
            {!query && !hasActiveFilters && recentSearches.length > 0 && (
              <div className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>最近搜索</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setRecentSearches([]);
                    localStorage.removeItem('jubuai-recent-searches');
                  }} className="h-6 text-xs">
                    清除
                  </Button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(term)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-muted/50"
                    >
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 空状态 */}
            {!query && !hasActiveFilters && recentSearches.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">开始搜索</p>
                <p className="text-sm mt-1">输入关键词或使用过滤器精确定位内容</p>
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
          {hasActiveFilters && (
            <Badge variant="outline" className="text-xs">
              有活动筛选器
            </Badge>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 快速跳转命令 ====================

export interface QuickJumpCommand {
  id: string;
  name: string;
  type: SearchableType;
  icon?: React.ReactNode;
  action: () => void;
}

interface QuickJumpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: QuickJumpCommand[];
}

export function QuickJumpPanel({ open, onOpenChange, commands }: QuickJumpProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const filteredCommands = query.trim()
    ? commands.filter(cmd => cmd.name.toLowerCase().includes(query.toLowerCase()))
    : commands;
  
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);
  
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onOpenChange(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-md gap-0 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="快速跳转..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 h-10"
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <ScrollArea className="max-h-[300px]">
          <div className="py-2">
            {filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  onOpenChange(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                  index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                )}
              >
                {cmd.icon && (
                  <div className="text-muted-foreground">{cmd.icon}</div>
                )}
                <span className="flex-1">{cmd.name}</span>
                <Badge variant="outline" className="text-xs">
                  {TYPE_CONFIG[cmd.type]?.label}
                </Badge>
              </button>
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
