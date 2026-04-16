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

      // 检查响应状态
      if (!response.ok) {
        console.error('[CloudAuth] 注册请求失败:', response.status, response.statusText);
        return { success: false, error: `服务器错误: ${response.status}` };
      }

      // 检查响应内容
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.error('[CloudAuth] 注册响应为空');
        return { success: false, error: '服务器响应为空，请稍后重试' };
      }

      let data: AuthResponse;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('[CloudAuth] JSON 解析失败:', text.substring(0, 100));
        return { success: false, error: '服务器响应格式错误，请稍后重试' };
      }

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
      return { success: false, error: error.message || '注册失败，请检查网络连接' };
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

      // 检查响应状态
      if (!response.ok) {
        console.error('[CloudAuth] 登录请求失败:', response.status, response.statusText);
        return { success: false, error: `服务器错误: ${response.status}` };
      }

      // 检查响应内容
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.error('[CloudAuth] 登录响应为空');
        return { success: false, error: '服务器响应为空，请稍后重试' };
      }

      let data: AuthResponse;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('[CloudAuth] JSON 解析失败:', text.substring(0, 100));
        return { success: false, error: '服务器响应格式错误，请稍后重试' };
      }

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
      return { success: false, error: error.message || '登录失败，请检查网络连接' };
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

      // 检查响应内容
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.error('[CloudAuth] 获取用户响应为空');
        return this.getSavedUser();
      }

      let data: AuthResponse;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('[CloudAuth] JSON 解析失败:', text.substring(0, 100));
        return this.getSavedUser();
      }

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
   * Validate token and check if session is still valid
   */
  async validateSession(): Promise<{ valid: boolean; user?: CloudUser | null; expired?: boolean }> {
    const token = this.getToken();
    if (!token) {
      return { valid: false };
    }

    try {
      const response = await fetch(`${API_BASE}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token expired or invalid
        this.clearToken();
        return { valid: false, expired: true };
      }

      if (!response.ok) {
        return { valid: false };
      }

      const text = await response.text();
      if (!text || text.trim() === '') {
        return { valid: false };
      }

      let data: AuthResponse;
      try {
        data = JSON.parse(text);
      } catch {
        return { valid: false };
      }

      if (!data.success || !data.user) {
        return { valid: false };
      }

      const cloudUser: CloudUser = {
        id: data.user.id,
        email: data.user.email,
        username: data.user.email.split('@')[0],
        createdAt: new Date(data.user.createdAt).getTime(),
      };

      this.saveUser(cloudUser);
      return { valid: true, user: cloudUser };
    } catch (error) {
      console.error('[CloudAuth] Session validation failed:', error);
      // Network error - assume session is still valid
      return { valid: true, user: this.getSavedUser() };
    }
  }

  /**
   * Check if token is expired (local check without API call)
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      // Decode JWT payload (without signature verification)
      const payload = token.split('.')[1];
      if (!payload) return true;

      const decoded = JSON.parse(atob(payload));
      const now = Math.floor(Date.now() / 1000);

      // Check exp claim
      if (decoded.exp) {
        return decoded.exp < now;
      }
    } catch {
      // If decode fails, assume expired
      return true;
    }

    return false;
  }

  /**
   * Update user profile locally and optionally sync to cloud
   */
  updateUserProfile(username: string, syncToCloud: boolean = true): void {
    const user = this.getSavedUser();
    if (user) {
      const updatedUser = { ...user, username };
      this.saveUser(updatedUser);
      
      // Optionally sync to cloud
      if (syncToCloud) {
        this.syncProfileToCloud({ email: user.email, username });
      }
    }
  }

  /**
   * Sync profile to cloud
   */
  private async syncProfileToCloud(profile: { email: string; username?: string }): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/sync/user-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile }),
      });

      if (!response.ok) {
        return false;
      }

      // Also save to local storage for sync service
      localStorage.setItem('jubuai_user_profile', JSON.stringify({
        ...profile,
        syncedAt: Date.now(),
      }));

      return true;
    } catch {
      return false;
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
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
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
        body: JSON.stringify({ newPassword }),
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
