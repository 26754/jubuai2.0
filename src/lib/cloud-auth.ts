// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端认证管理器
 * 使用自定义 JWT 认证 API 实现用户认证
 */

export interface CloudUser {
  id: string;
  email: string;
  username?: string;
  createdAt: number;
}

export interface AuthResult {
  success: boolean;
  user?: CloudUser;
  token?: string;
  error?: string;
}

// API 基础路径
const API_BASE = '/api/auth';

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    createdAt: string;
  };
  token?: string;
  error?: string;
}

/**
 * 云端认证管理器类
 */
export class CloudAuthManager {
  private static TOKEN_KEY = 'jubuai_jwt_token';
  private static USER_KEY = 'jubuai_user';

  /**
   * 保存 Token 到本地存储
   */
  private saveToken(token: string): void {
    localStorage.setItem(CloudAuthManager.TOKEN_KEY, token);
  }

  /**
   * 获取本地存储的 Token
   */
  private getToken(): string | null {
    return localStorage.getItem(CloudAuthManager.TOKEN_KEY);
  }

  /**
   * 清除 Token
   */
  private clearToken(): void {
    localStorage.removeItem(CloudAuthManager.TOKEN_KEY);
    localStorage.removeItem(CloudAuthManager.USER_KEY);
  }

  /**
   * 保存用户信息
   */
  private saveUser(user: CloudUser): void {
    localStorage.setItem(CloudAuthManager.USER_KEY, JSON.stringify(user));
  }

  /**
   * 获取保存的用户信息
   */
  private getSavedUser(): CloudUser | null {
    const userStr = localStorage.getItem(CloudAuthManager.USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 注册新用户
   */
  async register(email: string, password: string, username?: string): Promise<AuthResult> {
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: AuthResponse = await response.json();

      if (!data.success || !data.user) {
        console.error('[CloudAuth] 注册失败:', data.error);
        return { success: false, error: data.error || '注册失败' };
      }

      const cloudUser: CloudUser = {
        id: data.user.id,
        email: data.user.email,
        username: username || email.split('@')[0],
        createdAt: new Date(data.user.createdAt).getTime(),
      };

      // 保存 Token 和用户信息
      if (data.token) {
        this.saveToken(data.token);
      }
      this.saveUser(cloudUser);

      return { success: true, user: cloudUser, token: data.token };
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
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: AuthResponse = await response.json();

      if (!data.success || !data.user) {
        console.error('[CloudAuth] 登录失败:', data.error);
        return { success: false, error: data.error || '登录失败' };
      }

      const cloudUser: CloudUser = {
        id: data.user.id,
        email: data.user.email,
        username: email.split('@')[0],
        createdAt: new Date(data.user.createdAt).getTime(),
      };

      // 保存 Token 和用户信息
      if (data.token) {
        this.saveToken(data.token);
      }
      this.saveUser(cloudUser);

      return { success: true, user: cloudUser, token: data.token };
    } catch (error: any) {
      console.error('[CloudAuth] 登录异常:', error);
      return { success: false, error: error.message || '登录失败' };
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    this.clearToken();
  }

  /**
   * 获取当前用户
   */
  async getCurrentUser(): Promise<CloudUser | null> {
    const token = this.getToken();
    if (!token) {
      return this.getSavedUser();
    }

    try {
      const response = await fetch(`${API_BASE}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token 无效，清除并返回缓存用户
        const savedUser = this.getSavedUser();
        if (savedUser) {
          return savedUser;
        }
        this.clearToken();
        return null;
      }

      const data: AuthResponse = await response.json();

      if (!data.success || !data.user) {
        return this.getSavedUser();
      }

      const cloudUser: CloudUser = {
        id: data.user.id,
        email: data.user.email,
        username: data.user.email.split('@')[0],
        createdAt: new Date(data.user.createdAt).getTime(),
      };

      this.saveUser(cloudUser);
      return cloudUser;
    } catch (error) {
      console.error('[CloudAuth] 获取当前用户失败:', error);
      return this.getSavedUser();
    }
  }

  /**
   * 监听认证状态变化
   * 注意：JWT 模式下使用轮询或本地事件
   */
  onAuthStateChange(callback: (user: CloudUser | null) => void): () => void {
    // 立即检查当前状态
    this.getCurrentUser().then(user => {
      callback(user);
    });

    // 设置轮询检查（每 5 分钟检查一次）
    const intervalId = setInterval(async () => {
      const user = await this.getCurrentUser();
      callback(user);
    }, 5 * 60 * 1000);

    // 返回取消订阅函数
    return () => clearInterval(intervalId);
  }

  /**
   * 获取授权头
   */
  getAuthHeader(): Record<string, string> {
    const token = this.getToken();
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
      };
    }
    return {};
  }

  /**
   * 更新密码
   */
  async updatePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: '未登录' };
    }

    try {
      const response = await fetch(`${API_BASE}/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || '更新密码失败' };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || '更新密码失败' };
    }
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}

// 导出单例
export const cloudAuth = new CloudAuthManager();
