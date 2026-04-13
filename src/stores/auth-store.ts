// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * 认证状态管理
 * 使用本地存储管理用户账户和登录状态
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: number;
}

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  error: string | null;
  isDemoUser: boolean;

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  loginAsDemo: () => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

// 简单的密码哈希（实际生产环境应使用更安全的方式）
const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

// 生成唯一 ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// 测试账号的密码哈希
const TEST_PASSWORD_HASH = '54c9a7a0'; // hashPassword('test123')
const DEMO_PASSWORD_HASH = '7c4a8d09'; // hashPassword('demo123')

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

// 确保测试账号存在
const ensureTestUser = (users: (User & { passwordHash?: string })[]): (User & { passwordHash: string })[] => {
  const hasTestUser = users.some(u => u.username === 'test');
  const hasDemoUser = users.some(u => u.username === 'demo');
  
  const result = users as (User & { passwordHash: string })[];
  
  if (!hasTestUser) {
    result.push({
      id: 'test-user-001',
      username: 'test',
      email: 'test@example.com',
      createdAt: Date.now(),
      passwordHash: TEST_PASSWORD_HASH,
    });
  }
  
  if (!hasDemoUser) {
    result.push({
      ...DEMO_USER,
      createdAt: Date.now(),
    });
  }
  
  return result;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUser: null,
      isDemoUser: false,
      users: [
        // 默认测试账号
        {
          id: 'test-user-001',
          username: 'test',
          email: 'test@example.com',
          createdAt: Date.now(),
          passwordHash: TEST_PASSWORD_HASH,
        },
        // Demo 体验账号
        {
          id: 'demo-user-001',
          username: 'demo',
          email: 'demo@jubu.ai',
          createdAt: Date.now(),
          passwordHash: DEMO_PASSWORD_HASH,
        }
      ] as (User & { passwordHash: string })[],
      isLoading: false,
      error: null,

      login: async (username: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });

        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 500));

        const { users } = get();
        const passwordHash = hashPassword(password);

        // 查找用户
        const user = users.find(
          u => u.username === username && (u as any).passwordHash === passwordHash
        );

        if (user) {
          // 移除密码哈希后存储用户
          const { passwordHash: _, ...userWithoutPassword } = user as any;
          set({
            isAuthenticated: true,
            currentUser: userWithoutPassword,
            isLoading: false,
            error: null,
          });
          console.log('[Auth] User logged in:', username);
          return true;
        }

        set({
          isLoading: false,
          error: '用户名或密码错误',
        });
        return false;
      },

      loginAsDemo: async (): Promise<boolean> => {
        set({ isLoading: true, error: null });

        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 500));

        const demoUser = {
          id: DEMO_USER.id,
          username: DEMO_USER.username,
          email: DEMO_USER.email,
          createdAt: Date.now(),
        };

        set({
          isAuthenticated: true,
          currentUser: demoUser,
          isDemoUser: true,
          isLoading: false,
          error: null,
        });
        
        console.log('[Auth] Demo user logged in');
        console.log('[Demo] Initializing demo project data...');
        
        return true;
      },

      register: async (username: string, email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });

        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 500));

        const { users } = get();

        // 检查用户名是否已存在
        if (users.some(u => u.username === username)) {
          set({
            isLoading: false,
            error: '用户名已存在',
          });
          return false;
        }

        // 检查邮箱是否已存在
        if (users.some(u => u.email === email)) {
          set({
            isLoading: false,
            error: '邮箱已被注册',
          });
          return false;
        }

        // 验证密码长度
        if (password.length < 6) {
          set({
            isLoading: false,
            error: '密码至少需要6个字符',
          });
          return false;
        }

        // 创建新用户
        const newUser: User & { passwordHash: string } = {
          id: generateId(),
          username,
          email,
          createdAt: Date.now(),
          passwordHash: hashPassword(password),
        };

        set({
          users: [...users, newUser],
          isAuthenticated: true,
          currentUser: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            createdAt: newUser.createdAt,
          },
          isLoading: false,
          error: null,
        });

        console.log('[Auth] New user registered:', username);
        return true;
      },

      logout: () => {
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
    }),
    {
      name: 'jubu-auth-storage',
      partialize: (state) => ({
        users: state.users,
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
        isDemoUser: state.isDemoUser,
      }),
      // 自定义合并逻辑，确保测试账号始终存在且保留已注册用户
      merge: (persistedState: any, currentState: any) => {
        // 处理空或无效的 persistedState
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState;
        }
        
        // 获取 persisted 中的用户列表
        const persistedUsers = Array.isArray(persistedState.users) 
          ? persistedState.users 
          : [];
        
        // 确保测试账号存在，同时保留所有已注册用户
        const mergedUsers = ensureTestUser(persistedUsers);
        
        return {
          ...currentState,
          isAuthenticated: persistedState.isAuthenticated ?? currentState.isAuthenticated,
          currentUser: persistedState.currentUser ?? currentState.currentUser,
          isDemoUser: persistedState.isDemoUser ?? currentState.isDemoUser,
          users: mergedUsers,
        };
      },
    }
  )
);
