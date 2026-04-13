// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端同步 Hook
 * 提供 React Hook 用于在组件中使用云端功能
 */

import { useState, useEffect, useCallback } from 'react';
import { cloudAuth, type CloudUser } from '@/lib/cloud-auth';
import { cloudProjectManager, type CloudProject } from '@/lib/cloud-project-manager';

export interface UseCloudAuthReturn {
  user: CloudUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  error: string | null;
}

export function useCloudAuth(): UseCloudAuthReturn {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 获取初始用户状态
    const initAuth = async () => {
      try {
        const currentUser = await cloudAuth.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('[useCloudAuth] 初始化失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // 监听认证状态变化
    const unsubscribe = cloudAuth.onAuthStateChange((newUser) => {
      setUser(newUser);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await cloudAuth.login(email, password);
      if (result.success) {
        setUser(result.user || null);
        return true;
      } else {
        setError(result.error || '登录失败');
        return false;
      }
    } catch (err: any) {
      setError(err.message || '登录失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, username?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await cloudAuth.register(email, password, username);
      if (result.success) {
        setUser(result.user || null);
        return true;
      } else {
        setError(result.error || '注册失败');
        return false;
      }
    } catch (err: any) {
      setError(err.message || '注册失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await cloudAuth.logout();
      setUser(null);
    } catch (err) {
      console.error('[useCloudAuth] 登出失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    error,
  };
}

export interface UseCloudProjectsReturn {
  projects: CloudProject[];
  isLoading: boolean;
  error: string | null;
  createProject: (name: string, visualStyleId?: string) => Promise<CloudProject | null>;
  updateProject: (projectId: string, updates: Partial<CloudProject>) => Promise<boolean>;
  deleteProject: (projectId: string) => Promise<boolean>;
  refreshProjects: () => Promise<void>;
}

export function useCloudProjects(userId: string | null): UseCloudProjectsReturn {
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    if (!userId) {
      setProjects([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const projectList = await cloudProjectManager.getProjects(userId);
      setProjects(projectList);
    } catch (err: any) {
      setError(err.message || '加载项目失败');
      console.error('[useCloudProjects] 加载失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 当用户 ID 变化时重新加载
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const createProject = useCallback(async (name: string, visualStyleId?: string): Promise<CloudProject | null> => {
    if (!userId) {
      setError('请先登录');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newProject = await cloudProjectManager.createProject(userId, name, visualStyleId);
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (err: any) {
      setError(err.message || '创建项目失败');
      console.error('[useCloudProjects] 创建失败:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<CloudProject>): Promise<boolean> => {
    setError(null);

    try {
      await cloudProjectManager.updateProject(projectId, updates);
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, ...updates, updatedAt: Date.now() }
          : p
      ));
      return true;
    } catch (err: any) {
      setError(err.message || '更新项目失败');
      console.error('[useCloudProjects] 更新失败:', err);
      return false;
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    setError(null);

    try {
      await cloudProjectManager.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      return true;
    } catch (err: any) {
      setError(err.message || '删除项目失败');
      console.error('[useCloudProjects] 删除失败:', err);
      return false;
    }
  }, []);

  return {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects: loadProjects,
  };
}
