import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.API_PORT || 3001;
const HOST = process.env.API_HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

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

// ==================== Existing Routes ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
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
  console.log(`[API Server] Running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log('[API Server] Available endpoints:');
  console.log('  GET  /oauth/consent         - OAuth 授权同意屏幕');
  console.log('  GET  /auth/callback         - OAuth 回调处理');
  console.log('  POST /api/ai/chat        - AI dialogue');
  console.log('  POST /api/ai/screenplay  - Screenplay generation');
  console.log('  POST /api/ai/image       - Image generation');
  console.log('  POST /api/ai/video       - Video generation');
  console.log('  GET  /api/ai/task/:id   - Task status query');
  console.log('  GET  /api/proxy-image   - Image proxy');
  console.log('  POST /api/proxy-doubao   - Doubao API proxy');
  console.log('  GET  /api/health         - Health check');
  console.log('  [Proxy] /__proxy/volcengine/*   - 火山引擎 ARK 北京');
  console.log('  [Proxy] /__proxy/volcengine-sh/* - 火山引擎 ARK 上海');
  console.log('  [Proxy] /__proxy/volcengine-gz/* - 火山引擎 ARK 广州');
  console.log('  [Proxy] /__proxy/bailian/*      - 阿里云百炼');
  console.log('  [Proxy] /__proxy/memefast/*     - MemeFast');
  console.log('  [Proxy] /__proxy/external/*      - 通用外部 API');
});
