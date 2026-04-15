// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 用户中心组件
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  Mail,
  Calendar,
  Shield,
  LogOut,
  Edit3,
  Camera,
  Key,
  Monitor,
  Smartphone,
  Globe,
  Clock,
  BarChart3,
  FolderOpen,
  Users,
  Grid3X3,
  Clapperboard,
  ExternalLink,
  Check,
  X,
  Loader2,
  AlertCircle,
  BadgeCheck,
  Crown,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthStore, type User as AppUser } from '@/stores/auth-store';
import { getSupabaseClient, isSupabaseConfigured } from '@/storage/database/supabase-client';
import { useProjectStore } from '@/stores/project-store';
import { useCharacterLibraryStore } from '@/stores/character-library-store';
import { useSceneStore } from '@/stores/scene-store';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';
import { SyncStatusIndicator, SyncStatusPanel } from '@/components/SyncStatusIndicator';

// ==================== 类型定义 ====================

interface UserStats {
  projectCount: number;
  characterCount: number;
  sceneCount: number;
  shotCount: number;
  cloudSynced: boolean;
  lastSyncTime: number | null;
}

interface SessionInfo {
  id: string;
  createdAt: string;
  lastRefreshedAt: string;
  expiresAt: string;
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
}

// ==================== 用户资料卡片组件 ====================

interface ProfileCardProps {
  user: AppUser;
  onEditProfile: () => void;
}

function ProfileCard({ user, onEditProfile }: ProfileCardProps) {
  // 获取头像首字母
  const getInitial = useCallback((name: string | undefined) => {
    if (!name) return user.email?.[0]?.toUpperCase() || 'U';
    return name[0].toUpperCase();
  }, [user.email]);

  // 格式化日期
  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30 border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-6">
          {/* 头像 */}
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-primary/20 shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-2xl font-bold">
                {getInitial(user.username)}
              </AvatarFallback>
            </Avatar>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-md hover:scale-110 transition-transform"
                    onClick={onEditProfile}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>更换头像</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* 用户信息 */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">
                {user.username || '未设置用户名'}
              </h2>
              {user.username && (
                <Badge variant="secondary" className="gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  已验证
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="text-sm">{user.email}</span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">
                注册于 {formatDate(user.createdAt)}
              </span>
            </div>
          </div>

          {/* 编辑按钮 */}
          <Button variant="outline" size="sm" onClick={onEditProfile}>
            <Edit3 className="h-4 w-4 mr-2" />
            编辑资料
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 使用统计卡片组件 ====================

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'info';
}

function StatsCard({ title, value, icon, color = 'primary' }: StatsCardProps) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  };

  return (
    <Card className="bg-card border-border/50 hover:border-border transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-xl border', colorMap[color])}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 统计概览组件 ====================

interface StatsOverviewProps {
  stats: UserStats;
  isLoading: boolean;
}

function StatsOverview({ stats, isLoading }: StatsOverviewProps) {
  const formatLastSync = useCallback((timestamp: number | null) => {
    if (!timestamp) return '从未同步';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return new Date(timestamp).toLocaleDateString('zh-CN');
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-card border-border/50 animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="项目数量"
          value={stats.projectCount}
          icon={<FolderOpen className="h-5 w-5" />}
          color="primary"
        />
        <StatsCard
          title="角色数量"
          value={stats.characterCount}
          icon={<Users className="h-5 w-5" />}
          color="success"
        />
        <StatsCard
          title="场景数量"
          value={stats.sceneCount}
          icon={<Grid3X3 className="h-5 w-5" />}
          color="info"
        />
        <StatsCard
          title="分镜数量"
          value={stats.shotCount}
          icon={<Clapperboard className="h-5 w-5" />}
          color="warning"
        />
      </div>

      {/* 云端同步状态 */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                stats.cloudSynced ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
              )}>
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">云端同步</p>
                <p className="text-xs text-muted-foreground">
                  {stats.cloudSynced ? `已同步 · ${formatLastSync(stats.lastSyncTime)}` : '未连接到云端'}
                </p>
              </div>
            </div>
            <Badge variant={stats.cloudSynced ? 'default' : 'secondary'}>
              {stats.cloudSynced ? '已连接' : '未连接'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 账户安全组件 ====================

interface SecuritySectionProps {
  user: AppUser;
  onChangePassword: () => void;
  onLogout: () => void;
}

function SecuritySection({ user, onChangePassword, onLogout }: SecuritySectionProps) {
  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5 text-primary" />
          账户安全
        </CardTitle>
        <CardDescription>
          管理您的账户安全设置
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 邮箱 */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">登录邮箱</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Badge variant="outline">已验证</Badge>
        </div>

        {/* 修改密码 */}
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onChangePassword}
        >
          <Key className="h-4 w-4 mr-2" />
          修改密码
        </Button>

        <Separator />

        {/* 登出 */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          退出登录
        </Button>
      </CardContent>
    </Card>
  );
}

// ==================== 修改密码对话框 ====================

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function ChangePasswordDialog({ open, onOpenChange, onSuccess }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { supabaseUser } = useAuthStore();

  // 密码强度计算
  const passwordStrength = useMemo(() => {
    if (!newPassword) return null;
    
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) score++;
    
    if (score <= 2) return { label: '弱', color: 'bg-red-500', percent: 33 };
    if (score <= 4) return { label: '中等', color: 'bg-yellow-500', percent: 66 };
    return { label: '强', color: 'bg-green-500', percent: 100 };
  }, [newPassword]);

  const handleSubmit = async () => {
    setError('');

    // 验证
    if (!currentPassword) {
      setError('请输入当前密码');
      return;
    }
    if (!newPassword) {
      setError('请输入新密码');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码至少需要 6 个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        toast.error('云端服务未配置');
        return;
      }

      const supabase = getSupabaseClient();

      // 先验证当前密码
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: supabaseUser?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        setError('当前密码错误');
        return;
      }

      // 更新密码
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      toast.success('密码修改成功');
      onSuccess();
      onOpenChange(false);
      
      // 清空表单
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || '修改失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
          <DialogDescription>
            请输入当前密码和新密码来更新您的账户密码
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 当前密码 */}
          <div className="space-y-2">
            <Label htmlFor="current-password">当前密码</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="输入当前密码"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 新密码 */}
          <div className="space-y-2">
            <Label htmlFor="new-password">新密码</Label>
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="输入新密码"
              disabled={isLoading}
            />
            
            {/* 密码强度 */}
            {passwordStrength && (
              <div className="space-y-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full transition-all', passwordStrength.color)}
                    style={{ width: `${passwordStrength.percent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  密码强度：{passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          {/* 确认新密码 */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">确认新密码</Label>
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
              disabled={isLoading}
            />
          </div>

          {/* 显示密码选项 */}
          <div className="flex items-center gap-2">
            <Switch
              id="show-password"
              checked={showPassword}
              onCheckedChange={setShowPassword}
            />
            <Label htmlFor="show-password" className="text-sm cursor-pointer">
              显示密码
            </Label>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                修改中...
              </>
            ) : (
              '确认修改'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 确认登出对话框 ====================

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function LogoutDialog({ open, onOpenChange, onConfirm }: LogoutDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>退出登录</DialogTitle>
          <DialogDescription>
            确定要退出当前账户吗？本地未同步的数据将会保留。
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleLogout} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                退出中...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                确认退出
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 主用户中心组件 ====================

export function UserCenter() {
  const { currentUser, supabaseUser, isAuthenticated, isDemoUser, logout } = useAuthStore();
  const { projects } = useProjectStore();
  const { characters } = useCharacterLibraryStore();
  const { scenes } = useSceneStore();

  // 实时同步状态
  const { isConnected, isSyncing, status: syncStatus, offlineQueueCount, triggerSync } = useRealtimeSync({
    autoStart: true,
  });

  const [stats, setStats] = useState<UserStats>({
    projectCount: 0,
    characterCount: 0,
    sceneCount: 0,
    shotCount: 0,
    cloudSynced: false,
    lastSyncTime: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // 对话框状态
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // 计算统计数据
  useEffect(() => {
    if (!isAuthenticated || isDemoUser) {
      setStats({
        projectCount: projects.length,
        characterCount: characters.length,
        sceneCount: scenes.length,
        shotCount: 0,
        cloudSynced: false,
        lastSyncTime: null,
      });
      setIsLoading(false);
      return;
    }

    // 从云端获取更多统计信息
    const fetchCloudStats = async () => {
      if (!isSupabaseConfigured()) {
        setStats({
          projectCount: projects.length,
          characterCount: characters.length,
          sceneCount: scenes.length,
          shotCount: 0,
          cloudSynced: false,
          lastSyncTime: null,
        });
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        
        // 获取云端项目数量
        const { count: cloudProjectCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser?.id);

        // 获取最后同步时间（从实时同步管理器）
        const lastSyncTime = syncStatus.lastEventAt || 
          (localStorage.getItem('jubuai-last-sync-time') ? parseInt(localStorage.getItem('jubuai-last-sync-time')!, 10) : null);
        
        setStats({
          projectCount: cloudProjectCount || projects.length,
          characterCount: characters.length,
          sceneCount: scenes.length,
          shotCount: 0,
          cloudSynced: isConnected,
          lastSyncTime,
        });
      } catch (error) {
        console.error('[UserCenter] Failed to fetch cloud stats:', error);
        setStats({
          projectCount: projects.length,
          characterCount: characters.length,
          sceneCount: scenes.length,
          shotCount: 0,
          cloudSynced: isConnected,
          lastSyncTime: null,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCloudStats();
  }, [isAuthenticated, isDemoUser, projects, characters, scenes, currentUser, isConnected, syncStatus.lastEventAt]);

  // 处理登出
  const handleLogout = async () => {
    try {
      await logout();
      toast.success('已退出登录');
    } catch (error) {
      console.error('[UserCenter] Logout failed:', error);
      toast.error('退出登录失败');
    }
  };

  // 演示用户提示
  if (isDemoUser) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b border-border bg-panel px-6 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            用户中心
          </h2>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-8 max-w-2xl mx-auto space-y-6">
            {/* 演示用户提示 */}
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-amber-500/20">
                    <Zap className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">演示模式</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      您当前使用的是演示账户，登录后即可享受完整功能，包括云端同步、团队协作等高级特性。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 用户信息 */}
            <Card className="bg-card border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-xl font-bold">
                      D
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-foreground">演示用户</h2>
                      <Badge variant="outline" className="gap-1">
                        <Crown className="h-3 w-3" />
                        演示
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">demo@jubu.ai</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 功能提示 */}
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">完整功能</CardTitle>
                <CardDescription>
                  登录账户解锁以下高级功能
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: Globe, title: '云端同步', desc: '跨设备无缝同步数据' },
                  { icon: Shield, title: '账户安全', desc: '修改密码，保护账户' },
                  { icon: Users, title: '团队协作', desc: '邀请成员共同创作' },
                  { icon: Crown, title: '高级模板', desc: '解锁更多专业模板' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <item.icon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 统计信息 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard
                title="项目数量"
                value={projects.length}
                icon={<FolderOpen className="h-5 w-5" />}
                color="primary"
              />
              <StatsCard
                title="角色数量"
                value={characters.length}
                icon={<Users className="h-5 w-5" />}
                color="success"
              />
              <StatsCard
                title="场景数量"
                value={scenes.length}
                icon={<Grid3X3 className="h-5 w-5" />}
                color="info"
              />
              <StatsCard
                title="分镜数量"
                value={0}
                icon={<Clapperboard className="h-5 w-5" />}
                color="warning"
              />
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // 未登录状态
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b border-border bg-panel px-6 flex items-center shrink-0">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            用户中心
          </h2>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md bg-card border-border/50">
            <CardContent className="pt-8 pb-8 text-center">
              <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                请先登录
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                登录后即可享受云端同步和更多高级功能
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 已登录状态
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-border bg-panel px-6 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-3">
          <User className="w-5 h-5 text-primary" />
          用户中心
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-8 max-w-2xl mx-auto space-y-6">
          {/* 用户资料卡片 */}
          <ProfileCard
            user={currentUser}
            onEditProfile={() => toast.info('头像上传功能即将推出')}
          />

          {/* 统计概览 */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              使用统计
            </h3>
            <StatsOverview stats={stats} isLoading={isLoading} />
          </div>

          {/* 实时同步状态 */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-5 w-5" />
              实时同步
              <SyncStatusIndicator showText={false} showCount={true} />
            </h3>
            <SyncStatusPanel />
          </div>

          {/* 账户安全 */}
          <SecuritySection
            user={currentUser}
            onChangePassword={() => setChangePasswordOpen(true)}
            onLogout={() => setLogoutDialogOpen(true)}
          />

          {/* 账户信息 */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="h-5 w-5 text-primary" />
                账户信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">用户 ID</span>
                </div>
                <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {currentUser.id.slice(0, 8)}...
                </code>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">账户类型</span>
                </div>
                <Badge variant="secondary">正式账户</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">注册时间</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(currentUser.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* 修改密码对话框 */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        onSuccess={() => setChangePasswordOpen(false)}
      />

      {/* 确认登出对话框 */}
      <LogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={handleLogout}
      />
    </div>
  );
}

export default UserCenter;
