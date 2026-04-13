// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * 用户认证状态管理
 * 使用 localStorage 存储，支持 Supabase 迁移
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 认证方法
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  clearError: () => void;
  
  // 检查认证状态
  checkAuth: () => boolean;
}

// 简单的密码哈希（生产环境应使用后端验证）
const hashPassword = (password: string): string => {
  // 使用简单的 base64 编码作为演示
  // 生产环境应使用 bcrypt 或 Argon2
  return btoa(password);
};

// 生成随机 ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// 存储键名
const USERS_KEY = 'jubu_users';
const SESSION_KEY = 'jubu_session';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          // 模拟网络延迟
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 从 localStorage 获取用户列表
          const usersData = localStorage.getItem(USERS_KEY);
          const users: Array<User & { passwordHash: string }> = usersData ? JSON.parse(usersData) : [];
          
          // 查找用户
          const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
          
          if (userIndex === -1) {
            set({ error: '用户不存在', isLoading: false });
            return false;
          }
          
          const user = users[userIndex];
          
          // 验证密码
          const passwordHash = hashPassword(password);
          if (user.passwordHash !== passwordHash) {
            set({ error: '密码错误', isLoading: false });
            return false;
          }
          
          // 创建会话
          const { passwordHash: _, ...userWithoutPassword } = user;
          const session = {
            user: userWithoutPassword,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 天过期
          };
          
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          
          set({ 
            user: userWithoutPassword, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          return true;
        } catch (err) {
          console.error('[Auth] Login error:', err);
          set({ error: '登录失败，请重试', isLoading: false });
          return false;
        }
      },

      register: async (email: string, password: string, username: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          // 模拟网络延迟
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 验证输入
          if (!email || !email.includes('@')) {
            set({ error: '请输入有效的邮箱地址', isLoading: false });
            return false;
          }
          
          if (!password || password.length < 6) {
            set({ error: '密码至少需要 6 个字符', isLoading: false });
            return false;
          }
          
          if (!username || username.trim().length < 2) {
            set({ error: '用户名至少需要 2 个字符', isLoading: false });
            return false;
          }
          
          // 从 localStorage 获取用户列表
          const usersData = localStorage.getItem(USERS_KEY);
          const users: Array<User & { passwordHash: string }> = usersData ? JSON.parse(usersData) : [];
          
          // 检查邮箱是否已存在
          if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            set({ error: '该邮箱已被注册', isLoading: false });
            return false;
          }
          
          // 创建新用户
          const newUser: User & { passwordHash: string } = {
            id: generateId(),
            email: email.toLowerCase(),
            username: username.trim(),
            createdAt: new Date().toISOString(),
            passwordHash: hashPassword(password),
          };
          
          users.push(newUser);
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
          
          // 自动登录
          const { passwordHash: _, ...userWithoutPassword } = newUser;
          const session = {
            user: userWithoutPassword,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          };
          
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          
          set({ 
            user: userWithoutPassword, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          return true;
        } catch (err) {
          console.error('[Auth] Register error:', err);
          set({ error: '注册失败，请重试', isLoading: false });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem(SESSION_KEY);
        set({ user: null, isAuthenticated: false, error: null });
      },

      updateProfile: (data: Partial<User>) => {
        const { user } = get();
        if (!user) return;
        
        const updatedUser = { ...user, ...data };
        
        // 更新用户列表中的数据
        const usersData = localStorage.getItem(USERS_KEY);
        if (usersData) {
          const users: Array<User & { passwordHash: string }> = JSON.parse(usersData);
          const userIndex = users.findIndex(u => u.id === user.id);
          if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...data };
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
          }
        }
        
        // 更新会话
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          session.user = updatedUser;
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
        
        set({ user: updatedUser });
      },

      clearError: () => set({ error: null }),

      checkAuth: (): boolean => {
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (!sessionData) {
          set({ user: null, isAuthenticated: false });
          return false;
        }
        
        try {
          const session = JSON.parse(sessionData);
          
          // 检查是否过期
          if (session.expiresAt < Date.now()) {
            localStorage.removeItem(SESSION_KEY);
            set({ user: null, isAuthenticated: false });
            return false;
          }
          
          set({ user: session.user, isAuthenticated: true });
          return true;
        } catch {
          localStorage.removeItem(SESSION_KEY);
          set({ user: null, isAuthenticated: false });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// 初始化时检查认证状态
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuth();
}
