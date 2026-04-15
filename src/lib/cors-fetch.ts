// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
/**
 * CORS-safe fetch wrapper
 *
 * 自动检测运行环境：
 * - Electron 桌面模式 → 直接使用原生 fetch()（无 CORS 限制）
 * - 浏览器开发模式   → 通过 Vite 开发服务器代理转发
 * - 浏览器生产模式   → 通过生产服务器代理转发
 */

/** 检测是否在 Electron 环境中运行 */
function isElectron(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    (window as any).electron
  );
}

/** 检测是否在 Vite 开发服务器中运行 */
function isViteDev(): boolean {
  return import.meta.env?.DEV === true;
}

/** 检测是否在浏览器环境中运行 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof fetch !== 'undefined';
}

/** 检测 URL 是否已经是代理路径 */
function isProxiedUrl(url: string): boolean {
  return url.startsWith('/__proxy/') || url.startsWith('/__api_proxy');
}

/**
 * CORS 安全的 fetch 封装
 *
 * 在浏览器模式下，自动将请求代理到 /__api_proxy 中间件，
 * 由服务端转发请求以绕过 CORS 限制。
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

  // Electron：直连（无 CORS 限制）
  if (isElectron()) {
    return fetch(targetUrl, init);
  }

  // 已经是代理路径，直接使用原生 fetch
  if (isProxiedUrl(targetUrl)) {
    return fetch(targetUrl, init);
  }

  // 浏览器环境（包括开发和生产）：走代理
  if (isBrowser()) {
    // 构建原始 headers
    const proxyHeaders = new Headers(init?.headers);
    const originalHeaders: Record<string, string> = {};
    proxyHeaders.forEach((value, key) => {
      originalHeaders[key] = value;
    });

    // 构建代理 URL
    let proxyPath: string;
    if (targetUrl.includes('memefast.top')) {
      // MemeFast 特殊处理：使用专用代理 + host 参数
      const path = targetUrl.replace(/^https?:\/\/[^\/]+/, '');
      proxyPath = `/__proxy/memefast${path}?host=https://memefast.top`;
    } else {
      // 通用代理
      proxyPath = `/__api_proxy?url=${encodeURIComponent(targetUrl)}`;
    }

    const proxyInit: RequestInit = {
      ...init,
      headers: {
        'Content-Type': originalHeaders['Content-Type'] || 'application/json',
        'x-proxy-headers': JSON.stringify(originalHeaders),
      },
    };

    return fetch(proxyPath, proxyInit);
  }

  // 非浏览器环境（如 Node.js）：直连
  return fetch(targetUrl, init);
}
