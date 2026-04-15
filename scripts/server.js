#!/usr/bin/env node
/**
 * 自定义生产服务器
 * 提供静态文件服务 + 数据同步 API
 * 注意：已移除第三方 API 代理，API 调用直接通过浏览器访问
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// 加载 .env 文件
const __filename = fileURLToPath(import.meta.url);
dotenv.config({ path: path.join(path.dirname(__filename), '..', '.env') });

const __dirname = path.dirname(__filename);

const { Pool } = pg;

const app = express();
const PORT = process.env.DEPLOY_RUN_PORT || 5000;
const HOST = '0.0.0.0';

// 向上一级到达项目根目录（scripts -> 项目根目录）
const projectRoot = path.join(__dirname, '..');
const distPath = path.join(projectRoot, 'dist');

// Middleware
// 增强 CORS 配置，明确指定允许的来源
const ALLOWED_ORIGINS = [
  'https://jubuguanai.coze.site',
  'http://localhost:*', // 开发环境
  'http://127.0.0.1:*', // 开发环境
];

app.use(cors({
  origin: (origin, callback) => {
    // 允许没有 origin 的请求（如 curl、Postman）
    if (!origin) {
      return callback(null, true);
    }
    // 检查 origin 是否在白名单中
    const isAllowed = ALLOWED_ORIGINS.some(pattern => {
      if (pattern.includes('*')) {
        // 处理通配符模式
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return origin === pattern;
    });
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204,
}));
app.use(express.json());

// ==================== 数据库连接 ====================

// Neon PostgreSQL 配置
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const PGPASSWORD = process.env.SUPABASE_DB_PASSWORD || 'mNS7unB909M2drG7Sd';
const PGHOST = process.env.SUPABASE_DB_HOST || 'cp-sound-thaw-b6a0e530.pg4.aidap-global.cn-beijing.volces.com';
const PGPORT = process.env.PGPORT || '5432';
const PGDATABASE = process.env.PGDATABASE || 'postgres';
const PGUSER = process.env.PGUSER || 'postgres';

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'jubu-ai-default-jwt-secret-change-in-production';

let dbPool = null;

const getDbPool = () => {
  if (!dbPool) {
    // 优先使用 Neon 数据库
    const connectionString = NEON_DATABASE_URL || `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
    dbPool = new Pool({
      connectionString,
      ssl: NEON_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

    dbPool.on('error', (err) => {
      console.error('[DB] Unexpected error:', err.message);
    });
  }
  return dbPool;
};

// 测试数据库连接
const testDbConnection = async () => {
  try {
    const pool = getDbPool();
    const result = await pool.query('SELECT NOW() as now');
    const dbType = NEON_DATABASE_URL ? 'Neon PostgreSQL' : 'PostgreSQL';
    console.log(`[DB] Connected to ${dbType}:`, result.rows[0].now);
    return true;
  } catch (error) {
    console.error('[DB] Connection failed:', error.message);
    return false;
  }
};

// 辅助函数：snake_case 转 camelCase
const toCamelCase = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
    }
    return result;
  }
  return obj;
};

// ==================== JWT 认证 ====================

// JWT 验证中间件
const jwtAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.headers['x-user-id'];

  if (!token) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }

  try {
    // 尝试验证 JWT Token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (jwtError) {
    // 如果不是 JWT Token，尝试作为普通 userId 使用（向后兼容）
    if (token && token.length > 10) {
      req.userId = token;
      next();
    } else {
      return res.status(401).json({ error: 'Token 无效或已过期' });
    }
  }
};

// 用户注册
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: '邮箱和密码不能为空' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: '请输入有效的邮箱地址' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, error: '密码至少需要 6 个字符' });
  }

  try {
    const pool = getDbPool();

    // 检查邮箱是否已注册
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: '该邮箱已被注册' });
    }

    // 哈希密码并创建用户
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id, email, created_at`,
      [email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`[Auth] User registered: ${user.email}`);

    res.json({
      success: true,
      user: { id: user.id, email: user.email, createdAt: user.created_at },
      token
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ success: false, error: '注册失败，请稍后重试' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: '邮箱和密码不能为空' });
  }

  try {
    const pool = getDbPool();

    // 查找用户
    const result = await pool.query(
      'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: '邮箱或密码错误' });
    }

    const userRow = result.rows[0];

    // 验证密码
    const valid = await bcrypt.compare(password, userRow.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: '邮箱或密码错误' });
    }

    const token = jwt.sign({ userId: userRow.id }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`[Auth] User logged in: ${userRow.email}`);

    res.json({
      success: true,
      user: { id: userRow.id, email: userRow.email, createdAt: userRow.created_at },
      token
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ success: false, error: '登录失败，请稍后重试' });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', jwtAuthMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    const result = await pool.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: { id: user.id, email: user.email, createdAt: user.created_at }
    });
  } catch (error) {
    console.error('[Auth] Get user error:', error);
    res.status(500).json({ success: false, error: '获取用户信息失败' });
  }
});

// 更新密码
app.post('/api/auth/update-password', jwtAuthMiddleware, async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ success: false, error: '请输入新密码' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: '新密码至少需要 6 个字符' });
  }

  try {
    const pool = getDbPool();

    // 更新密码
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[Auth] Update password error:', error);
    res.status(500).json({ success: false, error: '更新密码失败' });
  }
});

// ==================== 数据同步 API ====================

// 认证中间件（兼容旧版）
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const userId = authHeader && authHeader.startsWith('Bearer ')
    ? jwt.verify(authHeader.slice(7), JWT_SECRET)?.userId
    : req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Missing X-User-Id header' });
  }
  req.userId = userId;
  next();
};

// ==================== Projects API ====================

// 获取所有项目
app.get('/api/sync/projects', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    const result = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.userId]
    );
    res.json({ success: true, data: toCamelCase(result.rows) });
  } catch (error) {
    console.error('[API] Get projects error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个项目
app.get('/api/sync/projects/:id', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('[API] Get project error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建/更新项目
app.post('/api/sync/projects', authMiddleware, async (req, res) => {
  try {
    const { id, name, script_data, created_at, updated_at } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields: id, name' });
    }
    
    const pool = getDbPool();
    const now = new Date().toISOString();
    
    const result = await pool.query(
      `INSERT INTO projects (id, user_id, name, script_data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         script_data = EXCLUDED.script_data,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [id, req.userId, name, JSON.stringify(script_data || {}), created_at || now, updated_at || now]
    );
    
    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('[API] Upsert project error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除项目
app.delete('/api/sync/projects/:id', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    res.json({ success: true, deletedId: req.params.id });
  } catch (error) {
    console.error('[API] Delete project error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Shots API ====================

// 获取分镜列表
app.get('/api/sync/shots', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    const { project_id } = req.query;
    
    let query = 'SELECT * FROM shots WHERE user_id = $1';
    const params = [req.userId];
    
    if (project_id) {
      query += ' AND project_id = $2';
      params.push(project_id);
    }
    
    query += ' ORDER BY created_at ASC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: toCamelCase(result.rows) });
  } catch (error) {
    console.error('[API] Get shots error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建/更新分镜
app.post('/api/sync/shots', authMiddleware, async (req, res) => {
  try {
    const { id, project_id, episode_id, scene_id, index_data, content, camera, status, created_at, updated_at } = req.body;
    
    if (!id || !project_id) {
      return res.status(400).json({ success: false, error: 'Missing required fields: id, project_id' });
    }
    
    const pool = getDbPool();
    const now = new Date().toISOString();
    
    const result = await pool.query(
      `INSERT INTO shots (id, user_id, project_id, episode_id, scene_id, index_data, content, camera, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         episode_id = EXCLUDED.episode_id,
         scene_id = EXCLUDED.scene_id,
         index_data = EXCLUDED.index_data,
         content = EXCLUDED.content,
         camera = EXCLUDED.camera,
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [id, req.userId, project_id, episode_id, scene_id, JSON.stringify(index_data || {}), JSON.stringify(content || {}), JSON.stringify(camera || {}), status || 'draft', created_at || now, updated_at || now]
    );
    
    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('[API] Upsert shot error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量创建/更新分镜
app.post('/api/sync/shots/batch', authMiddleware, async (req, res) => {
  try {
    const { shots } = req.body;
    
    if (!Array.isArray(shots) || shots.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing or invalid shots array' });
    }
    
    const pool = getDbPool();
    const now = new Date().toISOString();
    const results = [];
    
    for (const shot of shots) {
      const { id, project_id, episode_id, scene_id, index_data, content, camera, status, created_at, updated_at } = shot;
      
      if (!id || !project_id) continue;
      
      const result = await pool.query(
        `INSERT INTO shots (id, user_id, project_id, episode_id, scene_id, index_data, content, camera, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           episode_id = EXCLUDED.episode_id,
           scene_id = EXCLUDED.scene_id,
           index_data = EXCLUDED.index_data,
           content = EXCLUDED.content,
           camera = EXCLUDED.camera,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at
         RETURNING *`,
        [id, req.userId, project_id, episode_id, scene_id, JSON.stringify(index_data || {}), JSON.stringify(content || {}), JSON.stringify(camera || {}), status || 'draft', created_at || now, updated_at || now]
      );
      
      results.push(toCamelCase(result.rows[0]));
    }
    
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    console.error('[API] Batch upsert shots error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除分镜
app.delete('/api/sync/shots/:id', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    const result = await pool.query(
      'DELETE FROM shots WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shot not found' });
    }
    
    res.json({ success: true, deletedId: req.params.id });
  } catch (error) {
    console.error('[API] Delete shot error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== User Settings API ====================

// 获取用户设置
app.get('/api/sync/settings', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    const result = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    
    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('[API] Get settings error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建/更新用户设置
app.post('/api/sync/settings', authMiddleware, async (req, res) => {
  try {
    const { theme, language, api_configs, editor_settings, sync_preferences } = req.body;
    
    const pool = getDbPool();
    const now = new Date().toISOString();
    
    const result = await pool.query(
      `INSERT INTO user_settings (user_id, theme, language, api_configs, editor_settings, sync_preferences, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         theme = COALESCE(EXCLUDED.theme, user_settings.theme),
         language = COALESCE(EXCLUDED.language, user_settings.language),
         api_configs = COALESCE(EXCLUDED.api_configs, user_settings.api_configs),
         editor_settings = COALESCE(EXCLUDED.editor_settings, user_settings.editor_settings),
         sync_preferences = COALESCE(EXCLUDED.sync_preferences, user_settings.sync_preferences),
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [req.userId, theme, language, JSON.stringify(api_configs || {}), JSON.stringify(editor_settings || {}), JSON.stringify(sync_preferences || {}), now]
    );
    
    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('[API] Upsert settings error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 外部 API 代理（解决 CORS 问题） ====================

// 允许代理的域名列表
const PROXIED_DOMAINS = [
  'memefast.top',
  'api.memefast.top',
  // 火山引擎
  'ark.cn-beijing.volces.com',
  'ark.cn-shanghai.volces.com',
  'ark.cn-guangzhou.volces.com',
  'ark.cn-hangzhou.volces.com',
  // 阿里云百炼
  'dashscope.aliyuncs.com',
  'dashscope.cn-shanghai.aliyuncs.com',
  'dashcope.cn-beijing.aliyuncs.com',
  // RunningHub
  'www.runninghub.cn',
  'openapi.runninghub.cn',
];

// 通用 API 代理路由
app.use('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  // 验证 URL 是否来自允许的域名
  try {
    const urlObj = new URL(targetUrl);
    const isAllowed = PROXIED_DOMAINS.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );
    
    if (!isAllowed) {
      return res.status(403).json({ error: 'Domain not allowed for proxy' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  
  try {
    // 读取请求体
    let body;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      body = JSON.stringify(req.body);
    }
    
    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'JuBuAI/1.0',
    };
    
    // 如果有原始请求头需要传递，添加到这里
    if (req.headers['authorization']) {
      headers['Authorization'] = req.headers['authorization'];
    }
    
    // 发起请求
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });
    
    // 获取响应内容
    const contentType = response.headers.get('content-type');
    const data = await response.text();
    
    // 返回响应
    res.setHeader('Content-Type', contentType || 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).send(data);
  } catch (error) {
    console.error('[Proxy] Error:', error.message);
    res.status(502).json({ error: 'Proxy request failed', detail: error.message });
  }
});

// ==================== 健康检查 ====================

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ==================== CSP 配置 ====================

// CSP 配置
const SITE_URL = process.env.VITE_SITE_URL || 'https://jubuguanai.coze.site';

// 允许访问的外部 API 域名
const ALLOWED_API_DOMAINS = [
  // MemeFast 及其所有子域名
  'memefast.top',
  'api.memefast.top',
  '*.memefast.top',
  // 阿里云百炼及其所有区域
  'dashscope.aliyuncs.com',
  'dashscope.cn-shanghai.aliyuncs.com',
  '*.aliyuncs.com',
  // 火山引擎及其所有区域
  'ark.cn-beijing.volces.com',
  'ark.cn-shanghai.volces.com',
  'ark.cn-guangzhou.volces.com',
  'ark.cn-hangzhou.volces.com',
  '*.volces.com',
  // RunningHub
  'www.runninghub.cn',
  'openapi.runninghub.cn',
  // 其他 AI 提供商
  'api.deepseek.com',
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.coze.cn',
  'api.coze.com',
  // 图像托管服务
  'api.imgbb.com',
  'www.imgurl.org',
  'img.scdn.io',
  'catbox.moe',
  // 阿里云 APM 监控
  'apm.volccdn.com',
];

// 构建 CSP 指令
const allowedDomainsHttps = ALLOWED_API_DOMAINS.map(d => `https://${d}`).join(' ');
const allowedWss = ALLOWED_API_DOMAINS.map(d => `wss://${d}`).join(' ');

const CSP_HEADER = [
  `default-src 'self' ${SITE_URL}`,
  `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apm.volccdn.com`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `connect-src 'self' https://localhost:* http://localhost:* ${allowedDomainsHttps} ${allowedWss} https://apm.volccdn.com`,
  `img-src 'self' data: blob: https:`,
  `frame-src 'none'`,
  `worker-src 'self' blob:`,
].join('; ');

// 全局中间件：设置 CSP 头（但跳过 API 路由）
app.use((req, res, next) => {
  // 跳过 API 路由的 CSP 头设置
  if (!req.path.startsWith('/api/')) {
    res.setHeader('Content-Security-Policy', CSP_HEADER);
  }
  next();
});

// ==================== Characters API ====================

// 创建 characters 表（如果不存在）
const initCharactersTable = async () => {
  try {
    const pool = getDbPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        project_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        appearance TEXT,
        personality TEXT,
        role VARCHAR(50),
        age VARCHAR(50),
        image_key VARCHAR(500),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id)`);
    console.log('[DB] Characters table initialized');
  } catch (error) {
    console.error('[DB] Failed to init characters table:', error.message);
  }
};

// 获取角色列表
app.get('/api/sync/characters', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    const { project_id } = req.query;

    let query = 'SELECT * FROM characters WHERE user_id = $1';
    const params = [req.userId];

    if (project_id) {
      query += ' AND project_id = $2';
      params.push(project_id);
    }

    query += ' ORDER BY created_at ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: toCamelCase(result.rows) });
  } catch (error) {
    console.error('[API] Get characters error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建/更新角色
app.post('/api/sync/characters', authMiddleware, async (req, res) => {
  try {
    const { id, project_id, name, description, appearance, personality, role, age, image_key, metadata } = req.body;

    if (!id || !project_id || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const pool = getDbPool();

    const result = await pool.query(
      `INSERT INTO characters (id, user_id, project_id, name, description, appearance, personality, role, age, image_key, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         appearance = EXCLUDED.appearance,
         personality = EXCLUDED.personality,
         role = EXCLUDED.role,
         age = EXCLUDED.age,
         image_key = EXCLUDED.image_key,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [id, req.userId, project_id, name, description, appearance, personality, role, age, image_key, JSON.stringify(metadata || {})]
    );

    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('[API] Save character error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除角色
app.delete('/api/sync/characters/:id', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    await pool.query(
      'DELETE FROM characters WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ success: true, deletedId: req.params.id });
  } catch (error) {
    console.error('[API] Delete character error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Scenes API ====================

// 创建 scenes 表（如果不存在）
const initScenesTable = async () => {
  try {
    const pool = getDbPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scenes (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        project_id VARCHAR(255) NOT NULL,
        episode_id VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        time_of_day VARCHAR(50),
        description TEXT,
        image_key VARCHAR(500),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_scenes_user_id ON scenes(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id)`);
    console.log('[DB] Scenes table initialized');
  } catch (error) {
    console.error('[DB] Failed to init scenes table:', error.message);
  }
};

// 获取场景列表
app.get('/api/sync/scenes', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    const { project_id, episode_id } = req.query;

    let query = 'SELECT * FROM scenes WHERE user_id = $1';
    const params = [req.userId];

    if (project_id) {
      query += ` AND project_id = $${params.length + 1}`;
      params.push(project_id);
    }
    if (episode_id) {
      query += ` AND episode_id = $${params.length + 1}`;
      params.push(episode_id);
    }

    query += ' ORDER BY created_at ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: toCamelCase(result.rows) });
  } catch (error) {
    console.error('[API] Get scenes error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建/更新场景
app.post('/api/sync/scenes', authMiddleware, async (req, res) => {
  try {
    const { id, project_id, episode_id, name, location, time_of_day, description, image_key, metadata } = req.body;

    if (!id || !project_id || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const pool = getDbPool();

    const result = await pool.query(
      `INSERT INTO scenes (id, user_id, project_id, episode_id, name, location, time_of_day, description, image_key, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         episode_id = EXCLUDED.episode_id,
         name = EXCLUDED.name,
         location = EXCLUDED.location,
         time_of_day = EXCLUDED.time_of_day,
         description = EXCLUDED.description,
         image_key = EXCLUDED.image_key,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [id, req.userId, project_id, episode_id, name, location, time_of_day, description, image_key, JSON.stringify(metadata || {})]
    );

    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('[API] Save scene error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除场景
app.delete('/api/sync/scenes/:id', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    await pool.query(
      'DELETE FROM scenes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ success: true, deletedId: req.params.id });
  } catch (error) {
    console.error('[API] Delete scene error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Scripts API ====================

// 创建 scripts 表（剧本数据）
const initScriptsTable = async () => {
  try {
    const pool = getDbPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scripts (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        project_id VARCHAR(255) NOT NULL UNIQUE,
        raw_script TEXT,
        script_data JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON scripts(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_scripts_project_id ON scripts(project_id)`);
    console.log('[DB] Scripts table initialized');
  } catch (error) {
    console.error('[DB] Failed to init scripts table:', error.message);
  }
};

// 获取剧本
app.get('/api/sync/scripts', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    const { project_id } = req.query;

    let query = 'SELECT * FROM scripts WHERE user_id = $1';
    const params = [req.userId];

    if (project_id) {
      query += ' AND project_id = $2';
      params.push(project_id);
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: toCamelCase(result.rows) });
  } catch (error) {
    console.error('[API] Get scripts error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建/更新剧本
app.post('/api/sync/scripts', authMiddleware, async (req, res) => {
  try {
    const { id, project_id, raw_script, script_data, metadata } = req.body;

    if (!id || !project_id) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const pool = getDbPool();

    const result = await pool.query(
      `INSERT INTO scripts (id, user_id, project_id, raw_script, script_data, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         raw_script = EXCLUDED.raw_script,
         script_data = EXCLUDED.script_data,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [id, req.userId, project_id, raw_script, JSON.stringify(script_data || {}), JSON.stringify(metadata || {})]
    );

    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('[API] Save script error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Media API ====================

// 创建 media 表（媒体文件索引）
const initMediaTable = async () => {
  try {
    const pool = getDbPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS media (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        project_id VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL,
        cloud_key VARCHAR(500) NOT NULL,
        size BIGINT DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_project_id ON media(project_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_category ON media(category)`);
    console.log('[DB] Media table initialized');
  } catch (error) {
    console.error('[DB] Failed to init media table:', error.message);
  }
};

// 上传媒体文件（使用 base64 编码）
app.post('/api/sync/media/upload', authMiddleware, async (req, res) => {
  try {
    const { id, project_id, category, name, type, data, size, metadata } = req.body;

    if (!id || !project_id || !category || !name || !type || !data) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // 将 base64 转换为 buffer 并保存到文件系统
    const buffer = Buffer.from(data, 'base64');
    const fileName = `${req.userId}/${project_id}/${category}/${id}_${Date.now()}`;
    const filePath = path.join(projectRoot, 'uploads', fileName);

    // 确保目录存在
    const fs = await import('fs');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);

    const pool = getDbPool();

    // 保存到数据库
    const result = await pool.query(
      `INSERT INTO media (id, user_id, project_id, category, name, type, cloud_key, size, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         category = EXCLUDED.category,
         name = EXCLUDED.name,
         cloud_key = EXCLUDED.cloud_key,
         size = EXCLUDED.size,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [id, req.userId, project_id, category, name, type, fileName, size || buffer.length, JSON.stringify(metadata || {})]
    );

    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('[API] Upload media error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取媒体列表
app.get('/api/sync/media', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    const { project_id, category } = req.query;

    let query = 'SELECT * FROM media WHERE user_id = $1';
    const params = [req.userId];

    if (project_id) {
      query += ` AND project_id = $${params.length + 1}`;
      params.push(project_id);
    }
    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: toCamelCase(result.rows) });
  } catch (error) {
    console.error('[API] Get media error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取媒体访问 URL
app.get('/api/sync/media/:id/url', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();
    const result = await pool.query(
      'SELECT cloud_key FROM media WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Media not found' });
    }

    const cloudKey = result.rows[0].cloud_key;
    const filePath = path.join(projectRoot, 'uploads', cloudKey);

    // 检查文件是否存在
    const fs = await import('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // 返回文件内容
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');
    const mediaResult = await pool.query('SELECT type FROM media WHERE id = $1', [req.params.id]);
    const mimeType = mediaResult.rows[0]?.type === 'video' ? 'video/mp4' : 'image/jpeg';

    res.json({ success: true, data: `data:${mimeType};base64,${base64}` });
  } catch (error) {
    console.error('[API] Get media URL error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除媒体
app.delete('/api/sync/media/:id', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();

    // 先获取文件路径
    const result = await pool.query(
      'SELECT cloud_key FROM media WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );

    if (result.rows.length > 0) {
      const cloudKey = result.rows[0].cloud_key;
      const filePath = path.join(projectRoot, 'uploads', cloudKey);

      // 删除文件
      const fs = await import('fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // 删除数据库记录
    await pool.query(
      'DELETE FROM media WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );

    res.json({ success: true, deletedId: req.params.id });
  } catch (error) {
    console.error('[API] Delete media error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Full Backup/Restore API ====================

// 导出完整备份
app.get('/api/sync/backup', authMiddleware, async (req, res) => {
  try {
    const pool = getDbPool();

    const [projects, shots, characters, scenes, scripts, media, settings] = await Promise.all([
      pool.query('SELECT * FROM projects WHERE user_id = $1', [req.userId]),
      pool.query('SELECT * FROM shots WHERE user_id = $1', [req.userId]),
      pool.query('SELECT * FROM characters WHERE user_id = $1', [req.userId]),
      pool.query('SELECT * FROM scenes WHERE user_id = $1', [req.userId]),
      pool.query('SELECT * FROM scripts WHERE user_id = $1', [req.userId]),
      pool.query('SELECT * FROM media WHERE user_id = $1', [req.userId]),
      pool.query('SELECT * FROM user_settings WHERE user_id = $1', [req.userId]),
    ]);

    res.json({
      success: true,
      data: {
        version: '1.0.0',
        timestamp: Date.now(),
        userId: req.userId,
        projects: toCamelCase(projects.rows),
        shots: toCamelCase(shots.rows),
        characters: toCamelCase(characters.rows),
        scenes: toCamelCase(scenes.rows),
        scripts: toCamelCase(scripts.rows),
        media: toCamelCase(media.rows),
        settings: settings.rows[0] ? toCamelCase(settings.rows[0]) : null,
      },
    });
  } catch (error) {
    console.error('[API] Backup error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 静态文件服务 ====================

// 静态文件服务
app.use(express.static(distPath));

// 所有其他路由返回 index.html（SPA 支持）
app.use((req, res) => {
  res.setHeader('Content-Security-Policy', CSP_HEADER);
  res.sendFile(path.join(distPath, 'index.html'));
});

// 初始化所有表
const initAllTables = async () => {
  await initCharactersTable();
  await initScenesTable();
  await initScriptsTable();
  await initMediaTable();
};

// ==================== 启动服务器 ====================

const server = http.createServer(app);

server.listen(Number(PORT), HOST, async () => {
  console.log(`[Server] Production server running on http://${HOST}:${PORT}`);
  console.log('[Server] Serving static files from:', distPath);

  // 初始化数据库连接
  await testDbConnection();

  // 初始化所有表
  await initAllTables();

  console.log('[Server] Data sync API endpoints:');
  console.log('  GET    /api/sync/projects         - 获取所有项目');
  console.log('  GET    /api/sync/projects/:id    - 获取单个项目');
  console.log('  POST   /api/sync/projects         - 创建/更新项目');
  console.log('  DELETE /api/sync/projects/:id     - 删除项目');
  console.log('  GET    /api/sync/shots            - 获取分镜列表');
  console.log('  POST   /api/sync/shots            - 创建/更新分镜');
  console.log('  POST   /api/sync/shots/batch      - 批量创建/更新分镜');
  console.log('  DELETE /api/sync/shots/:id        - 删除分镜');
  console.log('  GET    /api/sync/characters       - 获取角色列表');
  console.log('  POST   /api/sync/characters       - 创建/更新角色');
  console.log('  DELETE /api/sync/characters/:id  - 删除角色');
  console.log('  GET    /api/sync/scenes           - 获取场景列表');
  console.log('  POST   /api/sync/scenes           - 创建/更新场景');
  console.log('  DELETE /api/sync/scenes/:id      - 删除场景');
  console.log('  GET    /api/sync/scripts          - 获取剧本数据');
  console.log('  POST   /api/sync/scripts          - 创建/更新剧本');
  console.log('  GET    /api/sync/media            - 获取媒体列表');
  console.log('  POST   /api/sync/media/upload     - 上传媒体文件');
  console.log('  GET    /api/sync/media/:id/url    - 获取媒体访问URL');
  console.log('  DELETE /api/sync/media/:id        - 删除媒体文件');
  console.log('  GET    /api/sync/settings         - 获取用户设置');
  console.log('  POST   /api/sync/settings         - 创建/更新用户设置');
  console.log('  GET    /api/sync/backup           - 导出完整备份');
});

