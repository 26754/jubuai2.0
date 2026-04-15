#!/usr/bin/env node
/**
 * 自定义生产服务器
 * 同时提供静态文件和 API 代理
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.DEPLOY_RUN_PORT || 5000;
const HOST = '0.0.0.0';

// 向上一级到达项目根目录（scripts -> 项目根目录）
const projectRoot = path.join(__dirname, '..');
const distPath = path.join(projectRoot, 'dist');

// Middleware
app.use(cors());
app.use(express.json());

// ==================== MemeFast 代理 ====================

app.all(/\/__proxy\/memefast(\/.*)?/, async (req, res) => {
  const match = req.originalUrl.match(/\/__proxy\/memefast(\/.*)?/);
  const targetPath = match && match[1] ? match[1] : '/';
  const targetHost = req.headers['x-target-host'] || req.query.host || '';
  
  if (!targetHost) {
    return res.status(400).json({ error: 'Missing target host (use x-target-host header or ?host= query param)' });
  }
  
  const targetUrl = `${targetHost}${targetPath}`;
  
  try {
    console.log(`[proxy/memefast] Forwarding: ${req.method} ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[proxy/memefast] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 火山引擎 ARK 北京代理 ====================

app.all(/\/__proxy\/volcengine(\/.*)?/, async (req, res) => {
  const match = req.originalUrl.match(/\/__proxy\/volcengine(\/.*)?/);
  const targetPath = match && match[1] ? match[1] : '/';
  const targetUrl = `https://ark.cn-beijing.volces.com${targetPath}`;
  
  try {
    console.log(`[proxy/volcengine] Forwarding: ${req.method} ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[proxy/volcengine] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 火山引擎 ARK 上海代理 ====================

app.all(/\/__proxy\/volcengine-sh(\/.*)?/, async (req, res) => {
  const match = req.originalUrl.match(/\/__proxy\/volcengine-sh(\/.*)?/);
  const targetPath = match && match[1] ? match[1] : '/';
  const targetUrl = `https://ark.cn-shanghai.volces.com${targetPath}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[proxy/volcengine-sh] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 火山引擎 ARK 广州代理 ====================

app.all(/\/__proxy\/volcengine-gz(\/.*)?/, async (req, res) => {
  const match = req.originalUrl.match(/\/__proxy\/volcengine-gz(\/.*)?/);
  const targetPath = match && match[1] ? match[1] : '/';
  const targetUrl = `https://ark.cn-guangzhou.volces.com${targetPath}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[proxy/volcengine-gz] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 阿里云百炼代理 ====================

app.all(/\/__proxy\/bailian(\/.*)?/, async (req, res) => {
  const match = req.originalUrl.match(/\/__proxy\/bailian(\/.*)?/);
  const targetPath = match && match[1] ? match[1] : '/';
  const targetUrl = `https://dashscope.aliyuncs.com${targetPath}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[proxy/bailian] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 通用外部 API 代理 ====================

app.all(/\/__proxy\/external(\/.*)?/, async (req, res) => {
  const match = req.originalUrl.match(/\/__proxy\/external(\/.*)?/);
  const targetPath = match && match[1] ? match[1] : '/';
  const targetHost = req.headers['x-target-host'] || req.query.host || '';
  
  if (!targetHost) {
    return res.status(400).json({ error: 'Missing target host (use x-target-host header or ?host= query param)' });
  }
  
  const targetUrl = `${targetHost}${targetPath}`;
  
  try {
    console.log(`[proxy/external] Forwarding: ${req.method} ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[proxy/external] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 通用 API 代理（支持所有第三方 API） ====================

// 这个路由用于代理所有第三方 API 请求，解决 CORS 问题
// 前端通过 /__api_proxy?url=<encoded_url> 调用
app.all('/__api_proxy', async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter (use ?url=<encoded_url>)' });
  }
  
  // 解码目标 URL
  const decodedUrl = decodeURIComponent(targetUrl);
  
  // 安全检查：只允许 http/https
  if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'Only http/https URLs are allowed' });
  }
  
  try {
    console.log(`[proxy/api] Forwarding: ${req.method} ${decodedUrl}`);
    
    // 提取原始 headers（通过 x-proxy-headers 传递）
    let originalHeaders = {};
    const proxyHeadersRaw = req.headers['x-proxy-headers'];
    if (proxyHeadersRaw && typeof proxyHeadersRaw === 'string') {
      try {
        originalHeaders = JSON.parse(proxyHeadersRaw);
      } catch (e) {
        console.warn('[proxy/api] Failed to parse x-proxy-headers');
      }
    }
    
    const response = await fetch(decodedUrl, {
      method: req.method,
      headers: {
        'Content-Type': originalHeaders['Content-Type'] || 'application/json',
        'Authorization': originalHeaders['Authorization'] || req.headers.authorization || '',
        ...originalHeaders,
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[proxy/api] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 静态文件服务 ====================

// CSP 配置：允许 Supabase 所有必要域名
const CSP_HEADER = [
  "default-src 'self' https://jubuguanai.coze.site https://jubuguanai.coze.site:5000 http://localhost:* https://localhost:*",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://voorsnefrbmqgbtfdoel.supabase.co https://*.supabase.co https://*.supabase.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://voorsnefrbmqgbtfdoel.supabase.co https://*.supabase.co https://*.supabase.com wss://voorsnefrbmqgbtfdoel.supabase.co wss://*.supabase.co wss://*.supabase.com https://localhost:* http://localhost:*",
  "img-src 'self' data: blob: https:",
  "frame-src 'none'",
].join('; ');

// 全局中间件：为所有非代理响应设置 CSP 头
app.use((req, res, next) => {
  // 跳过 API 路由和代理路由（包括 /__api_proxy）
  if (req.path.startsWith('/__proxy') || req.path.startsWith('/__api_proxy') || req.path.startsWith('/api')) {
    return next();
  }
  
  // 设置 CSP 头
  res.setHeader('Content-Security-Policy', CSP_HEADER);
  next();
});

// 静态文件服务
app.use(express.static(distPath));

// 所有其他路由返回 index.html（SPA 支持）
app.use((req, res) => {
  res.setHeader('Content-Security-Policy', CSP_HEADER);
  res.sendFile(path.join(distPath, 'index.html'));
});

// ==================== 启动服务器 ====================

const server = http.createServer(app);

server.listen(Number(PORT), HOST, () => {
  console.log(`[Server] Production server running on http://${HOST}:${PORT}`);
  console.log('[Server] Serving static files from:', distPath);
  console.log('[Server] Available proxy routes:');
  console.log('  /__api_proxy/*         - 通用 API 代理（所有第三方 API）');
  console.log('  /__proxy/memefast/*     - MemeFast API');
  console.log('  /__proxy/volcengine/*  - 火山引擎 ARK 北京');
  console.log('  /__proxy/volcengine-sh/* - 火山引擎 ARK 上海');
  console.log('  /__proxy/volcengine-gz/* - 火山引擎 ARK 广州');
  console.log('  /__proxy/bailian/*     - 阿里云百炼');
  console.log('  /__proxy/external/*    - 通用外部 API（需指定 host）');
});
