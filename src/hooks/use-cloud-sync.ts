// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * Auto Sync Hook
 * React hook for integrating auto-sync with component lifecycle
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { 
  smartSyncService, 
  type SyncResult, 
  type SyncFrequency,
  type SyncStatusEvent 
} from '@/lib/smart-sync-service';

/**
 * Hook for using cloud sync service in components
 */
export function useCloudSync() {
  const { isAuthenticated } = useAuthStore();
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(false);
  const [syncFrequency, setSyncFrequencyState] = useState<SyncFrequency>('15min');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string>('');

  // Load initial state
  useEffect(() => {
    setLastSyncTime(smartSyncService.getLastSyncTime());
    setIsAutoSyncEnabled(smartSyncService.isAutoSyncEnabled());
    setSyncFrequencyState(smartSyncService.getSyncFrequency());
    
    // Subscribe to sync status events
    const unsubscribe = smartSyncService.addSyncStatusListener((event: SyncStatusEvent) => {
      switch (event.type) {
        case 'syncing':
          setIsSyncing(true);
          setSyncProgress(event.progress || 0);
          setSyncMessage(event.message || '同步中...');
          break;
        case 'success':
          setIsSyncing(false);
          setSyncProgress(100);
          setSyncMessage('同步完成');
          if (event.result) {
            setLastResult(event.result);
            setLastSyncTime(event.result.timestamp);
          }
          break;
        case 'error':
          setIsSyncing(false);
          setSyncProgress(0);
          setSyncMessage(event.message || '同步失败');
          if (event.result) {
            setLastResult(event.result);
          }
          break;
        case 'idle':
          setIsSyncing(false);
          setSyncProgress(0);
          setSyncMessage('');
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  // Manual sync function
  const performSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncMessage('开始同步...');
    try {
      const result = await smartSyncService.performFullSync();
      setLastResult(result);
      setLastSyncTime(result.timestamp);
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Enable/disable auto-sync
  const setAutoSyncEnabled = useCallback((enabled: boolean) => {
    smartSyncService.setAutoSyncEnabled(enabled);
    setIsAutoSyncEnabled(enabled);
  }, []);

  // Set sync frequency
  const setSyncFrequency = useCallback((frequency: SyncFrequency) => {
    smartSyncService.setSyncFrequency(frequency);
    setSyncFrequencyState(frequency);
  }, []);

  // Sync projects only
  const syncProjects = useCallback(async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncMessage('同步项目中...');
    try {
      return await smartSyncService.syncProjects();
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Fetch from cloud
  const fetchFromCloud = useCallback(async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncMessage('获取云端数据...');
    try {
      const projects = await smartSyncService.fetchProjectsFromCloud();
      return { success: true, projects };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    // State
    isAuthenticated,
    isSyncing,
    lastSyncTime,
    lastResult,
    isAutoSyncEnabled,
    syncFrequency,
    syncProgress,
    syncMessage,
    
    // Actions
    performSync,
    syncProjects,
    fetchFromCloud,
    setAutoSyncEnabled,
    setSyncFrequency,
  };
}

/**
 * Hook for auto-syncing on data changes
 * Call this hook in components that modify project data
 */
export function useAutoSyncOnChange(
  dataKey: string,
  data: unknown,
  debounceMs: number = 2000
) {
  const { isAuthenticated } = useAuthStore();
  const [pendingSync, setPendingSync] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !smartSyncService.isAutoSyncEnabled()) return;

    // Mark as pending sync
    setPendingSync(true);

    // Debounce the sync
    const timer = setTimeout(() => {
      console.log(`[AutoSync] Data changed: ${dataKey}, triggering sync...`);
      smartSyncService.performFullSync();
      setPendingSync(false);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [dataKey, data, isAuthenticated, debounceMs]);

  return pendingSync;
}

/**
 * Hook for sync status indicator with real-time updates
 */
export function useSyncStatus() {
  const { isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // Subscribe to real-time sync status events
    const unsubscribe = smartSyncService.addSyncStatusListener((event: SyncStatusEvent) => {
      switch (event.type) {
        case 'syncing':
          setStatus('syncing');
          setProgress(event.progress || 0);
          setMessage(event.message || '同步中...');
          break;
        case 'success':
          setStatus('success');
          setProgress(100);
          setMessage('同步完成');
          break;
        case 'error':
          setStatus('error');
          setLastError(event.message || '同步失败');
          setProgress(0);
          setMessage('');
          break;
        case 'idle':
          setStatus('idle');
          setProgress(0);
          setMessage('');
          break;
        case 'progress':
          setProgress(event.progress || 0);
          setMessage(event.message || '');
          break;
      }
    });

    // Also poll for sync state changes as backup
    const interval = setInterval(() => {
      const result = smartSyncService.getLastSyncResult();
      const isSyncing = smartSyncService.getIsSyncing();
      
      if (isSyncing && status !== 'syncing') {
        setStatus('syncing');
      }
      
      if (result && !isSyncing) {
        setStatus(result.success ? 'success' : 'error');
        setLastError(result.error || null);
        setProgress(100);
        setMessage('');
      }
    }, 500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { status, lastError, isAuthenticated, progress, message };
}

/**
 * Hook for sync history/log
 */
export function useSyncHistory(limit: number = 10) {
  const [history, setHistory] = useState<SyncResult[]>([]);
  const historyRef = useRef<SyncResult[]>([]);

  useEffect(() => {
    const unsubscribe = smartSyncService.addSyncStatusListener((event: SyncStatusEvent) => {
      if (event.type === 'success' && event.result) {
        historyRef.current = [event.result, ...historyRef.current].slice(0, limit);
        setHistory([...historyRef.current]);
      }
    });

    return () => unsubscribe();
  }, [limit]);

  return history;
}
