// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 项目分享系统
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Share2,
  Link,
  Copy,
  Check,
  Clock,
  Eye,
  Edit3,
  Trash2,
  Plus,
  ExternalLink,
  QrCode,
  Settings,
  Users,
  Globe,
  Lock,
  Unlock,
  Calendar,
  BarChart3,
  MoreVertical,
  RefreshCw,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Users as UsersIcon,
  Clapperboard,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

export type SharePermission = 'view' | 'edit' | 'admin';
export type ShareStatus = 'active' | 'expired' | 'disabled' | 'revoked';

export interface ShareLink {
  id: string;
  projectId: string;
  token: string;
  url: string;
  permission: SharePermission;
  status: ShareStatus;
  expiresAt: Date | null;
  maxViews: number | null;
  currentViews: number;
  password: string | null;
  createdAt: Date;
  createdBy: string;
  title?: string;
  description?: string;
}

export interface ShareSettings {
  allowCopy: boolean;
  allowDownload: boolean;
  allowScreenshot: boolean;
  requireAuth: boolean;
  notifyOnAccess: boolean;
  showWatermark: boolean;
}

export interface ShareAccess {
  id: string;
  shareLinkId: string;
  accessedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

export interface ShareLinkStats {
  totalViews: number;
  uniqueViews: number;
  lastAccessed: Date | null;
  topCountries: { country: string; count: number }[];
  accessTimeline: { date: string; count: number }[];
}

// ==================== 预设分享模板 ====================

export const SHARE_PRESETS = [
  {
    id: 'quick-view',
    name: '快速预览',
    description: '只读访问，24小时有效',
    permission: 'view' as SharePermission,
    expiresIn: 24 * 60 * 60 * 1000,
    settings: { allowCopy: false, allowDownload: false },
  },
  {
    id: 'review',
    name: '审核协作',
    description: '可评论，7天有效',
    permission: 'view' as SharePermission,
    expiresIn: 7 * 24 * 60 * 60 * 1000,
    settings: { allowCopy: true, allowDownload: false },
  },
  {
    id: 'collaboration',
    name: '协作编辑',
    description: '可编辑，长期有效',
    permission: 'edit' as SharePermission,
    expiresIn: null,
    settings: { allowCopy: true, allowDownload: true },
  },
  {
    id: 'public',
    name: '公开发布',
    description: '任何人可访问，无时间限制',
    permission: 'view' as SharePermission,
    expiresIn: null,
    settings: { allowCopy: true, allowDownload: true, showWatermark: true },
  },
];

// ==================== 分享存储 Hook ====================

const SHARES_STORAGE_KEY = 'jubuai-share-links';

export function useShareLinks(projectId: string) {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 加载分享链接
  const loadShares = useCallback(() => {
    try {
      const stored = localStorage.getItem(`${SHARES_STORAGE_KEY}-${projectId}`);
      if (stored) {
        const parsed = JSON.parse(stored).map((share: any) => ({
          ...share,
          expiresAt: share.expiresAt ? new Date(share.expiresAt) : null,
          createdAt: new Date(share.createdAt),
        }));
        setShares(parsed);
      }
    } catch (error) {
      console.error('[Share] Failed to load shares:', error);
    }
  }, [projectId]);
  
  // 保存分享链接
  const saveShares = useCallback((newShares: ShareLink[]) => {
    try {
      localStorage.setItem(`${SHARES_STORAGE_KEY}-${projectId}`, JSON.stringify(newShares));
      setShares(newShares);
    } catch (error) {
      console.error('[Share] Failed to save shares:', error);
    }
  }, [projectId]);
  
  // 创建分享链接
  const createShare = useCallback(async (options: {
    permission: SharePermission;
    expiresIn?: number | null;
    maxViews?: number | null;
    password?: string | null;
    title?: string;
    description?: string;
    settings?: Partial<ShareSettings>;
  }) => {
    setIsLoading(true);
    
    try {
      // 生成唯一 token
      const token = generateToken();
      
      // 计算过期时间
      const expiresAt = options.expiresIn
        ? new Date(Date.now() + options.expiresIn)
        : null;
      
      const newShare: ShareLink = {
        id: crypto.randomUUID(),
        projectId,
        token,
        url: `${window.location.origin}/shared/${token}`,
        permission: options.permission,
        status: 'active',
        expiresAt,
        maxViews: options.maxViews || null,
        currentViews: 0,
        password: options.password || null,
        createdAt: new Date(),
        createdBy: 'current-user',
        title: options.title,
        description: options.description,
      };
      
      const newShares = [...shares, newShare];
      saveShares(newShares);
      
      return newShare;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, shares, saveShares]);
  
  // 更新分享链接
  const updateShare = useCallback((shareId: string, updates: Partial<ShareLink>) => {
    const newShares = shares.map(share =>
      share.id === shareId ? { ...share, ...updates } : share
    );
    saveShares(newShares);
  }, [shares, saveShares]);
  
  // 删除分享链接
  const deleteShare = useCallback((shareId: string) => {
    const newShares = shares.filter(share => share.id !== shareId);
    saveShares(newShares);
  }, [shares, saveShares]);
  
  // 撤销分享链接
  const revokeShare = useCallback((shareId: string) => {
    updateShare(shareId, { status: 'revoked' });
  }, [updateShare]);
  
  // 恢复分享链接
  const restoreShare = useCallback((shareId: string) => {
    updateShare(shareId, { status: 'active' });
  }, [updateShare]);
  
  // 增加访问次数
  const incrementViews = useCallback((shareId: string) => {
    const newShares = shares.map(share =>
      share.id === shareId
        ? { ...share, currentViews: share.currentViews + 1 }
        : share
    );
    saveShares(newShares);
  }, [shares, saveShares]);
  
  // 获取活跃的分享链接
  const activeShares = useMemo(() =>
    shares.filter(share => {
      if (share.status !== 'active') return false;
      if (share.expiresAt && share.expiresAt < new Date()) return false;
      if (share.maxViews && share.currentViews >= share.maxViews) return false;
      return true;
    }),
    [shares]
  );
  
  // 加载初始数据
  useEffect(() => {
    loadShares();
  }, [loadShares]);
  
  return {
    shares,
    activeShares,
    isLoading,
    createShare,
    updateShare,
    deleteShare,
    revokeShare,
    restoreShare,
    incrementViews,
  };
}

// ==================== 工具函数 ====================

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function formatTimeRemaining(date: Date | null): string {
  if (!date) return '永久有效';
  
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) return '已过期';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}天${hours}小时后过期`;
  if (hours > 0) return `${hours}小时后过期`;
  return '即将过期';
}

// ==================== 创建分享对话框 ====================

interface CreateShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onCreate: (options: any) => Promise<ShareLink>;
  presets?: typeof SHARE_PRESETS;
}

export function CreateShareDialog({
  open,
  onOpenChange,
  projectName,
  onCreate,
  presets = SHARE_PRESETS,
}: CreateShareDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [permission, setPermission] = useState<SharePermission>('view');
  const [expiresIn, setExpiresIn] = useState<number | null>(24 * 60 * 60 * 1000);
  const [maxViews, setMaxViews] = useState<number | null>(null);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdShare, setCreatedShare] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);
  
  // 应用预设
  const applyPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setPermission(preset.permission);
      setExpiresIn(preset.expiresIn);
    }
  };
  
  // 创建分享
  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const share = await onCreate({
        permission,
        expiresIn: expiresIn || null,
        maxViews: maxViews || null,
        password: requirePassword ? password : null,
        title: title || projectName,
      });
      setCreatedShare(share);
    } finally {
      setIsCreating(false);
    }
  };
  
  // 复制链接
  const handleCopy = async () => {
    if (createdShare) {
      await navigator.clipboard.writeText(createdShare.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // 重置状态
  useEffect(() => {
    if (!open) {
      setSelectedPreset(null);
      setPermission('view');
      setExpiresIn(24 * 60 * 60 * 1000);
      setMaxViews(null);
      setRequirePassword(false);
      setPassword('');
      setTitle('');
      setCreatedShare(null);
    }
  }, [open]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            创建分享链接
          </DialogTitle>
          <DialogDescription>
            为项目「{projectName}」创建分享链接
          </DialogDescription>
        </DialogHeader>
        
        {!createdShare ? (
          <>
            {/* 预设选择 */}
            <div className="space-y-2">
              <Label>快速选择</Label>
              <div className="grid grid-cols-2 gap-2">
                {presets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-colors',
                      selectedPreset === preset.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <div className="font-medium text-sm">{preset.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <Separator />
            
            {/* 权限设置 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>访问权限</Label>
                <Select value={permission} onValueChange={(v) => setPermission(v as SharePermission)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>只读</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="edit">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        <span>可编辑</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 过期时间 */}
              <div className="space-y-2">
                <Label>链接有效期</Label>
                <Select 
                  value={expiresIn?.toString() || 'never'} 
                  onValueChange={(v) => setExpiresIn(v === 'never' ? null : parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3600000">1 小时</SelectItem>
                    <SelectItem value="86400000">24 小时</SelectItem>
                    <SelectItem value="604800000">7 天</SelectItem>
                    <SelectItem value="2592000000">30 天</SelectItem>
                    <SelectItem value="never">永久有效</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 访问次数限制 */}
              <div className="space-y-2">
                <Label>访问次数限制（可选）</Label>
                <Input
                  type="number"
                  placeholder="不限制"
                  value={maxViews || ''}
                  onChange={(e) => setMaxViews(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
              
              {/* 密码保护 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>密码保护</Label>
                  <p className="text-xs text-muted-foreground">
                    需要输入密码才能访问
                  </p>
                </div>
                <Switch
                  checked={requirePassword}
                  onCheckedChange={setRequirePassword}
                />
              </div>
              
              {requirePassword && (
                <Input
                  type="password"
                  placeholder="设置访问密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                创建链接
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* 分享链接已创建 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span>分享链接已创建</span>
              </div>
              
              <div className="space-y-2">
                <Label>分享链接</Label>
                <div className="flex gap-2">
                  <Input
                    value={createdShare.url}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleCopy}>
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {createdShare.password && (
                <div className="space-y-2">
                  <Label>访问密码</Label>
                  <div className="flex gap-2">
                    <Input
                      value={createdShare.password}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(createdShare.password!);
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  {permission === 'view' ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  <span>{permission === 'view' ? '只读' : '可编辑'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTimeRemaining(createdShare.expiresAt)}</span>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                完成
              </Button>
              <Button onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                复制链接
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ==================== 分享管理面板 ====================

interface ShareManagerPanelProps {
  shares: ShareLink[];
  onRevoke: (shareId: string) => void;
  onRestore: (shareId: string) => void;
  onDelete: (shareId: string) => void;
  onCopy: (url: string) => void;
}

export function ShareManagerPanel({
  shares,
  onRevoke,
  onRestore,
  onDelete,
  onCopy,
}: ShareManagerPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const handleCopy = async (share: ShareLink) => {
    await navigator.clipboard.writeText(share.url);
    setCopiedId(share.id);
    onCopy(share.url);
    setTimeout(() => setCopiedId(null), 2000);
  };
  
  const getStatusBadge = (share: ShareLink) => {
    if (share.status === 'revoked') {
      return <Badge variant="destructive">已撤销</Badge>;
    }
    if (share.expiresAt && share.expiresAt < new Date()) {
      return <Badge variant="secondary">已过期</Badge>;
    }
    if (share.maxViews && share.currentViews >= share.maxViews) {
      return <Badge variant="secondary">访问已达上限</Badge>;
    }
    return <Badge variant="default">活跃</Badge>;
  };
  
  const getPermissionIcon = (permission: SharePermission) => {
    switch (permission) {
      case 'view':
        return <Eye className="w-4 h-4" />;
      case 'edit':
        return <Edit3 className="w-4 h-4" />;
      case 'admin':
        return <Settings className="w-4 h-4" />;
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">分享链接管理</h3>
        <span className="text-sm text-muted-foreground">
          {shares.length} 个链接
        </span>
      </div>
      
      {shares.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Share2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>暂无分享链接</p>
          <p className="text-sm">创建第一个分享链接</p>
        </div>
      ) : (
        <ScrollArea className="max-h-96">
          <div className="space-y-2">
            {shares.map(share => (
              <div
                key={share.id}
                className={cn(
                  'p-3 rounded-lg border',
                  share.status === 'revoked' && 'opacity-50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {share.title || '未命名链接'}
                      </span>
                      {getStatusBadge(share)}
                    </div>
                    
                    <div className="text-xs text-muted-foreground font-mono truncate mb-2">
                      .../{share.token}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1">
                            {getPermissionIcon(share.permission)}
                            <span>
                              {share.permission === 'view' ? '只读' : 
                               share.permission === 'edit' ? '可编辑' : '管理'}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>访问权限</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{share.currentViews}</span>
                            {share.maxViews && <span>/{share.maxViews}</span>}
                          </TooltipTrigger>
                          <TooltipContent>
                            访问次数 {share.maxViews && `/ 限制 ${share.maxViews}`}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeRemaining(share.expiresAt)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {share.expiresAt
                              ? `过期时间: ${share.expiresAt.toLocaleString()}`
                              : '永久有效'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {share.password && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>密码保护</span>
                            </TooltipTrigger>
                            <TooltipContent>已设置密码</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopy(share)}
                          >
                            {copiedId === share.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>复制链接</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(share.url, '_blank')}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          打开链接
                        </DropdownMenuItem>
                        {share.status === 'active' ? (
                          <DropdownMenuItem onClick={() => onRevoke(share.id)}>
                            <Lock className="w-4 h-4 mr-2" />
                            撤销链接
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => onRestore(share.id)}>
                            <Unlock className="w-4 h-4 mr-2" />
                            恢复链接
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(share.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ==================== 分享统计卡片 ====================

interface ShareStatsCardProps {
  share: ShareLink;
}

export function ShareStatsCard({ share }: ShareStatsCardProps) {
  const progress = share.maxViews
    ? Math.min((share.currentViews / share.maxViews) * 100, 100)
    : 0;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          访问统计
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 访问次数 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">访问次数</span>
            <span className="font-medium">
              {share.currentViews}
              {share.maxViews && <span className="text-muted-foreground">/{share.maxViews}</span>}
            </span>
          </div>
          {share.maxViews && (
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  progress >= 80 ? 'bg-red-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        
        {/* 创建时间 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">创建时间</span>
          <span>{share.createdAt.toLocaleDateString()}</span>
        </div>
        
        {/* 过期时间 */}
        {share.expiresAt && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">过期时间</span>
            <span className={share.expiresAt < new Date() ? 'text-red-500' : ''}>
              {share.expiresAt.toLocaleDateString()}
            </span>
          </div>
        )}
        
        {/* 权限 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">权限</span>
          <Badge variant="outline">
            {share.permission === 'view' && <Eye className="w-3 h-3 mr-1" />}
            {share.permission === 'edit' && <Edit3 className="w-3 h-3 mr-1" />}
            {share.permission === 'view' ? '只读' : '可编辑'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 分享设置面板 ====================

interface ShareSettingsPanelProps {
  settings: ShareSettings;
  onChange: (settings: ShareSettings) => void;
}

export function ShareSettingsPanel({ settings, onChange }: ShareSettingsPanelProps) {
  const updateSetting = (key: keyof ShareSettings, value: boolean) => {
    onChange({ ...settings, [key]: value });
  };
  
  return (
    <div className="space-y-4">
      <h3 className="font-medium">分享设置</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>允许复制内容</Label>
            <p className="text-xs text-muted-foreground">
              允许访问者复制项目内容
            </p>
          </div>
          <Switch
            checked={settings.allowCopy}
            onCheckedChange={(v) => updateSetting('allowCopy', v)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>允许下载</Label>
            <p className="text-xs text-muted-foreground">
              允许访问者下载项目文件
            </p>
          </div>
          <Switch
            checked={settings.allowDownload}
            onCheckedChange={(v) => updateSetting('allowDownload', v)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>允许截图</Label>
            <p className="text-xs text-muted-foreground">
              允许访问者截图或屏幕录制
            </p>
          </div>
          <Switch
            checked={settings.allowScreenshot}
            onCheckedChange={(v) => updateSetting('allowScreenshot', v)}
          />
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>需要登录</Label>
            <p className="text-xs text-muted-foreground">
              访问者需要登录账户
            </p>
          </div>
          <Switch
            checked={settings.requireAuth}
            onCheckedChange={(v) => updateSetting('requireAuth', v)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>访问通知</Label>
            <p className="text-xs text-muted-foreground">
              当有人访问时发送通知
            </p>
          </div>
          <Switch
            checked={settings.notifyOnAccess}
            onCheckedChange={(v) => updateSetting('notifyOnAccess', v)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>显示水印</Label>
            <p className="text-xs text-muted-foreground">
              在内容上显示水印
            </p>
          </div>
          <Switch
            checked={settings.showWatermark}
            onCheckedChange={(v) => updateSetting('showWatermark', v)}
          />
        </div>
      </div>
    </div>
  );
}

// ==================== 分享预览组件 ====================

interface SharePreviewProps {
  share: ShareLink;
  projectName: string;
  onClose: () => void;
}

export function SharePreview({ share, projectName, onClose }: SharePreviewProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              分享预览
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">{projectName}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {share.description || '分享预览'}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                {share.permission === 'view' ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                <span>{share.permission === 'view' ? '只读访问' : '可编辑'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatTimeRemaining(share.expiresAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>分享链接</Label>
            <div className="flex gap-2">
              <Input value={share.url} readOnly className="font-mono text-sm" />
              <Button
                onClick={() => navigator.clipboard.writeText(share.url)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {share.password && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-600">
                <Lock className="w-4 h-4" />
                <span className="font-medium">此链接受密码保护</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                访问时需要输入密码
              </p>
            </div>
          )}
          
          <ShareStatsCard share={share} />
        </CardContent>
      </Card>
    </div>
  );
}
