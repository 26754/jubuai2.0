// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * HelpGuide - 启动页帮助指南组件
 * 包含工作流教程和剧本格式示例
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BookOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  X,
  ExternalLink,
  Copy,
  Check,
  Layers,
  Wand2,
  Image,
  Video,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ==================== 工作流教程内容 ====================

const WORKFLOW_STEPS = [
  {
    phase: "准备工作",
    icon: Settings,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    steps: [
      { title: "添加 API 服务商", desc: "进入设置 → API 配置 → 添加服务商，配置 AI 服务商账号" },
      { title: "服务映射", desc: "为各功能选择对应的 AI 模型" },
    ],
  },
  {
    phase: "剧本板块",
    icon: FileText,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    steps: [
      { title: "导入剧本", desc: "将已有的完整剧本粘贴或导入到编辑区" },
      { title: "AI 创作", desc: "使用 AI 辅助从零创作剧本" },
    ],
  },
  {
    phase: "AI 二次校准",
    icon: Wand2,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    steps: [
      { title: "AI 场景校准", desc: "优化每个场景的环境描述、氛围、光影等细节" },
      { title: "API 校准分镜", desc: "精确校准每个分镜的镜头语言、景别、构图" },
      { title: "AI 角色校准", desc: "深化角色外观描述、表情、动作等一致性锚点" },
    ],
  },
  {
    phase: "生成素材（可选）",
    icon: Image,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    steps: [
      { title: "生成场景", desc: "根据校准后的场景描述批量生成场景参考图" },
      { title: "生成角色", desc: "根据校准后的角色描述生成角色参考图" },
    ],
  },
  {
    phase: "导演板块",
    icon: Layers,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    steps: [
      { title: "加载剧本分镜", desc: "将剧本中的所有分镜导入当前板块" },
      { title: "单镜生成", desc: "逐个分镜单独生成图片" },
      { title: "合并生成（推荐）", desc: "将多个分镜合并批量生成" },
    ],
  },
  {
    phase: "视频生成",
    icon: Video,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    steps: [
      { title: "S级板块", desc: "使用 Seedance 2.0 多镜头合并叙事功能" },
      { title: "生成分组", desc: "自由选择视频分组长短" },
      { title: "生成视频", desc: "点击生成视频即可" },
    ],
  },
];

// ==================== 剧本格式示例内容 ====================

const SCRIPT_FORMAT_SECTIONS = [
  {
    title: "基本格式",
    content: `场景头格式：
[场景编号] [场景名称]
[地点] [时间]

示例：
01 咖啡馆
咖啡馆内，白天`,
  },
  {
    title: "对白格式",
    content: `**角色名**：对白内容`,
  },
  {
    title: "舞台指示",
    content: `（动作描述）`,
  },
  {
    title: "完整示例",
    content: `# 第一集：相遇

## 第一场：咖啡馆

**咖啡馆内，白天**

阳光透过落地窗洒在木质地板上。

**小明**：（走进咖啡馆，环顾四周）
这里还挺安静的。

**小红**：（抬头看见小明）
小明？你怎么在这？

（两人相视而笑）`,
  },
];

// ==================== 组件 ====================

interface HelpGuideProps {
  className?: string;
}

export function HelpGuide({ className = "" }: HelpGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"workflow" | "format">("workflow");
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0, 1, 2]));
  const [expandedFormats, setExpandedFormats] = useState<Set<number>>(new Set([0, 3]));
  const [copiedFormat, setCopiedFormat] = useState<number | null>(null);

  const togglePhase = (index: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleFormat = (index: number) => {
    setExpandedFormats((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const copyFormat = (index: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFormat(index);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <>
      {/* 底部入口按钮 */}
      <div className={cn("flex items-center justify-center gap-4 pt-4 border-t mt-4", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          工作流教程
        </Button>
        <div className="w-px h-4 bg-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setActiveTab("format");
            setIsOpen(true);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <FileText className="h-4 w-4 mr-2" />
          剧本格式示例
        </Button>
      </div>

      {/* 指南对话框 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-lg">帮助指南</DialogTitle>
                <Badge variant="secondary" className="text-xs">
                  新手必读
                </Badge>
              </div>
            </div>
            <DialogDescription className="sr-only">
              工作流教程和剧本格式示例
            </DialogDescription>
          </DialogHeader>

          {/* Tab 切换 */}
          <div className="flex gap-2 pb-4 border-b shrink-0">
            <Button
              variant={activeTab === "workflow" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("workflow")}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              工作流教程
            </Button>
            <Button
              variant={activeTab === "format" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("format")}
            >
              <FileText className="h-4 w-4 mr-2" />
              剧本格式示例
            </Button>
          </div>

          {/* 内容区域 */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="py-4">
              {/* 工作流教程 */}
              {activeTab === "workflow" && (
                <div className="space-y-4">
                  {/* 流程总览 */}
                  <div className="rounded-lg bg-primary/5 border p-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      流程总览
                    </h3>
                    <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
                      <Badge variant="outline">准备工作</Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline">剧本</Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline">AI校准</Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline">场景/角色</Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline">导演</Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline">S级</Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="secondary">视频生成</Badge>
                    </div>
                  </div>

                  {/* 分阶段步骤 */}
                  {WORKFLOW_STEPS.map((phase, phaseIndex) => {
                    const Icon = phase.icon;
                    const isExpanded = expandedPhases.has(phaseIndex);
                    return (
                      <div
                        key={phaseIndex}
                        className={cn("rounded-lg border overflow-hidden", phase.bgColor)}
                      >
                        <button
                          onClick={() => togglePhase(phaseIndex)}
                          className="w-full flex items-center justify-between p-3 hover:opacity-90 transition-opacity"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("shrink-0", phase.color)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className="font-medium text-sm">{phase.phase}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {phase.steps.length} 步
                            </Badge>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 pl-11 space-y-2">
                            {phase.steps.map((step, stepIndex) => (
                              <div
                                key={stepIndex}
                                className="flex items-start gap-2 text-sm"
                              >
                                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px]">
                                  {stepIndex + 1}
                                </span>
                                <div>
                                  <div className="font-medium">{step.title}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {step.desc}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 小贴士 */}
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-amber-600">
                      <span className="text-base">💡</span>
                      小贴士
                    </h3>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• 先校准，再生成 — 二次校准能显著提升输出质量</li>
                      <li>• 合并生成优先 — 合并生成比单镜生成效率更高</li>
                      <li>• 参数可调 — 每个分镜的提示词、首帧、尾帧都支持手动微调</li>
                      <li>• 多 Key 轮询 — 添加多个 API Key 可提高并发能力</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 剧本格式示例 */}
              {activeTab === "format" && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-primary/5 border p-4">
                    <h3 className="text-sm font-medium mb-2">支持的导入格式</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge>Markdown（推荐）</Badge>
                      <Badge>Fountain（专业剧本格式）</Badge>
                      <Badge>JSON（结构化数据）</Badge>
                    </div>
                  </div>

                  {SCRIPT_FORMAT_SECTIONS.map((section, index) => {
                    const isExpanded = expandedFormats.has(index);
                    return (
                      <div
                        key={index}
                        className="rounded-lg border overflow-hidden"
                      >
                        <button
                          onClick={() => toggleFormat(index)}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                        >
                          <span className="font-medium text-sm">{section.title}</span>
                          <div className="flex items-center gap-2">
                            {index === 3 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyFormat(index, section.content);
                                }}
                              >
                                {copiedFormat === index ? (
                                  <Check className="h-3 w-3 mr-1" />
                                ) : (
                                  <Copy className="h-3 w-3 mr-1" />
                                )}
                                {copiedFormat === index ? "已复制" : "复制"}
                              </Button>
                            )}
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4">
                            <pre className="text-xs bg-muted/50 rounded-lg p-3 whitespace-pre-wrap font-mono">
                              {section.content}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 注意事项 */}
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                    <h3 className="text-sm font-medium mb-2 text-blue-600">注意事项</h3>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• 使用 # 表示集/幕标题</li>
                      <li>• 使用 ## 表示场景标题</li>
                      <li>• 场景头格式：[地点] [时间]</li>
                      <li>• 对白格式：**角色名**：（动作）对白内容</li>
                      <li>• 舞台指示使用（动作）或全角括号</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
