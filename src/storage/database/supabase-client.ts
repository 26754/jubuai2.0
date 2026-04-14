// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * Supabase 客户端 - 浏览器版本
 * 使用 Vite 环境变量
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 环境变量（Vite 前缀 VITE_）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || '';

// 单例客户端实例
let supabaseClient: SupabaseClient | null = null;

/**
 * 检查 Supabase 是否配置
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

/**
 * 获取环境配置信息
 */
export function getSupabaseConfig() {
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isConfigured: isSupabaseConfigured(),
  };
}

/**
 * 获取 Supabase 客户端（单例模式）
 * @param accessToken - 可选的用户访问令牌（用于认证请求）
 */
export function getSupabaseClient(accessToken?: string): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase 未配置。请确保 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 环境变量已设置。');
  }

  // 如果已存在单例客户端且不需要新的 accessToken，直接返回
  if (supabaseClient && !accessToken) {
    return supabaseClient;
  }

  // 获取当前域名用于重定向
  const getRedirectUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/auth/callback`;
    }
    return 'https://jubuguanai.coze.site/auth/callback';
  };

  const options: any = {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      redirectTo: getRedirectUrl(),
    },
  };

  // 如果提供了访问令牌，使用它进行认证
  if (accessToken) {
    options.global = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };
  }

  // 创建新客户端
  const client = createClient(supabaseUrl, supabaseAnonKey, options);
  
  // 如果不需要 accessToken，保存为单例
  if (!accessToken) {
    supabaseClient = client;
  }
  
  return client;
}

/**
 * 获取当前会话
 */
export async function getCurrentSession(accessToken?: string) {
  const client = getSupabaseClient(accessToken);
  const { data: { session }, error } = await client.auth.getSession();
  if (error) {
    console.error('[Supabase] 获取会话失败:', error);
    return null;
  }
  return session;
}

/**
 * 获取当前用户
 */
export async function getCurrentUser(accessToken?: string) {
  const client = getSupabaseClient(accessToken);
  const { data: { user }, error } = await client.auth.getUser();
  if (error) {
    console.error('[Supabase] 获取用户失败:', error);
    return null;
  }
  return user;
}
