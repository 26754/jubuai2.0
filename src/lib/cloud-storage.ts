// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端存储 React Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { cloudAuth } from './cloud-auth';
import type { CloudUser, AuthResult } from './cloud-auth';
import { cloudProjectManager } from './cloud-project-manager';
import type { CloudProject } from './cloud-project-manager';

// =============================================
// useCloudAuth - 认证状态管理
// =============================================

export function useCloudAuth() {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化：获取当前用户
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const currentUser = await cloudAuth.getCurrentUser();
        setUser(currentUser);
      } catch (err: any) {
        console.error('[useCloudAuth] 初始化失败:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 监听认证状态变化
    const unsubscribe = cloudAuth.onAuthStateChange((newUser) => {
      setUser(newUser);
    });

    return () => unsubscribe();
  }, []);

  // 登录
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await cloudAuth.login(email, password);
      if (result.success && result.user) {
        setUser(result.user);
        return result;
      } else {
        setError(result.error || '登录失败');
        return result;
      }
    } catch (err: any) {
      const errorMsg = err.message || '登录失败';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // 注册
  const register = useCallback(async (email: string, password: string, username?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await cloudAuth.register(email, password, username);
      if (result.success && result.user) {
        setUser(result.user);
        return result;
      } else {
        setError(result.error || '注册失败');
        return result;
      }
    } catch (err: any) {
      const errorMsg = err.message || '注册失败';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await cloudAuth.logout();
      setUser(null);
    } catch (err: any) {
      console.error('[useCloudAuth] 登出失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };
}

// =============================================
// useCloudProjects - 项目列表管理
// =============================================

export function useCloudProjects(userId: string | null) {
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取项目列表
  const fetchProjects = useCallback(async () => {
    if (!userId) {
      setProjects([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await cloudProjectManager.getProjects(userId);
      setProjects(data);
    } catch (err: any) {
      console.error('[useCloudProjects] 获取项目失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 初始化：获取项目列表
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 创建项目
  const createProject = useCallback(async (name: string, visualStyleId?: string) => {
    if (!userId) return null;

    setLoading(true);
    setError(null);
    try {
      const newProject = await cloudProjectManager.createProject(userId, name, visualStyleId);
      setProjects((prev) => [newProject, ...prev]);
      return newProject;
    } catch (err: any) {
      console.error('[useCloudProjects] 创建项目失败:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 更新项目
  const updateProject = useCallback(async (projectId: string, updates: Partial<CloudProject>) => {
    setLoading(true);
    setError(null);
    try {
      await cloudProjectManager.updateProject(projectId, updates);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
      );
    } catch (err: any) {
      console.error('[useCloudProjects] 更新项目失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 删除项目
  const deleteProject = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      await cloudProjectManager.deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err: any) {
      console.error('[useCloudProjects] 删除项目失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
