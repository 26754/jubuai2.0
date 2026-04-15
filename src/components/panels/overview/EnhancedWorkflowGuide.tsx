"use client";

/**
 * EnhancedWorkflowGuide - 增强版工作流指引
 * 包含交互式步骤、可视化进度和快捷操作
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Film,
  User,
  Image,
  Sparkles,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";

export interface WorkflowStep {
  id: string;
  module: "script" | "character" | "scene" | "director";
  title: string;
  description: string;
  tips?: string[];
  warning?: string;
  completed?: boolean;
}

export interface WorkflowPhase {
  id: number;
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  steps: WorkflowStep[];
}

const ENHANCED_WORKFLOW_PHASES: WorkflowPhase[] = [
  {
    id: 1,
    title: "剧本模块",
    icon: BookOpen,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    steps: [
      {
        id: "script-1",
        module: "script",
        title: "进入剧本模块",
        description: "点击左侧导航栏的剧本模块",
        tips: ["剧本模块是整个项目的起点"],
      },
      {
        id: "script-2",
        module: "script",
        title: "导入剧本",
        description: "点击导入按钮，粘贴完整剧本内容",
        tips: ["支持 Markdown、Fountain、JSON 多种格式"],
      },
      {
        id: "script-3",
        module: "script",
        title: "导入完整剧本",
        description: "点击「导入完整剧本」按钮解析内容",
      },
      {
        id: "script-4",
        module: "script",
        title: "选择视觉风格",
        description: "为项目选择统一的视觉风格",
        tips: ["视觉风格将自动应用到后续的角色和场景生成"],
      },
      {
        id: "script-5",
        module: "script",
        title: "二次检查",
        description: "检查导入的角色和场景列表是否正确",
        warning: "请仔细核对，错误的角色关联会影响后续生成",
      },
      {
        id: "script-6",
        module: "script",
        title: "AI 场景校准",
        description: "使用 AI 优化场景描述和分类",
      },
      {
        id: "script-7",
        module: "scene",
        title: "生成场景图",
        description: "点击场景，在右边栏点击「去场景库生成」",
        tips: ["每个场景可以生成对应的背景图"],
      },
      {
        id: "script-8",
        module: "scene",
        title: "保存场景",
        description: "在场景板块生成后点击保存",
      },
      {
        id: "script-9",
        module: "script",
        title: "AI 分镜校准",
        description: "使用 AI 优化分镜描述",
      },
      {
        id: "script-10",
        module: "script",
        title: "AI 角色校准",
        description: "使用 AI 优化角色描述",
      },
      {
        id: "script-11",
        module: "character",
        title: "生成角色形象",
        description: "点击角色，在右边栏点击「去角色库生成」",
      },
      {
        id: "script-12",
        module: "character",
        title: "生成设定图",
        description: "在角色板块点击「生成设定图」",
        tips: ["设定图将用于后续的分镜合成"],
      },
      {
        id: "script-13",
        module: "character",
        title: "保存角色",
        description: "生成后点击保存按钮",
      },
    ],
  },
  {
    id: 2,
    title: "导演模块",
    icon: Film,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    steps: [
      {
        id: "director-1",
        module: "director",
        title: "进入导演模块",
        description: "点击左侧导航栏的导演模块",
      },
      {
        id: "director-2",
        module: "director",
        title: "选择场景",
        description: "点击左边树形栏查看可用场景",
      },
      {
        id: "director-3",
        module: "director",
        title: "添加分镜",
        description: "点击场景右侧的「+」添加到分镜编辑区",
      },
      {
        id: "director-4",
        module: "director",
        title: "选择生成模式",
        description: "图片生成方式选择「合并生成」",
        tips: ["合并生成可以保持角色一致性"],
      },
      {
        id: "director-5",
        module: "director",
        title: "执行合并生成",
        description: "点击「执行合并生成」按钮",
      },
      {
        id: "director-6",
        module: "director",
        title: "等待生成完成",
        description: "等待图片生成完毕",
        tips: ["可以在全局任务管理器查看进度"],
      },
      {
        id: "director-7",
        module: "director",
        title: "生成成图或视频",
        description: "无主角案例时使用「生成成图」；有主角时使用「生成视频」",
        warning: "视频生成需要较长的等待时间",
      },
    ],
  },
];

interface StepItemProps {
  step: WorkflowStep;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function StepItem({ step, index, isExpanded, onToggle }: StepItemProps) {
  const moduleIcons = {
    script: <BookOpen className="h-3 w-3" />,
    character: <User className="h-3 w-3" />,
    scene: <Image className="h-3 w-3" />,
    director: <Film className="h-3 w-3" />,
  };

  const moduleColors = {
    script: "text-blue-500",
    character: "text-green-500",
    scene: "text-orange-500",
    director: "text-purple-500",
  };

  return (
    <div className="border rounded-lg overflow-hidden transition-all">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
      >
        <span className={`shrink-0 ${step.completed ? "text-green-500" : moduleColors[step.module]}`}>
          {step.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="text-xs text-muted-foreground mr-2">{index + 1}.</span>
          <span className="text-sm font-medium">{step.title}</span>
        </span>
        {step.tips && <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0" />}
        {step.warning && <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 pl-11 space-y-2">
          <p className="text-xs text-muted-foreground">{step.description}</p>
          {step.tips && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-yellow-500/10 p-2 rounded">
              <Lightbulb className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
              <div>{step.tips[0]}</div>
            </div>
          )}
          {step.warning && (
            <div className="flex items-start gap-2 text-xs text-orange-500 bg-orange-500/10 p-2 rounded">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <div>{step.warning}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PhaseSectionProps {
  phase: WorkflowPhase;
  completedSteps: Set<string>;
  currentStep: string | null;
  onStepClick: (stepId: string) => void;
}

function PhaseSection({ phase, completedSteps, currentStep, onStepClick }: PhaseSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = phase.icon;
  const completedCount = phase.steps.filter((s) => completedSteps.has(s.id)).length;
  const progress = (completedCount / phase.steps.length) * 100;

  return (
    <div className={`rounded-lg border overflow-hidden ${phase.bgColor}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <div className={`shrink-0 ${phase.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold">{phase.title}</h3>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{phase.steps.length} 步骤完成
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progress} className="w-20 h-2" />
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {phase.steps.map((step, idx) => (
            <div
              key={step.id}
              onClick={() => onStepClick(step.id)}
              className={`cursor-pointer ${currentStep === step.id ? "ring-2 ring-primary" : ""}`}
            >
              <StepItem
                step={{ ...step, completed: completedSteps.has(step.id) }}
                index={idx}
                isExpanded={currentStep === step.id}
                onToggle={() => onStepClick(step.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface EnhancedWorkflowGuideProps {
  className?: string;
  onStepClick?: (step: WorkflowStep) => void;
}

export function EnhancedWorkflowGuide({ className = "", onStepClick }: EnhancedWorkflowGuideProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);

  const totalSteps = ENHANCED_WORKFLOW_PHASES.reduce((acc, p) => acc + p.steps.length, 0);
  const completedCount = completedSteps.size;
  const overallProgress = (completedCount / totalSteps) * 100;

  const toggleStep = (stepId: string) => {
    setCurrentStep(currentStep === stepId ? null : stepId);
  };

  const markStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const resetProgress = () => {
    setCompletedSteps(new Set());
    setCurrentStep(null);
  };

  const handleStepClick = (step: WorkflowStep) => {
    if (onStepClick) {
      onStepClick(step);
    } else {
      setCurrentStep(step.id);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="rounded-lg border bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">JuBu AI 工作流指引</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {completedCount}/{totalSteps}
            </Badge>
            <Button size="sm" variant="ghost" onClick={resetProgress}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <Progress value={overallProgress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {overallProgress === 100
            ? "恭喜！你已完成所有工作流程"
            : `完成度: ${Math.round(overallProgress)}%`}
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={showOnlyIncomplete ? "secondary" : "ghost"}
          onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
        >
          {showOnlyIncomplete ? "显示全部" : "仅显示未完成"}
        </Button>
      </div>

      {/* Phases */}
      <div className="space-y-3">
        {ENHANCED_WORKFLOW_PHASES.map((phase) => {
          const filteredSteps = showOnlyIncomplete
            ? phase.steps.filter((s) => !completedSteps.has(s.id))
            : phase.steps;
          if (showOnlyIncomplete && filteredSteps.length === 0) return null;

          return (
            <PhaseSection
              key={phase.id}
              phase={{ ...phase, steps: filteredSteps }}
              completedSteps={completedSteps}
              currentStep={currentStep}
              onStepClick={handleStepClick}
            />
          );
        })}
      </div>

      {/* Quick Actions */}
      {currentStep && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg p-4 z-50">
          <div className="text-sm font-medium mb-2">步骤操作</div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => markStepComplete(currentStep)}>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              标记完成
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(null)}>
              关闭
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { ENHANCED_WORKFLOW_PHASES };
