// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * 火山引擎模型窗口组件
 * 显示所有火山引擎豆包模型
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, Video, Image, MessageSquare } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DoubaoModelWindowProps {
  onModelSelect?: (model: string) => void;
}

export function DoubaoModelWindow({ onModelSelect }: DoubaoModelWindowProps) {
  const [isOpen, setIsOpen] = useState(true);

  // 火山引擎模型分类
  const modelCategories = [
    {
      category: "对话模型",
      icon: MessageSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      models: [
        { id: "doubao-pro-32k", name: "豆包 Pro 32K", description: "高性能对话模型，支持 32K 上下文", context: "32K" },
        { id: "doubao-pro-128k", name: "豆包 Pro 128K", description: "超长上下文对话模型", context: "128K" },
        { id: "doubao-lite-32k", name: "豆包 Lite 32K", description: "轻量级对话模型，适合简单任务", context: "32K" },
        { id: "doubao-lite-128k", name: "豆包 Lite 128K", description: "轻量级超长上下文模型", context: "128K" },
      ],
    },
    {
      category: "视频生成模型",
      icon: Video,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      models: [
        { id: "doubao-seedance-2-0-pro-t2v-260610", name: "Seedance 2.0 Pro 文生视频", description: "最新一代文生视频模型，支持 4-15 秒视频生成", version: "2.0", duration: "4-15s" },
        { id: "doubao-seedance-2-0-pro-i2v-260610", name: "Seedance 2.0 Pro 图生视频", description: "最新一代图生视频模型，支持运镜复刻", version: "2.0", duration: "4-15s" },
        { id: "doubao-seedance-2-0-pro-t2v-fast-260610", name: "Seedance 2.0 Pro Fast", description: "快速文生视频，适合快速迭代", version: "2.0", duration: "4-10s" },
        { id: "doubao-seedance-1-5-pro-251215", name: "Seedance 1.5 Pro", description: "高质量文生视频，支持多镜头叙事", version: "1.5", duration: "4-12s" },
        { id: "doubao-seedance-1-0-pro-250528", name: "Seedance 1.0 Pro", description: "基础版视频生成模型", version: "1.0", duration: "5-10s" },
        { id: "doubao-seedance-1-0-pro-fast-251015", name: "Seedance 1.0 Pro Fast", description: "快速视频生成", version: "1.0", duration: "5-10s" },
        { id: "doubao-seedance-1-0-lite-t2v-250428", name: "Seedance 1.0 Lite T2V", description: "轻量级文生视频", version: "1.0", duration: "5-10s" },
        { id: "doubao-seedance-1-0-lite-i2v-250428", name: "Seedance 1.0 Lite I2V", description: "轻量级图生视频", version: "1.0", duration: "5-10s" },
        { id: "doubao-nanobanana-2", name: "Nano Banana 2", description: "创新视频生成模型，支持多种风格和运镜", version: "2.0", duration: "3-15s" },
        { id: "doubao-nanobanana-1", name: "Nano Banana 1", description: "基础版创新视频模型", version: "1.0", duration: "3-10s" },
      ],
    },
    {
      category: "图像生成模型",
      icon: Image,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      models: [
        { id: "doubao-seedream-4-5-251128", name: "Seedream 4.5", description: "最新一代图像生成模型，支持中文提示词", version: "4.5" },
        { id: "doubao-seedream-3-0-t2i-250415", name: "Seedream 3.0 T2I", description: "高质量文本生成图像", version: "3.0" },
      ],
    },
    {
      category: "思考模型",
      icon: Sparkles,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      models: [
        { id: "doubao-seed-1-0-thinking-pro", name: "豆包思考 Pro", description: "深度思考模型，适合复杂推理任务" },
      ],
    },
  ];

  return (
    <div className="mt-4 border rounded-lg bg-gradient-to-br from-primary/5 to-secondary/10 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-3 border-b border-border/50">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm">火山引擎豆包模型库</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    点击模型名称即可复制到剪贴板
                  </p>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {modelCategories.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <div key={category.category} className="space-y-2">
                  {/* Category Header */}
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <div className={`p-1.5 rounded ${category.bgColor}`}>
                      <CategoryIcon className={`h-4 w-4 ${category.color}`} />
                    </div>
                    <span>{category.category}</span>
                    <span className="text-xs text-muted-foreground">
                      ({category.models.length} 个模型)
                    </span>
                  </div>

                  {/* Model Grid */}
                  <div className="grid grid-cols-1 gap-2 ml-4">
                    {category.models.map((model) => (
                      <ModelCard
                        key={model.id}
                        model={model}
                        color={category.color}
                        onSelect={onModelSelect}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// 单个模型卡片组件
function ModelCard({
  model,
  color,
  onSelect,
}: {
  model: {
    id: string;
    name: string;
    description: string;
    context?: string;
    version?: string;
    duration?: string;
  };
  color: string;
  onSelect?: (model: string) => void;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(model.id);
    onSelect?.(model.id);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-left p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium text-sm group-hover:text-${color} transition-colors truncate`}>
            {model.name}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {model.description}
          </p>
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {model.version && (
              <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
                v{model.version}
              </span>
            )}
            {model.context && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded">
                上下文 {model.context}
              </span>
            )}
            {model.duration && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded">
                {model.duration}
              </span>
            )}
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className={`h-4 w-4 ${color}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>
    </button>
  );
}
