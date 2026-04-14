// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * Supabase 客户端 - 浏览器版本
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 直接硬编码 Supabase 配置（确保生产环境可用）
// 重要：这些值在构建时被直接嵌入到代码中，不依赖环境变量
const SUPABASE_URL = 'https://voorsnefrbmqgbtfdoel.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvb3JzbmVmcmJtcWdidGZkb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODQ0ODQsImV4cCI6MjA5MTY2MDQ4NH0.OLcgSyMxF1JiJtVmPwxox32bWiltPvFErR6ik91qiG8';

// 始终使用硬编码值，确保生产环境可用
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

// 调试日志
console.log('[Supabase] Configuration loaded (hardcoded)');
console.log('  URL:', supabaseUrl);
console.log('  Key:', supabaseAnonKey ? 'SET' : 'MISSING');

// 单例客户端实例
let supabaseClient: SupabaseClient | null = null;

/**
 * 检查 Supabase 是否配置
 */
export function isSupabaseConfigured(): boolean {
  const configured = !!(supabaseUrl && supabaseAnonKey);
  console.log('[Supabase] isSupabaseConfigured:', configured);
  return configured;
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
      detectSessionInUrl: false, // 邮箱登录不需要，OAuth 才需要
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
