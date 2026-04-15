// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * SmartMatchSuggestions Component
 * 
 * 显示智能匹配推荐，支持一键关联
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  Sparkles,
  Link2,
  User,
  MapPin,
  Check,
  X,
  ChevronRight,
  AlertCircle,
  ThumbsUp,
  Lightbulb,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { CharacterMatchResult, SceneMatchResult } from "@/lib/script/smart-resource-matcher";

// ==================== 类型定义 ====================

interface SmartMatchSuggestionsProps {
  /** 角色匹配结果 */
  characterMatches?: Map<string, CharacterMatchResult[]>;
  /** 场景匹配结果 */
  sceneMatches?: Map<string, SceneMatchResult[]>;
  /** 剧本角色名称映射 */
  characterNames?: Map<string, string>;
  /** 剧本场景名称映射 */
  sceneNames?: Map<string, string>;
  /** 关联回调 */
  onLinkCharacter?: (scriptCharId: string, libraryCharId: string) => void;
  /** 关联回调 */
  onLinkScene?: (scriptSceneId: string, librarySceneId: string) => void;
  /** 全部忽略回调 */
  onIgnoreAll?: () => void;
  /** 是否显示详细视图 */
  detailed?: boolean;
  /** 最小推荐分数 */
  minRecommendedScore?: number;
}

// ==================== 匹配度徽章 ====================

function MatchScoreBadge({ score }: { score: number }) {
  const getConfig = (s: number) => {
    if (s >= 80) return { variant: "default" as const, label: "高度匹配", className: "bg-green-500" };
    if (s >= 60) return { variant: "secondary" as const, label: "良好匹配", className: "bg-blue-500" };
    if (s >= 40) return { variant: "outline" as const, label: "一般匹配", className: "" };
    return { variant: "ghost" as const, label: "弱匹配", className: "" };
  };
  
  const config = getConfig(score);
  
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label} {score}%
    </Badge>
  );
}

// ==================== 单个匹配项 ====================

interface MatchItemProps {
  /** 剧本资源ID */
  scriptId: string;
  /** 剧本资源名称 */
  scriptName: string;
  /** 匹配结果 */
  match: CharacterMatchResult | SceneMatchResult;
  /** 类型 */
  type: "character" | "scene";
  /** 关联回调 */
  onLink: (scriptId: string, libraryId: string) => void;
  /** 忽略回调 */
  onIgnore: (scriptId: string) => void;
}

function MatchItem({ scriptId, scriptName, match, type, onLink, onIgnore }: MatchItemProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = type === "character" ? User : MapPin;
  
  return (
    <div className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate" title={scriptName}>
              {scriptName}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate">
              → {match.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <MatchScoreBadge score={match.score} />
        </div>
      </div>
      
      {/* 匹配原因 */}
      {match.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {match.reasons.slice(0, 3).map((reason, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {reason}
            </Badge>
          ))}
        </div>
      )}
      
      {/* 操作按钮 */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs"
          onClick={() => onLink(scriptId, match.libraryId)}
        >
          <Link2 className="h-3 w-3 mr-1" />
          关联
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起" : "详情"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground ml-auto"
          onClick={() => onIgnore(scriptId)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      {/* 详细匹配特征 */}
      {expanded && (
        <div className="pt-2 border-t space-y-1">
          <p className="text-xs text-muted-foreground">匹配特征详情：</p>
          {Object.entries(match.matchedFeatures).map(([key, value]) => {
            if (value === undefined) return null;
            return (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground capitalize">{key}</span>
                <div className="flex items-center gap-2">
                  <Progress value={value} className="w-16 h-1.5" />
                  <span className="text-muted-foreground w-8">{value}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== 推荐摘要 ====================

interface MatchSummaryProps {
  totalCharacters: number;
  matchedCharacters: number;
  totalScenes: number;
  matchedScenes: number;
  onViewDetails?: () => void;
}

function MatchSummary({ 
  totalCharacters, 
  matchedCharacters, 
  totalScenes, 
  matchedScenes,
  onViewDetails 
}: MatchSummaryProps) {
  const charPercent = totalCharacters > 0 ? Math.round((matchedCharacters / totalCharacters) * 100) : 0;
  const scenePercent = totalScenes > 0 ? Math.round((matchedScenes / totalScenes) * 100) : 0;
  
  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-sm">智能匹配推荐</CardTitle>
        </div>
        <CardDescription className="text-xs">
          发现 {matchedCharacters} 个可关联角色和 {matchedScenes} 个可关联场景
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              角色
            </span>
            <span className="text-muted-foreground">
              {matchedCharacters}/{totalCharacters} ({charPercent}%)
            </span>
          </div>
          <Progress value={charPercent} className="h-2" />
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              场景
            </span>
            <span className="text-muted-foreground">
              {matchedScenes}/{totalScenes} ({scenePercent}%)
            </span>
          </div>
          <Progress value={scenePercent} className="h-2" />
        </div>
        
        {onViewDetails && (
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full mt-2"
            onClick={onViewDetails}
          >
            <Lightbulb className="h-3 w-3 mr-1" />
            查看详情并关联
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 主组件 ====================

export function SmartMatchSuggestions({
  characterMatches,
  sceneMatches,
  characterNames,
  sceneNames,
  onLinkCharacter,
  onLinkScene,
  onIgnoreAll,
  detailed = false,
  minRecommendedScore = 50,
}: SmartMatchSuggestionsProps) {
  const [activeTab, setActiveTab] = useState<"character" | "scene">("character");
  const [ignoredChars, setIgnoredChars] = useState<Set<string>>(new Set());
  const [ignoredScenes, setIgnoredScenes] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // 计算统计数据
  const charMatchesArray = characterMatches ? Array.from(characterMatches.entries()) : [];
  const sceneMatchesArray = sceneMatches ? Array.from(sceneMatches.entries()) : [];
  
  const totalCharacters = charMatchesArray.length;
  const totalScenes = sceneMatchesArray.length;
  
  // 过滤被忽略的
  const visibleCharMatches = charMatchesArray.filter(([id]) => !ignoredChars.has(id));
  const visibleSceneMatches = sceneMatchesArray.filter(([id]) => !ignoredScenes.has(id));
  
  // 获取最佳匹配数量
  const matchedCharacters = visibleCharMatches.filter(([, matches]) => 
    matches.length > 0 && matches[0].score >= minRecommendedScore
  ).length;
  const matchedScenes = visibleSceneMatches.filter(([, matches]) => 
    matches.length > 0 && matches[0].score >= minRecommendedScore
  ).length;
  
  // 如果没有匹配结果，不显示
  if (totalCharacters === 0 && totalScenes === 0) {
    return null;
  }
  
  // 处理忽略
  const handleIgnoreChar = (charId: string) => {
    setIgnoredChars(prev => new Set([...prev, charId]));
  };
  
  const handleIgnoreScene = (sceneId: string) => {
    setIgnoredScenes(prev => new Set([...prev, sceneId]));
  };
  
  // 处理关联
  const handleLinkCharacter = (scriptId: string, libraryId: string) => {
    onLinkCharacter?.(scriptId, libraryId);
    setIgnoredChars(prev => new Set([...prev, scriptId]));
    toast.success("角色关联成功！");
  };
  
  const handleLinkScene = (scriptId: string, libraryId: string) => {
    onLinkScene?.(scriptId, libraryId);
    setIgnoredScenes(prev => new Set([...prev, scriptId]));
    toast.success("场景关联成功！");
  };
  
  // 简略视图
  if (!detailed) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
          >
            <Zap className="h-4 w-4 text-amber-500" />
            智能匹配
            {(matchedCharacters > 0 || matchedScenes > 0) && (
              <Badge variant="secondary" className="ml-1">
                {matchedCharacters + matchedScenes}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              智能匹配推荐
            </DialogTitle>
            <DialogDescription>
              自动分析剧本中的角色和场景，与角色库/场景库进行智能匹配
            </DialogDescription>
          </DialogHeader>
          
          <MatchSummaryContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            visibleCharMatches={visibleCharMatches}
            visibleSceneMatches={visibleSceneMatches}
            characterNames={characterNames}
            sceneNames={sceneNames}
            onIgnoreChar={handleIgnoreChar}
            onIgnoreScene={handleIgnoreScene}
            onLinkCharacter={handleLinkCharacter}
            onLinkScene={handleLinkScene}
          />
        </DialogContent>
      </Dialog>
    );
  }
  
  // 详细视图
  return (
    <div className="space-y-4">
      <MatchSummary
        totalCharacters={totalCharacters}
        matchedCharacters={matchedCharacters}
        totalScenes={totalScenes}
        matchedScenes={matchedScenes}
      />
      
      <MatchSummaryContent
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        visibleCharMatches={visibleCharMatches}
        visibleSceneMatches={visibleSceneMatches}
        characterNames={characterNames}
        sceneNames={sceneNames}
        onIgnoreChar={handleIgnoreChar}
        onIgnoreScene={handleIgnoreScene}
        onLinkCharacter={handleLinkCharacter}
        onLinkScene={handleLinkScene}
      />
    </div>
  );
}

// ==================== 内部内容组件 ====================

interface MatchSummaryContentProps {
  activeTab: "character" | "scene";
  setActiveTab: (tab: "character" | "scene") => void;
  visibleCharMatches: Array<[string, CharacterMatchResult[]]>;
  visibleSceneMatches: Array<[string, SceneMatchResult[]]>;
  characterNames?: Map<string, string>;
  sceneNames?: Map<string, string>;
  onIgnoreChar: (id: string) => void;
  onIgnoreScene: (id: string) => void;
  onLinkCharacter: (scriptId: string, libraryId: string) => void;
  onLinkScene: (scriptId: string, libraryId: string) => void;
}

function MatchSummaryContent({
  activeTab,
  setActiveTab,
  visibleCharMatches,
  visibleSceneMatches,
  characterNames,
  sceneNames,
  onIgnoreChar,
  onIgnoreScene,
  onLinkCharacter,
  onLinkScene,
}: MatchSummaryContentProps) {
  const charMatches = visibleCharMatches.flatMap(([, matches]) => matches.slice(0, 2));
  const sceneMatches = visibleSceneMatches.flatMap(([, matches]) => matches.slice(0, 2));
  
  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "character" | "scene")}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="character" className="gap-1">
          <User className="h-3 w-3" />
          角色 ({visibleCharMatches.length})
        </TabsTrigger>
        <TabsTrigger value="scene" className="gap-1">
          <MapPin className="h-3 w-3" />
          场景 ({visibleSceneMatches.length})
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="character" className="mt-3">
        {visibleCharMatches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>所有角色都已关联，或没有找到匹配项</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {visibleCharMatches.map(([scriptId, matches]) => {
                const scriptName = characterNames?.get(scriptId) || scriptId;
                const topMatch = matches[0];
                return (
                  <MatchItem
                    key={scriptId}
                    scriptId={scriptId}
                    scriptName={scriptName}
                    match={topMatch}
                    type="character"
                    onLink={onLinkCharacter}
                    onIgnore={onIgnoreChar}
                  />
                );
              })}
            </div>
          </ScrollArea>
        )}
      </TabsContent>
      
      <TabsContent value="scene" className="mt-3">
        {visibleSceneMatches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>所有场景都已关联，或没有找到匹配项</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {visibleSceneMatches.map(([scriptId, matches]) => {
                const scriptName = sceneNames?.get(scriptId) || scriptId;
                const topMatch = matches[0];
                return (
                  <MatchItem
                    key={scriptId}
                    scriptId={scriptId}
                    scriptName={scriptName}
                    match={topMatch}
                    type="scene"
                    onLink={onLinkScene}
                    onIgnore={onIgnoreScene}
                  />
                );
              })}
            </div>
          </ScrollArea>
        )}
      </TabsContent>
    </Tabs>
  );
}

// ==================== 导出组件 ====================

export { MatchItem, MatchScoreBadge, MatchSummary };
