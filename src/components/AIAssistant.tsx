// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * AI 助手面板
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  MessageSquare,
  Lightbulb,
  Wand2,
  FileText,
  Users,
  Clapperboard,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Settings,
  BookOpen,
  Layers,
  Star,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  WandSparkles,
  Film,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export type AssistantMode = 'chat' | 'script' | 'character' | 'scene' | 'storyboard';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface AssistantMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  suggestions?: Suggestion[];
  metadata?: Record<string, any>;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'script' | 'character' | 'scene';
  name: string;
  url?: string;
  preview?: string;
}

export interface Suggestion {
  id: string;
  type: 'text' | 'action';
  label: string;
  icon?: React.ReactNode;
  action?: () => void;
}

export interface AssistantPreset {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  prompt: string;
  mode: AssistantMode;
}

// ==================== 预设助手 ====================

export const ASSISTANT_PRESETS: AssistantPreset[] = [
  {
    id: 'script-writer',
    name: '剧本创作',
    icon: <FileText className="w-4 h-4" />,
    description: '帮助你编写和优化剧本内容',
    prompt: '你是一位专业的剧本创作助手。请根据用户的需求：1) 创作新的剧本内容 2) 优化现有的剧本结构 3) 提供情节发展建议 4) 分析角色动机。请用简洁专业的语言回复。',
    mode: 'script',
  },
  {
    id: 'character-designer',
    name: '角色设计',
    icon: <Users className="w-4 h-4" />,
    description: '帮助你创建和完善角色设定',
    prompt: '你是一位专业的角色设计专家。请根据用户的需求：1) 创建新的角色设定 2) 丰富角色背景故事 3) 设计角色外观描述 4) 优化角色性格特征。请提供详细且富有创意的内容。',
    mode: 'character',
  },
  {
    id: 'scene-builder',
    name: '场景构建',
    icon: <Film className="w-4 h-4" />,
    description: '帮助你构建场景细节',
    prompt: '你是一位专业的场景设计专家。请根据用户的需求：1) 描述场景环境细节 2) 设计场景氛围和色调 3) 提供光线和构图建议 4) 增强场景的视觉冲击力。',
    mode: 'scene',
  },
  {
    id: 'storyboard-director',
    name: '分镜导演',
    icon: <Clapperboard className="w-4 h-4" />,
    description: '帮助你规划分镜和镜头语言',
    prompt: '你是一位经验丰富的分镜导演。请根据用户的需求：1) 规划分镜节奏 2) 设计镜头语言 3) 提供机位建议 4) 分析叙事效果。请用专业的影视语言描述。',
    mode: 'storyboard',
  },
  {
    id: 'idea-generator',
    name: '灵感激发',
    icon: <Lightbulb className="w-4 h-4" />,
    description: '帮助你获得创作灵感',
    prompt: '你是一位富有创意的灵感激发专家。请根据用户的需求提供：1) 新颖的创意点子 2) 意想不到的情节转折 3) 独特的主题表达方式 4) 有趣的角色互动。请天马行空但切合实际。',
    mode: 'chat',
  },
  {
    id: 'quality-reviewer',
    name: '质量评审',
    icon: <Star className="w-4 h-4" />,
    description: '帮你评审和提升内容质量',
    prompt: '你是一位资深的内容质量评审专家。请从以下角度评审用户的内容：1) 故事结构 2) 角色塑造 3) 对话质量 4) 视觉描述 5) 整体连贯性。请给出具体的改进建议。',
    mode: 'chat',
  },
];

// ==================== 模式配置 ====================

const MODE_CONFIG: Record<AssistantMode, { icon: React.ReactNode; label: string; colorClass: string; bgClass: string }> = {
  chat: { icon: <MessageSquare className="w-4 h-4" />, label: '对话', colorClass: 'text-[hsl(var(--info))]', bgClass: 'bg-[hsl(var(--info))/10]' },
  script: { icon: <FileText className="w-4 h-4" />, label: '剧本', colorClass: 'text-[hsl(var(--success))]', bgClass: 'bg-[hsl(var(--success))/10]' },
  character: { icon: <Users className="w-4 h-4" />, label: '角色', colorClass: 'text-[hsl(var(--style-anime))]', bgClass: 'bg-[hsl(var(--style-anime))/10]' },
  scene: { icon: <Film className="w-4 h-4" />, label: '场景', colorClass: 'text-[hsl(var(--warning))]', bgClass: 'bg-[hsl(var(--warning))/10]' },
  storyboard: { icon: <Clapperboard className="w-4 h-4" />, label: '分镜', colorClass: 'text-[hsl(var(--style-watercolor))]', bgClass: 'bg-[hsl(var(--style-watercolor))/10]' },
};

// ==================== AI 消息处理 ====================

interface UseAIChatOptions {
  mode: AssistantMode;
  systemPrompt?: string;
  context?: Record<string, any>;
}

export function useAIChat({ mode, systemPrompt, context }: UseAIChatOptions) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    
    try {
      // 构建上下文（预留真实 API 调用使用）
      // const contextPrompt = buildContextPrompt(mode, context);
      // const fullPrompt = contextPrompt ? `${contextPrompt}\n\n用户消息：${content}` : content;
      
      // TODO: 替换为真实 API 调用
      // const response = await callAIAPI(fullPrompt);
      
      // 模拟 AI 响应（实际项目中应调用真实 API）
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const response = generateMockResponse(mode, content, context);
      
      const assistantMessage: AssistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        suggestions: response.suggestions,
        metadata: response.metadata,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || '生成失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [mode, context]);
  
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);
  
  const regenerateResponse = useCallback(async () => {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) return;
    
    // 删除最后一条助手消息
    setMessages(prev => prev.slice(0, -1));
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const response = generateMockResponse(mode, lastUserMessage.content, context);
      
      const assistantMessage: AssistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        suggestions: response.suggestions,
        metadata: response.metadata,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || '生成失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [messages, mode, context]);
  
  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    regenerateResponse,
  };
}

// ==================== 模拟 AI 响应 ====================

function generateMockResponse(
  mode: AssistantMode,
  userMessage: string,
  context?: Record<string, any>
): { content: string; suggestions: Suggestion[]; metadata?: Record<string, any> } {
  const lowerMessage = userMessage.toLowerCase();
  
  switch (mode) {
    case 'script':
      return {
        content: `根据你的需求，我建议从以下几个方面优化剧本：

**1. 故事结构**
- 采用经典的三幕式结构
- 第一幕：建立世界观和主要冲突
- 第二幕：升级冲突，增加转折
- 第三幕：高潮和解决

**2. 角色动机**
确保每个主要角色都有清晰的动机。建议：
- 主角：追求某个核心目标
- 对手：与主角目标冲突
- 配角：辅助主角成长

**3. 对话优化**
- 每句对白都应该推进剧情或展现角色
- 避免过多的信息解释
- 使用潜台词增加层次

**4. 视觉描述**
- 每场戏都有独特的视觉标识
- 利用环境变化反映角色心理
- 注意节奏和留白

你可以告诉我具体是哪部分需要更详细的建议？`,
        suggestions: [
          { id: '1', type: 'action', label: '优化角色动机', icon: <Users className="w-4 h-4" /> },
          { id: '2', type: 'action', label: '改进对话', icon: <MessageSquare className="w-4 h-4" /> },
          { id: '3', type: 'action', label: '生成示例对白', icon: <FileText className="w-4 h-4" /> },
        ],
      };
      
    case 'character':
      return {
        content: `角色设计建议：

**1. 基础设定**
- 姓名要有记忆点，暗示角色特质
- 年龄、职业、社会地位要服务于故事
- 外貌描写要抓住关键特征

**2. 性格塑造**
- 使用矛盾性增加层次（如：表面冷漠，内心善良）
- 设定明确的优缺点
- 恐惧和渴望是角色核心

**3. 背景故事**
- 影响角色现在行为的关键事件
- 与其他角色的关系网络
- 未解开的悬念增加神秘感

**4. 一致性**
- 确保行为符合性格设定
- 成长或转变要有铺垫
- 使用标志性的习惯或口头禅

请问你想深入了解哪个方面？`,
        suggestions: [
          { id: '1', type: 'action', label: '生成角色描述', icon: <Wand2 className="w-4 h-4" /> },
          { id: '2', type: 'action', label: '设计关系网络', icon: <Users className="w-4 h-4" /> },
          { id: '3', type: 'action', label: '创建背景故事', icon: <BookOpen className="w-4 h-4" /> },
        ],
      };
      
    case 'scene':
      return {
        content: `场景设计建议：

**1. 环境选择**
- 每个场景都应该有独特的存在理由
- 考虑地点如何影响角色行为
- 利用环境元素创造隐喻

**2. 视觉元素**
- 光线：表达时间段和情绪
- 色彩：建立视觉主题
- 道具：暗示角色和剧情

**3. 空间感**
- 利用前景、中景、背景创造层次
- 角色位置表达关系和动态
- 空间变化反映心理变化

**4. 氛围营造**
- 声音设计（即使只是描述）
- 天气和季节的选择
- 节奏和留白的控制

需要我为特定场景提供更详细的描述吗？`,
        suggestions: [
          { id: '1', type: 'action', label: '生成场景描述', icon: <Wand2 className="w-4 h-4" /> },
          { id: '2', type: 'action', label: '设计光线方案', icon: <Sparkles className="w-4 h-4" /> },
          { id: '3', type: 'action', label: '添加环境细节', icon: <Layers className="w-4 h-4" /> },
        ],
      };
      
    case 'storyboard':
      return {
        content: `分镜规划建议：

**1. 镜头语言**
- 特写：强调情感细节
- 中景：展示互动关系
- 全景：建立空间感
- 航拍：强调规模和位置

**2. 节奏控制**
- 动作片：短镜头快切
- 情感戏：长镜头留白
- 转折点：使用跳切制造冲击

**3. 运动设计**
- 推拉镜头表达关注点变化
- 摇移镜头展示空间关系
- 手持摄影增加临场感

**4. 连续性**
- 视线匹配保持流畅
- 180度规则避免混乱
- 利用动作剪辑点

你想从哪个场景开始规划分镜？`,
        suggestions: [
          { id: '1', type: 'action', label: '规划分镜序列', icon: <Clapperboard className="w-4 h-4" /> },
          { id: '2', type: 'action', label: '设计镜头运动', icon: <Film className="w-4 h-4" /> },
          { id: '3', type: 'action', label: '分析节奏', icon: <Layers className="w-4 h-4" /> },
        ],
      };
      
    default:
      return {
        content: `好的，我来帮你思考这个问题。

根据你提到的"${userMessage.slice(0, 50)}..."，我有以下建议：

**创意方向**
1. 考虑加入意想不到的元素
2. 深挖角色的内心世界
3. 利用对比创造张力

**实施建议**
- 先从局部开始，再完善整体
- 保持灵活，随时调整
- 不要害怕推翻重来

需要我提供更具体的帮助吗？你可以：
- 让我帮你生成具体内容
- 提供多个方案供选择
- 评审你已有的内容

`,
        suggestions: [
          { id: '1', type: 'action', label: '生成创意内容', icon: <Sparkles className="w-4 h-4" /> },
          { id: '2', type: 'action', label: '提供多个方案', icon: <Layers className="w-4 h-4" /> },
          { id: '3', type: 'action', label: '深入分析', icon: <Lightbulb className="w-4 h-4" /> },
        ],
      };
  }
}

// ==================== AI 助手面板组件 ====================

interface AIAssistantPanelProps {
  mode?: AssistantMode;
  onModeChange?: (mode: AssistantMode) => void;
  onApplyContent?: (content: string, type: 'script' | 'character' | 'scene') => void;
  context?: {
    currentScript?: string;
    characters?: string[];
    scenes?: string[];
    projectName?: string;
  };
  className?: string;
}

export function AIAssistantPanel({
  mode: initialMode = 'chat',
  onModeChange,
  onApplyContent,
  context,
  className,
}: AIAssistantPanelProps) {
  const [mode, setMode] = useState<AssistantMode>(initialMode);
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { messages, isLoading, error, sendMessage, clearMessages, regenerateResponse } = useAIChat({
    mode,
    context,
  });
  
  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 处理模式变化
  const handleModeChange = (newMode: AssistantMode) => {
    setMode(newMode);
    onModeChange?.(newMode);
  };
  
  // 发送消息
  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
    setShowPresets(false);
  }, [input, isLoading, sendMessage]);
  
  // 键盘发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // 复制消息
  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  
  // 应用内容
  const handleApply = (content: string) => {
    onApplyContent?.(content, mode === 'script' ? 'script' : mode === 'character' ? 'character' : 'scene');
  };
  
  return (
    <Card className={cn('flex flex-col border-border/50 bg-card/80 backdrop-blur-sm', className)}>
      {/* 头部 */}
      <CardHeader className="pb-2 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', MODE_CONFIG[mode].bgClass)}>
              <Bot className={cn('w-5 h-5', MODE_CONFIG[mode].colorClass)} />
            </div>
            <CardTitle className="text-lg">AI 创作助手</CardTitle>
            <Badge variant="secondary" className={cn('text-xs gap-1', MODE_CONFIG[mode].colorClass)}>
              {MODE_CONFIG[mode].icon}
              <span className="ml-1">{MODE_CONFIG[mode].label}</span>
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            {/* 模式选择 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                <DropdownMenuLabel>选择模式</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(MODE_CONFIG) as AssistantMode[]).map(m => (
                  <DropdownMenuItem
                    key={m}
                    onClick={() => handleModeChange(m)}
                    className={cn(mode === m && 'bg-muted')}
                  >
                    <span className="mr-2">{MODE_CONFIG[m].icon}</span>
                    {MODE_CONFIG[m].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* 展开/收起 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted/50"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* 内容区域 */}
      {isExpanded && (
        <>
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            {/* 预设快捷按钮 */}
            {showPresets && messages.length === 0 && (
              <div className="px-4 pb-4">
                <div className="text-xs text-muted-foreground mb-2">快速开始</div>
                <div className="flex flex-wrap gap-2">
                  {ASSISTANT_PRESETS.filter(p => p.mode === mode).map(preset => (
                    <Button
                      key={preset.id}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInput(preset.prompt);
                        setShowPresets(false);
                      }}
                      className="h-8 text-xs"
                    >
                      {preset.icon}
                      <span className="ml-1">{preset.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 消息列表 */}
            <ScrollArea className="flex-1 px-4" style={{ maxHeight: '400px' }}>
              <div className="space-y-4 pb-4">
                {messages.map(message => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onCopy={handleCopy}
                    onApply={handleApply}
                    copiedId={copiedId}
                    mode={mode}
                  />
                ))}
                
                {isLoading && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        思考中...
                      </div>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {/* 输入区域 */}
            <div className="p-4 border-t border-border/30">
              <div className="flex gap-2">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`输入你的问题，或者选择上面的快捷按钮...`}
                  className="min-h-[80px] resize-none bg-panel border-border/50 focus:border-primary/50"
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {messages.length > 0 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearMessages}
                        className="h-8 text-xs"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        清空
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={regenerateResponse}
                        disabled={isLoading || messages.length === 0}
                        className="h-8 text-xs"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        重新生成
                      </Button>
                    </>
                  )}
                </div>
                
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  发送
                </Button>
              </div>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}

// ==================== 消息气泡组件 ====================

interface MessageBubbleProps {
  message: AssistantMessage;
  onCopy: (content: string, id: string) => void;
  onApply: (content: string) => void;
  copiedId: string | null;
  mode: AssistantMode;
}

function MessageBubble({ message, onCopy, onApply, copiedId, mode }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      {/* 头像 */}
      <div className={cn(
        'p-2 rounded-full flex-shrink-0',
        isUser ? 'bg-primary/10' : 'bg-muted'
      )}>
        {isUser ? (
          <div className="w-5 h-5 flex items-center justify-center text-sm font-medium">U</div>
        ) : (
          <Bot className="w-5 h-5" />
        )}
      </div>
      
      {/* 内容 */}
      <div className={cn('flex-1 max-w-[80%]', isUser && 'max-w-[80%]')}>
        <div className={cn(
          'rounded-lg p-3',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          {/* 格式化内容 */}
          <div className={cn(
            'text-sm whitespace-pre-wrap',
            isUser ? '' : 'prose prose-sm dark:prose-invert max-w-none'
          )}>
            {formatMessageContent(message.content)}
          </div>
        </div>
        
        {/* 操作按钮 */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onCopy(message.content, message.id)}
                  >
                    {copiedId === message.id ? (
                      <Check className="w-3 h-3 mr-1" />
                    ) : (
                      <Copy className="w-3 h-3 mr-1" />
                    )}
                    复制
                  </Button>
                </TooltipTrigger>
                <TooltipContent>复制内容</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onApply(message.content)}
                  >
                    <WandSparkles className="w-3 h-3 mr-1" />
                    应用
                  </Button>
                </TooltipTrigger>
                <TooltipContent>应用到{mode === 'script' ? '剧本' : mode === 'character' ? '角色' : '场景'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <span className="text-xs text-muted-foreground ml-auto">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        )}
        
        {/* 建议操作 */}
        {message.suggestions && message.suggestions.length > 0 && !isUser && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.suggestions.map(suggestion => (
              <Button
                key={suggestion.id}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={suggestion.action}
              >
                {suggestion.icon}
                <span className="ml-1">{suggestion.label}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 格式化消息内容 ====================

function formatMessageContent(content: string): React.ReactNode {
  // 简单的 Markdown 风格格式化
  const lines = content.split('\n');
  
  return lines.map((line, i) => {
    // 标题
    if (line.startsWith('**') && line.endsWith('**')) {
      return (
        <p key={i} className="font-bold mt-2 mb-1">
          {line.replace(/\*\*/g, '')}
        </p>
      );
    }
    
    // 列表项
    if (line.match(/^[-*]\s/)) {
      return (
        <li key={i} className="ml-4">
          {line.replace(/^[-*]\s/, '')}
        </li>
      );
    }
    
    // 数字列表
    if (line.match(/^\d+\.\s/)) {
      return (
        <li key={i} className="ml-4 list-decimal">
          {line.replace(/^\d+\.\s/, '')}
        </li>
      );
    }
    
    // 空行
    if (!line.trim()) {
      return <br key={i} />;
    }
    
    // 普通文本
    return (
      <span key={i}>
        {line}
        <br />
      </span>
    );
  });
}

// ==================== 浮动 AI 助手按钮 ====================

interface FloatingAssistantButtonProps {
  onClick: () => void;
  unreadCount?: number;
  className?: string;
}

export function FloatingAssistantButton({ onClick, unreadCount = 0, className }: FloatingAssistantButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            size="icon"
            className={cn(
              'h-12 w-12 rounded-full shadow-lg',
              'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
              'relative',
              className
            )}
          >
            <Bot className="w-6 h-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>打开 AI 助手</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ==================== AI 助手对话框 ====================

interface AIAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: AssistantMode;
  context?: Record<string, any>;
}

export function AIAssistantDialog({
  open,
  onOpenChange,
  mode,
  context,
}: AIAssistantDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>AI 创作助手</DialogTitle>
        </DialogHeader>
        <AIAssistantPanel
          mode={mode}
          context={context}
          className="border-0 rounded-none"
        />
      </DialogContent>
    </Dialog>
  );
}
