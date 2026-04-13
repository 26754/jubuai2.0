/**
 * 统一 API 代理配置
 * 所有代理 URL 转换逻辑集中在这里管理
 */

// ==================== 代理规则定义 ====================

export interface ProxyRule {
  /** 匹配模式（URL 中包含的字符串） */
  pattern: string;
  /** 代理路径前缀 */
  proxyPath: string;
  /** 目标基础 URL */
  targetBase: string;
}

const PROXY_RULES: ProxyRule[] = [
  // 火山引擎 ARK API - 北京
  {
    pattern: 'ark.cn-beijing.volces.com',
    proxyPath: '/__proxy/volcengine',
    targetBase: 'https://ark.cn-beijing.volces.com',
  },
  // 火山引擎 ARK API - 上海
  {
    pattern: 'ark.cn-shanghai.volces.com',
    proxyPath: '/__proxy/volcengine-sh',
    targetBase: 'https://ark.cn-shanghai.volces.com',
  },
  // 火山引擎 ARK API - 广州
  {
    pattern: 'ark.cn-guangzhou.volces.com',
    proxyPath: '/__proxy/volcengine-gz',
    targetBase: 'https://ark.cn-guangzhou.volces.com',
  },
  // 阿里云百炼 API
  {
    pattern: 'dashscope.aliyuncs.com',
    proxyPath: '/__proxy/bailian',
    targetBase: 'https://dashscope.aliyuncs.com',
  },
  // MemeFast API
  {
    pattern: 'memefast.top',
    proxyPath: '/__proxy/memefast',
    targetBase: 'https://memefast.top',
  },
];

/**
 * 获取代理配置（用于 Vite 配置）
 */
export function getViteProxyConfig() {
  return {
    '/__proxy/volcengine': {
      target: 'https://ark.cn-beijing.volces.com',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/__proxy\/volcengine/, ''),
    },
    '/__proxy/volcengine-sh': {
      target: 'https://ark.cn-shanghai.volces.com',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/__proxy\/volcengine-sh/, ''),
    },
    '/__proxy/volcengine-gz': {
      target: 'https://ark.cn-guangzhou.volces.com',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/__proxy\/volcengine-gz/, ''),
    },
    '/__proxy/bailian': {
      target: 'https://dashscope.aliyuncs.com',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/__proxy\/bailian/, ''),
    },
    '/__proxy/memefast': {
      target: 'https://memefast.top',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/__proxy\/memefast/, ''),
    },
  };
}

/**
 * 代理 URL 转换函数
 * 将外部 API URL 转换为代理路径，避免 CORS 问题
 */
export function proxyUrl(url: string): string {
  for (const rule of PROXY_RULES) {
    if (url.includes(rule.pattern)) {
      // 提取路径部分
      const path = url.replace(/^https?:\/\/[^\/]+/, '');
      return `${rule.proxyPath}${path}`;
    }
  }
  // 无需代理，直接返回原 URL
  return url;
}

/**
 * 检查 URL 是否需要代理
 */
export function needsProxy(url: string): boolean {
  return PROXY_RULES.some(rule => url.includes(rule.pattern));
}

/**
 * 获取代理目标基础 URL
 */
export function getProxyTarget(url: string): string | null {
  const rule = PROXY_RULES.find(r => url.includes(r.pattern));
  return rule?.targetBase || null;
}

/**
 * 获取所有支持的代理平台
 */
export function getSupportedProxyPlatforms(): string[] {
  return PROXY_RULES.map(rule => rule.targetBase);
}
