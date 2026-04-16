// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
"use client";

/**
 * 认证状态管理
 * 使用自定义 JWT 认证 API 管理用户账户和登录状态
 */

import { create } from 'zustand';
import { cloudAuth } from '@/lib/cloud-auth';
import { cloudSyncService } from '@/lib/cloud-sync-service';

export interface User {
  id: string;
  email: string;
  username?: string;
  createdAt: number;
}

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  isDemoUser: boolean;
  isCloudConfigured: boolean;

  // Actions
  initialize: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  updatePassword: (newPassword: string) => Promise<boolean>;
  updateUsername: (username: string) => void;
}

// Demo 用户配置
export const DEMO_USER = {
  id: 'demo-user-001',
  username: 'demo',
  email: 'demo@jubu.ai',
  password: 'demo123',
};

// Demo 项目数据
export const createDemoProjectData = (projectId: string) => ({
  scriptData: {
    title: "星际探险",
    synopsis: "一艘宇宙飞船在探索未知星系时发现了神秘的外星文明。",
    episodes: [{
      id: `demo-episode-1-${projectId}`,
      title: "第一集：神秘信号",
      synopsis: "船长收到了一段来自深空的神秘信号...",
      scenes: [{
        id: `demo-scene-1-${projectId}`,
        sceneNumber: 1,
        location: "宇宙飞船 驾驶舱",
        timeOfDay: "夜晚",
        description: "船长独自一人在驾驶舱中工作，窗外星光点点。",
        characters: ["船长", "AI助手"],
        dialogue: {
          "船长": "这信号...从哪里来的？",
          "AI助手": "根据分析，信号来自银河系边缘的未知区域。"
        },
        shots: [
          {
            id: `demo-shot-1-${projectId}`,
            shotNumber: 1,
            shotType: "全景",
            cameraAngle: "平视",
            cameraMovement: "固定",
            description: "宇宙飞船在星空中漂浮",
            duration: 3
          },
          {
            id: `demo-shot-2-${projectId}`,
            shotNumber: 2,
            shotType: "中景",
            cameraAngle: "侧面",
            cameraMovement: "缓慢推进",
            description: "船长注视着屏幕",
            duration: 2
          }
        ],
        visualStyle: "科幻风格",
        musicMood: "神秘悬疑",
        visualStyleLocked: false,
        styleSource: "episode"
      }],
      visualStyle: "科幻风格",
      visualStyleLocked: false
    }],
    characters: [{
      id: `demo-char-1-${projectId}`,
      name: "船长",
      age: "35-40",
      appearance: "坚毅的眼神，灰色短发，穿着太空服",
      personality: "勇敢、果断、有责任感",
      role: "主角"
    }, {
      id: `demo-char-2-${projectId}`,
      name: "AI助手",
      age: "未知",
      appearance: "全息投影，蓝色光芒",
      personality: "冷静、逻辑性强、略带幽默",
      role: "配角"
    }]
  },
  rawScript: `第一集：神秘信号

场景1：宇宙飞船 驾驶舱 - 夜晚

[外景] 宇宙飞船在星空中漂浮，星光闪烁。

[内景] 驾驶舱内，船长独自一人注视着前方的屏幕。

船长：这信号...从哪里来的？

（AI助手投影出现）

AI助手：根据分析，信号来自银河系边缘的未知区域。

船长：能确定信号内容吗？

AI助手：正在解码中...数据显示，这可能是一种文明发出的邀请。

船长（表情严肃）：我们需要去看看。
`,
  language: "zh-CN",
  targetDuration: "5分钟",
  styleId: "sci-fi",
  parseStatus: "completed" as const,
  shots: [
    {
      id: `demo-shot-1-${projectId}`,
      episodeId: `demo-episode-1-${projectId}`,
      sceneId: `demo-scene-1-${projectId}`,
      shotNumber: 1,
      shotType: "全景",
      cameraAngle: "平视",
      cameraMovement: "固定",
      description: "宇宙飞船在星空中漂浮",
      duration: 3,
      status: "pending" as const
    },
    {
      id: `demo-shot-2-${projectId}`,
      episodeId: `demo-episode-1-${projectId}`,
      sceneId: `demo-scene-1-${projectId}`,
      shotNumber: 2,
      shotType: "中景",
      cameraAngle: "侧面",
      cameraMovement: "缓慢推进",
      description: "船长注视着屏幕",
      duration: 2,
      status: "pending" as const
    }
  ],
  shotStatus: "completed" as const
});

export const DEMO_PROJECT = {
  id: 'demo-project',
  name: '星际探险 - 演示项目',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  visualStyleId: 'sci-fi'
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  currentUser: null,
  isLoading: false,
  error: null,
  isDemoUser: false,
  isCloudConfigured: true, // JWT 认证始终可用

  initialize: async () => {
    console.log('[Auth] Initializing with JWT authentication...');

    try {
      // 检查是否有保存的登录状态
      const user = await cloudAuth.getCurrentUser();

      if (user) {
        set({
          isAuthenticated: true,
          currentUser: user,
          isCloudConfigured: true,
        });
        console.log('[Auth] Restored session for:', user.email);
      } else {
        set({
          isAuthenticated: false,
          currentUser: null,
          isCloudConfigured: true,
        });
        console.log('[Auth] No saved session found');
      }
    } catch (err) {
      console.error('[Auth] Initialize error:', err);
      set({
        isAuthenticated: false,
        currentUser: null,
        isCloudConfigured: true,
      });
    }
  },

  /**
   * 检查当前 session 是否有效
   */
  checkSession: async (): Promise<boolean> => {
    try {
      const user = await cloudAuth.getCurrentUser();

      if (!user) {
        set({
          isAuthenticated: false,
          currentUser: null,
        });
        return false;
      }

      set({
        isAuthenticated: true,
        currentUser: user,
      });

      return true;
    } catch (err) {
      console.error('[Auth] Session check error:', err);
      return false;
    }
  },

  login: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const result = await cloudAuth.login(email, password);

      if (!result.success || !result.user) {
        console.error('[Auth] Login failed:', result.error);
        set({
          isLoading: false,
          error: result.error || '登录失败',
        });
        return false;
      }

      const user: User = {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        createdAt: result.user.createdAt,
      };

      set({
        isAuthenticated: true,
        currentUser: user,
        isLoading: false,
        error: null,
      });
      console.log('[Auth] User logged in:', email);

      // Auto-sync to cloud after successful login
      if (cloudSyncService.isAutoSyncEnabled()) {
        console.log('[Auth] Triggering auto-sync after login...');
        cloudSyncService.performFullSync();
      }

      return true;
    } catch (err: any) {
      console.error('[Auth] Login error:', err);
      set({
        isLoading: false,
        error: err.message || '登录失败，请稍后重试',
      });
      return false;
    }
  },

  register: async (email: string, password: string, username?: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const result = await cloudAuth.register(email, password, username);

      if (!result.success || !result.user) {
        console.error('[Auth] Registration failed:', result.error);
        set({
          isLoading: false,
          error: result.error || '注册失败',
        });
        return false;
      }

      const user: User = {
        id: result.user.id,
        email: result.user.email,
        username: username || email.split('@')[0],
        createdAt: result.user.createdAt,
      };

      set({
        isAuthenticated: true,
        currentUser: user,
        isLoading: false,
        error: null,
      });
      console.log('[Auth] User registered:', email);

      // Auto-sync to cloud after successful registration
      console.log('[Auth] Triggering initial sync after registration...');
      cloudSyncService.performFullSync();

      return true;
    } catch (err: any) {
      console.error('[Auth] Registration error:', err);
      set({
        isLoading: false,
        error: err.message || '注册失败，请稍后重试',
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await cloudAuth.logout();
    } catch (err) {
      console.error('[Auth] Logout error:', err);
    }

    set({
      isAuthenticated: false,
      currentUser: null,
      isDemoUser: false,
      error: null,
    });
    console.log('[Auth] User logged out');
  },

  clearError: () => {
    set({ error: null });
  },

  updatePassword: async (newPassword: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const result = await cloudAuth.updatePassword(newPassword);

      if (!result.success) {
        console.error('[Auth] Update password failed:', result.error);
        set({
          isLoading: false,
          error: result.error || '更新密码失败',
        });
        return false;
      }

      set({
        isLoading: false,
        error: null,
      });
      console.log('[Auth] Password updated successfully');

      return true;
    } catch (err: any) {
      console.error('[Auth] Update password error:', err);
      set({
        isLoading: false,
        error: err.message || '更新密码失败，请稍后重试',
      });
      return false;
    }
  },

  updateUsername: (username: string) => {
    const { currentUser } = get();
    if (currentUser) {
      set({
        currentUser: {
          ...currentUser,
          username,
        },
      });
      console.log('[Auth] Username updated to:', username);
    }
  },
}));
