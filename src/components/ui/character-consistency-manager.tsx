// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * Character Consistency Manager
 * 
 * 角色一致性管理器 - 支持多阶段角色和换装场景
 */

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  User,
  Clock,
  Shirt,
  Copy,
  Plus,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  ChevronRight,
  Image as ImageIcon,
  Layers,
  History,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ==================== 类型定义 ====================

/** 角色阶段 */
export interface CharacterStage {
  /** 阶段ID */
  id: string;
  /** 阶段名称 */
  name: string;
  /** 阶段描述 */
  description?: string;
  /** 年龄描述 */
  ageDescription?: string;
  /** 集数范围 */
  episodeRange: [number, number];
  /** 视觉提示词 */
  visualPrompt?: string;
  /** 参考图片 */
  referenceImages?: string[];
  /** 服装描述 */
  clothingDescription?: string;
  /** 发型描述 */
  hairstyleDescription?: string;
  /** 配饰描述 */
  accessoryDescription?: string;
  /** 状态 */
  status: "active" | "draft" | "archived";
}

/** 角色换装 */
export interface CharacterOutfit {
  /** 换装ID */
  id: string;
  /** 换装名称 */
  name: string;
  /** 换装描述 */
  description?: string;
  /** 服装类型 */
  type: "casual" | "formal" | "sports" | "sleepwear" | "costume" | "custom";
  /** 视觉提示词 */
  visualPrompt?: string;
  /** 参考图片 */
  referenceImages?: string[];
  /** 适用场景 */
  applicableScenes?: string[];
  /** 创建时间 */
  createdAt: Date;
}

/** 角色一致性配置 */
export interface CharacterConsistencyConfig {
  /** 是否启用多阶段 */
  enableStages: boolean;
  /** 是否启用换装 */
  enableOutfits: boolean;
  /** 阶段列表 */
  stages: CharacterStage[];
  /** 换装列表 */
  outfits: CharacterOutfit[];
  /** 当前阶段ID */
  currentStageId?: string;
  /** 当前换装ID */
  currentOutfitId?: string;
  /** 身份锚点 */
  identityAnchors?: {
    facialFeatures?: string;
    bodyType?: string;
    uniqueMarks?: string;
    voiceCharacteristics?: string;
    mannerisms?: string;
    colorPalette?: string;
  };
}

/** 角色阶段切换器属性 */
interface CharacterStageSwitcherProps {
  /** 角色配置 */
  config: CharacterConsistencyConfig;
  /** 当前集数 */
  currentEpisode?: number;
  /** 切换回调 */
  onSwitchStage?: (stageId: string) => void;
  /** 切换换装回调 */
  onSwitchOutfit?: (outfitId: string) => void;
  /** 添加阶段回调 */
  onAddStage?: (stage: Omit<CharacterStage, 'id'>) => void;
  /** 添加换装回调 */
  onAddOutfit?: (outfit: Omit<CharacterOutfit, 'id' | 'createdAt'>) => void;
  /** 编辑阶段回调 */
  onEditStage?: (stage: CharacterStage) => void;
  /** 编辑换装回调 */
  onEditOutfit?: (outfit: CharacterOutfit) => void;
  /** 删除阶段回调 */
  onDeleteStage?: (stageId: string) => void;
  /** 删除换装回调 */
  onDeleteOutfit?: (outfitId: string) => void;
}

// ==================== 阶段切换器 ====================

function CharacterStageSwitcher({
  config,
  currentEpisode,
  onSwitchStage,
  onAddStage,
  onEditStage,
  onDeleteStage,
}: CharacterStageSwitcherProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // 根据当前集数自动推荐阶段
  const recommendedStage = config.stages.find(
    stage => currentEpisode && 
    currentEpisode >= stage.episodeRange[0] && 
    currentEpisode <= stage.episodeRange[1]
  );
  
  // 当前阶段
  const currentStage = config.stages.find(s => s.id === config.currentStageId);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">角色阶段</CardTitle>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7">
                <Plus className="h-3 w-3 mr-1" />
                添加
              </Button>
            </DialogTrigger>
            <AddStageDialog
              onAdd={(stage) => {
                onAddStage?.(stage);
                setShowAddDialog(false);
              }}
              onCancel={() => setShowAddDialog(false)}
            />
          </Dialog>
        </div>
        {currentEpisode && (
          <CardDescription className="text-xs">
            当前第 {currentEpisode} 集
            {recommendedStage && (
              <span className="text-primary ml-1">
                → 推荐「{recommendedStage.name}」
              </span>
            )}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {/* 阶段列表 */}
        <ScrollArea className="h-[120px]">
          <div className="space-y-1">
            {config.stages.map(stage => (
              <div
                key={stage.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all",
                  stage.id === config.currentStageId
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted"
                )}
                onClick={() => onSwitchStage?.(stage.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{stage.name}</span>
                    {currentEpisode && 
                      currentEpisode >= stage.episodeRange[0] && 
                      currentEpisode <= stage.episodeRange[1] && (
                      <Badge variant="secondary" className="text-[10px]">当前</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    第{stage.episodeRange[0]}-{stage.episodeRange[1]}集
                    {stage.ageDescription && ` · ${stage.ageDescription}`}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditStage?.(stage);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteStage?.(stage.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {config.stages.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            暂无阶段信息
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 换装选择器 ====================

function CharacterOutfitSelector({
  config,
  onSwitchOutfit,
  onAddOutfit,
  onEditOutfit,
  onDeleteOutfit,
}: CharacterStageSwitcherProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  
  const currentOutfit = config.outfits.find(o => o.id === config.currentOutfitId);
  
  // 按类型分组
  const outfitsByType = config.outfits.reduce((acc, outfit) => {
    if (!acc[outfit.type]) acc[outfit.type] = [];
    acc[outfit.type].push(outfit);
    return acc;
  }, {} as Record<string, CharacterOutfit[]>);
  
  // 过滤后的换装列表
  const filteredOutfits = selectedType === "all" 
    ? config.outfits 
    : outfitsByType[selectedType] || [];
  
  const outfitTypes = [
    { value: "all", label: "全部" },
    { value: "casual", label: "日常" },
    { value: "formal", label: "正装" },
    { value: "sports", label: "运动" },
    { value: "sleepwear", label: "睡衣" },
    { value: "costume", label: "戏服" },
    { value: "custom", label: "自定义" },
  ];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shirt className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">角色换装</CardTitle>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7">
                <Plus className="h-3 w-3 mr-1" />
                添加
              </Button>
            </DialogTrigger>
            <AddOutfitDialog
              onAdd={(outfit) => {
                onAddOutfit?.(outfit);
                setShowAddDialog(false);
              }}
              onCancel={() => setShowAddDialog(false)}
            />
          </Dialog>
        </div>
        {currentOutfit && (
          <CardDescription className="text-xs">
            当前: <span className="text-primary">{currentOutfit.name}</span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {/* 类型筛选 */}
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {outfitTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* 换装列表 */}
        <ScrollArea className="h-[100px]">
          <div className="grid grid-cols-2 gap-2">
            {filteredOutfits.map(outfit => (
              <div
                key={outfit.id}
                className={cn(
                  "p-2 rounded-lg border cursor-pointer transition-all",
                  outfit.id === config.currentOutfitId
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted border-muted"
                )}
                onClick={() => onSwitchOutfit?.(outfit.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{outfit.name}</span>
                  {outfit.id === config.currentOutfitId && (
                    <Check className="h-3 w-3 text-primary shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {outfitTypes.find(t => t.value === outfit.type)?.label || outfit.type}
                  </Badge>
                </div>
                <div className="flex gap-1 mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditOutfit?.(outfit);
                    }}
                  >
                    <Edit2 className="h-2 w-2" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteOutfit?.(outfit.id);
                    }}
                  >
                    <Trash2 className="h-2 w-2" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {filteredOutfits.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            暂无换装
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 添加阶段对话框 ====================

function AddStageDialog({
  onAdd,
  onCancel,
}: {
  onAdd: (stage: Omit<CharacterStage, 'id'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ageDescription, setAgeDescription] = useState("");
  const [startEpisode, setStartEpisode] = useState("1");
  const [endEpisode, setEndEpisode] = useState("10");
  
  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("请输入阶段名称");
      return;
    }
    
    onAdd({
      name: name.trim(),
      description: description.trim() || undefined,
      ageDescription: ageDescription.trim() || undefined,
      episodeRange: [parseInt(startEpisode), parseInt(endEpisode)],
      status: "active",
    });
  };
  
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>添加角色阶段</DialogTitle>
        <DialogDescription>
          添加角色的不同人生阶段，如童年、少年、成年等
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm">阶段名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：童年、少年、成年、老年"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm">年龄描述</label>
          <input
            type="text"
            value={ageDescription}
            onChange={(e) => setAgeDescription(e.target.value)}
            placeholder="如：7-12岁、25-30岁"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-sm">起始集数</label>
            <input
              type="number"
              value={startEpisode}
              onChange={(e) => setStartEpisode(e.target.value)}
              min="1"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm">结束集数</label>
            <input
              type="number"
              value={endEpisode}
              onChange={(e) => setEndEpisode(e.target.value)}
              min="1"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm">阶段描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述这个阶段的特点..."
            className="w-full px-3 py-2 border rounded-md min-h-[80px]"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button onClick={handleSubmit}>添加</Button>
        </div>
      </div>
    </DialogContent>
  );
}

// ==================== 添加换装对话框 ====================

function AddOutfitDialog({
  onAdd,
  onCancel,
}: {
  onAdd: (outfit: Omit<CharacterOutfit, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CharacterOutfit['type']>("casual");
  const [visualPrompt, setVisualPrompt] = useState("");
  
  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("请输入换装名称");
      return;
    }
    
    onAdd({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      visualPrompt: visualPrompt.trim() || undefined,
      createdAt: new Date(),
    });
  };
  
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>添加角色换装</DialogTitle>
        <DialogDescription>
          添加角色的不同服装造型
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm">换装名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：校服、西装、休闲装"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm">服装类型</label>
          <Select value={type} onValueChange={(v) => setType(v as CharacterOutfit['type'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="casual">日常</SelectItem>
              <SelectItem value="formal">正装</SelectItem>
              <SelectItem value="sports">运动</SelectItem>
              <SelectItem value="sleepwear">睡衣</SelectItem>
              <SelectItem value="costume">戏服</SelectItem>
              <SelectItem value="custom">自定义</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm">换装描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述这套服装的特点..."
            className="w-full px-3 py-2 border rounded-md min-h-[80px]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm">视觉提示词</label>
          <textarea
            value={visualPrompt}
            onChange={(e) => setVisualPrompt(e.target.value)}
            placeholder="用于生成图片的提示词..."
            className="w-full px-3 py-2 border rounded-md min-h-[60px]"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button onClick={handleSubmit}>添加</Button>
        </div>
      </div>
    </DialogContent>
  );
}

// ==================== 主组件 ====================

export function CharacterConsistencyManager({
  config,
  currentEpisode,
  onSwitchStage,
  onSwitchOutfit,
  onAddStage,
  onAddOutfit,
  onEditStage,
  onEditOutfit,
  onDeleteStage,
  onDeleteOutfit,
}: CharacterStageSwitcherProps) {
  const [activeTab, setActiveTab] = useState<"stages" | "outfits">("stages");
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <CardTitle>角色一致性管理</CardTitle>
        </div>
        <CardDescription>
          管理角色的不同人生阶段和换装造型
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "stages" | "outfits")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stages" className="gap-1">
              <Clock className="h-3 w-3" />
              阶段
            </TabsTrigger>
            <TabsTrigger value="outfits" className="gap-1">
              <Shirt className="h-3 w-3" />
              换装
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="stages" className="mt-3">
            <CharacterStageSwitcher
              config={config}
              currentEpisode={currentEpisode}
              onSwitchStage={onSwitchStage}
              onAddStage={onAddStage}
              onEditStage={onEditStage}
              onDeleteStage={onDeleteStage}
            />
          </TabsContent>
          
          <TabsContent value="outfits" className="mt-3">
            <CharacterOutfitSelector
              config={config}
              onSwitchOutfit={onSwitchOutfit}
              onAddOutfit={onAddOutfit}
              onEditOutfit={onEditOutfit}
              onDeleteOutfit={onDeleteOutfit}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ==================== 导出 ====================

export type { CharacterStage, CharacterOutfit, CharacterConsistencyConfig };
