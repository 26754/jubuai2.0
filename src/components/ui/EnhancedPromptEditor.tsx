"use client";

/**
 * EnhancedPromptEditor - 增强版提示词编辑器
 * 支持正负提示词、模板、批量操作、智能优化
 */

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Copy,
  Sparkles,
  Wand2,
  Save,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertTriangle,
  Lightbulb,
  History,
  Tags,
  Edit3,
  Eye,
  EyeOff,
  RefreshCw,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ==================== 类型定义 ====================

export interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  negativePrompt?: string;
  tags?: string[];
  createdAt: number;
}

export interface PromptHistory {
  id: string;
  timestamp: number;
  prompt: string;
  negativePrompt?: string;
  model?: string;
}

export interface EnhancedPromptEditorProps {
  /** 正向提示词 */
  prompt: string;
  onPromptChange: (prompt: string) => void;
  /** 负向提示词 */
  negativePrompt?: string;
  onNegativePromptChange?: (prompt: string) => void;
  /** 是否显示负向提示词编辑 */
  showNegativePrompt?: boolean;
  /** 语言偏好 */
  language?: "zh" | "en" | "zh+en";
  onLanguageChange?: (lang: "zh" | "en" | "zh+en") => void;
  /** 是否只读模式 */
  readOnly?: boolean;
  /** 额外操作按钮 */
  extraActions?: React.ReactNode;
  /** 最大历史记录数 */
  maxHistory?: number;
  /** 提示词模板 */
  templates?: PromptTemplate[];
  onSaveTemplate?: (template: PromptTemplate) => void;
  /** 类名 */
  className?: string;
}

// ==================== 默认负面提示词 ====================

const DEFAULT_NEGATIVE_PROMPTS = {
  zh: "低质量,模糊,变形,残缺,缺齿,歪牙,扭曲的手指,多余的手指,多余的四肢,融合,残缺的人,不成比例的,变形,丑,糟糕的解剖,糟糕的手,糟糕的脚,模糊的,噪点,噪点过多,艺术错误,错误的解剖,错误的手部,错误的脚部,错误的眼睛,多余的手指,歪斜的眼睛,不对称的瞳孔,错误的面部比例,死鱼眼,卡通,动漫,写实,摄影",
  en: "low quality, blurry, deformed, missing fingers, extra limbs, bad anatomy, bad hands, bad feet, bad eyes, asymmetric pupils, wrong facial proportions, dead fish eyes, cartoon, anime, cgi, 3d render, illustration, painting, drawing,artifacts, noise, distortion, watermark, signature, text, logo",
};

// ==================== 预设模板 ====================

const PRESET_TEMPLATES: PromptTemplate[] = [
  {
    id: "realistic-portrait",
    name: "写实人像",
    prompt: "photorealistic portrait, detailed skin texture, natural lighting, studio lighting, 8k, high resolution",
    negativePrompt: DEFAULT_NEGATIVE_PROMPTS.en,
    tags: ["写实", "人像"],
    createdAt: Date.now(),
  },
  {
    id: "anime-style",
    name: "动漫风格",
    prompt: "anime style, vibrant colors, clean lineart, cel shading, high quality anime art",
    negativePrompt: "realistic, photograph, 3d render, low quality",
    tags: ["动漫", "风格"],
    createdAt: Date.now(),
  },
  {
    id: "cinematic",
    name: "电影感",
    prompt: "cinematic lighting, dramatic atmosphere, film grain, anamorphic lens, movie still",
    negativePrompt: "cartoon, anime, illustration, low quality, blurry",
    tags: ["电影", "氛围"],
    createdAt: Date.now(),
  },
  {
    id: "detailed-face",
    name: "精致五官",
    prompt: "detailed facial features, intricate eyes, detailed skin pores, hyperrealistic, perfect anatomy",
    negativePrompt: "deformed, blurry, bad anatomy, misshapen, ugly, disfigured",
    tags: ["细节", "五官"],
    createdAt: Date.now(),
  },
];

// ==================== 提示词片段库 ====================

const PROMPT_SNIPPETS = {
  quality: [
    { label: "高质量", snippet: "high quality, best quality, masterpiece" },
    { label: "8K清晰", snippet: "8k, ultra detailed, sharp focus" },
    { label: "专业摄影", snippet: "professional photography, studio lighting" },
    { label: "RAW照片", snippet: "RAW photo, unprocessed, original" },
  ],
  lighting: [
    { label: "自然光", snippet: "natural lighting, soft light" },
    { label: "戏剧光", snippet: "dramatic lighting, chiaroscuro" },
    { label: "逆光", snippet: "backlit, rim light, silhouette" },
    { label: "棚拍光", snippet: "studio lighting, professional light setup" },
  ],
  style: [
    { label: "写实", snippet: "photorealistic, realistic photography" },
    { label: "半写实", snippet: "semi-realistic, stylized realism" },
    { label: "厚涂", snippet: "painterly, oil painting style, impasto" },
    { label: "水彩", snippet: "watercolor style, soft edges" },
  ],
  camera: [
    { label: "特写", snippet: "close-up shot, close up view" },
    { label: "中景", snippet: "medium shot, waist up" },
    { label: "全景", snippet: "full body shot, wide shot" },
    { label: "长焦", snippet: "telephoto lens, shallow depth of field" },
  ],
};

// ==================== 组件 ====================

export function EnhancedPromptEditor({
  prompt,
  onPromptChange,
  negativePrompt = "",
  onNegativePromptChange,
  showNegativePrompt = true,
  language = "zh",
  onLanguageChange,
  readOnly = false,
  extraActions,
  maxHistory = 20,
  templates = PRESET_TEMPLATES,
  onSaveTemplate,
  className = "",
}: EnhancedPromptEditorProps) {
  // 状态
  const [localPrompt, setLocalPrompt] = useState(prompt);
  const [localNegativePrompt, setLocalNegativePrompt] = useState(negativePrompt);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [history, setHistory] = useState<PromptHistory[]>([]);
  const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 同步外部提示词
  useMemo(() => {
    setLocalPrompt(prompt);
  }, [prompt]);

  useMemo(() => {
    setLocalNegativePrompt(negativePrompt);
  }, [negativePrompt]);

  // 添加到历史记录
  const addToHistory = useCallback(() => {
    const newEntry: PromptHistory = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      prompt: localPrompt,
      negativePrompt: localNegativePrompt,
    };
    setHistory((prev) => {
      const updated = [newEntry, ...prev].slice(0, maxHistory);
      return updated;
    });
    setHistoryIndex(-1);
  }, [localPrompt, localNegativePrompt, maxHistory]);

  // 撤销
  const undo = useCallback(() => {
    if (history.length === 0) return;
    const newIndex = historyIndex === -1 ? 0 : historyIndex + 1;
    if (newIndex < history.length) {
      setHistoryIndex(newIndex);
      const entry = history[newIndex];
      setLocalPrompt(entry.prompt);
      setLocalNegativePrompt(entry.negativePrompt || "");
    }
  }, [history, historyIndex]);

  // 重做
  const redo = useCallback(() => {
    if (historyIndex === -1) return;
    const newIndex = historyIndex - 1;
    if (newIndex >= 0) {
      setHistoryIndex(newIndex);
      const entry = history[newIndex];
      setLocalPrompt(entry.prompt);
      setLocalNegativePrompt(entry.negativePrompt || "");
    } else {
      setHistoryIndex(-1);
      setLocalPrompt(prompt);
      setLocalNegativePrompt(negativePrompt);
    }
  }, [historyIndex, history, prompt, negativePrompt]);

  // 应用模板
  const applyTemplate = useCallback(
    (template: PromptTemplate) => {
      addToHistory();
      setLocalPrompt(template.prompt);
      if (template.negativePrompt) {
        setLocalNegativePrompt(template.negativePrompt);
      }
      setShowTemplates(false);
      toast.success(`已应用模板: ${template.name}`);
    },
    [addToHistory]
  );

  // 保存为模板
  const saveAsTemplate = useCallback(() => {
    if (!templateName.trim()) {
      toast.error("请输入模板名称");
      return;
    }
    const newTemplate: PromptTemplate = {
      id: `custom-${Date.now()}`,
      name: templateName,
      prompt: localPrompt,
      negativePrompt: localNegativePrompt,
      createdAt: Date.now(),
    };
    setCustomTemplates((prev) => [...prev, newTemplate]);
    onSaveTemplate?.(newTemplate);
    setEditingTemplate(null);
    setTemplateName("");
    toast.success("模板已保存");
  }, [templateName, localPrompt, localNegativePrompt, onSaveTemplate]);

  // 删除模板
  const deleteTemplate = useCallback((templateId: string) => {
    setCustomTemplates((prev) => prev.filter((t) => t.id !== templateId));
    toast.success("模板已删除");
  }, []);

  // 插入片段
  const insertSnippet = useCallback(
    (snippet: string) => {
      setLocalPrompt((prev) => (prev ? `${prev}, ${snippet}` : snippet));
      setShowSnippets(false);
    },
    []
  );

  // 应用更改
  const applyChanges = useCallback(() => {
    addToHistory();
    onPromptChange(localPrompt);
    onNegativePromptChange?.(localNegativePrompt);
  }, [addToHistory, onPromptChange, onNegativePromptChange, localPrompt, localNegativePrompt]);

  // 复制到剪贴板
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  }, []);

  // 重置为默认
  const resetToDefault = useCallback(() => {
    addToHistory();
    setLocalPrompt("");
    setLocalNegativePrompt(language === "en" ? DEFAULT_NEGATIVE_PROMPTS.en : DEFAULT_NEGATIVE_PROMPTS.zh);
  }, [addToHistory, language]);

  const allTemplates = [...PRESET_TEMPLATES, ...customTemplates];

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        {/* 工具栏 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 语言切换 */}
          {onLanguageChange && (
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              {(["zh", "en", "zh+en"] as const).map((lang) => (
                <Button
                  key={lang}
                  size="sm"
                  variant={language === lang ? "secondary" : "ghost"}
                  className="h-7 text-xs px-2"
                  onClick={() => onLanguageChange(lang)}
                >
                  {lang === "zh" ? "中文" : lang === "en" ? "English" : "双语"}
                </Button>
              ))}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={() => setShowSnippets(!showSnippets)}>
                  <Tags className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>提示词片段</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={() => setShowTemplates(!showTemplates)}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>模板管理</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={() => setShowHistory(!showHistory)}>
                  <History className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>历史记录</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={() => setShowAdvanced(!showAdvanced)}>
                  {showAdvanced ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showAdvanced ? "收起高级" : "展开高级"}</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex-1" />

          {/* 撤销/重做 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={undo} disabled={history.length === 0}>
                <Undo className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>撤销</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={redo} disabled={historyIndex === -1}>
                <Redo className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>重做</TooltipContent>
          </Tooltip>

          {/* 额外操作 */}
          {extraActions}
        </div>

        {/* 主编辑区 */}
        <div className="space-y-2">
          <div className="relative">
            <Textarea
              value={localPrompt}
              onChange={(e) => setLocalPrompt(e.target.value)}
              placeholder="输入正向提示词..."
              className="min-h-[100px] resize-y pr-20"
              readOnly={readOnly}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(localPrompt)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>复制提示词</TooltipContent>
              </Tooltip>
              {!readOnly && (
                <Button size="sm" variant="secondary" onClick={applyChanges}>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  应用
                </Button>
              )}
            </div>
          </div>

          {/* 提示词统计 */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>字符: {localPrompt.length}</span>
            <span>词汇: {localPrompt.split(/[,，]/).filter(Boolean).length}</span>
          </div>
        </div>

        {/* 负向提示词 */}
        {showNegativePrompt && onNegativePromptChange && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">负向提示词</Label>
              <Badge variant="outline" className="text-[10px]">
                避免生成
              </Badge>
            </div>
            <div className="relative">
              <Textarea
                value={localNegativePrompt}
                onChange={(e) => setLocalNegativePrompt(e.target.value)}
                placeholder="输入负向提示词..."
                className="min-h-[60px] resize-y text-muted-foreground"
                readOnly={readOnly}
              />
            </div>
          </div>
        )}

        {/* 高级选项 */}
        {showAdvanced && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">高级选项</Label>
              <Button size="sm" variant="ghost" onClick={resetToDefault}>
                <RefreshCw className="h-3 w-3 mr-1" />
                重置
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocalNegativePrompt(DEFAULT_NEGATIVE_PROMPTS.zh)}
              >
                默认中文
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocalNegativePrompt(DEFAULT_NEGATIVE_PROMPTS.en)}
              >
                默认英文
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setLocalPrompt((p) => `${p}, high quality, best quality, masterpiece`)
                }
              >
                <Sparkles className="h-3 w-3 mr-1" />
                高质量
              </Button>
            </div>
          </div>
        )}

        {/* 提示词片段抽屉 */}
        {showSnippets && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">提示词片段</Label>
              <Button size="sm" variant="ghost" onClick={() => setShowSnippets(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {Object.entries(PROMPT_SNIPPETS).map(([category, items]) => (
                <div key={category}>
                  <Label className="text-[10px] text-muted-foreground uppercase">{category}</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {items.map((item) => (
                      <Button
                        key={item.label}
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px]"
                        onClick={() => insertSnippet(item.snippet)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 模板抽屉 */}
        {showTemplates && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">提示词模板</Label>
              <Button size="sm" variant="ghost" onClick={() => setShowTemplates(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid gap-2 grid-cols-2">
              {allTemplates.map((template) => (
                <div
                  key={template.id}
                  className="rounded border bg-background p-2 space-y-1 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => applyTemplate(template)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{template.name}</span>
                    {template.id.startsWith("custom-") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplate(template.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {template.prompt.substring(0, 60)}...
                  </p>
                  {template.tags && (
                    <div className="flex gap-1">
                      {template.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[8px] h-4">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* 保存新模板 */}
            <div className="flex gap-2 pt-2 border-t">
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="新模板名称..."
                className="h-8 text-xs"
              />
              <Button size="sm" onClick={saveAsTemplate} disabled={!templateName.trim()}>
                <Save className="h-3 w-3 mr-1" />
                保存
              </Button>
            </div>
          </div>
        )}

        {/* 历史记录抽屉 */}
        {showHistory && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">历史记录</Label>
              <Button size="sm" variant="ghost" onClick={() => setShowHistory(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">暂无历史记录</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {history.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "rounded border bg-background p-2 cursor-pointer hover:bg-muted/50 transition-colors",
                      idx === historyIndex && "ring-2 ring-primary"
                    )}
                    onClick={() => {
                      setHistoryIndex(idx);
                      setLocalPrompt(entry.prompt);
                      setLocalNegativePrompt(entry.negativePrompt || "");
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs line-clamp-2">{entry.prompt.substring(0, 80)}...</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export { DEFAULT_NEGATIVE_PROMPTS, PRESET_TEMPLATES, PROMPT_SNIPPETS };
