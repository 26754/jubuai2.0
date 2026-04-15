import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const _filename = fileURLToPath(import.meta.url);

const app = express();
const PORT = process.env.API_PORT || 3001;
const HOST = process.env.API_HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

// ==================== Supabase PostgreSQL 数据库连接 ====================

// 构建 Supabase PostgreSQL 连接配置
const getDbConfig = () => {
  return {
    host: process.env.PGHOST || 'cp-sound-thaw-b6a0e530.pg4.aidap-global.cn-beijing.volces.com',
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || process.env.SUPABASE_DB_PASSWORD || 'mNS7unB909M2drG7Sd',
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  };
};

let dbPool: Pool | null = null;

const getDbPool = (): Pool => {
  if (!dbPool) {
    const config = getDbConfig();
    console.log('[DB] Connecting to:', config.host, ':', config.port);
    dbPool = new Pool(config);
    
    dbPool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client:', err.message);
    });
  }
  return dbPool;
};

// 测试数据库连接
const testDbConnection = async () => {
  try {
    const pool = getDbPool();
    const result = await pool.query('SELECT NOW() as now');
    console.log('[DB] Connected to Supabase PostgreSQL:', result.rows[0].now);
    return true;
  } catch (error: any) {
    console.error('[DB] Connection failed:', error.message);
    return false;
  }
};

// ==================== OAuth Routes ====================

// OAuth 同意屏幕
app.get('/oauth/consent', (req, res) => {
  const consentPath = path.join(process.cwd(), 'public/oauth/consent.html');
  console.log('[OAuth] Consent path:', consentPath);
  res.sendFile(consentPath, (err) => {
    if (err) {
      console.error('[OAuth] Error serving consent page:', err);
      res.status(404).send('Consent page not found');
    }
  });
});

// OAuth 回调处理
app.get('/auth/callback', (req, res) => {
  const { code, error, state } = req.query;
  
  if (error) {
    // 重定向回前端并显示错误
    const redirectUrl = new URL('/#login', req.headers.origin || 'https://jubuguanai.coze.site');
    redirectUrl.searchParams.set('error', error as string);
    return res.redirect(redirectUrl.toString());
  }
  
  if (code) {
    // 成功，重定向回前端
    const redirectUrl = new URL('/#auth/callback', req.headers.origin || 'https://jubuguanai.coze.site');
    redirectUrl.searchParams.set('code', code as string);
    if (state) redirectUrl.searchParams.set('state', state as string);
    return res.redirect(redirectUrl.toString());
  }
  
  // 没有 code 或 error，返回错误
  res.status(400).send('Missing authorization code or error');
});

// ==================== 数据同步 API 路由 ====================

// 数据同步 API 中间件 - 验证用户身份
const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(401).json({ error: 'Missing X-User-Id header' });
  }
  (req as any).userId = userId;
  next();
};

// 辅助函数：将 snake_case 转换为 camelCase
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
    }
    return result;
  }
  return obj;
};

// ==================== Projects API ====================

// 获取所有项目
app.get('/api/sync/projects', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).userId;
    const pool = getDbPool();
    const result = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    res.json({ success: true, data: toCamelCase(result.rows) });
  } catch (error: any) {
    console.error('[API] Get projects error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个项目
app.get('/api/sync/projects/:id', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    const pool = getDbPool();
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error: any) {
    console.error('[API] Get project error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建/更新项目（upsert）
app.post('/api/sync/projects', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).userId;
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
      [id, userId, name, JSON.stringify(script_data || {}), created_at || now, updated_at || now]
    );
    
    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error: any) {
    console.error('[API] Upsert project error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除项目
app.delete('/api/sync/projects/:id', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    const pool = getDbPool();
    
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    res.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('[API] Delete project error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Shots API ====================

// 获取项目的所有分镜
app.get('/api/sync/shots', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).userId;
    const { project_id } = req.query;
    const pool = getDbPool();
    
    let query = 'SELECT * FROM shots WHERE user_id = $1';
    const params: any[] = [userId];
    
    if (project_id) {
      query += ' AND project_id = $2';
      params.push(project_id);
    }
    
    query += ' ORDER BY created_at ASC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: toCamelCase(result.rows) });
  } catch (error: any) {
    console.error('[API] Get shots error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建/更新分镜（upsert）
app.post('/api/sync/shots', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).userId;
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
      [id, userId, project_id, episode_id, scene_id, JSON.stringify(index_data || {}), JSON.stringify(content || {}), JSON.stringify(camera || {}), status || 'draft', created_at || now, updated_at || now]
    );
    
    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error: any) {
    console.error('[API] Upsert shot error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量创建/更新分镜
app.post('/api/sync/shots/batch', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).userId;
    const { shots } = req.body;
    
    if (!Array.isArray(shots) || shots.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing or invalid shots array' });
    }
    
    const pool = getDbPool();
    const now = new Date().toISOString();
    const results: any[] = [];
    
    for (const shot of shots) {
      const { id, project_id, episode_id, scene_id, index_data, content, camera, status, created_at, updated_at } = shot;
      
      if (!id || !project_id) {
        continue;
      }
      
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
        [id, userId, project_id, episode_id, scene_id, JSON.stringify(index_data || {}), JSON.stringify(content || {}), JSON.stringify(camera || {}), status || 'draft', created_at || now, updated_at || now]
      );
      
      results.push(toCamelCase(result.rows[0]));
    }
    
    res.json({ success: true, data: results, count: results.length });
  } catch (error: any) {
    console.error('[API] Batch upsert shots error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除分镜
app.delete('/api/sync/shots/:id', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    const pool = getDbPool();
    
    const result = await pool.query(
      'DELETE FROM shots WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shot not found' });
    }
    
    res.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('[API] Delete shot error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== User Settings API ====================

// 获取用户设置
app.get('/api/sync/settings', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).userId;
    const pool = getDbPool();
    const result = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    
    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error: any) {
    console.error('[API] Get settings error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建/更新用户设置（upsert）
app.post('/api/sync/settings', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).userId;
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
      [userId, theme, language, JSON.stringify(api_configs || {}), JSON.stringify(editor_settings || {}), JSON.stringify(sync_preferences || {}), now]
    );
    
    res.json({ success: true, data: toCamelCase(result.rows[0]) });
  } catch (error: any) {
    console.error('[API] Upsert settings error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Health Check ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Debug: Check Supabase config
app.get('/api/debug/supabase', (req, res) => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  res.json({
    url: url ? 'configured' : 'missing',
    key: key ? 'configured' : 'missing',
    urlValue: url || 'none'
  });
});

// AI Chat endpoint
app.post('/api/ai/chat', (req, res) => {
  res.json({ success: true, message: 'AI chat endpoint ready' });
});

// Screenplay generation
app.post('/api/ai/screenplay', (req, res) => {
  res.json({ success: true, message: 'Screenplay generation endpoint ready' });
});

// Image generation
app.post('/api/ai/image', (req, res) => {
  res.json({ success: true, message: 'Image generation endpoint ready' });
});

// Video generation
app.post('/api/ai/video', (req, res) => {
  res.json({ success: true, message: 'Video generation endpoint ready' });
});

// Task status
app.get('/api/ai/task/:id', (req, res) => {
  res.json({ success: true, taskId: req.params.id, status: 'pending' });
});

// Image proxy
app.get('/api/proxy-image', (req, res) => {
  const { url } = req.query;
  if (url) {
    res.json({ success: true, proxyUrl: url });
  } else {
    res.status(400).json({ error: 'Missing url parameter' });
  }
});

// ==================== 豆包 API 代理 ====================

// 火山引擎 ARK 端点配置
const DOUBAN_ENDPOINTS: Record<string, string> = {
  'cn-beijing': 'https://ark.cn-beijing.volces.com/api/v3',
  'cn-shanghai': 'https://ark.cn-shanghai.volces.com/api/v3',
  'cn-guangzhou': 'https://ark.cn-guangzhou.volces.com/api/v3',
};

// 豆包 API 代理
app.post('/api/proxy-doubao', async (req, res) => {
  try {
    const { apiKey, model, region = 'cn-beijing', messages } = req.body;

    // 验证必需参数
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({
        success: false,
        error: 'API Key 不能为空',
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'messages 参数无效',
      });
    }

    // 获取端点
    const endpoint = DOUBAN_ENDPOINTS[region] || DOUBAN_ENDPOINTS['cn-beijing'];

    console.log('[proxy-doubao] Testing Doubao API:', {
      region,
      model,
      endpoint,
      messageCount: messages.length
    });

    // 调用豆包 API
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: model || 'doubao-pro-32k',
        messages,
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[proxy-doubao] API Error:', {
        status: response.status,
        error: data
      });

      return res.status(response.status).json({
        success: false,
        error: data.error?.message || data.error || `HTTP ${response.status}`,
        status: response.status
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[proxy-doubao] Network Error:', error);

    return res.status(500).json({
      success: false,
      error: `网络错误: ${error.message}`,
    });
  }
});

// ==================== 通用 API 代理 ====================

// 火山引擎 ARK API 代理 - 使用正则匹配
app.all(/\/__proxy\/volcengine(\/.*)?$/, async (req, res) => {
  const match = req.originalUrl.match(/\/__proxy\/volcengine(\/.*)?$/);
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
  } catch (error: any) {
    console.error('[proxy/volcengine] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 火山引擎 ARK 上海代理
app.all(/\/__proxy\/volcengine-sh(\/.*)?$/, async (req, res) => {
  const match = req.originalUrl.match(/\/__proxy\/volcengine-sh(\/.*)?$/);
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
  } catch (error: any) {
    console.error('[proxy/volcengine-sh] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 火山引擎 ARK 广州代理
app.all(/\/__proxy\/volcengine-gz(\/.*)?$/, async (req, res) => {
  const match = req.originalUrl.match(/\/__proxy\/volcengine-gz(\/.*)?$/);
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
  } catch (error: any) {
    console.error('[proxy/volcengine-gz] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 阿里云百炼 API 代理
app.all(/\/__proxy\/bailian(\/.*)?$/, async (req, res) => {
  const match = req.originalUrl.match(/\/__proxy\/bailian(\/.*)?$/);
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
  } catch (error: any) {
    console.error('[proxy/bailian] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// MemeFast 代理（通用转发）
app.all(/\/__proxy\/memefast(\/.*)?$/, async (req, res) => {
  const match = req.originalUrl.match(/\/__proxy\/memefast(\/.*)?$/);
  const targetPath = match && match[1] ? match[1] : '/';
  const targetHost = req.headers['x-target-host'] as string || (req.query.host as string) || '';
  
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
  } catch (error: any) {
    console.error('[proxy/memefast] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(Number(PORT), HOST, () => {
  // 初始化数据库连接
  testDbConnection();
  
  console.log(`[API Server] Running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log('[API Server] Available endpoints:');
  console.log('  === Data Sync API ===');
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
  console.log('');
  console.log('  === OAuth ===');
  console.log('  GET    /oauth/consent              - OAuth 授权同意屏幕');
  console.log('  GET    /auth/callback               - OAuth 回调处理');
  console.log('');
  console.log('  === AI API ===');
  console.log('  POST   /api/ai/chat                 - AI 对话');
  console.log('  POST   /api/ai/screenplay           - 剧本生成');
  console.log('  POST   /api/ai/image                - 图片生成');
  console.log('  POST   /api/ai/video                - 视频生成');
  console.log('  GET    /api/ai/task/:id             - 任务状态查询');
  console.log('');
  console.log('  === Proxy ===');
  console.log('  GET    /api/proxy-image            - 图片代理');
  console.log('  POST   /api/proxy-doubao           - 豆包 API 代理');
  console.log('  GET    /api/health                 - 健康检查');
});
