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

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Supabase PostgreSQL 配置
const PGPASSWORD = process.env.SUPABASE_DB_PASSWORD || 'mNS7unB909M2drG7Sd';
const PGHOST = process.env.SUPABASE_DB_HOST || 'cp-sound-thaw-b6a0e530.pg4.aidap-global.cn-beijing.volces.com';
const PGPORT = process.env.PGPORT || '5432';
const PGDATABASE = process.env.PGDATABASE || 'postgres';
const PGUSER = process.env.PGUSER || 'postgres';

let dbPool = null;

const getDbPool = () => {
  if (!dbPool) {
    const connectionString = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
    dbPool = new Pool({
      connectionString,
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
    console.log('[DB] Connected to PostgreSQL:', result.rows[0].now);
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

// ==================== 数据同步 API ====================

// 认证中间件
const authMiddleware = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
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

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ==================== CSP 配置 ====================

// CSP 配置
const SITE_URL = process.env.VITE_SITE_URL || 'https://jubuguanai.coze.site';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://voorsnefrbmqgbtfdoel.supabase.co';

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

// 全局中间件：设置 CSP 头（但跳过 API 路由）
app.use((req, res, next) => {
  // 跳过 API 路由的 CSP 头设置
  if (!req.path.startsWith('/api/')) {
    res.setHeader('Content-Security-Policy', CSP_HEADER);
  }
  next();
});

// ==================== 静态文件服务 ====================

// 静态文件服务
app.use(express.static(distPath));

// 所有其他路由返回 index.html（SPA 支持）
app.use((req, res) => {
  res.setHeader('Content-Security-Policy', CSP_HEADER);
  res.sendFile(path.join(distPath, 'index.html'));
});

// ==================== 启动服务器 ====================

const server = http.createServer(app);

server.listen(Number(PORT), HOST, async () => {
  console.log(`[Server] Production server running on http://${HOST}:${PORT}`);
  console.log('[Server] Serving static files from:', distPath);
  
  // 初始化数据库连接
  await testDbConnection();
  
  console.log('[Server] Data sync API endpoints:');
  console.log('  GET    /api/sync/projects         - 获取所有项目');
  console.log('  GET    /api/sync/projects/:id    - 获取单个项目');
  console.log('  POST   /api/sync/projects         - 创建/更新项目');
  console.log('  DELETE /api/sync/projects/:id     - 删除项目');
  console.log('  GET    /api/sync/shots            - 获取分镜列表');
  console.log('  POST   /api/sync/shots            - 创建/更新分镜');
  console.log('  POST   /api/sync/shots/batch      - 批量创建/更新分镜');
  console.log('  DELETE /api/sync/shots/:id        - 删除分镜');
  console.log('  GET    /api/sync/settings         - 获取用户设置');
  console.log('  POST   /api/sync/settings         - 创建/更新用户设置');
});
