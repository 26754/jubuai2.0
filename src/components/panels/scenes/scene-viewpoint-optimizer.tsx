// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * Scene Viewpoint Optimization Component
 * 
 * 场景多视角优化组件 - AI自动分析最佳视角数量和位置，提供命名建议
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Camera,
  Sparkles,
  Grid3x3,
  Info,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lightbulb,
  Layers,
  Eye,
} from 'lucide-react';

import {
  analyzeSceneViewpoints,
  suggestViewpointNames,
  validateViewpointConfiguration,
  type ViewpointAnalysisResult,
  type ViewpointSuggestion,
} from '@/lib/script/scene-viewpoint-analyzer';

import type { ScriptScene, SceneViewpoint } from '@/types/script';

interface SceneViewpointOptimizerProps {
  /** 场景数据 */
  scene: ScriptScene;
  /** 当前视角列表 */
  viewpoints: SceneViewpoint[];
  /** 网格布局 */
  gridLayout?: { rows: number; cols: number };
  /** 是否可见 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 应用建议回调 */
  onApplySuggestions: (
    viewpoints: SceneViewpoint[],
    gridLayout: { rows: number; cols: number }
  ) => void;
  /** 场景类型（可选，用于特定场景优化） */
  sceneType?: string;
}

// 视角卡片组件
function ViewpointCard({
  suggestion,
  index,
  isSelected,
  onSelect,
}: {
  suggestion: ViewpointSuggestion;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`
        relative p-4 rounded-lg border cursor-pointer transition-all
        ${isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }
      `}
      onClick={onSelect}
    >
      {/* 网格位置指示器 */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <Badge variant="outline" className="text-xs">
          <Grid3x3 className="w-3 h-3 mr-1" />
          {suggestion.gridPosition.row + 1},{suggestion.gridPosition.col + 1}
        </Badge>
        <Badge
          variant={suggestion.confidence >= 0.7 ? 'default' : 'secondary'}
          className="text-xs"
        >
          {Math.round(suggestion.confidence * 100)}%
        </Badge>
      </div>

      {/* 视角信息 */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Camera className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{suggestion.name}</h4>
            <p className="text-xs text-muted-foreground">{suggestion.nameEn}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2">
          {suggestion.description}
        </p>

        {/* 关键道具 */}
        {suggestion.keyProps && suggestion.keyProps.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {suggestion.keyProps.slice(0, 3).map((prop, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {prop}
              </Badge>
            ))}
            {suggestion.keyProps.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{suggestion.keyProps.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* 优先级指示 */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">优先级</span>
          <Progress value={suggestion.priority * 10} className="flex-1 h-1" />
        </div>
      </div>

      {/* 选中指示 */}
      {isSelected && (
        <div className="absolute -top-2 -right-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
        </div>
      )}
    </div>
  );
}

// 网格预览组件
function GridPreview({
  viewpoints,
  gridLayout,
  onSelectViewpoint,
  selectedIndices,
}: {
  viewpoints: ViewpointSuggestion[];
  gridLayout: { rows: number; cols: number };
  onSelectViewpoint: (index: number) => void;
  selectedIndices: number[];
}) {
  const cells: (ViewpointSuggestion | null)[][] = Array.from({ length: gridLayout.rows }, () =>
    Array.from({ length: gridLayout.cols }, () => null)
  );

  // 填充网格
  viewpoints.forEach((vp, index) => {
    const { row, col } = vp.gridPosition;
    if (row < gridLayout.rows && col < gridLayout.cols) {
      cells[row][col] = vp;
    }
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Grid3x3 className="w-4 h-4" />
        <span className="text-sm font-medium">网格预览</span>
        <span className="text-xs text-muted-foreground">
          ({gridLayout.rows}x{gridLayout.cols})
        </span>
      </div>
      <div
        className="grid gap-2 p-4 rounded-lg bg-muted/30"
        style={{
          gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
          gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
        }}
      >
        {cells.flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`
                aspect-square rounded-md border-2 border-dashed flex items-center justify-center
                transition-all cursor-pointer
                ${cell
                  ? selectedIndices.includes(viewpoints.indexOf(cell))
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary/50'
                  : 'border-muted-foreground/20'
                }
              `}
              onClick={() => {
                if (cell) {
                  onSelectViewpoint(viewpoints.indexOf(cell));
                }
              }}
            >
              {cell ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center p-1">
                      <Eye className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-xs font-medium line-clamp-1">
                        {cell.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{cell.nameEn}</p>
                    <p className="text-xs text-muted-foreground">
                      {cell.description}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="text-xs text-muted-foreground">空</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function SceneViewpointOptimizer({
  scene,
  viewpoints,
  gridLayout = { rows: 2, cols: 3 },
  open,
  onClose,
  onApplySuggestions,
  sceneType,
}: SceneViewpointOptimizerProps) {
  // 状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ViewpointAnalysisResult | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<string>('suggestions');

  // 分析场景视角
  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSceneViewpoints(scene, {
        minViewpoints: 3,
        maxViewpoints: 6,
        priorities: ['props', 'characters', 'atmosphere'],
      });
      setAnalysisResult(result);
      setSelectedIndices(result.viewpoints.map((_, i) => i));
    } catch (error) {
      console.error('[SceneViewpointOptimizer] Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [scene]);

  // 切换视角选择
  const toggleViewpointSelection = useCallback((index: number) => {
    setSelectedIndices(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  }, []);

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (!analysisResult) return;
    if (selectedIndices.length === analysisResult.viewpoints.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(analysisResult.viewpoints.map((_, i) => i));
    }
  }, [analysisResult, selectedIndices]);

  // 应用建议
  const handleApply = useCallback(() => {
    if (!analysisResult) return;

    const selectedViewpoints = analysisResult.viewpoints
      .filter((_, i) => selectedIndices.includes(i))
      .map((suggestion, index) => ({
        id: `vp-${Date.now()}-${index}`,
        name: suggestion.name,
        nameEn: suggestion.nameEn,
        description: suggestion.description,
        gridIndex: suggestion.gridPosition,
        keyProps: suggestion.keyProps,
        prompt: '',
        imageUrl: '',
        stylePreset: '',
        lightingPreset: '',
        cameraPreset: '',
      }));

    onApplySuggestions(selectedViewpoints, analysisResult.gridLayout);
    onClose();
  }, [analysisResult, selectedIndices, onApplySuggestions, onClose]);

  // 加载时自动分析
  React.useEffect(() => {
    if (open && !analysisResult && !isAnalyzing) {
      handleAnalyze();
    }
  }, [open, analysisResult, isAnalyzing, handleAnalyze]);

  // 获取验证结果
  const validation = analysisResult
    ? validateViewpointConfiguration(
        analysisResult.viewpoints.map((vp, i) => ({
          id: `vp-${i}`,
          name: vp.name,
          nameEn: vp.nameEn,
          description: vp.description,
          gridIndex: vp.gridPosition,
          keyProps: vp.keyProps,
          prompt: '',
          imageUrl: '',
          stylePreset: '',
          lightingPreset: '',
          cameraPreset: '',
        })),
        analysisResult.gridLayout
      )
    : null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            场景多视角优化
          </DialogTitle>
          <DialogDescription>
            AI 自动分析场景内容，推荐最佳的多视角配置和命名建议
          </DialogDescription>
        </DialogHeader>

        {/* 场景信息 */}
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">场景：</span>
                <span className="font-medium">{scene.name || '未命名'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">地点：</span>
                <span>{scene.location}</span>
              </div>
              {scene.time && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">时间：</span>
                  <span>{scene.time}</span>
                </div>
              )}
              {scene.atmosphere && (
                <Badge variant="outline">{scene.atmosphere}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 分析状态 */}
        {isAnalyzing && (
          <Card>
            <CardContent className="p-6 flex flex-col items-center gap-4">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">正在分析场景...</p>
                <p className="text-sm text-muted-foreground">
                  AI 正在分析场景内容，推荐最佳视角配置
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 分析结果 */}
        {analysisResult && !isAnalyzing && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="suggestions" className="gap-1">
                <Sparkles className="w-4 h-4" />
                视角建议
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1">
                <Grid3x3 className="w-4 h-4" />
                网格预览
              </TabsTrigger>
              <TabsTrigger value="validation" className="gap-1">
                <Info className="w-4 h-4" />
                验证结果
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              {/* 视角建议 */}
              <TabsContent value="suggestions" className="m-0 space-y-4">
                {/* 概览 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        推荐 {analysisResult.recommendedCount} 个视角
                      </span>
                    </div>
                    <Badge variant="outline">
                      {analysisResult.sceneType}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedIndices.length === analysisResult.viewpoints.length
                      ? '取消全选'
                      : '全选'}
                  </Button>
                </div>

                {/* 视角卡片列表 */}
                <div className="grid grid-cols-2 gap-4">
                  {analysisResult.viewpoints.map((suggestion, index) => (
                    <ViewpointCard
                      key={index}
                      suggestion={suggestion}
                      index={index}
                      isSelected={selectedIndices.includes(index)}
                      onSelect={() => toggleViewpointSelection(index)}
                    />
                  ))}
                </div>

                {/* 说明 */}
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">分析说明</p>
                        <p className="text-muted-foreground">
                          {analysisResult.explanation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 网格预览 */}
              <TabsContent value="preview" className="m-0">
                <GridPreview
                  viewpoints={analysisResult.viewpoints}
                  gridLayout={analysisResult.gridLayout}
                  onSelectViewpoint={toggleViewpointSelection}
                  selectedIndices={selectedIndices}
                />

                {/* 选中视角详情 */}
                {selectedIndices.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium">已选视角</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedIndices.map(index => {
                        const vp = analysisResult.viewpoints[index];
                        return (
                          <Badge key={index} variant="default" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {vp.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* 验证结果 */}
              <TabsContent value="validation" className="m-0 space-y-4">
                {validation && (
                  <>
                    {/* 警告 */}
                    {validation.warnings.length > 0 && (
                      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertCircle className="w-4 h-4" />
                            建议
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {validation.warnings.map((warning, i) => (
                              <li key={i} className="text-sm text-amber-700 dark:text-amber-400">
                                • {warning}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* 当前配置 */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">当前配置</CardTitle>
                        <CardDescription>
                          {analysisResult.viewpoints.length} 个视角，
                          {analysisResult.gridLayout.rows}x{analysisResult.gridLayout.cols} 网格
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>选中视角数</span>
                            <Badge variant="outline">
                              {selectedIndices.length} / {analysisResult.viewpoints.length}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>覆盖场景类型</span>
                            <Badge variant="outline">
                              {analysisResult.sceneType}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>平均置信度</span>
                            <Badge variant="outline">
                              {Math.round(
                                analysisResult.viewpoints.reduce(
                                  (acc, vp) => acc + vp.confidence,
                                  0
                                ) /
                                  analysisResult.viewpoints.length *
                                  100
                              )}%
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            重新分析
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleApply} disabled={selectedIndices.length === 0}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              应用建议 ({selectedIndices.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
