import { defineConfig, type Plugin, loadEnv } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { getViteProxyConfig } from './src/lib/proxy-config';

// 确定当前模式（development, production, test）
const mode = process.env.NODE_ENV || 'development';
// 加载所有 .env 文件（包含 .env, .env.local, .env.[mode], .env.[mode].local）
const env = loadEnv(mode, process.cwd(), '');
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || '';
console.log('[Vite] Loading env - Mode:', mode, '- SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');

/**
 * Vite 插件：API CORS 代理
 */
function apiCorsProxyPlugin(): Plugin {
  return {
    name: 'api-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/__api_proxy', async (req, res) => {
        // 处理 OPTIONS 预检请求
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          });
          res.end();
          return;
        }

        // 解析目标 URL
        const urlParam = new URL(req.url || '', 'http://localhost').searchParams.get('url');
        if (!urlParam) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing ?url= parameter' }));
          return;
        }

        try {
          // 读取请求体
          const bodyChunks: Buffer[] = [];
          for await (const chunk of req) {
            bodyChunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const body = bodyChunks.length > 0 ? Buffer.concat(bodyChunks) : undefined;

          // 解包 x-proxy-headers 中的原始请求头
          const proxyHeadersRaw = req.headers['x-proxy-headers'];
          let forwardHeaders: Record<string, string> = {};
          if (typeof proxyHeadersRaw === 'string') {
            try {
              forwardHeaders = JSON.parse(proxyHeadersRaw);
            } catch { /* ignore parse errors */ }
          }

          // 服务端转发请求
          const response = await fetch(urlParam, {
            method: req.method || 'GET',
            headers: forwardHeaders,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
          });

          // 将远程响应转发回浏览器
          const respBody = await response.arrayBuffer();
          const headers: Record<string, string> = {
            'Access-Control-Allow-Origin': '*',
          };
          // 转发 content-type
          const ct = response.headers.get('content-type');
          if (ct) headers['Content-Type'] = ct;

          res.writeHead(response.status, headers);
          res.end(Buffer.from(respBody));
        } catch (err: any) {
          console.error('[api-cors-proxy] Proxy error:', err?.message || err);
          res.writeHead(502, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({ error: 'Proxy request failed', detail: err?.message }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@opencut/ai-core/services/prompt-compiler': path.resolve(__dirname, './src/packages/ai-core/services/prompt-compiler.ts'),
      '@opencut/ai-core/api/task-poller': path.resolve(__dirname, './src/packages/ai-core/api/task-poller.ts'),
      '@opencut/ai-core/protocol': path.resolve(__dirname, './src/packages/ai-core/protocol/index.ts'),
      '@opencut/ai-core': path.resolve(__dirname, './src/packages/ai-core/index.ts'),
    },
  },
  plugins: [
    apiCorsProxyPlugin(),
    react(),
  ],
  server: {
    port: 5000,
    host: true,
    proxy: {
      '/api/proxy-doubao': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/__api_proxy': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // OAuth 路由代理
      '/oauth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/auth/callback': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // 使用集中化的代理配置
      ...getViteProxyConfig(),
    },
  },
})
