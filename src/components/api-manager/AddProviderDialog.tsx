// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * Add Provider Dialog
 * For adding new API providers with platform selection
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { IProvider } from "@/lib/api-key-manager";

/**
 * API 平台预设配置
 * 支持的供应商列表，按厂商分类
 */

export interface PlatformPreset {
  platform: string;
  name: string;
  baseUrl: string;
  description: string;
  services: string[];
  models: string[];
  category: 'video' | 'chat' | 'image' | 'multi';
}

// 按分类组织的平台预设
export const PLATFORM_PRESETS: PlatformPreset[] = [
  // ========== 视频/多模态厂商 ==========
  {
    platform: "doubao",
    name: "火山引擎豆包",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    description: "字节跳动豆包大模型，支持对话/图片理解/视频生成/图像生成",
    services: ["对话", "图片理解", "视频生成", "图像生成"],
    models: [
      "doubao-pro-32k",
      "doubao-pro-128k",
      "doubao-lite-32k",
      "doubao-lite-128k",
      "doubao-seedance-2-0-pro-t2v-260610",
      "doubao-seedance-2-0-pro-i2v-260610",
      "doubao-seedance-2-0-pro-t2v-fast-260610",
      "doubao-seedance-1-5-pro-251215",
      "doubao-seedance-1-0-pro-fast-251015",
      "doubao-seedream-4-5-251128",
      "doubao-seedream-3-0-t2i-250415",
    ],
    category: "multi",
  },
  {
    platform: "runninghub",
    name: "RunningHub",
    baseUrl: "https://www.runninghub.cn/openapi/v2",
    description: "Qwen 视角切换 / 多角度生成",
    services: ["视角切换", "图生图"],
    models: ["2009613632530812930"],
    category: "video",
  },

  // ========== 大模型厂商 ==========
  {
    platform: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    description: "GPT 系列模型，支持对话/图片理解/语音等",
    services: ["对话", "图片理解", "语音"],
    models: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo",
      "gpt-image-1",
      "gpt-image-1-mini",
    ],
    category: "multi",
  },
  {
    platform: "anthropic",
    name: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    description: "Claude 系列模型，支持长上下文和高级推理",
    services: ["对话", "图片理解"],
    models: [
      "claude-sonnet-4-20250514",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
    ],
    category: "chat",
  },
  {
    platform: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    description: "DeepSeek V3/R1 模型，高性价比国产大模型",
    services: ["对话", "图片理解"],
    models: [
      "deepseek-v3.2",
      "deepseek-chat",
      "deepseek-coder",
      "deepseek-reasoner",
    ],
    category: "chat",
  },
  {
    platform: "google",
    name: "Google AI (Gemini)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    description: "Gemini 系列模型，支持多模态和长上下文",
    services: ["对话", "图片理解", "视频生成"],
    models: [
      "gemini-2.5-flash",
      "gemini-2.5-flash-preview-05-20",
      "gemini-3.1-pro-preview",
      "gemini-3.1-flash-preview",
      "gemini-3-pro-preview",
      "gemini-3.0-flash-exp",
      "gemini-exp-1206",
    ],
    category: "multi",
  },
  {
    platform: "qwen",
    name: "阿里云百炼 (Qwen)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    description: "通义千问系列，支持对话/图片理解/视频生成",
    services: ["对话", "图片理解", "视频生成", "图像生成"],
    models: [
      "qwen-vl-max",
      "qwen-vl-plus",
      "qwen-vl-fast",
      "qwen2.5-vl-72b-instruct",
      "qwen2.5-vl-32b-instruct",
      "qwen-max",
      "qwen-plus",
      "qwen-turbo",
      "qwen2.5-72b-instruct",
      "qwen2.5-32b-instruct",
      "wanx-plus",
    ],
    category: "multi",
  },
  {
    platform: "zhipu",
    name: "智谱 AI (GLM)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    description: "智谱 GLM 系列，支持对话和图片理解",
    services: ["对话", "图片理解"],
    models: [
      "glm-4-plus",
      "glm-4v-plus",
      "glm-4-flash",
      "glm-4",
      "glm-3-turbo",
      "cogview-3-plus",
    ],
    category: "multi",
  },
  {
    platform: "siliconflow",
    name: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    description: "聚合多个大模型平台，高性价比",
    services: ["对话", "图片理解", "图像生成"],
    models: [
      "Qwen/Qwen2.5-72B-Instruct",
      "deepseek-ai/DeepSeek-V3",
      "deepseek-ai/DeepSeek-R1",
      "THUDM/glm-4-9b-chat",
      "Qwen/Qwen2-VL-72B-Instruct",
    ],
    category: "multi",
  },
  {
    platform: "tencent",
    name: "腾讯混元",
    baseUrl: "https://hunyuan-prod-igmr.tencentcloudapi.com",
    description: "腾讯混元大模型，支持对话和图片理解",
    services: ["对话", "图片理解"],
    models: [
      "hunyuan-pro",
      "hunyuan-standard",
      "hunyuan-lite",
    ],
    category: "chat",
  },
  {
    platform: "baidu",
    name: "百度文心一言",
    baseUrl: "https://qianfan.baidubce.com/v2",
    description: "百度文心大模型，支持对话和图片理解",
    services: ["对话", "图片理解"],
    models: [
      "ernie-4.0-8k-latest",
      "ernie-4.0-turbo-8k",
      "ernie-3.5-8k",
      "ernie-vl-pro-128k",
    ],
    category: "chat",
  },
  {
    platform: "iflytek",
    name: "讯飞星火",
    baseUrl: "https://spark-api.xf-yun.com/v3.5/chat",
    description: "讯飞星火大模型，支持对话和多模态",
    services: ["对话", "图片理解"],
    models: [
      "generalv3.5",
      "generalv3",
      "generalv2",
      "general",
    ],
    category: "chat",
  },
  {
    platform: "minimax",
    name: "海螺AI",
    baseUrl: "https://api.minimax.chat/v1",
    description: "MiniMax 海螺视频/对话模型",
    services: ["对话", "视频生成"],
    models: [
      "MiniMax-Text-01",
      "MiniMax-VL-01",
      "video-01",
      "video-01-live",
    ],
    category: "multi",
  },
  {
    platform: "luma",
    name: "Luma AI",
    baseUrl: "https://api.lumalabs.ai/dream-machine/v1",
    description: "Luma Dream Machine 视频生成",
    services: ["视频生成"],
    models: ["luma-video-api", "luma-video-extend-api"],
    category: "video",
  },
  {
    platform: "runway",
    name: "Runway",
    baseUrl: "https://api.runwayml.com/v1",
    description: "Runway Gen 系列视频生成",
    services: ["视频生成"],
    models: ["gen3a_turbo", "gen3_video_turbo"],
    category: "video",
  },

  // ========== 自定义 ==========
  {
    platform: "custom",
    name: "自定义 API",
    baseUrl: "",
    description: "添加任意的 OpenAI 兼容 API 供应商",
    services: [],
    models: [],
    category: "multi",
  },
];

// 获取分类显示名称
export function getCategoryName(category: PlatformPreset['category']): string {
  const names: Record<PlatformPreset['category'], string> = {
    video: '视频生成',
    chat: '对话模型',
    image: '图像生成',
    multi: '多模态',
  };
  return names[category];
}

// 获取分类图标
export function getCategoryIcon(category: PlatformPreset['category']): string {
  const icons: Record<PlatformPreset['category'], string> = {
    video: '🎬',
    chat: '💬',
    image: '🎨',
    multi: '🌟',
  };
  return icons[category];
}

interface AddProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (provider: Omit<IProvider, "id">) => void;
  existingPlatforms?: string[];
}

export function AddProviderDialog({
  open,
  onOpenChange,
  onSubmit,
  existingPlatforms = [],
}: AddProviderDialogProps) {
  const [platform, setPlatform] = useState("");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  // Get selected preset
  const selectedPreset = PLATFORM_PRESETS.find((p) => p.platform === platform);
  const isCustom = platform === "custom";

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPlatform("");
      setName("");
      setBaseUrl("");
      setApiKey("");
      setModel("");
    }
  }, [open]);

  // Auto-fill when platform changes
  useEffect(() => {
    if (selectedPreset && !isCustom) {
      setName(selectedPreset.name);
      setBaseUrl(selectedPreset.baseUrl);
      // 自动填充默认模型
      if (selectedPreset.models && selectedPreset.models.length > 0) {
        setModel(selectedPreset.models[0]);
      }
    }
  }, [platform, selectedPreset, isCustom]);

  // Filter out already existing platforms (except custom and memefast which allow repeat add)
  const availablePlatforms = PLATFORM_PRESETS.filter(
    (p) => p.platform === "custom" || p.platform === "memefast" || !existingPlatforms.includes(p.platform)
  );
  const isMemefastAppend = platform === "memefast" && existingPlatforms.includes("memefast");

  const handleSubmit = () => {
    if (!platform) {
      toast.error("请选择平台");
      return;
    }
    if (!name.trim()) {
      toast.error("请输入名称");
      return;
    }
    if (isCustom && !baseUrl.trim()) {
      toast.error("自定义平台需要输入 Base URL");
      return;
    }
    if (!apiKey.trim()) {
      toast.error("请输入 API Key");
      return;
    }

    // 保存该平台的所有预设模型，确保 provider.model 不为空
    const presetModels = selectedPreset?.models || [];
    const modelArray = presetModels.length > 0 
      ? presetModels 
      : (model ? [model] : []);
    
    onSubmit({
      platform,
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: modelArray,
    });

    onOpenChange(false);
    toast.success(isMemefastAppend ? `已追加 Key 到 ${name}` : `已添加 ${name}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>添加 API 供应商</DialogTitle>
          <DialogDescription className="hidden">添加一个新的 API 供应商</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>选择供应商</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent>
                {/* 视频/多模态厂商 */}
                <SelectGroup>
                  <SelectLabel>🎬 视频/多模态厂商</SelectLabel>
                </SelectGroup>
                <SelectItem value="doubao">火山引擎豆包</SelectItem>
                <SelectItem value="runninghub">RunningHub</SelectItem>
                <SelectItem value="luma">Luma AI</SelectItem>
                <SelectItem value="runway">Runway</SelectItem>
                <SelectItem value="minimax">海螺AI</SelectItem>
                
                {/* 大模型厂商 */}
                <SelectGroup>
                  <SelectLabel>💬 大模型厂商</SelectLabel>
                </SelectGroup>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                <SelectItem value="google">Google AI (Gemini)</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="qwen">阿里云百炼 (Qwen)</SelectItem>
                <SelectItem value="zhipu">智谱 AI (GLM)</SelectItem>
                <SelectItem value="siliconflow">硅基流动</SelectItem>
                <SelectItem value="tencent">腾讯混元</SelectItem>
                <SelectItem value="baidu">百度文心一言</SelectItem>
                <SelectItem value="iflytek">讯飞星火</SelectItem>
                
                {/* 自定义 */}
                <SelectGroup>
                  <SelectLabel>⚙️ 其他</SelectLabel>
                </SelectGroup>
                <SelectItem value="custom">自定义 API</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="供应商名称"
            />
          </div>

          {/* Base URL (only for custom or editable) */}
          {(isCustom || platform) && (
            <div className="space-y-2">
              <Label>Base URL {!isCustom && "(可选修改)"}</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={isCustom ? "https://api.example.com/v1" : ""}
              />
            </div>
          )}

          {/* API Key */}
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入 API Key"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              支持多个 Key，用逗号分隔
            </p>
          </div>

          {/* Model - optional input */}
          <div className="space-y-2">
            <Label>模型 (可选)</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="输入模型名称，如 gpt-4o"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>{isMemefastAppend ? "追加 Key" : "添加"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
