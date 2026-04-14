// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
"use client";

/**
 * 认证状态管理
 * 使用 Supabase Auth 管理用户账户和登录状态
 */

import { create } from 'zustand';
import { getSupabaseClient, isSupabaseConfigured as checkSupabaseConfigured } from '@/storage/database/supabase-client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { cloudSyncManager } from '@/storage/database/cloud-sync-manager';
import { getCloudProjects, isCloudStorageAvailable } from '@/storage/database/cloud-storage';

export interface User {
  id: string;
  email: string;
  username?: string;
  createdAt: number;
}

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  error: string | null;
  isDemoUser: boolean;
  isSupabaseConfigured: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  resetPassword: (email: string) => Promise<boolean>;
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

// 检查 Supabase 是否配置
// 动态检查 Supabase 配置
function isSupabaseConfigured(): boolean {
  return checkSupabaseConfigured();
}

// 检查 Supabase 配置（用于 store 初始化）
const checkSupabaseConfig = (): boolean => {
  return isSupabaseConfigured();
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  currentUser: null,
  supabaseUser: null,
  isLoading: false,
  error: null,
  isDemoUser: false,
  isSupabaseConfigured: isSupabaseConfigured(), // 动态检查

  initialize: async () => {
    // 每次初始化时动态检查配置
    if (!isSupabaseConfigured()) {
      console.log('[Auth] Supabase not configured, skipping initialization');
      set({ isSupabaseConfigured: false });
      return;
    }
    
    set({ isSupabaseConfigured: true });
    
    if (!isSupabaseConfigured()) {
      console.log('[Auth] Supabase not configured, skipping initialization');
      return;
    }

    try {
      const supabase = getSupabaseClient();
      
      // 获取当前会话
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[Auth] Failed to get session:', error);
        return;
      }

      if (session?.user) {
        const user = session.user;
        set({
          isAuthenticated: true,
          supabaseUser: user,
          currentUser: {
            id: user.id,
            email: user.email || '',
            username: user.user_metadata?.username || user.user_metadata?.full_name || undefined,
            createdAt: new Date(user.created_at).getTime(),
          },
        });
        console.log('[Auth] Restored session for:', user.email);
      }

      // 监听 Auth 状态变化
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('[Auth] Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          const user = session.user;
          set({
            isAuthenticated: true,
            supabaseUser: user,
            currentUser: {
              id: user.id,
              email: user.email || '',
              username: user.user_metadata?.username || user.user_metadata?.full_name || undefined,
              createdAt: new Date(user.created_at).getTime(),
            },
            isDemoUser: false,
            error: null,
          });
        } else if (event === 'SIGNED_OUT') {
          set({
            isAuthenticated: false,
            supabaseUser: null,
            currentUser: null,
            isDemoUser: false,
          });
        }
      });
    } catch (err) {
      console.error('[Auth] Initialize error:', err);
    }
  },

  login: async (email: string, password: string): Promise<boolean> => {
    // 动态检查 Supabase 配置
    if (!isSupabaseConfigured()) {
      set({ error: 'Supabase 未配置，请联系管理员' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[Auth] Login failed:', error);
        set({
          isLoading: false,
          error: error.message === 'Invalid login credentials'
            ? '邮箱或密码错误'
            : error.message,
        });
        return false;
      }

      if (data.user) {
        set({
          isAuthenticated: true,
          supabaseUser: data.user,
          currentUser: {
            id: data.user.id,
            email: data.user.email || '',
            username: data.user.user_metadata?.username || data.user.user_metadata?.full_name || undefined,
            createdAt: new Date(data.user.created_at).getTime(),
          },
          isLoading: false,
          error: null,
        });
        console.log('[Auth] User logged in:', email);
        
        // 登录成功后自动触发云端同步
        triggerAutoSync();
        
        return true;
      }

      return false;
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
    // 动态检查 Supabase 配置
    if (!isSupabaseConfigured()) {
      set({ error: 'Supabase 未配置，请联系管理员' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const supabase = getSupabaseClient();
      
      // 获取重定向 URL
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
      const redirectTo = `${siteUrl}/auth/callback`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            username: username || email.split('@')[0],
            full_name: username || email.split('@')[0],
          },
        },
      });

      if (error) {
        console.error('[Auth] Registration failed:', error);
        
        // 处理常见的注册错误
        let errorMessage = error.message;
        if (error.message.includes('already registered')) {
          errorMessage = '该邮箱已被注册';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = '密码长度至少为6个字符';
        }
        
        set({
          isLoading: false,
          error: errorMessage,
        });
        return false;
      }

      if (data.user) {
        set({
          isAuthenticated: true,
          supabaseUser: data.user,
          currentUser: {
            id: data.user.id,
            email: data.user.email || '',
            username: data.user.user_metadata?.username || username || email.split('@')[0],
            createdAt: new Date(data.user.created_at).getTime(),
          },
          isLoading: false,
          error: null,
        });
        console.log('[Auth] User registered:', email);
        
        // 注册成功后自动触发云端同步
        triggerAutoSync();
        
        return true;
      }

      // 注册成功但需要邮箱验证
      if (data.needsEmailVerification) {
        set({
          isLoading: false,
          error: '注册成功，请查收验证邮件并点击链接完成验证',
        });
        return true;
      }

      return false;
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
    const { isSupabaseConfigured } = get();
    
    try {
      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('[Auth] Logout error:', err);
    }

    set({
      isAuthenticated: false,
      currentUser: null,
      supabaseUser: null,
      isDemoUser: false,
      error: null,
    });
    console.log('[Auth] User logged out');
  },

  clearError: () => {
    set({ error: null });
  },

  resetPassword: async (email: string): Promise<boolean> => {
    const { isSupabaseConfigured } = get();
    
    if (!isSupabaseConfigured) {
      set({ error: 'Supabase 未配置，请联系管理员' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const supabase = getSupabaseClient();
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        console.error('[Auth] Password reset failed:', error);
        set({
          isLoading: false,
          error: error.message,
        });
        return false;
      }

      set({
        isLoading: false,
        error: null,
      });
      console.log('[Auth] Password reset email sent to:', email);
      return true;
    } catch (err: any) {
      console.error('[Auth] Password reset error:', err);
      set({
        isLoading: false,
        error: err.message || '密码重置失败，请稍后重试',
      });
      return false;
    }
  },
}));

/**
 * 自动云端同步
 * 登录成功后自动触发，处理本地与云端数据同步
 */
async function triggerAutoSync() {
  // 延迟执行，确保 UI 已经渲染完成
  setTimeout(async () => {
    try {
      if (!isCloudStorageAvailable()) {
        console.log('[AutoSync] Cloud storage not available, skipping sync');
        return;
      }

      console.log('[AutoSync] Starting automatic cloud sync...');

      // 获取本地项目数量
      const { useProjectStore } = await import('@/stores/project-store');
      const localProjects = useProjectStore.getState().projects;
      
      // 过滤掉默认项目（只有默认项目时不认为是有本地数据）
      const hasLocalData = localProjects.some(p => p.id !== 'default-project');
      
      // 获取云端项目数量
      let cloudProjectCount = 0;
      try {
        const cloudProjects = await getCloudProjects();
        cloudProjectCount = cloudProjects.length;
      } catch (e) {
        console.warn('[AutoSync] Failed to get cloud projects:', e);
      }

      console.log(`[AutoSync] Local projects: ${localProjects.length}, Cloud projects: ${cloudProjectCount}`);

      if (cloudProjectCount > 0 && !hasLocalData) {
        // 场景1: 云端有数据，本地没有 → 从云端恢复
        console.log('[AutoSync] Restoring from cloud...');
        await cloudSyncManager.restoreFromCloud();
        console.log('[AutoSync] Restored from cloud successfully');
        
      } else if (hasLocalData && cloudProjectCount === 0) {
        // 场景2: 本地有数据，云端没有 → 上传到云端
        console.log('[AutoSync] Uploading to cloud...');
        await cloudSyncManager.syncAllToCloud();
        console.log('[AutoSync] Uploaded to cloud successfully');
        
      } else if (hasLocalData && cloudProjectCount > 0) {
        // 场景3: 都有数据 → 保留本地（用户可能正在本地工作），同时更新云端
        console.log('[AutoSync] Syncing local changes to cloud...');
        await cloudSyncManager.syncAllToCloud();
        console.log('[AutoSync] Local changes synced to cloud');
        
      } else {
        // 场景4: 都没有数据（只有默认项目）→ 无需同步
        console.log('[AutoSync] No data to sync (only default project)');
      }

    } catch (error) {
      console.error('[AutoSync] Sync failed:', error);
      // 同步失败不影响用户体验，静默处理
    }
  }, 1000); // 延迟1秒执行，确保应用已完全加载
}
