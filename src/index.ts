import express from 'express';
import config from './config';

const app = express();
const port = config.app.port;

app.get('/', (_req, res) => {
  res.json({
    message: 'Fee Collector Scraper API',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: config.app.nodeEnv,
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port} in ${config.app.nodeEnv} mode`);
  console.log(`📊 Health check available at http://localhost:${port}/health`);
}); 