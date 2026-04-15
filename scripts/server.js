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

// 允许访问的外部 API 域名
const ALLOWED_API_DOMAINS = [
  'memefast.top',
  'dashscope.aliyuncs.com',
  'ark.cn-beijing.volces.com',
  'ark.cn-shanghai.volces.com',
  'ark.cn-guangzhou.volces.com',
  'www.runninghub.cn',
  'api.deepseek.com',
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
];

const CSP_HEADER = [
  `default-src 'self' ${SITE_URL} ${SITE_URL.replace('https://', 'https://')}:`,
  `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${SUPABASE_URL} https://*.supabase.co https://*.supabase.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' ${SUPABASE_URL} https://*.supabase.co https://*.supabase.com wss://*.supabase.co wss://*.supabase.com https://localhost:* http://localhost:* ${ALLOWED_API_DOMAINS.map(d => `https://${d}`).join(' ')} ${ALLOWED_API_DOMAINS.map(d => `wss://${d}`).join(' ')}`,
  "img-src 'self' data: blob: https:",
  "frame-src 'none'",
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
  console.log('[Server] CSP connect-src includes:', ALLOWED_API_DOMAINS.join(', '));
});
