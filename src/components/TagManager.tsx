// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 智能标签管理系统
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Tag,
  Plus,
  X,
  Search,
  Filter,
  Edit3,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Clock,
  Star,
  TrendingUp,
  Hash,
  Layers,
  FolderOpen,
  FileText,
  Users,
  Grid3X3,
  MoreVertical,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export type TagCategory = 
  | 'genre'        // 题材类型
  | 'style'        // 风格
  | 'mood'         // 情绪氛围
  | 'character'    // 角色类型
  | 'theme'        // 主题
  | 'custom';      // 自定义

export interface Tag {
  id: string;
  name: string;
  category: TagCategory;
  color?: string;
  count: number;         // 使用次数
  isSystem: boolean;      // 系统标签不可删除
  isFavorite: boolean;
  createdAt: Date;
  synonyms?: string[];    // 同义词
}

export interface TagSuggestion {
  tag: string;
  score: number;
  reason: string;
}

// ==================== 预设标签 ====================

const PRESET_TAGS: Tag[] = [
  // 题材类型
  { id: 'genre-action', name: '动作', category: 'genre', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['战斗', '武打'] },
  { id: 'genre-comedy', name: '喜剧', category: 'genre', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['搞笑', '幽默'] },
  { id: 'genre-romance', name: '爱情', category: 'genre', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['恋爱', '甜蜜'] },
  { id: 'genre-scifi', name: '科幻', category: 'genre', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['未来', '科技'] },
  { id: 'genre-fantasy', name: '奇幻', category: 'genre', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['魔法', '异世界'] },
  { id: 'genre-horror', name: '恐怖', category: 'genre', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['惊悚', '悬疑'] },
  { id: 'genre-drama', name: '剧情', category: 'genre', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['正剧', '现实'] },
  { id: 'genre-thriller', name: '悬疑', category: 'genre', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['推理', '破案'] },
  
  // 风格
  { id: 'style-anime', name: '动漫风格', category: 'style', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['日漫', '二次元'] },
  { id: 'style-realistic', name: '写实风格', category: 'style', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['真实', '3D'] },
  { id: 'style-watercolor', name: '水彩风格', category: 'style', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['手绘', '插画'] },
  { id: 'style-cyberpunk', name: '赛博朋克', category: 'style', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['未来科技', '霓虹'] },
  { id: 'style-ghibli', name: '吉卜力风格', category: 'style', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['宫崎骏', '治愈'] },
  
  // 情绪氛围
  { id: 'mood-happy', name: '欢快', category: 'mood', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['轻松', '愉快'] },
  { id: 'mood-serious', name: '严肃', category: 'mood', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['沉重', '深刻'] },
  { id: 'mood-mysterious', name: '神秘', category: 'mood', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['诡异', '悬疑'] },
  { id: 'mood-warm', name: '温馨', category: 'mood', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['治愈', '温暖'] },
  { id: 'mood-intense', name: '紧张', category: 'mood', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['刺激', '激烈'] },
  
  // 角色类型
  { id: 'char-hero', name: '英雄主角', category: 'character', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['男主', '勇者'] },
  { id: 'char-heroine', name: '女主角', category: 'character', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['女主', '女主'] },
  { id: 'char-villain', name: '反派', category: 'character', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['敌人', '恶役'] },
  { id: 'char-sidekick', name: '配角', category: 'character', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['伙伴', '友人'] },
  { id: 'char-mentor', name: '导师', category: 'character', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['师父', '引导者'] },
  
  // 主题
  { id: 'theme-friendship', name: '友情', category: 'theme', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['伙伴', '羁绊'] },
  { id: 'theme-family', name: '家庭', category: 'theme', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['亲情', '血缘'] },
  { id: 'theme-growth', name: '成长', category: 'theme', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['蜕变', '进化'] },
  { id: 'theme-justice', name: '正义', category: 'theme', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['公平', '道德'] },
  { id: 'theme-love', name: '爱情', category: 'theme', count: 0, isSystem: true, isFavorite: false, createdAt: new Date(), synonyms: ['恋爱', '情感'] },
];

// ==================== 分类配置 ====================

const CATEGORY_CONFIG: Record<TagCategory, { label: string; icon: React.ReactNode; color: string }> = {
  genre: { label: '题材', icon: <FolderOpen className="w-4 h-4" />, color: 'text-blue-500' },
  style: { label: '风格', icon: <Sparkles className="w-4 h-4" />, color: 'text-purple-500' },
  mood: { label: '氛围', icon: <TrendingUp className="w-4 h-4" />, color: 'text-pink-500' },
  character: { label: '角色', icon: <Users className="w-4 h-4" />, color: 'text-green-500' },
  theme: { label: '主题', icon: <Star className="w-4 h-4" />, color: 'text-yellow-500' },
  custom: { label: '自定义', icon: <Hash className="w-4 h-4" />, color: 'text-gray-500' },
};

// ==================== 标签存储 Hook ====================

const TAGS_STORAGE_KEY = 'jubuai-tags';

export function useTagStore() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  
  // 加载标签
  const loadTags = useCallback(() => {
    try {
      // 加载预设标签
      const systemTags = PRESET_TAGS.map(t => ({ ...t }));
      
      // 加载用户自定义标签
      const stored = localStorage.getItem(TAGS_STORAGE_KEY);
      const userTags: Tag[] = stored 
        ? JSON.parse(stored).map((t: any) => ({
            ...t,
            createdAt: new Date(t.createdAt),
          }))
        : [];
      
      // 合并
      const allTags = [...systemTags, ...userTags];
      
      // 加载收藏
      const storedFavorites = localStorage.getItem(`${TAGS_STORAGE_KEY}-favorites`);
      const favoriteIds: string[] = storedFavorites ? JSON.parse(storedFavorites) : [];
      
      setTags(allTags.map(t => ({
        ...t,
        isFavorite: favoriteIds.includes(t.id),
      })));
      setFavorites(new Set(favoriteIds));
    } catch (error) {
      console.error('[Tags] Failed to load:', error);
    }
  }, []);
  
  // 保存用户标签
  const saveUserTags = useCallback((userTags: Tag[]) => {
    try {
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(userTags));
    } catch (error) {
      console.error('[Tags] Failed to save:', error);
    }
  }, []);
  
  // 保存收藏
  const saveFavorites = useCallback((favoriteIds: string[]) => {
    try {
      localStorage.setItem(`${TAGS_STORAGE_KEY}-favorites`, JSON.stringify(favoriteIds));
    } catch (error) {
      console.error('[Tags] Failed to save favorites:', error);
    }
  }, []);
  
  // 创建标签
  const createTag = useCallback((name: string, category: TagCategory = 'custom') => {
    const existingTag = tags.find(t => t.name === name || t.synonyms?.includes(name));
    if (existingTag) return existingTag;
    
    const newTag: Tag = {
      id: crypto.randomUUID(),
      name,
      category,
      count: 0,
      isSystem: false,
      isFavorite: false,
      createdAt: new Date(),
    };
    
    const userTags = tags.filter(t => !t.isSystem);
    const newUserTags = [...userTags, newTag];
    saveUserTags(newUserTags);
    
    setTags(prev => [...prev, newTag]);
    
    return newTag;
  }, [tags, saveUserTags]);
  
  // 更新标签
  const updateTag = useCallback((id: string, updates: Partial<Tag>) => {
    const tag = tags.find(t => t.id === id);
    if (!tag || tag.isSystem) return; // 不能修改系统标签
    
    const userTags = tags.filter(t => !t.isSystem).map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    saveUserTags(userTags);
    
    setTags(prev => prev.map(t =>
      t.id === id ? { ...t, ...updates } : t
    ));
  }, [tags, saveUserTags]);
  
  // 删除标签
  const deleteTag = useCallback((id: string) => {
    const tag = tags.find(t => t.id === id);
    if (!tag || tag.isSystem) return; // 不能删除系统标签
    
    const userTags = tags.filter(t => !t.isSystem && t.id !== id);
    saveUserTags(userTags);
    
    setTags(prev => prev.filter(t => t.id !== id));
  }, [tags, saveUserTags]);
  
  // 切换收藏
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveFavorites(Array.from(next));
      
      setTags(prevTags => prevTags.map(t =>
        t.id === id ? { ...t, isFavorite: next.has(id) } : t
      ));
      
      return next;
    });
  }, [saveFavorites]);
  
  // 增加使用次数
  const incrementCount = useCallback((id: string) => {
    setTags(prev => {
      const updated = prev.map(t =>
        t.id === id ? { ...t, count: t.count + 1 } : t
      );
      
      // 保存用户标签的计数变化
      const userTags = updated.filter(t => !t.isSystem);
      saveUserTags(userTags);
      
      return updated;
    });
  }, [saveUserTags]);
  
  // 批量添加标签
  const addTags = useCallback((tagNames: string[], category?: TagCategory) => {
    const created: Tag[] = [];
    
    for (const name of tagNames) {
      const existing = tags.find(t => 
        t.name === name || t.synonyms?.includes(name)
      );
      
      if (existing) {
        incrementCount(existing.id);
        created.push(existing);
      } else {
        const newTag = createTag(name, category || 'custom');
        if (newTag) {
          incrementCount(newTag.id);
          created.push(newTag);
        }
      }
    }
    
    return created;
  }, [tags, createTag, incrementCount]);
  
  // 搜索标签
  const searchTags = useCallback((query: string, category?: TagCategory) => {
    let results = [...tags];
    
    if (category) {
      results = results.filter(t => t.category === category);
    }
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.synonyms?.some(s => s.toLowerCase().includes(lowerQuery))
      );
    }
    
    // 按使用次数和收藏排序
    results.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
      if (a.count !== b.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
    
    return results;
  }, [tags]);
  
  // 智能标签建议（基于内容分析）
  const suggestTags = useCallback((content: string): TagSuggestion[] => {
    const suggestions: TagSuggestion[] = [];
    const lowerContent = content.toLowerCase();
    
    // 关键词匹配规则
    const keywordRules: Record<string, { tag: string; score: number; reason: string }[]> = {
      genre: [
        { tag: '动作', score: 0.9, reason: '检测到战斗/动作场景' },
        { tag: '喜剧', score: 0.9, reason: '检测到幽默元素' },
        { tag: '爱情', score: 0.9, reason: '检测到情感互动' },
        { tag: '科幻', score: 0.9, reason: '检测到科技/未来元素' },
        { tag: '奇幻', score: 0.9, reason: '检测到魔法/超自然元素' },
        { tag: '恐怖', score: 0.9, reason: '检测到恐怖/惊悚元素' },
        { tag: '剧情', score: 0.8, reason: '检测到叙事内容' },
        { tag: '悬疑', score: 0.9, reason: '检测到推理/谜题元素' },
      ],
      style: [
        { tag: '动漫风格', score: 0.8, reason: '适合动漫表现形式' },
        { tag: '赛博朋克', score: 0.9, reason: '检测到未来科技/霓虹元素' },
        { tag: '吉卜力风格', score: 0.8, reason: '适合治愈系表现' },
      ],
      mood: [
        { tag: '欢快', score: 0.8, reason: '整体氛围轻快' },
        { tag: '温馨', score: 0.8, reason: '检测到温暖情感' },
        { tag: '紧张', score: 0.9, reason: '检测到紧张情节' },
        { tag: '神秘', score: 0.9, reason: '检测到悬疑/未知元素' },
      ],
    };
    
    // 分析内容并生成建议
    const analyzed = new Set<string>();
    
    for (const [category, rules] of Object.entries(keywordRules)) {
      for (const rule of rules) {
        // 检查关键词
        const keywords: Record<string, string[]> = {
          '动作': ['战斗', '打架', '攻击', '防御', '武器', '拳', '踢', '砍', '射', '爆炸'],
          '喜剧': ['笑', '搞笑', '幽默', '尴尬', '误会', '搞笑', '逗', '有趣'],
          '爱情': ['喜欢', '爱', '吻', '心跳', '告白', '约会', '恋人', '甜蜜'],
          '科幻': ['科技', '飞船', '机器人', '未来', '星球', '宇宙', 'AI', '网络', '数据'],
          '奇幻': ['魔法', '咒语', '精灵', '龙', '巫术', '结界', '异世界', '召唤'],
          '恐怖': ['恐怖', '血腥', '鬼', '死亡', '黑暗', '恐惧', '尖叫', '惊悚'],
          '剧情': ['讲述', '故事', '经历', '人生', '命运', '抉择', '成长'],
          '悬疑': ['谜题', '线索', '真相', '调查', '推理', '阴谋', '秘密'],
          '动漫风格': ['动漫', '二次元', '日漫', '卡通'],
          '赛博朋克': ['霓虹', '黑客', '虚拟', '生化', '义体', '网络空间'],
          '吉卜力风格': ['自然', '治愈', '温馨', '成长'],
          '欢快': ['开心', '快乐', '幸福', '欢笑', '兴奋'],
          '温馨': ['温暖', '感人', '治愈', '关怀', '陪伴'],
          '紧张': ['危机', '紧急', '追逐', '对峙', '临界'],
          '神秘': ['未知', '奇怪', '异常', '谜', '隐藏'],
        };
        
        const tagKeywords = keywords[rule.tag] || [];
        for (const keyword of tagKeywords) {
          if (lowerContent.includes(keyword) && !analyzed.has(rule.tag)) {
            suggestions.push({
              tag: rule.tag,
              score: rule.score,
              reason: rule.reason,
            });
            analyzed.add(rule.tag);
            break;
          }
        }
      }
    }
    
    // 按分数排序
    suggestions.sort((a, b) => b.score - a.score);
    
    return suggestions.slice(0, 5); // 最多返回 5 个建议
  }, []);
  
  // 按分类获取标签
  const getTagsByCategory = useCallback((category: TagCategory) => {
    return tags.filter(t => t.category === category);
  }, [tags]);
  
  // 获取收藏的标签
  const getFavoriteTags = useCallback(() => {
    return tags.filter(t => t.isFavorite);
  }, [tags]);
  
  // 获取热门标签
  const getHotTags = useCallback((limit: number = 10) => {
    return [...tags]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }, [tags]);
  
  // 加载初始数据
  useEffect(() => {
    loadTags();
  }, [loadTags]);
  
  return {
    tags,
    favorites,
    isLoading,
    createTag,
    updateTag,
    deleteTag,
    toggleFavorite,
    incrementCount,
    addTags,
    searchTags,
    suggestTags,
    getTagsByCategory,
    getFavoriteTags,
    getHotTags,
  };
}

// ==================== 标签输入组件 ====================

interface TagInputProps {
  tags: Tag[];
  selectedTagIds: string[];
  onSelect: (tagId: string) => void;
  onDeselect: (tagId: string) => void;
  onCreate: (name: string) => void;
  placeholder?: string;
  maxTags?: number;
  showSuggestions?: boolean;
}

export function TagInput({
  tags,
  selectedTagIds,
  onSelect,
  onDeselect,
  onCreate,
  placeholder = '添加标签...',
  maxTags = 10,
  showSuggestions = true,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // 过滤可选标签
  const availableTags = useMemo(() => {
    const selected = new Set(selectedTagIds);
    return tags.filter(t => !selected.has(t.id));
  }, [tags, selectedTagIds]);
  
  // 搜索匹配
  const matchedTags = useMemo(() => {
    if (!inputValue) return availableTags.slice(0, 8);
    
    const query = inputValue.toLowerCase();
    return availableTags.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.synonyms?.some(s => s.toLowerCase().includes(query))
    ).slice(0, 8);
  }, [availableTags, inputValue]);
  
  // 添加标签
  const handleAddTag = (tag: Tag) => {
    if (selectedTagIds.length >= maxTags) return;
    onSelect(tag.id);
    setInputValue('');
  };
  
  // 创建新标签
  const handleCreateTag = () => {
    if (!inputValue.trim()) return;
    
    // 检查是否已存在
    const existing = tags.find(t => 
      t.name.toLowerCase() === inputValue.toLowerCase()
    );
    
    if (existing && !selectedTagIds.includes(existing.id)) {
      handleAddTag(existing);
    } else if (!existing) {
      onCreate(inputValue.trim());
      setInputValue('');
    }
  };
  
  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matchedTags.length > 0) {
        handleAddTag(matchedTags[0]);
      } else {
        handleCreateTag();
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTagIds.length > 0) {
      onDeselect(selectedTagIds[selectedTagIds.length - 1]);
    }
  };
  
  return (
    <div className="space-y-2">
      {/* 已选标签 */}
      {selectedTagIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTagIds.map(id => {
            const tag = tags.find(t => t.id === id);
            if (!tag) return null;
            
            const categoryConfig = CATEGORY_CONFIG[tag.category];
            
            return (
              <Badge
                key={id}
                variant="secondary"
                className="pl-2 pr-1 py-0.5 gap-1 text-xs"
              >
                <span className={categoryConfig.color}>{categoryConfig.icon}</span>
                {tag.name}
                <button
                  onClick={() => onDeselect(id)}
                  className="ml-1 hover:text-destructive rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      
      {/* 输入框 */}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={selectedTagIds.length >= maxTags}
          className="w-full"
        />
        
        {/* 下拉建议 */}
        {isFocused && showSuggestions && matchedTags.length > 0 && (
          <div className="absolute z-10 w-full mt-1 py-1 bg-popover border rounded-md shadow-lg">
            {matchedTags.map(tag => {
              const categoryConfig = CATEGORY_CONFIG[tag.category];
              
              return (
                <button
                  key={tag.id}
                  onClick={() => handleAddTag(tag)}
                  className="w-full px-3 py-1.5 text-left hover:bg-muted flex items-center gap-2"
                >
                  <span className={categoryConfig.color}>
                    {categoryConfig.icon}
                  </span>
                  <span className="flex-1">{tag.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {categoryConfig.label}
                  </span>
                </button>
              );
            })}
            
            {inputValue && !matchedTags.some(t => 
              t.name.toLowerCase() === inputValue.toLowerCase()
            ) && (
              <>
                <div className="border-t my-1" />
                <button
                  onClick={handleCreateTag}
                  className="w-full px-3 py-1.5 text-left hover:bg-muted flex items-center gap-2 text-primary"
                >
                  <Plus className="w-4 h-4" />
                  创建「{inputValue}」
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* 标签数量提示 */}
      <p className="text-xs text-muted-foreground">
        {selectedTagIds.length}/{maxTags} 个标签
      </p>
    </div>
  );
}

// ==================== 标签选择器面板 ====================

interface TagSelectorPanelProps {
  tags: Tag[];
  selectedTagIds: string[];
  onSelect: (tagId: string) => void;
  onDeselect: (tagId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TagSelectorPanel({
  tags,
  selectedTagIds,
  onSelect,
  onDeselect,
  onConfirm,
  onCancel,
}: TagSelectorPanelProps) {
  const [activeCategory, setActiveCategory] = useState<TagCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 过滤标签
  const filteredTags = useMemo(() => {
    let result = [...tags];
    
    if (activeCategory !== 'all') {
      result = result.filter(t => t.category === activeCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.synonyms?.some(s => s.toLowerCase().includes(query))
      );
    }
    
    // 按分类和热度排序
    result.sort((a, b) => {
      if (a.category !== b.category) {
        const order: TagCategory[] = ['genre', 'style', 'mood', 'character', 'theme', 'custom'];
        return order.indexOf(a.category) - order.indexOf(b.category);
      }
      return b.count - a.count;
    });
    
    return result;
  }, [tags, activeCategory, searchQuery]);
  
  const selectedSet = new Set(selectedTagIds);
  
  return (
    <div className="space-y-4">
      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索标签..."
          className="pl-9"
        />
      </div>
      
      {/* 分类切换 */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeCategory === 'all' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setActiveCategory('all')}
        >
          全部
        </Button>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <Button
            key={key}
            variant={activeCategory === key ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(key as TagCategory)}
            className={cn(activeCategory === key && config.color)}
          >
            {config.icon}
            <span className="ml-1">{config.label}</span>
          </Button>
        ))}
      </div>
      
      {/* 标签列表 */}
      <ScrollArea className="h-64">
        <div className="grid grid-cols-2 gap-2">
          {filteredTags.map(tag => {
            const isSelected = selectedSet.has(tag.id);
            const categoryConfig = CATEGORY_CONFIG[tag.category];
            
            return (
              <button
                key={tag.id}
                onClick={() => isSelected ? onDeselect(tag.id) : onSelect(tag.id)}
                className={cn(
                  'p-2 rounded-lg border text-left transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={categoryConfig.color}>
                    {categoryConfig.icon}
                  </span>
                  <span className="flex-1 text-sm truncate">{tag.name}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
                {tag.count > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    使用 {tag.count} 次
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* 已选标签预览 */}
      {selectedTagIds.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground mb-2">
            已选择 {selectedTagIds.length} 个标签
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedTagIds.map(id => {
              const tag = tags.find(t => t.id === id);
              if (!tag) return null;
              
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="text-xs"
                >
                  {tag.name}
                  <button
                    onClick={() => onDeselect(id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}
      
      {/* 操作按钮 */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={onConfirm}>
          确认 ({selectedTagIds.length})
        </Button>
      </div>
    </div>
  );
}

// ==================== 标签管理器面板 ====================

interface TagManagerPanelProps {
  tags: Tag[];
  onUpdate: (id: string, updates: Partial<Tag>) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function TagManagerPanel({
  tags,
  onUpdate,
  onDelete,
  onToggleFavorite,
}: TagManagerPanelProps) {
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [filterCategory, setFilterCategory] = useState<TagCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 过滤和排序
  const filteredTags = useMemo(() => {
    let result = [...tags];
    
    if (filterCategory !== 'all') {
      result = result.filter(t => t.category === filterCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.synonyms?.some(s => s.toLowerCase().includes(query))
      );
    }
    
    // 收藏优先，然后按使用次数
    result.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
      if (a.count !== b.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
    
    return result;
  }, [tags, filterCategory, searchQuery]);
  
  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          <h3 className="font-medium">标签管理</h3>
          <Badge variant="secondary">{tags.length}</Badge>
        </div>
      </div>
      
      {/* 搜索和筛选 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索标签..."
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  {config.icon}
                  {config.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* 标签列表 */}
      <ScrollArea className="h-80">
        <div className="space-y-2">
          {filteredTags.map(tag => {
            const categoryConfig = CATEGORY_CONFIG[tag.category];
            
            return (
              <div
                key={tag.id}
                className="p-3 rounded-lg border flex items-center gap-3"
              >
                {/* 分类图标 */}
                <span className={cn('p-2 rounded-lg', tag.isSystem ? 'bg-muted' : 'bg-primary/10')}>
                  {categoryConfig.icon}
                </span>
                
                {/* 标签信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tag.name}</span>
                    {tag.isSystem && (
                      <Badge variant="outline" className="text-xs">系统</Badge>
                    )}
                    {tag.isFavorite && (
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{categoryConfig.label}</span>
                    <span>使用 {tag.count} 次</span>
                  </div>
                </div>
                
                {/* 操作 */}
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onToggleFavorite(tag.id)}
                        >
                          {tag.isFavorite ? (
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          ) : (
                            <Star className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {tag.isFavorite ? '取消收藏' : '收藏'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {!tag.isSystem && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingTag(tag)}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(tag.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* 编辑对话框 */}
      {editingTag && (
        <EditTagDialog
          tag={editingTag}
          open={!!editingTag}
          onOpenChange={(open) => !open && setEditingTag(null)}
          onSave={(updates) => {
            onUpdate(editingTag.id, updates);
            setEditingTag(null);
          }}
        />
      )}
    </div>
  );
}

// ==================== 编辑标签对话框 ====================

interface EditTagDialogProps {
  tag: Tag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<Tag>) => void;
}

export function EditTagDialog({
  tag,
  open,
  onOpenChange,
  onSave,
}: EditTagDialogProps) {
  const [name, setName] = useState(tag.name);
  const [category, setCategory] = useState(tag.category);
  const [synonyms, setSynonyms] = useState(tag.synonyms?.join(', ') || '');
  const [synonymInput, setSynonymInput] = useState('');
  
  const handleAddSynonym = () => {
    if (!synonymInput.trim()) return;
    const current = synonyms ? synonyms.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!current.includes(synonymInput.trim())) {
      setSynonyms([...current, synonymInput.trim()].join(', '));
    }
    setSynonymInput('');
  };
  
  const handleRemoveSynonym = (synonym: string) => {
    const current = synonyms.split(',').map(s => s.trim()).filter(Boolean);
    setSynonyms(current.filter(s => s !== synonym).join(', '));
  };
  
  const handleSave = () => {
    onSave({
      name: name.trim(),
      category,
      synonyms: synonyms ? synonyms.split(',').map(s => s.trim()).filter(Boolean) : [],
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑标签</DialogTitle>
          <DialogDescription>
            修改标签名称、分类和同义词
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>标签名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入标签名称"
            />
          </div>
          
          <div className="space-y-2">
            <Label>分类</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TagCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      {config.icon}
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>同义词</Label>
            <div className="flex gap-2">
              <Input
                value={synonymInput}
                onChange={(e) => setSynonymInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSynonym())}
                placeholder="输入同义词后回车"
              />
              <Button variant="outline" onClick={handleAddSynonym}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {synonyms && (
              <div className="flex flex-wrap gap-1 mt-2">
                {synonyms.split(',').map(s => s.trim()).filter(Boolean).map(synonym => (
                  <Badge key={synonym} variant="secondary" className="text-xs">
                    {synonym}
                    <button
                      onClick={() => handleRemoveSynonym(synonym)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
