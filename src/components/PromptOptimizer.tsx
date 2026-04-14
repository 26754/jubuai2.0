// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * AI 提示词优化工具
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Copy, 
  Check, 
  RefreshCw, 
  Lightbulb,
  Settings,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  ArrowRight,
  Languages,
  FileText,
  Image,
  Video,
  Scissors,
  BookOpen,
  WandSparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export type PromptType = 'character' | 'scene' | 'shot' | 'action' | 'general';
export type PromptLanguage = 'zh' | 'en' | 'zh+en';
export type EnhancementLevel = 'simple' | 'standard' | 'professional';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  type: PromptType;
  template: string;
  variables: string[];
  tips?: string[];
}

export interface PromptEnhancement {
  original: string;
  enhanced: string;
  suggestions: string[];
  metadata: {
    type: PromptType;
    language: PromptLanguage;
    level: EnhancementLevel;
    timestamp: Date;
  };
}

// ==================== 提示词模板 ====================

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // 角色模板
  {
    id: 'character-portrait',
    name: '角色全身像',
    description: '生成角色全身肖像图',
    type: 'character',
    template: `[角色描述], [服装细节], [姿态], [背景环境], [光照风格], [画面比例: 3:4], [高细节, 8K, 电影级画质]`,
    variables: ['角色描述', '服装细节', '姿态', '背景环境', '光照风格'],
    tips: [
      '描述越具体，生成效果越好',
      '包含服装材质和颜色细节',
      '指定角色情绪和姿态',
    ],
  },
  {
    id: 'character-expression',
    name: '角色表情特写',
    description: '生成角色面部表情特写',
    type: 'character',
    template: `[角色描述], [面部特征], [表情], [眼神], [光线角度], [特写构图], [细节层次]`,
    variables: ['角色描述', '面部特征', '表情', '眼神', '光线角度'],
  },
  {
    id: 'character-style',
    name: '角色风格化',
    description: '特定艺术风格的字符角色',
    type: 'character',
    template: `[角色描述], [艺术风格: anime/realistic/3D], [渲染引擎], [光照方案], [画面质量]`,
    variables: ['角色描述', '艺术风格', '渲染引擎', '光照方案'],
  },
  
  // 场景模板
  {
    id: 'scene-landscape',
    name: '场景全景',
    description: '生成环境场景全景图',
    type: 'scene',
    template: `[场景类型], [地理位置], [时间段], [天气氛围], [色彩风格], [视角], [构图比例], [8K, 高细节]`,
    variables: ['场景类型', '地理位置', '时间段', '天气氛围', '色彩风格', '视角'],
    tips: [
      '指定时间段可以获得更准确的光照效果',
      '天气和氛围会影响整体色调',
    ],
  },
  {
    id: 'scene-interior',
    name: '室内场景',
    description: '生成室内空间场景',
    type: 'scene',
    template: `[空间类型], [装修风格], [家具摆设], [光源], [色调], [视角], [氛围], [高细节渲染]`,
    variables: ['空间类型', '装修风格', '家具摆设', '光源', '色调', '氛围'],
  },
  
  // 分镜模板
  {
    id: 'shot-close-up',
    name: '特写镜头',
    description: '生成特写分镜画面',
    type: 'shot',
    template: `[拍摄对象], [特写细节], [相机角度], [景深效果], [光线], [情绪氛围], [电影感]`,
    variables: ['拍摄对象', '特写细节', '相机角度', '景深效果', '光线'],
    tips: [
      '特写镜头强调情感表达',
      '注意光线对情绪的影响',
    ],
  },
  {
    id: 'shot-wide',
    name: '全景镜头',
    description: '生成全景分镜画面',
    type: 'shot',
    template: `[场景环境], [主体位置], [景别], [空间关系], [氛围], [色调风格], [电影构图]`,
    variables: ['场景环境', '主体位置', '景别', '空间关系', '氛围', '色调风格'],
  },
  {
    id: 'shot-action',
    name: '动作镜头',
    description: '生成动态动作分镜',
    type: 'shot',
    template: `[动作描述], [动态模糊], [速度感], [姿态], [背景动态], [电影感], [高帧率渲染]`,
    variables: ['动作描述', '动态模糊', '速度感', '姿态', '背景动态'],
  },
  
  // 动作模板
  {
    id: 'action-expression',
    name: '表情动作',
    description: '描述角色表情变化',
    type: 'action',
    template: `[角色名] [表情变化: 微笑/皱眉/惊讶...], [眼神变化], [身体语言], [情绪递进]`,
    variables: ['角色名', '表情变化', '眼神变化', '身体语言', '情绪递进'],
  },
  {
    id: 'action-movement',
    name: '运动动作',
    description: '描述角色运动动作',
    type: 'action',
    template: `[角色名] [动作类型], [运动轨迹], [力度], [速度], [连贯性], [背景配合]`,
    variables: ['角色名', '动作类型', '运动轨迹', '力度', '速度', '连贯性'],
  },
];

// ==================== 提示词增强关键词 ====================

const ENHANCEMENT_KEYWORDS = {
  quality: [
    '高细节', '8K', '4K', '超高清', '电影级', '专业摄影',
    'high detail', '8K', '4K', 'ultra HD', 'cinematic', 'professional photography',
  ],
  lighting: [
    '电影光', '柔光', '硬光', '逆光', '侧光', '顶光', '自然光',
    'cinematic lighting', 'soft light', 'hard light', 'backlight', 'side light', 'top light', 'natural light',
  ],
  composition: [
    '黄金分割', '三分法', '对称构图', '对角线构图', '框架构图',
    'golden ratio', 'rule of thirds', 'symmetrical composition', 'diagonal composition', 'framing',
  ],
  atmosphere: [
    '氛围感', '电影感', '沉浸感', '情绪化', '戏剧性',
    'atmospheric', 'cinematic', 'immersive', 'emotional', 'dramatic',
  ],
  style: [
    '写实风格', '动漫风格', '水彩风格', '油画风格', '3D渲染',
    'realistic', 'anime style', 'watercolor style', 'oil painting style', '3D render',
  ],
};

// ==================== 提示词分析器 ====================

interface PromptAnalysis {
  score: number;
  issues: string[];
  suggestions: string[];
  strengths: string[];
}

export function analyzePrompt(prompt: string, type: PromptType): PromptAnalysis {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const strengths: string[] = [];
  let score = 50; // 基础分数
  
  const lowerPrompt = prompt.toLowerCase();
  
  // 检查长度
  if (prompt.length < 20) {
    issues.push('提示词过于简短');
    suggestions.push('增加更多细节描述');
    score -= 20;
  } else if (prompt.length >= 50) {
    strengths.push('包含足够的细节描述');
    score += 10;
  }
  
  // 检查质量关键词
  const hasQualityKeywords = ENHANCEMENT_KEYWORDS.quality.some(k => lowerPrompt.includes(k.toLowerCase()));
  if (hasQualityKeywords) {
    strengths.push('包含质量相关关键词');
    score += 10;
  } else {
    suggestions.push('添加质量描述关键词（如：高细节、8K）');
  }
  
  // 检查光线关键词
  const hasLightingKeywords = ENHANCEMENT_KEYWORDS.lighting.some(k => lowerPrompt.includes(k.toLowerCase()));
  if (hasLightingKeywords) {
    strengths.push('包含光线描述');
    score += 10;
  } else {
    suggestions.push('添加光线和光照描述');
  }
  
  // 检查构图关键词
  const hasCompositionKeywords = ENHANCEMENT_KEYWORDS.composition.some(k => lowerPrompt.includes(k.toLowerCase()));
  if (hasCompositionKeywords) {
    strengths.push('包含构图描述');
    score += 10;
  } else {
    suggestions.push('添加构图描述（如：三分法、黄金分割）');
  }
  
  // 检查氛围关键词
  const hasAtmosphereKeywords = ENHANCEMENT_KEYWORDS.atmosphere.some(k => lowerPrompt.includes(k.toLowerCase()));
  if (hasAtmosphereKeywords) {
    strengths.push('包含氛围描述');
    score += 10;
  } else {
    suggestions.push('添加氛围和情绪描述');
  }
  
  // 检查类型特定问题
  if (type === 'character') {
    if (!prompt.includes('面部') && !prompt.includes('表情') && !prompt.includes('face')) {
      suggestions.push('考虑添加面部或表情描述');
    }
  }
  
  if (type === 'scene') {
    if (!prompt.includes('背景') && !prompt.includes('环境') && !prompt.includes('background')) {
      suggestions.push('添加背景环境描述');
    }
  }
  
  // 确保分数在 0-100 范围内
  score = Math.max(0, Math.min(100, score));
  
  return { score, issues, suggestions, strengths };
}

// ==================== 提示词优化器 ====================

export function enhancePrompt(
  prompt: string,
  type: PromptType,
  language: PromptLanguage,
  level: EnhancementLevel
): string {
  let enhanced = prompt;
  
  // 根据类型添加特定增强
  if (type === 'character' && level !== 'simple') {
    if (!enhanced.includes('细节') && !enhanced.includes('detail')) {
      enhanced += ', 高细节面部刻画';
    }
    if (!enhanced.includes('光') && !enhanced.includes('light')) {
      enhanced += ', 柔和环境光';
    }
  }
  
  if (type === 'scene' && level !== 'simple') {
    if (!enhanced.includes('氛围') && !enhanced.includes('atmosphere')) {
      enhanced += ', 电影感氛围';
    }
    if (!enhanced.includes('构图') && !enhanced.includes('composition')) {
      enhanced += ', 三分法构图';
    }
  }
  
  if (type === 'shot' && level !== 'simple') {
    if (!enhanced.includes('景深') && !enhanced.includes('depth')) {
      enhanced += ', 浅景深虚化背景';
    }
    if (!enhanced.includes('电影') && !enhanced.includes('cinematic')) {
      enhanced += ', 电影级画质';
    }
  }
  
  // 专业级别额外增强
  if (level === 'professional') {
    const professionalEnhancements = [
      ', 8K超高清分辨率',
      ', 电影级色彩分级',
      ', 专业摄影棚布光',
      ', 细腻材质质感',
    ];
    
    const randomEnhancements = professionalEnhancements
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    
    enhanced += randomEnhancements.join('');
  }
  
  // 双语支持
  if (language === 'zh+en') {
    // 将中文关键词转换为双语
    enhanced = enhanced
      .replace(/高细节/g, '高细节 high detail')
      .replace(/8K/g, '8K UHD')
      .replace(/电影级/g, '电影级 cinematic')
      .replace(/三分法/g, '三分法 rule of thirds');
  }
  
  return enhanced;
}

// ==================== 提示词模板选择器 ====================

interface TemplateSelectorProps {
  type: PromptType;
  onSelect: (template: PromptTemplate) => void;
  className?: string;
}

export function TemplateSelector({ type, onSelect, className }: TemplateSelectorProps) {
  const templates = useMemo(() => 
    PROMPT_TEMPLATES.filter(t => t.type === type),
    [type]
  );
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Wand2 className="w-4 h-4 mr-2" />
          使用模板
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>选择模板</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-80">
          {templates.map(template => (
            <DropdownMenuItem
              key={template.id}
              onClick={() => onSelect(template)}
              className="flex flex-col items-start gap-1 py-2"
            >
              <span className="font-medium">{template.name}</span>
              <span className="text-xs text-muted-foreground">{template.description}</span>
            </DropdownMenuItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ==================== 提示词编辑器 ====================

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  type: PromptType;
  onTypeChange?: (type: PromptType) => void;
  showAnalysis?: boolean;
  className?: string;
}

export function PromptEditor({
  value,
  onChange,
  type,
  onTypeChange,
  showAnalysis = true,
  className,
}: PromptEditorProps) {
  const [copied, setCopied] = useState(false);
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  
  // 实时分析
  React.useEffect(() => {
    if (showAnalysis && value.trim()) {
      const result = analyzePrompt(value, type);
      setAnalysis(result);
    } else {
      setAnalysis(null);
    }
  }, [value, type, showAnalysis]);
  
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);
  
  const handleEnhance = useCallback(() => {
    const enhanced = enhancePrompt(value, type, 'zh', 'standard');
    onChange(enhanced);
  }, [value, type, onChange]);
  
  return (
    <div className={cn('space-y-3', className)}>
      {/* 类型选择 */}
      {onTypeChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">类型:</span>
          <div className="flex gap-1">
            {(['character', 'scene', 'shot', 'action'] as PromptType[]).map(t => (
              <Button
                key={t}
                variant={type === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => onTypeChange(t)}
                className="h-7 text-xs"
              >
                {t === 'character' && <User className="w-3 h-3 mr-1" />}
                {t === 'scene' && <Grid3X3 className="w-3 h-3 mr-1" />}
                {t === 'shot' && <Camera className="w-3 h-3 mr-1" />}
                {t === 'action' && <Scissors className="w-3 h-3 mr-1" />}
                {t === 'character' && '角色'}
                {t === 'scene' && '场景'}
                {t === 'shot' && '分镜'}
                {t === 'action' && '动作'}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* 提示词输入 */}
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="输入你的提示词..."
          className="min-h-[120px] resize-y"
        />
        
        {/* 操作按钮 */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEnhance}
                  disabled={!value.trim()}
                  className="h-8 w-8"
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI 优化</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  disabled={!value.trim()}
                  className="h-8 w-8"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copied ? '已复制' : '复制'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* 分析结果 */}
      {analysis && (
        <Card className="border-muted">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">提示词分析</CardTitle>
              <Badge 
                variant={analysis.score >= 70 ? 'default' : analysis.score >= 40 ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                得分: {analysis.score}/100
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 优势 */}
            {analysis.strengths.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500" />
                  优点
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.strengths.map((strength, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* 建议 */}
            {analysis.suggestions.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-yellow-500" />
                  建议
                </div>
                <div className="space-y-1">
                  {analysis.suggestions.map((suggestion, i) => (
                    <div key={i} className="text-xs flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 问题 */}
            {analysis.issues.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-red-500" />
                  问题
                </div>
                <div className="space-y-1">
                  {analysis.issues.map((issue, i) => (
                    <div key={i} className="text-xs flex items-start gap-2 text-red-600">
                      <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== 提示词历史记录 ====================

interface PromptHistoryItem {
  id: string;
  original: string;
  enhanced: string;
  type: PromptType;
  timestamp: Date;
}

const PROMPT_HISTORY_KEY = 'jubuai-prompt-history';

export function usePromptHistory() {
  const [history, setHistory] = useState<PromptHistoryItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(PROMPT_HISTORY_KEY) || '[]')
        .map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
    } catch {
      return [];
    }
  });
  
  const addToHistory = useCallback((original: string, enhanced: string, type: PromptType) => {
    const newItem: PromptHistoryItem = {
      id: crypto.randomUUID(),
      original,
      enhanced,
      type,
      timestamp: new Date(),
    };
    
    setHistory(prev => {
      const next = [newItem, ...prev].slice(0, 50);
      localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(PROMPT_HISTORY_KEY);
  }, []);
  
  const removeFromHistory = useCallback((id: string) => {
    setHistory(prev => {
      const next = prev.filter(item => item.id !== id);
      localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  
  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };
}

// ==================== 提示词对比工具 ====================

interface PromptCompareProps {
  original: string;
  enhanced: string;
  onUseOriginal: () => void;
  onUseEnhanced: () => void;
  className?: string;
}

export function PromptCompare({
  original,
  enhanced,
  onUseOriginal,
  onUseEnhanced,
  className,
}: PromptCompareProps) {
  const [activeTab, setActiveTab] = useState<'original' | 'enhanced'>('enhanced');
  
  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'original' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('original')}
          >
            原版
          </Button>
          <Button
            variant={activeTab === 'enhanced' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('enhanced')}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            优化版
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm whitespace-pre-wrap">
            {activeTab === 'original' ? original : enhanced}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={activeTab === 'original' ? onUseOriginal : onUseEnhanced}
            className="flex-1"
          >
            使用{activeTab === 'original' ? '原版' : '优化版'}
          </Button>
        </div>
        
        {/* 差异高亮 */}
        {activeTab === 'enhanced' && enhanced !== original && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">优化内容:</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {enhanced.split(',').filter(part => !original.includes(part.trim())).map((part, i) => (
                <li key={i} className="text-green-600">+ {part.trim()}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 提示词快捷增强 ====================

interface QuickEnhanceProps {
  prompt: string;
  onEnhance: (enhanced: string) => void;
  className?: string;
}

export function QuickEnhance({ prompt, onEnhance, className }: QuickEnhanceProps) {
  const [loading, setLoading] = useState(false);
  
  const handleEnhance = useCallback(async (level: EnhancementLevel) => {
    setLoading(true);
    try {
      // 模拟 API 调用延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      const enhanced = enhancePrompt(prompt, 'general', 'zh', level);
      onEnhance(enhanced);
    } finally {
      setLoading(false);
    }
  }, [prompt, onEnhance]);
  
  return (
    <div className={cn('flex gap-2', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEnhance('simple')}
              disabled={loading || !prompt.trim()}
            >
              轻微优化
            </Button>
          </TooltipTrigger>
          <TooltipContent>添加基础增强词</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEnhance('standard')}
              disabled={loading || !prompt.trim()}
            >
              <Wand2 className="w-3 h-3 mr-1" />
              标准优化
            </Button>
          </TooltipTrigger>
          <TooltipContent>添加质量、光线、构图描述</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleEnhance('professional')}
              disabled={loading || !prompt.trim()}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              专业优化
            </Button>
          </TooltipTrigger>
          <TooltipContent>添加电影级增强词</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// 辅助图标组件
function User(props: React.SVGProps<SVGSVGElement>) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}

function Grid3X3(props: React.SVGProps<SVGSVGElement>) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>;
}

function Camera(props: React.SVGProps<SVGSVGElement>) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>;
}

function Scissors(props: React.SVGProps<SVGSVGElement>) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/></svg>;
}
