import express from 'express';
import config from '@/config';
import { databaseService } from '@/services/database';
import { logger } from '@/utils/logger';

const app = express();
const port = config.app.port;

// Basic middleware
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    message: 'Fee Collector Scraper API',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: config.app.nodeEnv,
    database: databaseService.getConnectionState(),
  });
});

app.get('/health', (_req, res) => {
  const isHealthy = databaseService.isConnectedToDatabase();
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: databaseService.getConnectionState(),
  });
});

app.get('/health/database', (_req, res) => {
  const isConnected = databaseService.isConnectedToDatabase();
  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'connected' : 'disconnected',
    state: databaseService.getConnectionState(),
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  try {
    // Connect to database
    await databaseService.connect();
    
    // Start server
    app.listen(port, () => {
      logger.info(`🚀 Server running on port ${port} in ${config.app.nodeEnv} mode`);
      logger.info(`📊 Health check available at http://localhost:${port}/health`);
      logger.info(`🗄️  Database health check at http://localhost:${port}/health/database`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 