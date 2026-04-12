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

app.listen(Number(PORT), HOST, () => {
  console.log(`[API Server] Running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log('[API Server] Available endpoints:');
  console.log('  POST /api/ai/chat       - AI dialogue');
  console.log('  POST /api/ai/screenplay - Screenplay generation');
  console.log('  POST /api/ai/image      - Image generation');
  console.log('  POST /api/ai/video      - Video generation');
  console.log('  GET  /api/ai/task/:id   - Task status query');
  console.log('  GET  /api/proxy-image   - Image proxy');
  console.log('  GET  /api/health        - Health check');
});
