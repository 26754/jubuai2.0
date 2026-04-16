// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 新版云端同步设置面板
 */

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { cloudSyncEngine, type CloudSyncSettings, type SyncStatus, type SyncStats, type SyncEvent, type ConflictItem, type SyncDataType } from "@/lib/cloud-sync-engine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { cloudAuth } from "@/lib/cloud-auth";
import {
  Cloud,
  CloudOff,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Clock,
  RefreshCw,
  Radio,
  Wifi,
  WifiOff,
  Settings2,
  Database,
  FileText,
  Users,
  Image,
  Trash2,
  ChevronRight,
  Download,
  Upload,
  Eye,
  History,
  BarChart3,
  Shield,
  Zap,
  Server,
  HardDrive,
  Activity,
} from "lucide-react";

// ==================== 图标映射 ====================

const DATA_TYPE_ICONS: Record<SyncDataType, React.ReactNode> = {
  projects: <FileText className="h-4 w-4" />,
  characters: <Users className="h-4 w-4" />,
  scenes: <Image className="h-4 w-4" />,
  settings: <Settings2 className="h-4 w-4" />,
};

const DATA_TYPE_NAMES: Record<SyncDataType, string> = {
  projects: '项目',
  characters: '角色',
  scenes: '场景',
  settings: '设置',
};

// ==================== 状态徽章 ====================

function StatusBadge({ status }: { status: SyncStatus }) {
  const config = {
    idle: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: '就绪' },
    syncing: { icon: Loader2, color: 'text-primary animate-spin', bg: 'bg-primary/10', label: '同步中' },
    paused: { icon: WifiOff, color: 'text-amber-500', bg: 'bg-amber-500/10', label: '已暂停' },
    error: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: '错误' },
    offline: { icon: CloudOff, color: 'text-muted-foreground', bg: 'bg-muted', label: '离线' },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full", bg)}>
      <Icon className={cn("h-4 w-4", color)} />
      <span className={cn("text-sm font-medium", color)}>{label}</span>
    </div>
  );
}

// ==================== 同步统计卡片 ====================

function SyncStatsCards({ stats }: { stats: SyncStats }) {
  const cards = [
    { label: '同步次数', value: stats.totalSyncs, icon: RefreshCw, color: 'text-blue-500' },
    { label: '上传项目', value: stats.totalUploaded, icon: Upload, color: 'text-green-500' },
    { label: '下载项目', value: stats.totalDownloaded, icon: Download, color: 'text-purple-500' },
    { label: '解决冲突', value: stats.conflictsResolved, icon: Shield, color: 'text-amber-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
        >
          <card.icon className={cn("h-5 w-5", card.color)} />
          <div>
            <div className="text-xl font-bold">{card.value}</div>
            <div className="text-xs text-muted-foreground">{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== 选择性同步开关 ====================

function SelectiveSyncToggle({
  dataType,
  enabled,
  onChange,
}: {
  dataType: SyncDataType;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        {DATA_TYPE_ICONS[dataType]}
        <span className="text-sm">{DATA_TYPE_NAMES[dataType]}</span>
      </div>
      <Switch checked={enabled} onCheckedChange={onChange} />
    </div>
  );
}

// ==================== 冲突项卡片 ====================

function ConflictCard({
  conflict,
  onResolve,
}: {
  conflict: ConflictItem;
  onResolve: (resolution: 'local' | 'cloud') => void;
}) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPreview = (data: unknown): string => {
    if (!data || typeof data !== 'object') return '无数据';
    const obj = data as Record<string, unknown>;
    if (obj.name) return String(obj.name);
    if (obj.title) return String(obj.title);
    if (obj.key) return String(obj.key);
    return '未知项目';
  };

  return (
    <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="font-medium">
            {DATA_TYPE_NAMES[conflict.dataType]} 冲突
          </span>
        </div>
        <Badge variant="outline" className="text-amber-500 border-amber-500/30">
          {conflict.id.slice(0, 8)}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 rounded bg-muted/50">
          <div className="text-xs text-muted-foreground mb-1">本地版本</div>
          <div className="text-sm font-medium truncate">
            {getPreview(conflict.localVersion)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatTime(conflict.localUpdatedAt)}
          </div>
        </div>
        <div className="p-2 rounded bg-muted/50">
          <div className="text-xs text-muted-foreground mb-1">云端版本</div>
          <div className="text-sm font-medium truncate">
            {getPreview(conflict.cloudVersion)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatTime(conflict.cloudUpdatedAt)}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onResolve('local')}
        >
          <Upload className="h-3 w-3 mr-1" />
          使用本地
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onResolve('cloud')}
        >
          <Download className="h-3 w-3 mr-1" />
          使用云端
        </Button>
      </div>
    </div>
  );
}

// ==================== 同步日志项 ====================

function LogItem({ event }: { event: SyncEvent }) {
  const config = {
    start: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    progress: { icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    conflict: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    conflict_resolved: { icon: Shield, color: 'text-green-500', bg: 'bg-green-500/10' },
  };

  const { icon: Icon, color, bg } = config[event.type];

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className={cn("flex items-start gap-3 p-2 rounded", bg)}>
      <Icon className={cn("h-4 w-4 mt-0.5", color)} />
      <div className="flex-1 min-w-0">
        <div className="text-sm">{event.message}</div>
        <div className="text-xs text-muted-foreground">
          {formatTime(event.timestamp)}
          {event.dataType && ` · ${DATA_TYPE_NAMES[event.dataType]}`}
        </div>
      </div>
      {event.progress !== undefined && (
        <Badge variant="outline" className="text-xs">
          {event.progress}%
        </Badge>
      )}
    </div>
  );
}

// ==================== 主组件 ====================

export function CloudSyncSettingsPanel() {
  const { currentUser, isAuthenticated } = useAuthStore();
  
  // 状态
  const [settings, setSettings] = useState<CloudSyncSettings>(cloudSyncEngine.getSettings());
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [stats, setStats] = useState<SyncStats>(cloudSyncEngine.getStats());
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [logs, setLogs] = useState<SyncEvent[]>([]);
  const [progress, setProgress] = useState({ value: 0, message: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // 加载初始数据
  useEffect(() => {
    setSettings(cloudSyncEngine.getSettings());
    setStatus(cloudSyncEngine.getStatus());
    setStats(cloudSyncEngine.getStats());
    setConflicts(cloudSyncEngine.getConflicts());
    setLogs(cloudSyncEngine.getLogs());

    // 订阅状态更新
    const unsubStatus = cloudSyncEngine.subscribeStatus(setStatus);
    const unsubProgress = cloudSyncEngine.subscribeProgress((value, message) => {
      setProgress({ value, message });
    });
    const unsubResult = cloudSyncEngine.subscribeResult(() => {
      setStats(cloudSyncEngine.getStats());
      setIsSyncing(false);
    });
    const unsubConflicts = cloudSyncEngine.subscribeConflicts(setConflicts);
    const unsubLogs = cloudSyncEngine.subscribeLogs((event) => {
      setLogs(prev => [...prev.slice(-49), event]);
    });

    // 初始化自动同步
    cloudSyncEngine.updateAutoSync();

    return () => {
      unsubStatus();
      unsubProgress();
      unsubResult();
      unsubConflicts();
      unsubLogs();
    };
  }, []);

  // 处理设置变更
  const handleSettingChange = useCallback((key: keyof CloudSyncSettings, value: boolean | number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    cloudSyncEngine.updateSettings({ [key]: value });
  }, [settings]);

  // 手动同步
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    await cloudSyncEngine.sync();
    setIsSyncing(false);
  }, []);

  // 解决冲突
  const handleResolveConflict = useCallback((conflictId: string, resolution: 'local' | 'cloud') => {
    cloudSyncEngine.resolveConflict(conflictId, resolution);
    toast.success('冲突已解决');
  }, []);

  // 一键解决所有冲突
  const handleResolveAll = useCallback((resolution: 'local' | 'cloud') => {
    cloudSyncEngine.resolveAllConflicts(resolution);
    toast.success('所有冲突已解决');
  }, []);

  // 格式化时间
  const formatLastSync = useCallback((timestamp: number | null) => {
    if (!timestamp) return '从未同步';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return new Date(timestamp).toLocaleString('zh-CN');
  }, []);

  // 未登录提示
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <CloudOff className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">未登录账号</h3>
        <p className="text-sm text-muted-foreground mb-4">
          请先登录账号以使用云端同步功能
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Cloud className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-semibold">云端同步</h2>
            <p className="text-xs text-muted-foreground">
              {currentUser?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing || status === 'syncing'}
          >
            {isSyncing || status === 'syncing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-1">同步</span>
          </Button>
        </div>
      </div>

      {/* 进度条 */}
      {(isSyncing || status === 'syncing') && (
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <Progress value={progress.value} className="h-1" />
          <p className="text-xs text-muted-foreground mt-1">{progress.message}</p>
        </div>
      )}

      {/* 内容区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
          <TabsTrigger
            value="overview"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            概览
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Settings2 className="h-4 w-4 mr-1" />
            设置
          </TabsTrigger>
          <TabsTrigger
            value="conflicts"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            冲突
            {conflicts.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center items-center text-xs">
                {conflicts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <History className="h-4 w-4 mr-1" />
            日志
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* 概览 Tab */}
          <TabsContent value="overview" className="m-0 p-4 space-y-4">
            {/* 同步状态卡片 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  同步状态
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">上次同步</span>
                  <span className="text-sm font-medium">{formatLastSync(stats.lastSyncAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">自动同步</span>
                  <Switch
                    checked={settings.autoSync}
                    onCheckedChange={(v) => handleSettingChange('autoSync', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">WiFi 仅同步</span>
                  <Switch
                    checked={settings.wifiOnly}
                    onCheckedChange={(v) => handleSettingChange('wifiOnly', v)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 统计卡片 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  同步统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SyncStatsCards stats={stats} />
              </CardContent>
            </Card>

            {/* 选择性同步 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  同步内容
                </CardTitle>
                <CardDescription>选择要同步的数据类型</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {(['projects', 'characters', 'scenes', 'settings'] as SyncDataType[]).map((type) => (
                  <SelectiveSyncToggle
                    key={type}
                    dataType={type}
                    enabled={
                      type === 'projects' ? settings.syncProjects :
                      type === 'characters' ? settings.syncCharacters :
                      type === 'scenes' ? settings.syncScenes :
                      settings.syncSettings
                    }
                    onChange={(v) => handleSettingChange(
                      type === 'projects' ? 'syncProjects' :
                      type === 'characters' ? 'syncCharacters' :
                      type === 'scenes' ? 'syncScenes' :
                      'syncSettings',
                      v
                    )}
                  />
                ))}
              </CardContent>
            </Card>

            {/* 错误提示 */}
            {stats.lastError && (
              <Card className="border-destructive/50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3 text-destructive">
                    <XCircle className="h-5 w-5 mt-0.5" />
                    <div>
                      <div className="font-medium">最近错误</div>
                      <div className="text-sm opacity-80">{stats.lastError}</div>
                      <div className="text-xs opacity-60 mt-1">
                        {stats.lastErrorAt && new Date(stats.lastErrorAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 设置 Tab */}
          <TabsContent value="settings" className="m-0 p-4 space-y-4">
            {/* 基础设置 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">基础设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">启用云端同步</div>
                    <div className="text-xs text-muted-foreground">关闭后将暂停所有同步功能</div>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={(v) => handleSettingChange('enabled', v)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">启动时同步</div>
                    <div className="text-xs text-muted-foreground">打开应用时自动同步数据</div>
                  </div>
                  <Switch
                    checked={settings.syncOnStartup}
                    onCheckedChange={(v) => handleSettingChange('syncOnStartup', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">变更时同步</div>
                    <div className="text-xs text-muted-foreground">数据变更后自动同步</div>
                  </div>
                  <Switch
                    checked={settings.syncOnChange}
                    onCheckedChange={(v) => handleSettingChange('syncOnChange', v)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 网络设置 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">网络设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">仅 WiFi 同步</div>
                    <div className="text-xs text-muted-foreground">使用移动网络时暂停自动同步</div>
                  </div>
                  <Switch
                    checked={settings.wifiOnly}
                    onCheckedChange={(v) => handleSettingChange('wifiOnly', v)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">同步间隔</div>
                    <div className="text-xs text-muted-foreground">自动同步的时间间隔</div>
                  </div>
                  <select
                    className="px-3 py-1.5 rounded border border-border bg-background text-sm"
                    value={settings.syncInterval}
                    onChange={(e) => handleSettingChange('syncInterval', Number(e.target.value))}
                  >
                    <option value={10000}>10 秒</option>
                    <option value={30000}>30 秒</option>
                    <option value={60000}>1 分钟</option>
                    <option value={300000}>5 分钟</option>
                    <option value={900000}>15 分钟</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* 通知设置 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">通知设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">同步完成通知</div>
                  <Switch
                    checked={settings.notifyOnSync}
                    onCheckedChange={(v) => handleSettingChange('notifyOnSync', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">冲突提醒</div>
                  <Switch
                    checked={settings.notifyOnConflict}
                    onCheckedChange={(v) => handleSettingChange('notifyOnConflict', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">错误通知</div>
                  <Switch
                    checked={settings.notifyOnError}
                    onCheckedChange={(v) => handleSettingChange('notifyOnError', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 冲突 Tab */}
          <TabsContent value="conflicts" className="m-0 p-4 space-y-4">
            {conflicts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="h-12 w-12 text-green-500 mb-3" />
                <h3 className="font-medium mb-1">没有冲突</h3>
                <p className="text-sm text-muted-foreground">
                  所有数据都已同步，没有冲突需要解决
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    有 {conflicts.length} 个冲突需要解决
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleResolveAll('local')}>
                      全部使用本地
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleResolveAll('cloud')}>
                      全部使用云端
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {conflicts.map((conflict) => (
                    <ConflictCard
                      key={conflict.id}
                      conflict={conflict}
                      onResolve={(resolution) => handleResolveConflict(conflict.id, resolution)}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* 日志 Tab */}
          <TabsContent value="logs" className="m-0 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                最近 {logs.length} 条同步记录
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => cloudSyncEngine.clearLogs()}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                清空
              </Button>
            </div>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <h3 className="font-medium mb-1">暂无同步记录</h3>
                <p className="text-sm text-muted-foreground">
                  触发同步后将显示同步日志
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.slice().reverse().map((log) => (
                  <LogItem key={log.id} event={log} />
                ))}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
