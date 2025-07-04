import express from 'express';
import config from '@/config';
import { databaseService } from '@/services/database';
import { scraperService } from '@/services/scraper';
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

app.get('/health', async (_req, res) => {
  const isHealthy = databaseService.isConnectedToDatabase();
  const scraperStatus = await scraperService.getStatus();
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: databaseService.getConnectionState(),
    scraper: {
      isRunning: scraperStatus.isRunning,
      activeChains: scraperStatus.activeChains,
      totalChains: scraperStatus.totalChains,
    },
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

app.get('/health/scraper', async (_req, res) => {
  try {
    const status = await scraperService.getStatus();
    res.json({
      status: status.isRunning ? 'running' : 'stopped',
      timestamp: new Date().toISOString(),
      ...status,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

async function startServer() {
  try {
    // Connect to database
    await databaseService.connect();
    
    // Start scraper service
    await scraperService.start();
    
    // Start server
    app.listen(port, () => {
      logger.info(`🚀 Server running on port ${port} in ${config.app.nodeEnv} mode`);
      logger.info(`📊 Health check available at http://localhost:${port}/health`);
      logger.info(`🗄️  Database health check at http://localhost:${port}/health/database`);
      logger.info(`🔍 Scraper health check at http://localhost:${port}/health/scraper`);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await scraperService.gracefulShutdown();
      await databaseService.disconnect();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await scraperService.gracefulShutdown();
      await databaseService.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 