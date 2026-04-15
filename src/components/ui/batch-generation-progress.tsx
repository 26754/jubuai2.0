// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * Batch Generation Progress Component
 * 
 * 批量生成进度组件 - 显示生成进度、预计时间和自动轮转控制
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ==================== 类型定义 ====================

export interface GenerationTask {
  /** 任务ID */
  id: string;
  /** 任务名称 */
  name: string;
  /** 任务状态 */
  status: "pending" | "generating" | "completed" | "failed" | "skipped";
  /** 生成进度（0-100） */
  progress?: number;
  /** 错误信息 */
  error?: string;
  /** 开始时间 */
  startTime?: Date;
  /** 完成时间 */
  endTime?: Date;
}

export interface BatchGenerationProgressProps {
  /** 任务队列 */
  tasks: GenerationTask[];
  /** 当前任务索引 */
  currentIndex: number;
  /** 是否正在生成 */
  isGenerating: boolean;
  /** 自动轮转模式 */
  autoContinue: boolean;
  /** 开始时间 */
  startTime?: Date;
  /** 预计剩余时间（秒） */
  estimatedRemainingTime?: number;
  /** 任务类型 */
  taskType?: "character" | "scene";
  /** 开始回调 */
  onStart?: () => void;
  /** 暂停回调 */
  onPause?: () => void;
  /** 继续回调 */
  onContinue?: () => void;
  /** 跳过回调 */
  onSkip?: (index: number) => void;
  /** 上一项回调 */
  onPrevious?: () => void;
  /** 下一项回调 */
  onNext?: () => void;
  /** 清空回调 */
  onClear?: () => void;
  /** 设置自动轮转 */
  onSetAutoContinue?: (auto: boolean) => void;
}

// ==================== 格式化时间 ====================

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) {
    return `${minutes}分${remainingSeconds}秒`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}小时${remainingMinutes}分`;
}

// ==================== 进度条组件 ====================

interface ProgressBarProps {
  tasks: GenerationTask[];
  currentIndex: number;
  onSelectTask?: (index: number) => void;
}

function BatchProgressBar({ tasks, currentIndex, onSelectTask }: ProgressBarProps) {
  const completedCount = tasks.filter(t => t.status === "completed").length;
  const failedCount = tasks.filter(t => t.status === "failed").length;
  const total = tasks.length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          进度: {completedCount}/{total}
        </span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        {/* 进度填充 */}
        <div 
          className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
        {/* 当前任务指示器 */}
        {tasks[currentIndex]?.status === "generating" && (
          <div 
            className="absolute inset-y-0 w-1.5 bg-primary animate-pulse"
            style={{ 
              left: `${(currentIndex / total) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          />
        )}
      </div>
      {/* 任务状态预览 */}
      <div className="flex gap-1">
        {tasks.map((task, idx) => {
          const statusColor = {
            pending: "bg-muted",
            generating: "bg-primary animate-pulse",
            completed: "bg-green-500",
            failed: "bg-red-500",
            skipped: "bg-yellow-500",
          }[task.status];
          
          return (
            <Tooltip key={task.id} open={false}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all hover:h-2",
                    statusColor,
                    idx === currentIndex && "ring-2 ring-primary ring-offset-1"
                  )}
                  onClick={() => onSelectTask?.(idx)}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{task.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{task.status}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 批量生成进度组件 ====================

export function BatchGenerationProgress({
  tasks,
  currentIndex,
  isGenerating,
  autoContinue,
  startTime,
  estimatedRemainingTime,
  taskType = "character",
  onStart,
  onPause,
  onContinue,
  onSkip,
  onPrevious,
  onNext,
  onClear,
  onSetAutoContinue,
}: BatchGenerationProgressProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [autoContinueDelay, setAutoContinueDelay] = useState(3000); // 3秒延迟
  
  const currentTask = tasks[currentIndex];
  const completedCount = tasks.filter(t => t.status === "completed").length;
  const failedCount = tasks.filter(t => t.status === "failed").length;
  const pendingCount = tasks.filter(t => t.status === "pending").length;
  const isAllDone = completedCount + failedCount === tasks.length;
  
  // 计算预计剩余时间
  const [remainingTime, setRemainingTime] = useState(estimatedRemainingTime);
  
  useEffect(() => {
    if (estimatedRemainingTime !== undefined) {
      setRemainingTime(estimatedRemainingTime);
    }
  }, [estimatedRemainingTime]);
  
  // 倒计时更新
  useEffect(() => {
    if (!isGenerating || remainingTime === undefined) return;
    
    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev === undefined || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isGenerating, remainingTime]);
  
  const Icon = taskType === "character" ? "user" : "map";
  
  return (
    <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-muted-foreground/20">
      <CardContent className="p-3 space-y-3">
        {/* 头部信息 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : isAllDone ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {isGenerating 
                ? `正在生成: ${currentTask?.name || '未知任务'}`
                : isAllDone 
                  ? "全部完成" 
                  : "批量生成暂停"
              }
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* 自动轮转开关 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={autoContinue ? "default" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onSetAutoContinue?.(!autoContinue)}
                >
                  <RotateCcw className={cn("h-3 w-3", autoContinue && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>自动继续: {autoContinue ? "开启" : "关闭"}</p>
              </TooltipContent>
            </Tooltip>
            
            {/* 设置 */}
            <Popover open={showSettings} onOpenChange={setShowSettings}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Settings className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">自动继续延迟</label>
                    <div className="flex gap-2 mt-1">
                      {[2000, 3000, 5000].map(delay => (
                        <Button
                          key={delay}
                          variant={autoContinueDelay === delay ? "default" : "outline"}
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => setAutoContinueDelay(delay)}
                        >
                          {delay / 1000}秒
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {/* 进度条 */}
        <BatchProgressBar 
          tasks={tasks} 
          currentIndex={currentIndex}
          onSelectTask={(idx) => {
            if (tasks[idx].status === "pending") {
              onSkip?.(idx);
            }
          }}
        />
        
        {/* 统计数据 */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex gap-3">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {completedCount}
            </span>
            {failedCount > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="h-3 w-3" />
                {failedCount}
              </span>
            )}
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {pendingCount}
            </span>
          </div>
          {remainingTime !== undefined && remainingTime > 0 && (
            <span className="text-muted-foreground">
              预计剩余: {formatTime(remainingTime)}
            </span>
          )}
        </div>
        
        {/* 控制按钮 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8"
            onClick={onPrevious}
            disabled={currentIndex === 0}
          >
            <SkipBack className="h-3 w-3 mr-1" />
            上一项
          </Button>
          
          {isGenerating ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8"
              onClick={onPause}
            >
              <Pause className="h-3 w-3 mr-1" />
              暂停
            </Button>
          ) : isAllDone ? (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-8"
              onClick={onClear}
            >
              完成
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-8"
              onClick={onContinue}
            >
              <Play className="h-3 w-3 mr-1" />
              {autoContinue ? "自动继续" : "继续"}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8"
            onClick={onNext}
            disabled={currentIndex === tasks.length - 1}
          >
            下一项
            <SkipForward className="h-3 w-3 ml-1" />
          </Button>
        </div>
        
        {/* 当前任务详情 */}
        {currentTask && (
          <div className="pt-2 border-t space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">{currentTask.name}</span>
              <Badge 
                variant={
                  currentTask.status === "completed" ? "default" :
                  currentTask.status === "failed" ? "destructive" :
                  currentTask.status === "generating" ? "secondary" :
                  "outline"
                }
                className="text-[10px]"
              >
                {currentTask.status === "generating" && <Loader2 className="h-2 w-2 mr-1 animate-spin" />}
                {currentTask.status}
              </Badge>
            </div>
            {currentTask.error && (
              <p className="text-xs text-red-500">{currentTask.error}</p>
            )}
            {currentTask.status === "generating" && currentTask.progress !== undefined && (
              <div className="flex items-center gap-2">
                <Progress value={currentTask.progress} className="flex-1 h-1.5" />
                <span className="text-xs text-muted-foreground w-8">{currentTask.progress}%</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 导出 Hook ====================

export function useBatchGeneration<T extends { id: string; name: string }>(
  items: T[],
  onGenerate: (item: T) => Promise<void>,
  options: {
    autoContinue?: boolean;
    onComplete?: () => void;
  } = {}
) {
  const [tasks, setTasks] = useState<GenerationTask[]>(() =>
    items.map(item => ({
      id: item.id,
      name: item.name,
      status: "pending" as const,
    }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoContinue, setAutoContinue] = useState(options.autoContinue ?? true);
  const [startTime, setStartTime] = useState<Date | undefined>();
  
  // 计算预计剩余时间
  const completedTasks = tasks.filter(t => t.status === "completed");
  const avgTimePerTask = completedTasks.length > 0
    ? (Date.now() - (startTime?.getTime() || Date.now())) / completedTasks.length
    : 60000; // 默认1分钟
  const remainingTasks = tasks.filter(t => t.status === "pending").length;
  const estimatedRemainingTime = remainingTasks * avgTimePerTask / 1000;
  
  // 更新任务状态
  const updateTaskStatus = useCallback((
    taskId: string, 
    status: GenerationTask["status"],
    error?: string
  ) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { 
            ...task, 
            status, 
            error,
            startTime: status === "generating" ? new Date() : task.startTime,
            endTime: status === "completed" || status === "failed" ? new Date() : task.endTime,
          }
        : task
    ));
  }, []);
  
  // 生成下一个任务
  const generateNext = useCallback(async () => {
    const nextPendingIndex = tasks.findIndex((t, idx) => idx > currentIndex && t.status === "pending");
    if (nextPendingIndex === -1) {
      setIsGenerating(false);
      options.onComplete?.();
      return;
    }
    
    setCurrentIndex(nextPendingIndex);
    const task = tasks[nextPendingIndex];
    
    try {
      updateTaskStatus(task.id, "generating");
      await onGenerate(items.find(i => i.id === task.id)!);
      updateTaskStatus(task.id, "completed");
      
      // 自动继续
      if (autoContinue) {
        setTimeout(() => {
          generateNext();
        }, 3000);
      } else {
        setIsGenerating(false);
      }
    } catch (error) {
      updateTaskStatus(task.id, "failed", (error as Error).message);
      if (autoContinue) {
        setTimeout(() => {
          generateNext();
        }, 5000);
      } else {
        setIsGenerating(false);
      }
    }
  }, [tasks, currentIndex, autoContinue, onGenerate, items, updateTaskStatus, options]);
  
  // 开始生成
  const start = useCallback(() => {
    if (!startTime) {
      setStartTime(new Date());
    }
    setIsGenerating(true);
    generateNext();
  }, [startTime, generateNext]);
  
  // 暂停
  const pause = useCallback(() => {
    setIsGenerating(false);
  }, []);
  
  // 继续
  const resume = useCallback(() => {
    setIsGenerating(true);
    generateNext();
  }, [generateNext]);
  
  // 跳过当前任务
  const skip = useCallback((index: number) => {
    updateTaskStatus(tasks[index].id, "skipped");
    if (index === currentIndex && isGenerating) {
      generateNext();
    }
  }, [tasks, currentIndex, isGenerating, updateTaskStatus, generateNext]);
  
  // 上一项
  const previous = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);
  
  // 下一项
  const next = useCallback(() => {
    if (currentIndex < tasks.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, tasks.length]);
  
  // 清空
  const clear = useCallback(() => {
    setTasks([]);
    setCurrentIndex(0);
    setIsGenerating(false);
    setStartTime(undefined);
  }, []);
  
  return {
    tasks,
    currentIndex,
    isGenerating,
    autoContinue,
    startTime,
    estimatedRemainingTime,
    setAutoContinue,
    start,
    pause,
    resume,
    skip,
    previous,
    next,
    clear,
    updateTaskStatus,
  };
}
