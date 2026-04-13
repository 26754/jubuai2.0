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

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
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

// 确保测试账号存在
const ensureTestUser = (users: (User & { passwordHash?: string })[]): (User & { passwordHash: string })[] => {
  const hasTestUser = users.some(u => u.username === 'test');
  if (!hasTestUser) {
    return [
      ...users,
      {
        id: 'test-user-001',
        username: 'test',
        email: 'test@example.com',
        createdAt: Date.now(),
        passwordHash: TEST_PASSWORD_HASH,
      }
    ];
  }
  return users as (User & { passwordHash: string })[];
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUser: null,
      users: [
        // 默认测试账号
        {
          id: 'test-user-001',
          username: 'test',
          email: 'test@example.com',
          createdAt: Date.now(),
          passwordHash: TEST_PASSWORD_HASH,
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
      }),
      // 自定义合并逻辑，确保测试账号始终存在
      merge: (persistedState: any, currentState) => {
        const persisted = persistedState || {};
        const users = ensureTestUser(persisted.users || []);
        return {
          ...currentState,
          ...persisted,
          users,
        };
      },
    }
  )
);
