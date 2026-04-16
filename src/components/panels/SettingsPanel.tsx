// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * Settings Panel - Unified API Manager v2
 * Provider-based API configuration with multi-key support
 * Based on AionUi's ModelModalContent pattern
 */

import { useState, useMemo, useEffect } from "react";
import {
  isVisibleImageHostProvider,
  useAPIConfigStore,
  type IProvider,
  type ImageHostProvider,
  type AIFeature,
} from "@/stores/api-config-store";
import { useProjectStore } from "@/stores/project-store";
import { getApiKeyCount, parseApiKeys, maskApiKey } from "@/lib/api-key-manager";
import { AddProviderDialog, EditProviderDialog, FeatureBindingPanel } from "@/components/api-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Key,
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Shield,
  Check,
  X,
  Loader2,
  Zap,
  ScanEye,
  Info,
  Image,
  RotateCcw,
  Link2,
  Play,
  ShieldAlert,
  Layers,
  Sparkles,
  RefreshCw,
  Cloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { useApiKeyTester } from "@/hooks/use-api-key-tester";
import { Suspense, lazy } from "react";
import { CloudSyncTab } from "./cloud-sync/CloudSyncTab";

// 懒加载大型组件 - 代码分割优化
const AIAssistantPanel = lazy(() => import("@/components/AIAssistant").then(m => ({ default: m.AIAssistantPanel })));

// 加载占位符
function ComponentLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// Platform icon mapping
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  memefast: <Zap className="h-5 w-5" />,
  runninghub: <Image className="h-5 w-5" />,
  custom: <Settings className="h-5 w-5" />,
};

// 应用版本号
const APP_VERSION = '1.0.0';

export function SettingsPanel() {
  const {
    providers,
    concurrency,
    advancedOptions,
    setConcurrency,
    setAdvancedOption,
    resetAdvancedOptions,
    syncProviderModels,
    setFeatureBindings,
    getFeatureBindings,
    addProvider,
    updateProvider,
    removeProvider,
  } = useAPIConfigStore();
  const { isAuthenticated } = useAuthStore();
  const { testKey } = useApiKeyTester();

  const [activeTab, setActiveTab] = useState("ai-assistant");
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<IProvider | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  // ====== Memefast 默认绑定自动补全 ======
  // 覆盖场景：
  //  1. 旧版本升级后已有 key 但 featureBindings 为空
  //  2. 旧版本留下无效绑定（模型名错、provider ID 变更等）
  //  3. 用户编辑填 key 后页面刷新
  useEffect(() => {
    const mf = providers.find(p => p.platform === 'memefast');
    if (!mf || parseApiKeys(mf.apiKey).length === 0) return;

    const pid = mf.id;
    const models = mf.model || [];
    const defaults: Record<string, string> = {
      script_analysis: `${pid}:deepseek-v3.2`,
      character_generation: `${pid}:gemini-3-pro-image-preview`,
      video_generation: `${pid}:doubao-seedance-2-0-pro-t2v-260610`,
      image_understanding: `${pid}:gemini-2.5-flash`,
    };

    // 检查绑定是否有效
    const isBindingValid = (b: string): boolean => {
      const idx = b.indexOf(':');
      if (idx <= 0) return false;
      const ref = b.slice(0, idx);
      const model = b.slice(idx + 1);
      const p = providers.find(pv => pv.id === ref || pv.platform === ref);
      if (!p || parseApiKeys(p.apiKey).length === 0) return false;
      // 模型列表为空时（尚未同步）暂时信任绑定
      if (p.model.length === 0) return true;
      return p.model.includes(model);
    };

    let changed = false;
    for (const [feature, binding] of Object.entries(defaults)) {
      const cur = getFeatureBindings(feature as AIFeature);

      // 自愈：deepseek-v3 → deepseek-v3.2（在校验之前先迁移）
      if (feature === 'script_analysis' && cur && cur.some(b => b.endsWith(':deepseek-v3'))) {
        const migrated = cur.map(b => {
          if (!b.endsWith(':deepseek-v3')) return b;
          const i = b.indexOf(':');
          return i > 0 ? `${b.slice(0, i)}:deepseek-v3.2` : binding;
        });
        setFeatureBindings(feature as AIFeature, [...new Set(migrated)]);
        changed = true;
        continue;
      }

      // 为空 或 全部无效 → 重新设置默认值
      const needsDefault = !cur || cur.length === 0 || !cur.some(isBindingValid);
      if (needsDefault) {
        setFeatureBindings(feature as AIFeature, [binding]);
        changed = true;
      }
    }
    if (changed) {
      console.log('[SettingsPanel] Auto-applied memefast default bindings');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers]);

  // Toggle provider expansion
  const toggleExpanded = (id: string) => {
    setExpandedProviders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open edit dialog
  const handleEdit = (provider: IProvider) => {
    setEditingProvider(provider);
    setEditDialogOpen(true);
  };

  // Delete provider
  const handleDelete = (id: string) => {
    removeProvider(id);
    toast.success("已删除供应商");
  };

  // Get existing platforms
  const existingPlatforms = useMemo(
    () => providers.map((p) => p.platform),
    [providers]
  );

  const configuredCount = providers.filter(
    (p) => parseApiKeys(p.apiKey).length > 0
  ).length;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-border bg-panel px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-3">
            <Settings className="w-5 h-5 text-primary" />
            设置
          </h2>
        </div>
        {activeTab === "api" && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono bg-muted border border-border px-2 py-1 rounded">
              已配置: {configuredCount}/{providers.length}
            </span>
            <Button onClick={() => setAddDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              添加供应商
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-6">
          <TabsList className="h-12 bg-transparent p-0 gap-4">
            <TabsTrigger 
              value="ai-assistant" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI 助手
            </TabsTrigger>
            <TabsTrigger 
              value="api" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12"
            >
              <Key className="h-4 w-4 mr-2" />
              API 供应商
            </TabsTrigger>
            <TabsTrigger 
              value="cloud-sync" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12"
            >
              <Cloud className="h-4 w-4 mr-2" />
              云端同步
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12"
            >
              <Layers className="h-4 w-4 mr-2" />
              高级设置
            </TabsTrigger>
          </TabsList>
        </div>

        {/* AI Assistant Tab */}
        <TabsContent value="ai-assistant" className="flex-1 overflow-hidden mt-0">
          <Suspense fallback={<ComponentLoader />}>
            <AIAssistantPanel />
          </Suspense>
        </TabsContent>

        {/* Cloud Sync Tab */}
        <TabsContent value="cloud-sync" className="flex-1 overflow-hidden mt-0">
          <CloudSyncTab />
        </TabsContent>

        {/* API Management Tab */}
        <TabsContent value="api" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-8 max-w-5xl mx-auto space-y-8">
          {/* Security Notice */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg">
            <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium text-foreground text-sm">安全说明</h3>
              <p className="text-xs text-muted-foreground mt-1">
                所有 API Key 仅存储在您的浏览器本地存储中，不会上传到任何服务器。支持多 Key 轮换，失败时自动切换。
              </p>
            </div>
          </div>

          {/* Feature Binding */}
          <FeatureBindingPanel />

          {/* Provider List */}
          <div className="space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Key className="h-4 w-4" />
              API 供应商
            </h3>

            {providers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-xl">
                <Info className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  尚未配置任何供应商
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  请添加您的 API 供应商以开始使用
                </p>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  添加供应商
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {providers.map((provider) => {
                  const isExpanded = expandedProviders[provider.id] ?? false;
                  const keyCount = getApiKeyCount(provider.apiKey);
                  const configured = keyCount > 0;

                  return (
                    <Collapsible
                      key={provider.id}
                      open={isExpanded}
                      onOpenChange={() => toggleExpanded(provider.id)}
                    >
                      <div
                        className={cn(
                          "border rounded-xl transition-all",
                          configured
                            ? "bg-card border-primary/30"
                            : "bg-card border-border"
                        )}
                      >
                        {/* Header */}
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 hover:bg-muted/30 rounded-t-xl transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "p-2 rounded-lg",
                                  configured
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {PLATFORM_ICONS[provider.platform] || (
                                  <Settings className="h-5 w-5" />
                                )}
                              </div>
                              <div className="text-left">
                                <h4 className="font-medium text-foreground flex items-center gap-2">
                                  {provider.name}
                                  {provider.platform === 'memefast' && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded font-normal">
                                      推荐
                                    </span>
                                  )}
                                  {configured && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-normal">
                                      已配置
                                    </span>
                                  )}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {provider.platform}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span
                                  className="cursor-pointer hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpanded(provider.id);
                                  }}
                                >
                                  模型 ({provider.model.length})
                                </span>
                                <span>|</span>
                                <span
                                  className="cursor-pointer hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(provider);
                                  }}
                                >
                                  Key ({keyCount})
                                </span>
                              </div>

                              <div
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {configured && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="测试 API Keys"
                                    onClick={async () => {
                                      const result = await testKey(provider.apiKey, provider);
                                      if (result.valid) {
                                        toast.success(`API Keys 有效 (${result.responseTime}ms)`);
                                      } else {
                                        toast.error(result.message || 'API Keys 无效');
                                      }
                                    }}
                                  >
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                )}

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="同步模型列表"
                                  onClick={async () => {
                                    setSyncingProvider(provider.id);
                                    const result = await syncProviderModels(provider.id);
                                    setSyncingProvider(null);
                                    if (result.success) {
                                      toast.success(`已同步 ${result.count} 个模型`);
                                    } else {
                                      toast.error(result.error || '同步失败');
                                    }
                                  }}
                                  disabled={!configured || syncingProvider === provider.id}
                                >
                                  {syncingProvider === provider.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="编辑"
                                  onClick={() => handleEdit(provider)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        确认删除
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        确定要删除 {provider.name} 吗？此操作无法撤销。
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>取消</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(provider.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        删除
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>

                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        {/* Expandable Content */}
                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                            {/* Base URL */}
                            {provider.baseUrl && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">
                                  Base URL:{" "}
                                </span>
                                <span className="font-mono text-foreground">
                                  {provider.baseUrl}
                                </span>
                              </div>
                            )}

                            {/* Models */}
                            {provider.model.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {provider.model.map((m) => (
                                  <span
                                    key={m}
                                    className="text-xs px-2 py-1 bg-muted rounded font-mono"
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* API Key Preview */}
                            {configured && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">
                                  API Key:{" "}
                                </span>
                                <span className="font-mono text-foreground">
                                  {maskApiKey(parseApiKeys(provider.apiKey)[0])}
                                  {keyCount > 1 && (
                                    <span className="text-muted-foreground">
                                      {" "}
                                      (+{keyCount - 1} 个)
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>

          {/* Global Settings */}
          <div className="p-6 border border-border rounded-xl bg-card space-y-6">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" />
              全局设置
            </h3>

            {/* Concurrency */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">并发生成数</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  value={concurrency}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 1) setConcurrency(val);
                  }}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">
                  同时生成的任务数量（多 Key 时可设置更高，建议不超过 Key 数量）
                </span>
              </div>
            </div>
          </div>

              {/* About */}
              <div className="text-center py-8 text-muted-foreground border-t border-border">
                <p className="text-sm font-medium">JuBu AI</p>
                <p className="text-xs mt-1">v{APP_VERSION} · AI 驱动的动漫视频创作工具</p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Advanced Options Tab */}
        <TabsContent value="advanced" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-8 max-w-3xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    高级生成选项
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    这些选项影响 AI 导演板块的视频生成行为
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    resetAdvancedOptions();
                    toast.success("已恢复默认设置");
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  恢复默认
                </Button>
              </div>

              {/* Options List */}
              <div className="space-y-4">
                {/* Visual Continuity */}
                <div className="p-4 border border-border rounded-xl bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <Link2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">视觉连续性</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          自动将上一分镜的尾帧传递给下一分镜作为参考图，保持视觉风格和角色外观的一致性
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          推荐开启 · 适合连续叙事和长视频创作
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={advancedOptions.enableVisualContinuity}
                      onCheckedChange={(checked) => setAdvancedOption('enableVisualContinuity', checked)}
                    />
                  </div>
                </div>

                {/* Resume Generation */}
                <div className="p-4 border border-border rounded-xl bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <Play className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">断点续传</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          批量生成中断后可从上次位置继续，不需要重新开始
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          推荐开启 · 防止网络中断或 API 超时导致进度丢失
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={advancedOptions.enableResumeGeneration}
                      onCheckedChange={(checked) => setAdvancedOption('enableResumeGeneration', checked)}
                    />
                  </div>
                </div>

                {/* Content Moderation */}
                <div className="p-4 border border-border rounded-xl bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <ShieldAlert className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">内容审核容错</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          遇到敏感内容时自动跳过该分镜，继续生成其他分镜
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          推荐开启 · 避免单个分镜失败导致整个流程中断
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={advancedOptions.enableContentModeration}
                      onCheckedChange={(checked) => setAdvancedOption('enableContentModeration', checked)}
                    />
                  </div>
                </div>

                {/* Auto Model Switch */}
                <div className="p-4 border border-border rounded-xl bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground mt-0.5">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">多模型自动切换</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          首分镜使用文生视频 (t2v)，后续分镜使用图生视频 (i2v)
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          默认关闭 · 需要配置多个模型才能使用
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={advancedOptions.enableAutoModelSwitch}
                      onCheckedChange={(checked) => setAdvancedOption('enableAutoModelSwitch', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Info Notice */}
              <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    这些选项会影响 AI 导演板块的视频生成行为。如果你不确定某个选项的作用，建议保持默认设置。
                  </p>
                </div>
              </div>

              {/* About */}
              <div className="text-center py-8 text-muted-foreground border-t border-border">
                <p className="text-sm font-medium">JuBu AI</p>
                <p className="text-xs mt-1">v{APP_VERSION} · AI 驱动的动漫视频创作工具</p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddProviderDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(providerData) => {
          // JuBu API：已存在时合并 Key，不重复创建
          const existingMemefast = providerData.platform === 'memefast'
            ? providers.find((p) => p.platform === 'memefast')
            : null;
          let provider: IProvider;
          if (existingMemefast) {
            const oldKeys = parseApiKeys(existingMemefast.apiKey);
            const newKeys = parseApiKeys(providerData.apiKey);
            const merged = Array.from(new Set([...oldKeys, ...newKeys]));
            updateProvider({ ...existingMemefast, apiKey: merged.join(',') });
            provider = existingMemefast;
          } else {
            provider = addProvider(providerData);
          }
          // 如果添加的是 memefast 供应商，自动设置默认服务映射（仅在对应服务尚未配置时）
          if (providerData.platform === 'memefast') {
            // 使用 provider.id（而非 platform 字符串）避免多供应商时的歧义解析
            const pid = provider.id;
            const MEMEFAST_DEFAULT_BINDINGS: Record<string, string> = {
              // NOTE: MemeFast 端点已升级，旧的 deepseek-v3 已不在列表中，改用 deepseek-v3.2
              script_analysis: `${pid}:deepseek-v3.2`,
              character_generation: `${pid}:gemini-3-pro-image-preview`,
              video_generation: `${pid}:doubao-seedance-2-0-pro-t2v-260610`,
              image_understanding: `${pid}:gemini-2.5-flash`,
            };
            for (const [feature, binding] of Object.entries(MEMEFAST_DEFAULT_BINDINGS)) {
              const current = getFeatureBindings(feature as AIFeature);
              // 仅在未配置时设置默认值，避免覆盖用户手动选择
              if (!current || current.length === 0) {
                setFeatureBindings(feature as AIFeature, [binding]);
                continue;
              }
              // 自愈：旧默认 deepseek-v3 -> deepseek-v3.2（尽量不破坏多选配置）
              if (feature === 'script_analysis') {
                const hasOld = current.some((b) => b.endsWith(':deepseek-v3'));
                if (hasOld) {
                  const migrated = current.map((b) => {
                    if (!b.endsWith(':deepseek-v3')) return b;
                    const idx = b.indexOf(':');
                    if (idx <= 0) return binding;
                    const prefix = b.slice(0, idx);
                    return `${prefix}:deepseek-v3.2`;
                  });
                  const deduped = Array.from(new Set(migrated));
                  setFeatureBindings(feature as AIFeature, deduped);
                }
              }
            }
          }
          // 添加后自动同步模型列表和端点元数据
          const finalProviderId = existingMemefast ? existingMemefast.id : provider.id;
          if (parseApiKeys(providerData.apiKey).length > 0) {
            setSyncingProvider(finalProviderId);
            syncProviderModels(finalProviderId).then(result => {
              setSyncingProvider(null);
              if (result.success) {
                toast.success(`已自动同步 ${result.count} 个模型`);
              } else if (result.error) {
                toast.error(`模型同步失败: ${result.error}`);
              }
            });
          }
        }}
        existingPlatforms={existingPlatforms}
      />

      <EditProviderDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        provider={editingProvider}
        onSave={(provider) => {
          updateProvider(provider);

          // 编辑 memefast 时也自动设置默认服务映射：初始状态会预置一个空 key 的 memefast，
          // 用户通常是“编辑填 key”，如果不在这里补默认映射，会导致服务映射一直是 0/6。
          if (provider.platform === 'memefast' && parseApiKeys(provider.apiKey).length > 0) {
            const pid = provider.id;
            const MEMEFAST_DEFAULT_BINDINGS: Record<string, string> = {
              // NOTE: MemeFast 端点已升级，旧的 deepseek-v3 已不在列表中，改用 deepseek-v3.2
              script_analysis: `${pid}:deepseek-v3.2`,
              character_generation: `${pid}:gemini-3-pro-image-preview`,
              video_generation: `${pid}:doubao-seedance-2-0-pro-t2v-260610`,
              image_understanding: `${pid}:gemini-2.5-flash`,
            };
            for (const [feature, binding] of Object.entries(MEMEFAST_DEFAULT_BINDINGS)) {
              const current = getFeatureBindings(feature as AIFeature);
              if (!current || current.length === 0) {
                setFeatureBindings(feature as AIFeature, [binding]);
                continue;
              }
              // 自愈：旧默认 deepseek-v3 -> deepseek-v3.2
              if (feature === 'script_analysis') {
                const hasOld = current.some((b) => b.endsWith(':deepseek-v3'));
                if (hasOld) {
                  const migrated = current.map((b) => {
                    if (!b.endsWith(':deepseek-v3')) return b;
                    const idx = b.indexOf(':');
                    if (idx <= 0) return binding;
                    const prefix = b.slice(0, idx);
                    return `${prefix}:deepseek-v3.2`;
                  });
                  const deduped = Array.from(new Set(migrated));
                  setFeatureBindings(feature as AIFeature, deduped);
                }
              }
            }
          }
          // 编辑保存后自动同步模型列表和端点元数据
          if (parseApiKeys(provider.apiKey).length > 0) {
            setSyncingProvider(provider.id);
            syncProviderModels(provider.id).then(result => {
              setSyncingProvider(null);
              if (result.success) {
                toast.success(`已自动同步 ${result.count} 个模型`);
              } else if (result.error) {
                toast.error(`模型同步失败: ${result.error}`);
              }
            });
          }
        }}
      />
    </div>
  );
}
