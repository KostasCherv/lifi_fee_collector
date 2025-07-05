import { app } from './index';
import config from '@/config';
import { databaseService } from '@/services/database';
import { scraperService } from '@/services/scraper';
import { logger } from '@/utils/logger';

const port = config.app.port;

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

// Only start server if this file is run directly (not imported for tests)
if (require.main === module) {
  startServer();
} 