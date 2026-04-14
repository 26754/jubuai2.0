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

// 向上两级到达项目根目录
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

// ==================== 静态文件服务 ====================

// 提供构建目录中的静态文件
app.use(express.static(distPath));

// 所有其他路由返回 index.html（SPA 支持）
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ==================== 启动服务器 ====================

const server = http.createServer(app);

server.listen(Number(PORT), HOST, () => {
  console.log(`[Server] Production server running on http://${HOST}:${PORT}`);
  console.log('[Server] Serving static files from:', distPath);
  console.log('[Server] Available proxy routes:');
  console.log('  /__proxy/memefast/*       - MemeFast API');
  console.log('  /__proxy/volcengine/*     - 火山引擎 ARK 北京');
  console.log('  /__proxy/volcengine-sh/*  - 火山引擎 ARK 上海');
  console.log('  /__proxy/volcengine-gz/*  - 火山引擎 ARK 广州');
  console.log('  /__proxy/bailian/*        - 阿里云百炼');
  console.log('  /__proxy/external/*       - 通用外部 API');
});
