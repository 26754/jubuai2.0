import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.API_PORT || 3001;
const HOST = process.env.API_HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

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

app.listen(Number(PORT), HOST, () => {
  console.log(`[API Server] Running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log('[API Server] Available endpoints:');
  console.log('  POST /api/ai/chat        - AI dialogue');
  console.log('  POST /api/ai/screenplay  - Screenplay generation');
  console.log('  POST /api/ai/image       - Image generation');
  console.log('  POST /api/ai/video       - Video generation');
  console.log('  GET  /api/ai/task/:id   - Task status query');
  console.log('  GET  /api/proxy-image   - Image proxy');
  console.log('  POST /api/proxy-doubao   - Doubao API proxy');
  console.log('  GET  /api/health         - Health check');
});
