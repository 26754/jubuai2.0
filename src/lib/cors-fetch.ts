// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
/**
 * CORS-safe fetch wrapper
 *
 * 直接调用 API，不使用代理
 */

/** 检测是否在浏览器环境中运行 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof fetch !== 'undefined';
}

/**
 * CORS 安全的 fetch 封装
 * 直接调用 API，让浏览器处理 CORS
 *
 * @param url    目标 URL（与原生 fetch 参数相同）
 * @param init   请求选项（与原生 fetch 参数相同）
 * @returns      Response（与原生 fetch 返回值相同）
 */
export async function corsFetch(
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const targetUrl = url.toString();

  // 浏览器环境：直接调用
  if (isBrowser()) {
    return fetch(targetUrl, init);
  }

  // 非浏览器环境（如 Node.js）：直连
  return fetch(targetUrl, init);
}
