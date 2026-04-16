// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 自动保存 Hook
 * 提供数据自动保存和备份功能
 */

import { useState, useEffect, useCallback } from 'react';
import { dataBackupService, type BackupData, type BackupMetadata, type AutoSaveConfig } from '@/lib/data-backup-service';
import { toast } from 'sonner';

export interface UseAutoSaveReturn {
  // 状态
  isEnabled: boolean;
  isSaving: boolean;
  lastSaveTime: string | null;
  intervalMs: number;
  backupCount: number;
  
  // 操作
  enable: () => void;
  disable: () => void;
  setInterval: (ms: number) => void;
  saveNow: () => void;
  exportBackup: (description?: string) => void;
  importBackup: (file: File) => Promise<{ success: boolean; message: string; restored: string[] }>;
  getBackupList: () => BackupMetadata[];
  clearBackups: () => void;
  getStats: () => ReturnType<typeof dataBackupService.getBackupStats>;
}

/**
 * 自动保存 Hook
 */
export function useAutoSave(): UseAutoSaveReturn {
  const [config, setConfig] = useState<AutoSaveConfig>(dataBackupService.getAutoSaveConfig());
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(
    dataBackupService.getLastSaveTime()
  );
  const [backupCount, setBackupCount] = useState(
    dataBackupService.getLocalBackups().length
  );

  // 初始化自动保存
  useEffect(() => {
    if (config.enabled) {
      dataBackupService.startAutoSave(config.intervalMs);
    }
    
    return () => {
      dataBackupService.stopAutoSave();
    };
  }, []);

  // 监听数据变化并更新状态
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSaveTime(dataBackupService.getLastSaveTime());
      setBackupCount(dataBackupService.getLocalBackups().length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 启用自动保存
  const enable = useCallback(() => {
    const newConfig = dataBackupService.updateAutoSaveConfig({ enabled: true });
    setConfig(newConfig);
    toast.success('自动保存已启用');
  }, []);

  // 禁用自动保存
  const disable = useCallback(() => {
    dataBackupService.updateAutoSaveConfig({ enabled: false });
    setConfig(prev => ({ ...prev, enabled: false }));
    toast.info('自动保存已禁用');
  }, []);

  // 设置保存间隔
  const setIntervalMs = useCallback((ms: number) => {
    const newConfig = dataBackupService.updateAutoSaveConfig({ intervalMs: ms });
    setConfig(newConfig);
    toast.success(`保存间隔已调整为 ${ms / 1000} 秒`);
  }, []);

  // 立即保存
  const saveNow = useCallback(() => {
    setIsSaving(true);
    try {
      const backup = dataBackupService.manualSave();
      setLastSaveTime(backup.createdAt);
      setBackupCount(dataBackupService.getLocalBackups().length);
      toast.success('数据已保存');
    } catch (error) {
      toast.error('保存失败: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // 导出备份
  const exportBackup = useCallback((description?: string) => {
    try {
      const backup = dataBackupService.createBackup(description);
      dataBackupService.exportToFile(backup);
      toast.success('备份已导出');
    } catch (error) {
      toast.error('导出失败: ' + (error as Error).message);
    }
  }, []);

  // 导入备份
  const importBackup = useCallback(async (file: File): Promise<{
    success: boolean;
    message: string;
    restored: string[];
  }> => {
    try {
      const backup = await dataBackupService.importFromFile(file);
      const result = dataBackupService.applyBackup(backup);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      
      return result;
    } catch (error) {
      const message = '导入失败: ' + (error as Error).message;
      toast.error(message);
      return { success: false, message, restored: [] };
    }
  }, []);

  // 获取备份列表
  const getBackupList = useCallback((): BackupMetadata[] => {
    return dataBackupService.getLocalBackups();
  }, []);

  // 清除备份
  const clearBackups = useCallback(() => {
    dataBackupService.clearLocalBackups();
    setBackupCount(0);
    toast.success('备份已清除');
  }, []);

  // 获取统计信息
  const getStats = useCallback(() => {
    return dataBackupService.getBackupStats();
  }, []);

  return {
    isEnabled: config.enabled,
    isSaving,
    lastSaveTime,
    intervalMs: config.intervalMs,
    backupCount,
    enable,
    disable,
    setInterval: setIntervalMs,
    saveNow,
    exportBackup,
    importBackup,
    getBackupList,
    clearBackups,
    getStats,
  };
}
