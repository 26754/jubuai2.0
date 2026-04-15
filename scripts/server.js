#!/usr/bin/env node
/**
 * 自定义生产服务器
 * 提供静态文件服务
 * 注意：已移除 API 代理，API 调用直接通过浏览器访问
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

// ==================== 静态文件服务 ====================

// CSP 配置：使用环境变量支持动态域名
const SITE_URL = process.env.VITE_SITE_URL || 'https://jubuguanai.coze.site';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://voorsnefrbmqgbtfdoel.supabase.co';

// 允许访问的外部 API 域名（用于 connect-src）
// 基于 API 供应商：MemeFast API、阿里云百炼、火山引擎、JuBu API (memefast)、RunningHub
const ALLOWED_API_DOMAINS = [
  // MemeFast / JuBu API
  'memefast.top',
  'api.memefast.top',
  // 阿里云百炼
  'dashscope.aliyuncs.com',
  'dashscope.cn-shanghai.aliyuncs.com',
  // 火山引擎
  'ark.cn-beijing.volces.com',
  'ark.cn-shanghai.volces.com',
  'ark.cn-guangzhou.volces.com',
  'ark.cn-hangzhou.volces.com',
  // RunningHub
  'www.runninghub.cn',
  'openapi.runninghub.cn',
  // 常见 AI API
  'api.deepseek.com',
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.coze.cn',
  'api.coze.com',
];

// 构建 CSP 指令
const allowedDomainsHttps = ALLOWED_API_DOMAINS.map(d => `https://${d}`).join(' ');
const allowedWss = ALLOWED_API_DOMAINS.map(d => `wss://${d}`).join(' ');

const CSP_HEADER = [
  `default-src 'self' ${SITE_URL}`,
  `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${SUPABASE_URL} https://*.supabase.co https://*.supabase.com`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `connect-src 'self' ${SUPABASE_URL} https://*.supabase.co https://*.supabase.com wss://*.supabase.co wss://*.supabase.com https://localhost:* http://localhost:* ${allowedDomainsHttps} ${allowedWss}`,
  `img-src 'self' data: blob: https:`,
  `frame-src 'none'`,
  `worker-src 'self' blob:`,
].join('; ');

// 全局中间件：设置 CSP 头
app.use((req, res, next) => {
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
  console.log('[Server] CSP connect-src includes:');
  ALLOWED_API_DOMAINS.forEach(d => console.log(`  - https://${d}`));
});
