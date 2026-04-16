// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * Auto Sync Hook
 * React hook for integrating auto-sync with component lifecycle
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { 
  smartSyncService, 
  type SyncResult, 
  type SyncFrequency 
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
  const [syncFrequency, setSyncFrequencyState] = useState<SyncFrequency>('manual');

  // Load initial state
  useEffect(() => {
    setLastSyncTime(smartSyncService.getLastSyncTime());
    setIsAutoSyncEnabled(smartSyncService.isAutoSyncEnabled());
    setSyncFrequencyState(smartSyncService.getSyncFrequency());
  }, []);

  // Update state when sync completes
  useEffect(() => {
    const interval = setInterval(() => {
      const result = smartSyncService.getLastSyncResult();
      if (result) {
        setLastResult(result);
        setLastSyncTime(result.timestamp);
      }
      setIsSyncing(smartSyncService.getIsSyncing());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Manual sync function
  const performSync = useCallback(async () => {
    setIsSyncing(true);
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
    try {
      return await smartSyncService.syncProjects();
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Fetch from cloud
  const fetchFromCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      const projects = await smartSyncService.fetchProjectsFromCloud();
      return projects;
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
  const { isAuthenticated, isAutoSyncEnabled } = useCloudSync();
  const [pendingSync, setPendingSync] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAutoSyncEnabled) return;

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
  }, [dataKey, data, isAuthenticated, isAutoSyncEnabled, debounceMs]);

  return pendingSync;
}

/**
 * Hook for sync status indicator
 */
export function useSyncStatus() {
  const { isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const result = smartSyncService.getLastSyncResult();
      if (result) {
        setStatus(result.success ? 'success' : 'error');
        setLastError(result.error || null);
      }
      if (smartSyncService.getIsSyncing()) {
        setStatus('syncing');
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return { status, lastError, isAuthenticated };
}
