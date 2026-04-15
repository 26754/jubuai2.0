// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端认证管理器
 * 使用 Supabase Auth 实现用户认证
 */

import { createSupabaseClient } from '@/storage/database/supabase-client';
import type { User } from '@supabase/supabase-js';

export interface CloudUser {
  id: string;
  email: string;
  username?: string;
  createdAt: number;
}

export interface AuthResult {
  success: boolean;
  user?: CloudUser;
  error?: string;
}

/**
 * 云端认证管理器类
 */
export class CloudAuthManager {
  private supabase = createSupabaseClient();

  /**
   * 注册新用户
   */
  async register(email: string, password: string, username?: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0],
          },
        },
      });

      if (error) {
        console.error('[CloudAuth] 注册失败:', error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const cloudUser: CloudUser = {
          id: data.user.id,
          email: data.user.email || email,
          username: data.user.user_metadata?.username || username,
          createdAt: new Date(data.user.created_at).getTime(),
        };
        return { success: true, user: cloudUser };
      }

      return { success: false, error: '注册未返回用户数据' };
    } catch (error: any) {
      console.error('[CloudAuth] 注册异常:', error);
      return { success: false, error: error.message || '注册失败' };
    }
  }

  /**
   * 用户登录
   */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[CloudAuth] 登录失败:', error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const cloudUser: CloudUser = {
          id: data.user.id,
          email: data.user.email || email,
          username: data.user.user_metadata?.username,
          createdAt: new Date(data.user.created_at).getTime(),
        };
        return { success: true, user: cloudUser };
      }

      return { success: false, error: '登录未返回用户数据' };
    } catch (error: any) {
      console.error('[CloudAuth] 登录异常:', error);
      return { success: false, error: error.message || '登录失败' };
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.error('[CloudAuth] 登出失败:', error);
      }
    } catch (error: any) {
      console.error('[CloudAuth] 登出异常:', error);
    }
  }

  /**
   * 获取当前用户
   */
  async getCurrentUser(): Promise<CloudUser | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email || '',
        username: user.user_metadata?.username,
        createdAt: new Date(user.created_at).getTime(),
      };
    } catch (error) {
      console.error('[CloudAuth] 获取当前用户失败:', error);
      return null;
    }
  }

  /**
   * 监听认证状态变化
   */
  onAuthStateChange(callback: (user: CloudUser | null) => void): () => void {
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const cloudUser: CloudUser = {
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.username,
            createdAt: new Date(session.user.created_at).getTime(),
          };
          callback(cloudUser);
        } else if (event === 'SIGNED_OUT') {
          callback(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }

  /**
   * 发送密码重置邮件
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || '重置密码失败' };
    }
  }

  /**
   * 更新用户资料
   */
  async updateProfile(data: { username?: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        data,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || '更新资料失败' };
    }
  }
}

// 导出单例
export const cloudAuth = new CloudAuthManager();
