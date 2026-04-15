// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * Global Task Manager
 * 统一的任务管理面板 - 管理所有 AI 生成任务
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ListTodo,
  Play,
  Pause,
  RotateCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Image,
  Video,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  X,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ==================== 类型定义 ====================

export type TaskType = "image" | "video" | "script" | "character" | "scene" | "calibration";
export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface GlobalTask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  title: string;
  description?: string;
  progress: number; // 0-100
  total?: number;
  completed?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
  canRetry: boolean;
  canCancel: boolean;
}

// ==================== 任务 Store ====================

interface TaskStore {
  tasks: GlobalTask[];
  addTask: (task: Omit<GlobalTask, "id" | "createdAt" | "retryCount">) => string;
  updateTask: (id: string, updates: Partial<GlobalTask>) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
  retryTask: (id: string) => void;
  cancelTask: (id: string) => void;
}

let taskStore: TaskStore | null = null;

function getTaskStore(): TaskStore {
  if (!taskStore) {
    const tasks: GlobalTask[] = [];
    
    taskStore = {
      tasks,
      
      addTask: (task) => {
        const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const newTask: GlobalTask = {
          ...task,
          id,
          createdAt: Date.now(),
          retryCount: 0,
        };
        tasks.push(newTask);
        return id;
      },
      
      updateTask: (id, updates) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
          Object.assign(task, updates);
        }
      },
      
      removeTask: (id) => {
        const idx = tasks.findIndex(t => t.id === id);
        if (idx !== -1) tasks.splice(idx, 1);
      },
      
      clearCompleted: () => {
        const completedIds = tasks
          .filter(t => t.status === "completed" || t.status === "cancelled")
          .map(t => t.id);
        completedIds.forEach(id => {
          const idx = tasks.findIndex(t => t.id === id);
          if (idx !== -1) tasks.splice(idx, 1);
        });
      },
      
      retryTask: (id) => {
        const task = tasks.find(t => t.id === id);
        if (task && task.canRetry) {
          task.status = "queued";
          task.progress = 0;
          task.error = undefined;
          task.retryCount++;
        }
      },
      
      cancelTask: (id) => {
        const task = tasks.find(t => t.id === id);
        if (task && task.canCancel) {
          task.status = "cancelled";
          task.completedAt = Date.now();
        }
      },
    };
  }
  return taskStore;
}

// ==================== Hook ====================

export function useGlobalTaskStore() {
  const [, forceUpdate] = useState(0);
  const store = useMemo(() => getTaskStore(), []);
  
  const refresh = useCallback(() => forceUpdate(n => n + 1), []);
  
  useEffect(() => {
    const interval = setInterval(refresh, 500);
    return () => clearInterval(interval);
  }, [refresh]);
  
  return { ...store, refresh };
}

// ==================== 任务图标 ====================

const TASK_TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  image: <Image className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  script: <FileText className="h-4 w-4" />,
  character: <Sparkles className="h-4 w-4" />,
  scene: <Sparkles className="h-4 w-4" />,
  calibration: <RefreshCw className="h-4 w-4" />,
};

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  image: "生图",
  video: "生视频",
  script: "剧本解析",
  character: "角色生成",
  scene: "场景生成",
  calibration: "校准",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  queued: "bg-zinc-500",
  running: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  cancelled: "bg-zinc-400",
};

// ==================== 任务卡片 ====================

function TaskCard({ task, onRetry, onCancel, onRemove }: {
  task: GlobalTask;
  onRetry: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const isRunning = task.status === "running";
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";
  const isCancelled = task.status === "cancelled";
  
  const duration = task.completedAt && task.startedAt
    ? task.completedAt - task.startedAt
    : task.startedAt
    ? Date.now() - task.startedAt
    : 0;
  
  const formatDuration = (ms: number) => {
    if (ms < 1000) return "<1s";
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };
  
  return (
    <div className={cn(
      "rounded-lg border p-3 transition-all",
      isRunning && "border-blue-500/50 bg-blue-500/5",
      isCompleted && "border-green-500/30 bg-green-500/5",
      isFailed && "border-red-500/30 bg-red-500/5",
      isCancelled && "border-zinc-700 bg-zinc-800/30 opacity-60",
      (isCompleted || isCancelled) && "opacity-75",
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("p-1.5 rounded-md", STATUS_COLORS[task.status] + "/20")}>
            {task.status === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : task.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : task.status === "failed" ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <span className={cn("h-4 w-4 rounded-full", STATUS_COLORS[task.status])} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{task.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {TASK_TYPE_ICONS[task.type]}
                {TASK_TYPE_LABELS[task.type]}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(duration)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isFailed && task.canRetry && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRetry}>
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>重试</TooltipContent>
            </Tooltip>
          )}
          {isRunning && task.canCancel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>取消</TooltipContent>
            </Tooltip>
          )}
          {(isCompleted || isCancelled || isFailed) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRemove}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>移除</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      
      {/* Progress */}
      {isRunning && (
        <div className="space-y-1">
          <Progress value={task.progress} className="h-1.5" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{task.progress}%</span>
            {task.total && (
              <span>{task.completed || 0} / {task.total}</span>
            )}
          </div>
        </div>
      )}
      
      {/* Error */}
      {isFailed && task.error && (
        <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400 flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{task.error}</span>
          </p>
          {task.retryCount > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">
              已重试 {task.retryCount} 次
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== 主组件 ====================

export function GlobalTaskManager() {
  const { tasks, clearCompleted, retryTask, cancelTask, removeTask } = useGlobalTaskStore();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [isExpanded, setIsExpanded] = useState(true);
  
  // 统计数据
  const stats = useMemo(() => {
    const running = tasks.filter(t => t.status === "running" || t.status === "queued");
    const completed = tasks.filter(t => t.status === "completed");
    const failed = tasks.filter(t => t.status === "failed");
    return {
      total: tasks.length,
      running: running.length,
      completed: completed.length,
      failed: failed.length,
    };
  }, [tasks]);
  
  // 过滤任务
  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter(t => t.status === filter);
  }, [tasks, filter]);
  
  // 活跃任务（显示在浮窗）
  const activeTasks = useMemo(() => {
    return tasks.filter(t => t.status === "running" || t.status === "queued").slice(0, 3);
  }, [tasks]);
  
  return (
    <>
      {/* 浮动指示器 */}
      {stats.running > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                className={cn(
                  "h-12 w-12 rounded-full shadow-lg relative",
                  "bg-blue-600 hover:bg-blue-700",
                )}
              >
                <ListTodo className="h-5 w-5" />
                {stats.running > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-500 text-[10px] font-bold flex items-center justify-center">
                    {stats.running}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5" />
                  全局任务管理
                </DialogTitle>
              </DialogHeader>
              
              {/* 统计 */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-sm">进行中 {stats.running}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">已完成 {stats.completed}</span>
                </div>
                {stats.failed > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-sm text-red-400">失败 {stats.failed}</span>
                  </div>
                )}
              </div>
              
              {/* 筛选 */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {(["all", "running", "completed", "failed"] as const).map(f => (
                    <Button
                      key={f}
                      size="sm"
                      variant={filter === f ? "secondary" : "ghost"}
                      onClick={() => setFilter(f)}
                      className="h-7 text-xs"
                    >
                      {f === "all" ? "全部" : f === "running" ? "进行中" : f === "completed" ? "已完成" : "失败"}
                    </Button>
                  ))}
                </div>
                {stats.completed > 0 && (
                  <Button size="sm" variant="ghost" onClick={clearCompleted} className="h-7 text-xs ml-auto">
                    <Trash2 className="h-3 w-3 mr-1" />
                    清除已完成
                  </Button>
                )}
              </div>
              
              {/* 任务列表 */}
              <ScrollArea className="h-[300px] pr-4">
                {filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                    <ListTodo className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">暂无任务</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onRetry={() => retryTask(task.id)}
                        onCancel={() => cancelTask(task.id)}
                        onRemove={() => removeTask(task.id)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  );
}

// ==================== 导出 API ====================

export const globalTaskManager = {
  /**
   * 创建图片生成任务
   */
  createImageTask(title: string, description?: string): string {
    const store = getTaskStore();
    return store.addTask({
      type: "image",
      status: "queued",
      title,
      description,
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      canRetry: true,
      canCancel: true,
    });
  },
  
  /**
   * 创建视频生成任务
   */
  createVideoTask(title: string, description?: string): string {
    const store = getTaskStore();
    return store.addTask({
      type: "video",
      status: "queued",
      title,
      description,
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      canRetry: true,
      canCancel: true,
    });
  },
  
  /**
   * 更新任务进度
   */
  updateProgress(taskId: string, progress: number, completed?: number, total?: number) {
    const store = getTaskStore();
    store.updateTask(taskId, { 
      progress, 
      completed, 
      total,
      status: progress === 100 ? "completed" : "running",
      startedAt: undefined, // 保持已有值
    });
  },
  
  /**
   * 标记任务开始
   */
  startTask(taskId: string) {
    const store = getTaskStore();
    store.updateTask(taskId, { status: "running", startedAt: Date.now() });
  },
  
  /**
   * 标记任务完成
   */
  completeTask(taskId: string) {
    const store = getTaskStore();
    store.updateTask(taskId, { 
      status: "completed", 
      progress: 100, 
      completedAt: Date.now() 
    });
  },
  
  /**
   * 标记任务失败
   */
  failTask(taskId: string, error: string) {
    const store = getTaskStore();
    store.updateTask(taskId, { status: "failed", error });
  },
};
