// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 智能标签系统
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Tag,
  Plus,
  X,
  Search,
  Edit3,
  Trash2,
  Check,
  Star,
  Clock,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Sparkles,
  Hash,
  AlertCircle,
  Copy,
  FolderOpen,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export interface TagItem {
  id: string;
  name: string;
  color?: string;
  category?: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
  isSystem?: boolean;
  isFavorite?: boolean;
}

export interface TagSuggestion {
  tag: string;
  score: number;
  reason: string;
}

export type TagSortBy = 'count' | 'name' | 'recent' | 'alphabetical';
export type TagFilterBy = 'all' | 'favorites' | 'system' | 'custom';

// ==================== 预设标签分类 ====================

export const TAG_CATEGORIES = {
  character: {
    name: '角色',
    icon: '👤',
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    tags: ['主角', '配角', '反派', 'NPC', '群演', '儿童', '老人', '男性', '女性'],
  },
  scene: {
    name: '场景',
    icon: '🏠',
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    tags: ['室内', '室外', '城市', '乡村', '夜景', '日景', '室内', '室外'],
  },
  emotion: {
    name: '情绪',
    icon: '😊',
    color: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    tags: ['开心', '悲伤', '愤怒', '恐惧', '惊讶', '平静', '紧张', '温馨'],
  },
  style: {
    name: '风格',
    icon: '🎨',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    tags: ['写实', '动漫', '水彩', '油画', '3D', '古风', '现代', '赛博朋克'],
  },
  quality: {
    name: '质量',
    icon: '✨',
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    tags: ['精选', '草稿', '已完成', '待审核', '需修改'],
  },
  custom: {
    name: '自定义',
    icon: '🏷️',
    color: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    tags: [],
  },
};

// ==================== 标签颜色预设 ====================

export const TAG_COLORS = [
  { name: '红色', value: 'bg-red-500', textColor: 'text-red-500' },
  { name: '橙色', value: 'bg-orange-500', textColor: 'text-orange-500' },
  { name: '黄色', value: 'bg-yellow-500', textColor: 'text-yellow-500' },
  { name: '绿色', value: 'bg-green-500', textColor: 'text-green-500' },
  { name: '青色', value: 'bg-cyan-500', textColor: 'text-cyan-500' },
  { name: '蓝色', value: 'bg-blue-500', textColor: 'text-blue-500' },
  { name: '紫色', value: 'bg-purple-500', textColor: 'text-purple-500' },
  { name: '粉色', value: 'bg-pink-500', textColor: 'text-pink-500' },
  { name: '灰色', value: 'bg-gray-500', textColor: 'text-gray-500' },
];

// ==================== 标签存储 Hook ====================

const TAGS_STORAGE_KEY = 'jubuai-tags';

export function useTagStore() {
  const [tags, setTags] = useState<TagItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(TAGS_STORAGE_KEY) || '[]')
        .map((tag: any) => ({
          ...tag,
          createdAt: new Date(tag.createdAt),
          updatedAt: new Date(tag.updatedAt),
        }));
    } catch {
      return [];
    }
  });
  
  const addTag = useCallback((name: string, category?: string, color?: string) => {
    const newTag: TagItem = {
      id: crypto.randomUUID(),
      name,
      category,
      color,
      count: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setTags(prev => {
      const next = [...prev, newTag];
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    
    return newTag;
  }, []);
  
  const updateTag = useCallback((id: string, updates: Partial<TagItem>) => {
    setTags(prev => {
      const next = prev.map(tag =>
        tag.id === id
          ? { ...tag, ...updates, updatedAt: new Date() }
          : tag
      );
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  
  const deleteTag = useCallback((id: string) => {
    setTags(prev => {
      const next = prev.filter(tag => tag.id !== id);
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  
  const incrementCount = useCallback((id: string) => {
    setTags(prev => {
      const next = prev.map(tag =>
        tag.id === id
          ? { ...tag, count: tag.count + 1, updatedAt: new Date() }
          : tag
      );
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  
  const decrementCount = useCallback((id: string) => {
    setTags(prev => {
      const next = prev.map(tag =>
        tag.id === id
          ? { ...tag, count: Math.max(0, tag.count - 1), updatedAt: new Date() }
          : tag
      );
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  
  const toggleFavorite = useCallback((id: string) => {
    setTags(prev => {
      const next = prev.map(tag =>
        tag.id === id
          ? { ...tag, isFavorite: !tag.isFavorite, updatedAt: new Date() }
          : tag
      );
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  
  const mergeTags = useCallback((sourceIds: string[], targetId: string) => {
    setTags(prev => {
      const next = prev.map(tag => {
        if (tag.id === targetId) {
          const sourceTags = prev.filter(t => sourceIds.includes(t.id));
          return {
            ...tag,
            count: tag.count + sourceTags.reduce((sum, t) => sum + t.count, 0),
            updatedAt: new Date(),
          };
        }
        return tag;
      }).filter(tag => !sourceIds.includes(tag.id));
      
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  
  const getTagByName = useCallback((name: string) => {
    return tags.find(tag => tag.name === name);
  }, [tags]);
  
  const ensureTag = useCallback((name: string, category?: string) => {
    const existing = getTagByName(name);
    if (existing) {
      return existing;
    }
    return addTag(name, category);
  }, [addTag, getTagByName]);
  
  return {
    tags,
    addTag,
    updateTag,
    deleteTag,
    incrementCount,
    decrementCount,
    toggleFavorite,
    mergeTags,
    getTagByName,
    ensureTag,
  };
}

// ==================== 标签输入组件 ====================

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  maxTags?: number;
  placeholder?: string;
  className?: string;
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  maxTags = 10,
  placeholder = '添加标签...',
  className,
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const filteredSuggestions = useMemo(() => {
    if (!input.trim()) return suggestions.slice(0, 5);
    return suggestions
      .filter(s => 
        s.toLowerCase().includes(input.toLowerCase()) && 
        !value.includes(s)
      )
      .slice(0, 5);
  }, [input, suggestions, value]);
  
  const addTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag) && value.length < maxTags) {
      onChange([...value, trimmedTag]);
    }
    setInput('');
    setShowSuggestions(false);
  }, [value, maxTags, onChange]);
  
  const removeTag = useCallback((tag: string) => {
    onChange(value.filter(t => t !== tag));
  }, [value, onChange]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === ',') {
      e.preventDefault();
      if (input.trim()) addTag(input);
    }
  };
  
  return (
    <div className={cn('relative', className)}>
      <div 
        className="flex flex-wrap gap-1 p-2 border rounded-md bg-background min-h-[42px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(tag => (
          <Badge key={tag} variant="secondary" className="h-6 text-xs gap-1">
            <Tag className="w-3 h-3" />
            {tag}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="ml-1 hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        
        {value.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[80px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        )}
      </div>
      
      {/* 建议列表 */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 p-1 bg-background border rounded-md shadow-lg">
          {filteredSuggestions.map(suggestion => (
            <button
              key={suggestion}
              onClick={() => addTag(suggestion)}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted rounded flex items-center gap-2"
            >
              <Tag className="w-3 h-3 text-muted-foreground" />
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== 标签选择器 ====================

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  allTags: TagItem[];
  maxSelection?: number;
  className?: string;
}

export function TagSelector({
  selectedTags,
  onChange,
  allTags,
  maxSelection = 10,
  className,
}: TagSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return allTags;
    return allTags.filter(tag => 
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allTags, searchQuery]);
  
  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter(t => t !== tagName));
    } else if (selectedTags.length < maxSelection) {
      onChange([...selectedTags, tagName]);
    }
  };
  
  const groupedTags = useMemo(() => {
    const groups: Record<string, TagItem[]> = {};
    filteredTags.forEach(tag => {
      const category = tag.category || 'custom';
      if (!groups[category]) groups[category] = [];
      groups[category].push(tag);
    });
    return groups;
  }, [filteredTags]);
  
  return (
    <div className={cn('space-y-3', className)}>
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索标签..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {/* 标签网格 */}
      <ScrollArea className="max-h-60">
        <div className="space-y-4">
          {Object.entries(groupedTags).map(([category, tags]) => (
            <div key={category}>
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                <span>{TAG_CATEGORIES[category as keyof typeof TAG_CATEGORIES]?.icon}</span>
                <span>{TAG_CATEGORIES[category as keyof typeof TAG_CATEGORIES]?.name || '自定义'}</span>
                <span>({tags.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.slice(0, showAll ? undefined : 10).map(tag => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.name) ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-colors',
                      selectedTags.includes(tag.name) && TAG_CATEGORIES[tag.category as keyof typeof TAG_CATEGORIES]?.color
                    )}
                    onClick={() => toggleTag(tag.name)}
                  >
                    {selectedTags.includes(tag.name) && <Check className="w-3 h-3 mr-1" />}
                    {tag.name}
                    {tag.count > 0 && (
                      <span className="ml-1 text-xs opacity-70">({tag.count})</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          
          {filteredTags.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="w-full"
            >
              {showAll ? '收起' : `显示全部 ${filteredTags.length} 个标签`}
            </Button>
          )}
        </div>
      </ScrollArea>
      
      {/* 已选择 */}
      {selectedTags.length > 0 && (
        <div className="pt-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">
            已选择 ({selectedTags.length}/{maxSelection})
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedTags.map(tag => (
              <Badge key={tag} variant="secondary" className="h-6 text-xs">
                {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 标签管理器对话框 ====================

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: TagItem[];
  onAddTag: (name: string, category?: string, color?: string) => void;
  onUpdateTag: (id: string, updates: Partial<TagItem>) => void;
  onDeleteTag: (id: string) => void;
  onMergeTags: (sourceIds: string[], targetId: string) => void;
}

export function TagManagerDialog({
  open,
  onOpenChange,
  tags,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  onMergeTags,
}: TagManagerDialogProps) {
  const [newTagName, setNewTagName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('custom');
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  
  const handleAddTag = () => {
    if (newTagName.trim()) {
      onAddTag(newTagName.trim(), selectedCategory);
      setNewTagName('');
    }
  };
  
  const handleEditTag = (tag: TagItem) => {
    setEditingTag(tag);
    setEditName(tag.name);
  };
  
  const handleSaveEdit = () => {
    if (editingTag && editName.trim()) {
      onUpdateTag(editingTag.id, { name: editName.trim() });
      setEditingTag(null);
      setEditName('');
    }
  };
  
  const toggleTagSelection = (tagId: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };
  
  const handleMerge = () => {
    if (selectedTags.size >= 2) {
      const ids = Array.from(selectedTags);
      onMergeTags(ids.slice(0, -1), ids[ids.length - 1]);
      setSelectedTags(new Set());
    }
  };
  
  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => b.count - a.count);
  }, [tags]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>标签管理</DialogTitle>
          <DialogDescription>
            创建、编辑和合并标签
          </DialogDescription>
        </DialogHeader>
        
        {/* 新建标签 */}
        <div className="flex gap-2 pb-4 border-b">
          <Input
            placeholder="新标签名称..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            className="flex-1"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {TAG_CATEGORIES[selectedCategory as keyof typeof TAG_CATEGORIES]?.icon || '🏷️'}
                {TAG_CATEGORIES[selectedCategory as keyof typeof TAG_CATEGORIES]?.name || '自定义'}
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(TAG_CATEGORIES).map(([key, cat]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                >
                  <span className="mr-2">{cat.icon}</span>
                  {cat.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleAddTag} disabled={!newTagName.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* 批量操作 */}
        {selectedTags.size >= 2 && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <span className="text-sm">已选择 {selectedTags.size} 个标签</span>
            <Button size="sm" variant="outline" onClick={handleMerge}>
              <Layers className="w-4 h-4 mr-1" />
              合并
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedTags(new Set())}>
              取消
            </Button>
          </div>
        )}
        
        {/* 标签列表 */}
        <ScrollArea className="flex-1 py-4">
          <div className="space-y-1">
            {sortedTags.map(tag => (
              <div
                key={tag.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50',
                  selectedTags.has(tag.id) && 'bg-muted',
                  editingTag?.id === tag.id && 'bg-muted'
                )}
              >
                {/* 选择框 */}
                <Checkbox
                  checked={selectedTags.has(tag.id)}
                  onCheckedChange={() => toggleTagSelection(tag.id)}
                />
                
                {/* 标签内容 */}
                {editingTag?.id === tag.id ? (
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                      className="h-8"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleSaveEdit}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingTag(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 flex items-center gap-2">
                      <Badge variant="outline" className="h-6">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({tag.count})
                      </span>
                      {tag.isFavorite && <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />}
                    </div>
                    
                    {/* 操作 */}
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onUpdateTag(tag.id, { isFavorite: !tag.isFavorite })}
                            >
                              <Star className={cn('w-4 h-4', tag.isFavorite && 'fill-yellow-500 text-yellow-500')} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{tag.isFavorite ? '取消收藏' : '收藏'}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditTag(tag)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>编辑</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => onDeleteTag(tag.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>删除</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </>
                )}
              </div>
            ))}
            
            {sortedTags.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无标签</p>
                <p className="text-sm">创建你的第一个标签</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 智能标签建议 ====================

interface SmartTagSuggestionsProps {
  content: string;
  existingTags: string[];
  onSuggest: (suggestions: string[]) => void;
  className?: string;
}

export function SmartTagSuggestions({
  content,
  existingTags,
  onSuggest,
  className,
}: SmartTagSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  
  const analyzeContent = useCallback(() => {
    if (!content.trim()) {
      setSuggestions([]);
      return;
    }
    
    setLoading(true);
    
    // 简单的关键词提取（实际项目中可以调用 AI API）
    const keywords: TagSuggestion[] = [];
    const lowerContent = content.toLowerCase();
    
    // 情绪关键词
    const emotionKeywords = ['开心', '悲伤', '愤怒', '恐惧', '浪漫', '紧张', '温馨', '恐怖'];
    emotionKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        keywords.push({
          tag: keyword,
          score: 0.9,
          reason: '检测到情绪关键词',
        });
      }
    });
    
    // 场景关键词
    const sceneKeywords = ['室内', '室外', '城市', '乡村', '海边', '森林', '室内', '室外'];
    sceneKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        keywords.push({
          tag: keyword,
          score: 0.85,
          reason: '检测到场景关键词',
        });
      }
    });
    
    // 时间关键词
    const timeKeywords: Record<string, string> = {
      '早晨': '清晨', '上午': '日景', '中午': '日景', '下午': '日景',
      '傍晚': '黄昏', '晚上': '夜景', '深夜': '夜景', '凌晨': '夜景',
    };
    Object.entries(timeKeywords).forEach(([keyword, tag]) => {
      if (lowerContent.includes(keyword) && !keywords.some(k => k.tag === tag)) {
        keywords.push({
          tag,
          score: 0.8,
          reason: '检测到时间段',
        });
      }
    });
    
    // 过滤已存在的标签
    const filtered = keywords.filter(s => !existingTags.includes(s.tag));
    setSuggestions(filtered.slice(0, 5));
    setLoading(false);
  }, [content, existingTags]);
  
  useEffect(() => {
    const debounce = setTimeout(analyzeContent, 500);
    return () => clearTimeout(debounce);
  }, [analyzeContent]);
  
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Sparkles className="w-4 h-4" />
          智能建议
        </span>
        {suggestions.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => onSuggest(suggestions.map(s => s.tag))}>
            添加全部
          </Button>
        )}
      </div>
      
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 animate-pulse" />
          分析中...
        </div>
      ) : suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((suggestion, i) => (
            <TooltipProvider key={suggestion.tag}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => onSuggest([suggestion.tag])}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {suggestion.tag}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{suggestion.reason}</p>
                  <p className="text-xs text-muted-foreground">置信度: {Math.round(suggestion.score * 100)}%</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">输入内容以获取标签建议</p>
      )}
    </div>
  );
}

// ==================== 标签云 ====================

interface TagCloudProps {
  tags: TagItem[];
  selectedTags?: string[];
  onTagClick?: (tag: TagItem) => void;
  maxDisplay?: number;
  className?: string;
}

export function TagCloud({
  tags,
  selectedTags = [],
  onTagClick,
  maxDisplay = 20,
  className,
}: TagCloudProps) {
  const [expanded, setExpanded] = useState(false);
  
  const displayTags = expanded ? tags : tags.slice(0, maxDisplay);
  const maxCount = Math.max(...tags.map(t => t.count), 1);
  
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap gap-2">
        {displayTags.map(tag => {
          const scale = 0.8 + (tag.count / maxCount) * 0.4;
          return (
            <Badge
              key={tag.id}
              variant={selectedTags.includes(tag.name) ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer transition-all hover:scale-105',
                selectedTags.includes(tag.name) && TAG_CATEGORIES[tag.category as keyof typeof TAG_CATEGORIES]?.color
              )}
              style={{ fontSize: `${scale}rem` }}
              onClick={() => onTagClick?.(tag)}
            >
              {tag.name}
              {tag.count > 0 && (
                <span className="ml-1 text-xs opacity-70">({tag.count})</span>
              )}
            </Badge>
          );
        })}
      </div>
      
      {tags.length > maxDisplay && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full"
        >
          {expanded ? '收起' : `显示全部 ${tags.length} 个标签`}
          {expanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </Button>
      )}
    </div>
  );
}
