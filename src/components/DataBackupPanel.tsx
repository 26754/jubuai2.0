// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 数据备份与恢复组件
 * 提供本地数据备份、自动保存设置、导入导出功能
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAutoSave } from '@/hooks/use-auto-save';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Cloud,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Clock,
  Database,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Settings,
  FileJson,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const INTERVAL_OPTIONS = [
  { value: 10000, label: '10 秒' },
  { value: 30000, label: '30 秒' },
  { value: 60000, label: '1 分钟' },
  { value: 300000, label: '5 分钟' },
  { value: 600000, label: '10 分钟' },
];

export function DataBackupPanel() {
  const {
    isEnabled,
    isSaving,
    lastSaveTime,
    intervalMs,
    backupCount,
    enable,
    disable,
    setInterval,
    saveNow,
    exportBackup,
    importBackup,
    getBackupList,
    clearBackups,
    getStats,
  } = useAutoSave();

  const [importFile, setImportFile] = useState<File | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [importPreview, setImportPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = getStats();
  const backupList = getBackupList();

  // 格式化时间
  const formatTime = (isoString: string | null): string => {
    if (!isoString) return '暂无记录';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    // 预览文件内容
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setImportPreview(JSON.stringify(json, null, 2).slice(0, 500) + '...');
      setShowImportDialog(true);
    } catch {
      toast.error('文件格式无效，请选择 JSON 文件');
      setImportFile(null);
    }

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 确认导入
  const handleImportConfirm = async () => {
    if (!importFile) return;

    const result = await importBackup(importFile);
    if (result.success) {
      setShowImportDialog(false);
      setImportFile(null);
      setImportPreview(null);
    }
  };

  // 确认清除
  const handleClearConfirm = () => {
    clearBackups();
    setShowClearDialog(false);
  };

  // 导出完整备份（包含 API Key）
  const handleExportFull = () => {
    const backup = dataBackupService.createBackup('完整备份（含 API 配置）');
    dataBackupService.exportToFile(backup, `jubuai-full-backup-${new Date().toISOString().slice(0, 10)}.json`);
    toast.success('完整备份已导出，请妥善保管！');
  };

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{backupCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">本地备份</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {lastSaveTime ? formatTime(lastSaveTime) : '未保存'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">最后保存</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <Badge variant={isEnabled ? 'default' : 'secondary'}>
                {isEnabled ? '已启用' : '已禁用'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">自动保存</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {formatBytes(stats.totalSize)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">备份总大小</p>
          </CardContent>
        </Card>
      </div>

      {/* 自动保存设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            自动保存设置
          </CardTitle>
          <CardDescription>
            自动保存数据到浏览器本地，防止数据丢失
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>启用自动保存</Label>
              <p className="text-sm text-muted-foreground">
                定期自动保存当前工作数据
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={isEnabled ? disable : enable}
            />
          </div>

          {isEnabled && (
            <>
              <div className="space-y-2">
                <Label>保存间隔</Label>
                <div className="flex gap-2 flex-wrap">
                  {INTERVAL_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={intervalMs === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInterval(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveNow}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  立即保存
                </Button>
                <span className="text-sm text-muted-foreground">
                  {isSaving ? '保存中...' : '点击立即保存当前数据'}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 备份管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            备份管理
          </CardTitle>
          <CardDescription>
            导出、导入和恢复数据备份
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportBackup('手动备份')}>
              <Download className="h-4 w-4 mr-2" />
              导出备份
            </Button>

            <Button variant="outline" onClick={handleExportFull}>
              <FileJson className="h-4 w-4 mr-2" />
              完整导出（含 API 配置）
            </Button>

            <Button variant="outline" asChild>
              <label>
                <Upload className="h-4 w-4 mr-2" />
                导入备份
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </Button>
          </div>

          {/* 备份历史 */}
          {backupList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>本地备份历史</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClearDialog(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  清除全部
                </Button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {backupList.map((backup, index) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="text-sm">
                        {formatTime(backup.createdAt)}
                      </span>
                      {backup.description && (
                        <span className="text-xs text-muted-foreground">
                          ({backup.description})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(backup.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {backupList.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>暂无本地备份</p>
              <p className="text-sm">启用自动保存或手动导出备份</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 安全提示 */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            安全提示
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. 完整导出会包含 API Key 配置，请妥善保管备份文件</p>
          <p>2. 导入备份会覆盖当前数据，操作前请确认</p>
          <p>3. 建议定期导出备份，防止浏览器数据丢失</p>
          <p>4. 更换浏览器或设备时，可通过导入备份恢复数据</p>
        </CardContent>
      </Card>

      {/* 导入确认对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认导入备份</DialogTitle>
            <DialogDescription>
              导入将覆盖当前数据，是否继续？
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="bg-muted p-2 rounded-md">
              <pre className="text-xs overflow-x-auto max-h-40">
                {importPreview}
              </pre>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              取消
            </Button>
            <Button onClick={handleImportConfirm}>确认导入</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清除确认对话框 */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清除所有备份？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可恢复，确定要清除所有本地备份吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认清除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// 辅助函数
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 重新导出 dataBackupService 以便在组件中使用
import { dataBackupService } from '@/lib/data-backup-service';
