// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 模板市场系统
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Store,
  Plus,
  Search,
  Filter,
  Star,
  Download,
  Upload,
  Trash2,
  Edit3,
  Copy,
  Check,
  X,
  MoreVertical,
  Clock,
  Users,
  TrendingUp,
  Tag,
  Grid3X3,
  List,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Heart,
  Share2,
  ExternalLink,
  Loader2,
  FolderOpen,
  FileText,
  Palette,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export type TemplateType = 'project' | 'script' | 'character' | 'scene' | 'workflow' | 'style';
export type TemplateCategory = 'all' | 'anime' | 'drama' | 'commercial' | 'education' | 'social' | 'custom';

export interface Template {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  category: TemplateCategory;
  thumbnail?: string;
  preview?: string;
  content: TemplateContent;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  stats: {
    downloads: number;
    likes: number;
    uses: number;
    rating: number;
    ratingCount: number;
  };
  tags: string[];
  isBuiltIn: boolean;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  compatibility?: string[];
}

export interface TemplateContent {
  // 项目模板
  project?: {
    name: string;
    description: string;
    settings?: Record<string, any>;
  };
  // 剧本模板
  script?: {
    title: string;
    genre: string;
    synopsis: string;
    characters: string[];
    scenes: string[];
    structure?: string;
  };
  // 角色模板
  character?: {
    name: string;
    role: string;
    description: string;
    appearance?: string;
    personality?: string;
    backstory?: string;
  };
  // 场景模板
  scene?: {
    name: string;
    location: string;
    time: string;
    atmosphere: string;
    description: string;
  };
  // 工作流模板
  workflow?: {
    steps: WorkflowStep[];
  };
  // 风格模板
  style?: {
    visualStyle: string;
    colorPalette: string[];
    typography: string;
    effects: string[];
  };
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  order: number;
  inputs?: Record<string, any>;
}

export interface TemplateFilter {
  type?: TemplateType;
  category?: TemplateCategory;
  search?: string;
  sortBy?: 'popular' | 'recent' | 'rating' | 'downloads';
  tags?: string[];
}

// ==================== 内置模板 ====================

export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'anime-series',
    name: '动漫系列模板',
    description: '适合创作长篇动漫系列，包含完整的故事结构和角色设定',
    type: 'project',
    category: 'anime',
    content: {
      project: {
        name: '新动漫项目',
        description: '基于模板创建的新项目',
        settings: {
          aspectRatio: '16:9',
          frameRate: 24,
        },
      },
    },
    author: { id: 'system', name: 'JuBu AI' },
    stats: { downloads: 1250, likes: 456, uses: 890, rating: 4.5, ratingCount: 234 },
    tags: ['动漫', '系列', '长篇'],
    isBuiltIn: true,
    isFavorite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: '1.0.0',
    compatibility: ['script', 'character', 'scene'],
  },
  {
    id: 'short-drama',
    name: '短剧模板',
    description: '适合创作短视频/短剧内容，快速生成脚本和分镜',
    type: 'project',
    category: 'drama',
    content: {
      project: {
        name: '新短剧项目',
        description: '基于模板创建的新项目',
        settings: {
          aspectRatio: '9:16',
          frameRate: 30,
        },
      },
    },
    author: { id: 'system', name: 'JuBu AI' },
    stats: { downloads: 2340, likes: 789, uses: 1567, rating: 4.8, ratingCount: 456 },
    tags: ['短剧', '短视频', '竖屏'],
    isBuiltIn: true,
    isFavorite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: '1.0.0',
    compatibility: ['script', 'scene'],
  },
  {
    id: 'commercial-ad',
    name: '商业广告模板',
    description: '适合创作各类商业广告，包含多种时长规格',
    type: 'project',
    category: 'commercial',
    content: {
      project: {
        name: '新广告项目',
        description: '基于模板创建的新项目',
        settings: {
          aspectRatio: '16:9',
          frameRate: 30,
        },
      },
    },
    author: { id: 'system', name: 'JuBu AI' },
    stats: { downloads: 980, likes: 345, uses: 567, rating: 4.3, ratingCount: 123 },
    tags: ['广告', '商业', '品牌'],
    isBuiltIn: true,
    isFavorite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: '1.0.0',
    compatibility: ['script'],
  },
  {
    id: 'educational-content',
    name: '教育内容模板',
    description: '适合创作教学视频和知识科普内容',
    type: 'project',
    category: 'education',
    content: {
      project: {
        name: '新教育项目',
        description: '基于模板创建的新项目',
        settings: {
          aspectRatio: '16:9',
          frameRate: 30,
        },
      },
    },
    author: { id: 'system', name: 'JuBu AI' },
    stats: { downloads: 756, likes: 234, uses: 456, rating: 4.6, ratingCount: 89 },
    tags: ['教育', '知识', '教学'],
    isBuiltIn: true,
    isFavorite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: '1.0.0',
    compatibility: ['script', 'scene'],
  },
  {
    id: 'cyberpunk-style',
    name: '赛博朋克风格',
    description: '赛博朋克视觉风格预设，包含配色和效果',
    type: 'style',
    category: 'anime',
    content: {
      style: {
        visualStyle: 'cyberpunk',
        colorPalette: ['#00FFFF', '#FF00FF', '#000000', '#1a1a2e'],
        typography: 'Orbitron',
        effects: ['neon-glow', 'glitch', 'hologram'],
      },
    },
    author: { id: 'system', name: 'JuBu AI' },
    stats: { downloads: 1890, likes: 567, uses: 1234, rating: 4.7, ratingCount: 345 },
    tags: ['赛博朋克', '科幻', '霓虹'],
    isBuiltIn: true,
    isFavorite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: '1.0.0',
    compatibility: ['character', 'scene'],
  },
  {
    id: 'watercolor-anime',
    name: '水彩动漫风格',
    description: '柔和的水彩画风格，适合温馨治愈系内容',
    type: 'style',
    category: 'anime',
    content: {
      style: {
        visualStyle: 'watercolor-anime',
        colorPalette: ['#FFE4E1', '#E6E6FA', '#F0F8FF', '#F5F5DC'],
        typography: 'Noto Serif SC',
        effects: ['soft-blur', 'water-bleeding', 'paper-texture'],
      },
    },
    author: { id: 'system', name: 'JuBu AI' },
    stats: { downloads: 1456, likes: 678, uses: 987, rating: 4.9, ratingCount: 234 },
    tags: ['水彩', '治愈', '温馨'],
    isBuiltIn: true,
    isFavorite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: '1.0.0',
    compatibility: ['character', 'scene'],
  },
  {
    id: 'character-archetype-hero',
    name: '英雄主角模板',
    description: '经典英雄角色设定模板',
    type: 'character',
    category: 'anime',
    content: {
      character: {
        name: '新英雄角色',
        role: '主角',
        description: '勇敢、正义、成长型英雄角色',
        personality: '热情、坚定、有时冲动但内心善良',
        backstory: '因某个事件觉醒能力，开启英雄之路',
      },
    },
    author: { id: 'system', name: 'JuBu AI' },
    stats: { downloads: 876, likes: 345, uses: 567, rating: 4.4, ratingCount: 156 },
    tags: ['主角', '英雄', '成长'],
    isBuiltIn: true,
    isFavorite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: '1.0.0',
    compatibility: ['script'],
  },
  {
    id: 'scene-fantasy-city',
    name: '幻想城市场景',
    description: '奇幻风格的城市场景设定',
    type: 'scene',
    category: 'anime',
    content: {
      scene: {
        name: '幻想城市',
        location: '高科技与魔法并存的城市',
        time: '未来/幻想',
        atmosphere: '神秘、繁华、充满可能性',
        description: '鳞次栉比的塔楼、飞行的交通工具、霓虹与魔法光芒交织',
      },
    },
    author: { id: 'system', name: 'JuBu AI' },
    stats: { downloads: 654, likes: 234, uses: 432, rating: 4.6, ratingCount: 98 },
    tags: ['城市', '幻想', '奇幻'],
    isBuiltIn: true,
    isFavorite: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: '1.0.0',
    compatibility: ['script', 'character'],
  },
];

// ==================== 分类配置 ====================

const CATEGORY_CONFIG: Record<TemplateCategory, { label: string; icon: React.ReactNode; color: string }> = {
  all: { label: '全部', icon: <Grid3X3 className="w-4 h-4" />, color: 'text-gray-500' },
  anime: { label: '动漫', icon: <Sparkles className="w-4 h-4" />, color: 'text-pink-500' },
  drama: { label: '短剧', icon: <FileText className="w-4 h-4" />, color: 'text-purple-500' },
  commercial: { label: '商业', icon: <Store className="w-4 h-4" />, color: 'text-blue-500' },
  education: { label: '教育', icon: <Bookmark className="w-4 h-4" />, color: 'text-green-500' },
  social: { label: '社交', icon: <Users className="w-4 h-4" />, color: 'text-orange-500' },
  custom: { label: '自定义', icon: <Palette className="w-4 h-4" />, color: 'text-cyan-500' },
};

const TYPE_CONFIG: Record<TemplateType, { label: string; icon: React.ReactNode }> = {
  project: { label: '项目', icon: <FolderOpen className="w-4 h-4" /> },
  script: { label: '剧本', icon: <FileText className="w-4 h-4" /> },
  character: { label: '角色', icon: <Users className="w-4 h-4" /> },
  scene: { label: '场景', icon: <Grid3X3 className="w-4 h-4" /> },
  workflow: { label: '工作流', icon: <SlidersHorizontal className="w-4 h-4" /> },
  style: { label: '风格', icon: <Palette className="w-4 h-4" /> },
};

// ==================== 模板存储 Hook ====================

const TEMPLATES_STORAGE_KEY = 'jubuai-templates';
const FAVORITES_STORAGE_KEY = 'jubuai-template-favorites';

export function useTemplateStore() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  
  // 加载模板
  const loadTemplates = useCallback(() => {
    try {
      // 加载内置模板
      const builtIn = BUILT_IN_TEMPLATES;
      
      // 加载用户模板
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      const userTemplates: Template[] = stored ? JSON.parse(stored).map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      })) : [];
      
      // 加载收藏
      const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const favoriteIds: string[] = storedFavorites ? JSON.parse(storedFavorites) : [];
      
      // 合并并标记收藏状态
      const allTemplates = [...builtIn, ...userTemplates].map(t => ({
        ...t,
        isFavorite: favoriteIds.includes(t.id),
      }));
      
      setTemplates(allTemplates);
      setFavorites(new Set(favoriteIds));
    } catch (error) {
      console.error('[Templates] Failed to load:', error);
    }
  }, []);
  
  // 保存用户模板
  const saveUserTemplates = useCallback((userTemplates: Template[]) => {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(userTemplates));
    } catch (error) {
      console.error('[Templates] Failed to save:', error);
    }
  }, []);
  
  // 保存收藏
  const saveFavorites = useCallback((favoriteIds: string[]) => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch (error) {
      console.error('[Templates] Failed to save favorites:', error);
    }
  }, []);
  
  // 创建模板
  const createTemplate = useCallback(async (template: Omit<Template, 'id' | 'stats' | 'createdAt' | 'updatedAt'>) => {
    const newTemplate: Template = {
      ...template,
      id: crypto.randomUUID(),
      stats: { downloads: 0, likes: 0, uses: 0, rating: 0, ratingCount: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const userTemplates = templates.filter(t => !t.isBuiltIn);
    const newUserTemplates = [...userTemplates, newTemplate];
    saveUserTemplates(newUserTemplates);
    
    setTemplates(prev => [...prev, newTemplate]);
    
    return newTemplate;
  }, [templates, saveUserTemplates]);
  
  // 更新模板
  const updateTemplate = useCallback((id: string, updates: Partial<Template>) => {
    const isBuiltIn = BUILT_IN_TEMPLATES.some(t => t.id === id);
    if (isBuiltIn) return; // 不能修改内置模板
    
    const userTemplates = templates.filter(t => !t.isBuiltIn).map(t =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
    );
    saveUserTemplates(userTemplates);
    
    setTemplates(prev => prev.map(t =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
    ));
  }, [templates, saveUserTemplates]);
  
  // 删除模板
  const deleteTemplate = useCallback((id: string) => {
    const isBuiltIn = BUILT_IN_TEMPLATES.some(t => t.id === id);
    if (isBuiltIn) return; // 不能删除内置模板
    
    const userTemplates = templates.filter(t => !t.isBuiltIn && t.id !== id);
    saveUserTemplates(userTemplates);
    
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, [templates, saveUserTemplates]);
  
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
      
      // 更新模板的收藏状态
      setTemplates(prevTemplates => prevTemplates.map(t =>
        t.id === id ? { ...t, isFavorite: next.has(id) } : t
      ));
      
      return next;
    });
  }, [saveFavorites]);
  
  // 记录使用
  const recordUse = useCallback((id: string) => {
    const userTemplates = templates.filter(t => !t.isBuiltIn);
    const template = userTemplates.find(t => t.id === id);
    if (template) {
      updateTemplate(id, {
        stats: { ...template.stats, uses: template.stats.uses + 1 },
      });
    }
  }, [templates, updateTemplate]);
  
  // 导出模板
  const exportTemplate = useCallback((id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) return null;
    
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      template: {
        name: template.name,
        description: template.description,
        type: template.type,
        category: template.category,
        content: template.content,
        tags: template.tags,
      },
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}.jubutemplate`;
    a.click();
    URL.revokeObjectURL(url);
  }, [templates]);
  
  // 导入模板
  const importTemplate = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.version !== '1.0.0' || !data.template) {
        throw new Error('无效的模板文件');
      }
      
      const { template } = data;
      
      const newTemplate: Omit<Template, 'id' | 'stats' | 'createdAt' | 'updatedAt'> = {
        name: template.name,
        description: template.description,
        type: template.type,
        category: template.category || 'custom',
        content: template.content,
        author: { id: 'current-user', name: '我' },
        tags: template.tags || [],
        isBuiltIn: false,
        isFavorite: false,
        version: '1.0.0',
      };
      
      return await createTemplate(newTemplate);
    } catch (error: any) {
      throw new Error(`导入失败: ${error.message}`);
    }
  }, [createTemplate]);
  
  // 搜索模板
  const searchTemplates = useCallback((filter: TemplateFilter) => {
    let results = [...templates];
    
    if (filter.type) {
      results = results.filter(t => t.type === filter.type);
    }
    
    if (filter.category && filter.category !== 'all') {
      results = results.filter(t => t.category === filter.category);
    }
    
    if (filter.search) {
      const search = filter.search.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }
    
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(t =>
        filter.tags!.some(tag => t.tags.includes(tag))
      );
    }
    
    // 排序
    switch (filter.sortBy) {
      case 'popular':
        results.sort((a, b) => b.stats.downloads - a.stats.downloads);
        break;
      case 'recent':
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'rating':
        results.sort((a, b) => b.stats.rating - a.stats.rating);
        break;
      case 'downloads':
        results.sort((a, b) => b.stats.downloads - a.stats.downloads);
        break;
    }
    
    return results;
  }, [templates]);
  
  // 加载初始数据
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);
  
  return {
    templates,
    favorites,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,
    recordUse,
    exportTemplate,
    importTemplate,
    searchTemplates,
  };
}

// ==================== 模板卡片组件 ====================

interface TemplateCardProps {
  template: Template;
  onUse: (template: Template) => void;
  onFavorite: (id: string) => void;
  onExport: (id: string) => void;
  onEdit?: (template: Template) => void;
  onDelete?: (id: string) => void;
  viewMode?: 'grid' | 'list';
}

export function TemplateCard({
  template,
  onUse,
  onFavorite,
  onExport,
  onEdit,
  onDelete,
  viewMode = 'grid',
}: TemplateCardProps) {
  const isBuiltIn = template.isBuiltIn;
  const categoryConfig = CATEGORY_CONFIG[template.category];
  
  if (viewMode === 'list') {
    return (
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* 图标 */}
            <div className={cn(
              'p-3 rounded-lg',
              isBuiltIn ? 'bg-primary/10' : 'bg-muted'
            )}>
              {TYPE_CONFIG[template.type].icon}
            </div>
            
            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium truncate">{template.name}</span>
                {isBuiltIn && (
                  <Badge variant="secondary" className="text-xs">内置</Badge>
                )}
                <Badge 
                  variant="outline" 
                  className={cn('text-xs', categoryConfig.color)}
                >
                  {categoryConfig.icon}
                  <span className="ml-1">{categoryConfig.label}</span>
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {template.description}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  {template.stats.downloads}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  {template.stats.rating.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {template.stats.uses} 次使用
                </span>
              </div>
            </div>
            
            {/* 操作 */}
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onFavorite(template.id)}
                    >
                      {template.isFavorite ? (
                        <BookmarkCheck className="w-4 h-4 text-primary" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {template.isFavorite ? '取消收藏' : '收藏'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Button onClick={() => onUse(template)}>
                使用
              </Button>
              
              {!isBuiltIn && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onExport(template.id)}>
                      <Download className="w-4 h-4 mr-2" />
                      导出
                    </DropdownMenuItem>
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(template)}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        编辑
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(template.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // 网格视图
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* 缩略图 */}
      <div className={cn(
        'h-32 flex items-center justify-center',
        isBuiltIn ? 'bg-gradient-to-br from-primary/20 to-primary/5' : 'bg-muted'
      )}>
        <div className="text-4xl opacity-50">
          {TYPE_CONFIG[template.type].icon}
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{template.name}</CardTitle>
            <Badge 
              variant="outline" 
              className={cn('text-xs mt-1', categoryConfig.color)}
            >
              {categoryConfig.label}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => onFavorite(template.id)}
          >
            {template.isFavorite ? (
              <BookmarkCheck className="w-4 h-4 text-primary fill-primary" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <CardDescription className="line-clamp-2 text-xs">
          {template.description}
        </CardDescription>
      </CardContent>
      
      <CardFooter className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {template.stats.downloads}
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
            {template.stats.rating.toFixed(1)}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {!isBuiltIn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport(template.id)}>
                  <Download className="w-4 h-4 mr-2" />
                  导出
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(template)}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    编辑
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(template.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <Button size="sm" onClick={() => onUse(template)}>
            使用
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

// ==================== 模板市场主组件 ====================

interface TemplateMarketplaceProps {
  onSelectTemplate?: (template: Template) => void;
  filter?: TemplateFilter;
  className?: string;
}

export function TemplateMarketplace({
  onSelectTemplate,
  filter: initialFilter,
  className,
}: TemplateMarketplaceProps) {
  const [filter, setFilter] = useState<TemplateFilter>(initialFilter || {
    sortBy: 'popular',
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  
  const {
    templates,
    favorites,
    createTemplate,
    deleteTemplate,
    toggleFavorite,
    exportTemplate,
    importTemplate,
    searchTemplates,
  } = useTemplateStore();
  
  // 过滤和搜索
  const filteredTemplates = useMemo(() => {
    return searchTemplates(filter);
  }, [templates, filter, searchTemplates]);
  
  // 收藏的模板
  const favoriteTemplates = useMemo(() => {
    return templates.filter(t => favorites.has(t.id));
  }, [templates, favorites]);
  
  // 处理导入
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    try {
      const template = await importTemplate(file);
      onSelectTemplate?.(template);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5" />
          <h2 className="text-lg font-semibold">模板市场</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".jubutemplate,.json"
            onChange={handleImport}
            className="hidden"
            id="template-import"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('template-import')?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            导入
          </Button>
          
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            创建模板
          </Button>
        </div>
      </div>
      
      {/* 筛选器 */}
      <div className="flex flex-wrap items-center gap-4">
        {/* 搜索 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索模板..."
            value={filter.search || ''}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="pl-9"
          />
        </div>
        
        {/* 类型 */}
        <Select
          value={filter.type || 'all'}
          onValueChange={(v) => setFilter({ ...filter, type: v === 'all' ? undefined : v as TemplateType })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  {config.icon}
                  {config.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* 分类 */}
        <Select
          value={filter.category || 'all'}
          onValueChange={(v) => setFilter({ ...filter, category: v as TemplateCategory })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="分类" />
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
        
        {/* 排序 */}
        <Select
          value={filter.sortBy || 'popular'}
          onValueChange={(v) => setFilter({ ...filter, sortBy: v as any })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="排序" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">热门</SelectItem>
            <SelectItem value="recent">最新</SelectItem>
            <SelectItem value="rating">评分最高</SelectItem>
            <SelectItem value="downloads">下载最多</SelectItem>
          </SelectContent>
        </Select>
        
        {/* 视图切换 */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-r-none"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-l-none"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* 标签筛选 */}
      {filter.tags && filter.tags.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">标签:</span>
          <div className="flex flex-wrap gap-1">
            {filter.tags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs cursor-pointer"
                onClick={() => setFilter({
                  ...filter,
                  tags: filter.tags?.filter(t => t !== tag),
                })}
              >
                {tag}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* 内容区域 */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            全部 ({filteredTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Bookmark className="w-4 h-4 mr-1" />
            收藏 ({favoriteTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="mine">
            我的 ({templates.filter(t => !t.isBuiltIn).length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          {filteredTemplates.length === 0 ? (
            <EmptyState onCreate={() => setCreateDialogOpen(true)} />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={onSelectTemplate!}
                  onFavorite={toggleFavorite}
                  onExport={exportTemplate}
                  onDelete={deleteTemplate}
                  viewMode={viewMode}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={onSelectTemplate!}
                  onFavorite={toggleFavorite}
                  onExport={exportTemplate}
                  onDelete={deleteTemplate}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="favorites" className="mt-4">
          {favoriteTemplates.length === 0 ? (
            <EmptyState message="暂无收藏的模板" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {favoriteTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={onSelectTemplate!}
                  onFavorite={toggleFavorite}
                  onExport={exportTemplate}
                  viewMode="grid"
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="mine" className="mt-4">
          {templates.filter(t => !t.isBuiltIn).length === 0 ? (
            <EmptyState
              message="你还没有创建任何模板"
              onCreate={() => setCreateDialogOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {templates.filter(t => !t.isBuiltIn).map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={onSelectTemplate!}
                  onFavorite={toggleFavorite}
                  onExport={exportTemplate}
                  onDelete={deleteTemplate}
                  viewMode="grid"
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* 创建模板对话框 */}
      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={createTemplate}
      />
    </div>
  );
}

// ==================== 创建模板对话框 ====================

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (template: Omit<Template, 'id' | 'stats' | 'createdAt' | 'updatedAt'>) => Promise<Template>;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TemplateType>('project');
  const [category, setCategory] = useState<TemplateCategory>('custom');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const handleCreate = async () => {
    if (!name.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        type,
        category,
        tags,
        content: {},
        author: { id: 'current-user', name: '我' },
        isBuiltIn: false,
        isFavorite: false,
        version: '1.0.0',
      });
      onOpenChange(false);
      setName('');
      setDescription('');
      setTags([]);
    } finally {
      setIsCreating(false);
    }
  };
  
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>创建模板</DialogTitle>
          <DialogDescription>
            创建一个新的项目模板，方便以后快速使用
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>模板名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入模板名称"
            />
          </div>
          
          <div className="space-y-2">
            <Label>描述</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述这个模板的用途..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <Select value={type} onValueChange={(v) => setType(v as TemplateType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
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
              <Label>分类</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
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
          </div>
          
          <div className="space-y-2">
            <Label>标签</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="输入标签后按回车"
              />
              <Button variant="outline" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
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
          <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 空状态组件 ====================

function EmptyState({ 
  message = '暂无模板', 
  onCreate 
}: { 
  message?: string; 
  onCreate?: () => void 
}) {
  return (
    <div className="text-center py-12">
      <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <p className="text-muted-foreground mb-4">{message}</p>
      {onCreate && (
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" />
          创建第一个模板
        </Button>
      )}
    </div>
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

// Textarea 组件
function Textarea({ 
  value, 
  onChange, 
  placeholder, 
  rows = 3 
}: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; 
  placeholder?: string; 
  rows?: number; 
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
