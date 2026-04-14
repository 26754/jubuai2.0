// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 项目统计面板
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Grid3X3,
  FileText,
  Image,
  Video,
  Clock,
  Calendar,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Star,
  Eye,
  Heart,
  Share2,
  Settings,
  Filter,
  PieChart,
  Activity,
  Layers,
  Target,
  Zap,
  Sparkles,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export interface ProjectStats {
  // 基础统计
  totalProjects: number;
  totalScripts: number;
  totalCharacters: number;
  totalScenes: number;
  totalShots: number;
  totalMedia: number;
  
  // 内容统计
  totalWords: number;
  totalDuration: number;        // 总时长（秒）
  totalImages: number;
  totalVideos: number;
  
  // 时间统计
  totalTimeSpent: number;        // 花费时间（分钟）
  lastActivity: Date | null;
  creationTrend: { date: string; count: number }[];
  activityTrend: { date: string; count: number }[];
  
  // 质量指标
  avgScriptLength: number;
  avgShotsPerScene: number;
  completionRate: number;
}

export interface CharacterStats {
  id: string;
  name: string;
  appearanceCount: number;
  lineCount: number;
  lastAppearance: Date | null;
  avgSceneDuration: number;
}

export interface SceneStats {
  id: string;
  name: string;
  shotCount: number;
  imageCount: number;
  duration: number;
  lastModified: Date;
}

export interface TagStats {
  tag: string;
  count: number;
  category: string;
}

// ==================== 图表组件 ====================

interface MiniBarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export function MiniBarChart({ data, height = 100, color = 'hsl(var(--primary))' }: MiniBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((item, index) => (
        <TooltipProvider key={index}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex-1 rounded-t transition-all hover:opacity-80"
                style={{
                  height: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: color,
                  minHeight: '4px',
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{item.label}: {item.value}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export function ProgressRing({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color = 'hsl(var(--primary))',
  label,
  sublabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label !== undefined && (
          <span className="text-lg font-bold">{label}</span>
        )}
        {sublabel && (
          <span className="text-xs text-muted-foreground">{sublabel}</span>
        )}
      </div>
    </div>
  );
}

// ==================== 统计卡片 ====================

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  color?: string;
  description?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  color = 'text-primary',
  description,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <span className={cn(
                  'flex items-center text-xs',
                  trend.value >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--status-error))]'
                )}>
                  {trend.value >= 0 ? (
                    <ArrowUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <ArrowDown className="w-3 h-3 mr-0.5" />
                  )}
                  {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn('p-2 rounded-lg bg-muted', color)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 项目统计面板主组件 ====================

interface ProjectStatsPanelProps {
  stats: ProjectStats;
  characterStats?: CharacterStats[];
  sceneStats?: SceneStats[];
  tagStats?: TagStats[];
  onRefresh?: () => void;
  className?: string;
}

export function ProjectStatsPanel({
  stats,
  characterStats = [],
  sceneStats = [],
  tagStats = [],
  onRefresh,
  className,
}: ProjectStatsPanelProps) {
  const [activeView, setActiveView] = useState<'overview' | 'characters' | 'scenes' | 'timeline'>('overview');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  
  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };
  
  // 格式化时长
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          <h2 className="text-lg font-semibold">项目统计</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="year">本年</SelectItem>
            </SelectContent>
          </Select>
          {onRefresh && (
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* 视图切换 */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeView === 'overview' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('overview')}
        >
          <PieChart className="w-4 h-4 mr-1" />
          总览
        </Button>
        <Button
          variant={activeView === 'characters' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('characters')}
        >
          <Users className="w-4 h-4 mr-1" />
          角色
        </Button>
        <Button
          variant={activeView === 'scenes' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('scenes')}
        >
          <Grid3X3 className="w-4 h-4 mr-1" />
          场景
        </Button>
        <Button
          variant={activeView === 'timeline' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('timeline')}
        >
          <Activity className="w-4 h-4 mr-1" />
          时间线
        </Button>
      </div>
      
      {/* 总览视图 */}
      {activeView === 'overview' && (
        <div className="space-y-4">
          {/* 关键指标 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="项目总数"
              value={stats.totalProjects}
              icon={<FileText className="w-5 h-5" />}
              color="text-[hsl(var(--info))]"
            />
            <StatCard
              title="剧本字数"
              value={formatNumber(stats.totalWords)}
              icon={<FileText className="w-5 h-5" />}
              color="text-[hsl(var(--success))]"
              description="总计"
            />
            <StatCard
              title="生成图片"
              value={stats.totalImages}
              icon={<Image className="w-5 h-5" />}
              color="text-[hsl(var(--style-watercolor))]"
            />
            <StatCard
              title="分镜数量"
              value={stats.totalShots}
              icon={<Video className="w-5 h-5" />}
              color="text-[hsl(var(--warning))]"
            />
          </div>
          
          {/* 进度概览 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">完成进度</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ProgressRing
                  value={stats.completionRate}
                  max={100}
                  size={100}
                  color="hsl(var(--primary))"
                  label={`${stats.completionRate}%`}
                  sublabel="完成率"
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">内容分布</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">剧本</span>
                  <span className="text-sm font-medium">{stats.totalScripts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">角色</span>
                  <span className="text-sm font-medium">{stats.totalCharacters}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">场景</span>
                  <span className="text-sm font-medium">{stats.totalScenes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">分镜</span>
                  <span className="text-sm font-medium">{stats.totalShots}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">效率指标</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>平均剧本长度</span>
                    <span>{stats.avgScriptLength}字</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min((stats.avgScriptLength / 5000) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>平均每场景分镜</span>
                    <span>{stats.avgShotsPerScene.toFixed(1)}个</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min((stats.avgShotsPerScene / 10) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* 活动趋势 */}
          {stats.activityTrend.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  活动趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniBarChart
                  data={stats.activityTrend.slice(-14).map(d => ({
                    label: d.date.slice(5),
                    value: d.count,
                  }))}
                  height={120}
                  color="hsl(var(--primary))"
                />
              </CardContent>
            </Card>
          )}
          
          {/* 热门标签 */}
          {tagStats.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  热门标签
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tagStats.slice(0, 10).map((tag, index) => (
                    <Badge
                      key={tag.tag}
                      variant={index < 3 ? 'default' : 'secondary'}
                      className="cursor-pointer hover:bg-primary/80"
                    >
                      {tag.tag}
                      <span className="ml-1 text-xs opacity-70">{tag.count}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {/* 角色统计视图 */}
      {activeView === 'characters' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">角色出场统计</CardTitle>
            <CardDescription>按出场次数排序的角色列表</CardDescription>
          </CardHeader>
          <CardContent>
            {characterStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>暂无角色数据</p>
              </div>
            ) : (
              <div className="space-y-3">
                {characterStats.map((char) => (
                  <div key={char.id} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{char.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {char.lineCount} 台词
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>出场 {char.appearanceCount} 次</span>
                        <span>平均 {Math.round(char.avgSceneDuration / 60)}分钟/场</span>
                      </div>
                    </div>
                    <ProgressRing
                      value={char.appearanceCount}
                      max={Math.max(...characterStats.map(c => c.appearanceCount), 1)}
                      size={50}
                      strokeWidth={4}
                      color="hsl(var(--primary))"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* 场景统计视图 */}
      {activeView === 'scenes' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">场景统计</CardTitle>
            <CardDescription>各场景的分镜和时长分布</CardDescription>
          </CardHeader>
          <CardContent>
            {sceneStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Grid3X3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>暂无场景数据</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sceneStats.map((scene) => (
                  <div key={scene.id} className="p-3 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{scene.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(scene.duration)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          <Video className="w-3 h-3 mr-1" />
                          {scene.shotCount}
                        </Badge>
                        <Badge variant="outline">
                          <Image className="w-3 h-3 mr-1" />
                          {scene.imageCount}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(scene.shotCount / Math.max(...sceneStats.map(s => s.shotCount), 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* 时间线视图 */}
      {activeView === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">创建时间线</CardTitle>
            <CardDescription>项目内容的创建趋势</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.creationTrend.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>暂无时间线数据</p>
              </div>
            ) : (
              <div className="space-y-4">
                <MiniBarChart
                  data={stats.creationTrend.map(d => ({
                    label: d.date,
                    value: d.count,
                  }))}
                  height={150}
                  color="hsl(var(--primary))"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>最早: {stats.creationTrend[0]?.date}</span>
                  <span>最近: {stats.creationTrend[stats.creationTrend.length - 1]?.date}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== 快速统计小部件 ====================

interface QuickStatsWidgetProps {
  stats: ProjectStats;
  className?: string;
}

export function QuickStatsWidget({ stats, className }: QuickStatsWidgetProps) {
  const items = [
    { icon: <FileText className="w-4 h-4" />, value: stats.totalProjects, label: '项目' },
    { icon: <Users className="w-4 h-4" />, value: stats.totalCharacters, label: '角色' },
    { icon: <Grid3X3 className="w-4 h-4" />, value: stats.totalScenes, label: '场景' },
    { icon: <Video className="w-4 h-4" />, value: stats.totalShots, label: '分镜' },
  ];
  
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-muted-foreground">{item.icon}</span>
          <span className="font-medium">{item.value}</span>
          <span className="text-xs text-muted-foreground">{item.label}</span>
          {index < items.length - 1 && <Separator orientation="vertical" className="h-4" />}
        </div>
      ))}
    </div>
  );
}

// ==================== 导出统计报告 ====================

interface ExportStatsDialogProps {
  stats: ProjectStats;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportStatsDialog({ stats, open, onOpenChange }: ExportStatsDialogProps) {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [includeCharts, setIncludeCharts] = useState(true);
  
  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      stats,
      summary: {
        totalItems: stats.totalProjects + stats.totalScripts + stats.totalCharacters + stats.totalScenes,
        totalWords: stats.totalWords,
        completionRate: stats.completionRate,
      },
    };
    
    let content: string;
    let filename: string;
    let mimeType: string;
    
    if (format === 'json') {
      content = JSON.stringify(exportData, null, 2);
      filename = `jubuai-stats-${Date.now()}.json`;
      mimeType = 'application/json';
    } else {
      // CSV 格式
      const rows = [
        ['指标', '数值'],
        ['项目总数', stats.totalProjects],
        ['剧本总数', stats.totalScripts],
        ['角色总数', stats.totalCharacters],
        ['场景总数', stats.totalScenes],
        ['分镜总数', stats.totalShots],
        ['剧本字数', stats.totalWords],
        ['完成率', `${stats.completionRate}%`],
      ];
      content = rows.map(row => row.join(',')).join('\n');
      filename = `jubuai-stats-${Date.now()}.csv`;
      mimeType = 'text/csv';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    onOpenChange(false);
  };
  
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <h4 className="font-medium">导出格式</h4>
        <div className="flex gap-2">
          <Button
            variant={format === 'json' ? 'secondary' : 'outline'}
            onClick={() => setFormat('json')}
          >
            JSON
          </Button>
          <Button
            variant={format === 'csv' ? 'secondary' : 'outline'}
            onClick={() => setFormat('csv')}
          >
            CSV
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">包含图表数据</h4>
          <p className="text-xs text-muted-foreground">导出趋势和分布数据</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIncludeCharts(!includeCharts)}
        >
          {includeCharts ? '是' : '否'}
        </Button>
      </div>
      
      <Button onClick={handleExport} className="w-full">
        <Download className="w-4 h-4 mr-2" />
        导出统计报告
      </Button>
    </div>
  );
}
