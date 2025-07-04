import express from 'express';
import helmet from 'helmet';
import config from '@/config';
import { databaseService } from '@/services/database';
import { scraperService } from '@/services/scraper';
import { corsMiddleware } from '@/middleware/cors';
import { requestLogger } from '@/middleware/logging';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import routes from '@/routes';

const app = express();

// Export app for testing
export { app };

// Security middleware
if (config.security.helmetEnabled) {
  app.use(helmet());
}

// CORS middleware
app.use(corsMiddleware);

// Request logging middleware
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
  
  try {
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
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: databaseService.getConnectionState(),
      scraper: {
        isRunning: false,
        activeChains: 0,
        totalChains: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
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

// Mount API routes
app.use(routes);

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler); 