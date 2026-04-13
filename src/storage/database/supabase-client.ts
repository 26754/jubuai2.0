// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * Supabase 客户端配置
 * 支持服务端和客户端两种模式
 */

import { createClient } from '@supabase/supabase-js';

// 环境变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';

// 检查配置
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] 环境变量未配置，将使用本地存储模式');
}

/**
 * 创建 Supabase 客户端
 * @param accessToken - 可选的用户访问令牌（用于客户端认证）
 */
export const createSupabaseClient = (accessToken?: string) => {
  const options: any = {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
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

  return createClient(supabaseUrl, supabaseAnonKey, options);
};

// 默认客户端（用于服务端操作）
export const supabase = createSupabaseClient();

/**
 * 获取当前会话
 */
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[Supabase] 获取会话失败:', error);
    return null;
  }
  return session;
};

/**
 * 获取当前用户
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('[Supabase] 获取用户失败:', error);
    return null;
  }
  return user;
};
