import { logger } from '@/utils/logger';
import { databaseService } from '@/services/database';
import { blockchainService } from '@/services/blockchain';
import { eventProcessor } from '@/services/eventProcessor';
import { ChainConfigurationModel, ScraperStateModel } from '@/models';


class ScraperService {
  private isRunning = false;
  private intervals: Map<number, NodeJS.Timeout> = new Map();
  private readonly shutdownTimeout = 30000; // 30 seconds

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scraper service is already running');
      return;
    }

    try {
      logger.info('🚀 Starting scraper service...');
      
      // Ensure database is connected
      if (!databaseService.isConnectedToDatabase()) {
        await databaseService.connect();
      }
      
      // Initialize blockchain providers
      await blockchainService.initializeProviders();
      
      // Start scraping for each enabled chain
      await this.startAllChains();
      
      this.isRunning = true;
      logger.info('✅ Scraper service started successfully');
      
    } catch (error) {
      logger.error('Failed to start scraper service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Scraper service is not running');
      return;
    }

    logger.info('🛑 Stopping scraper service...');
    
    // Clear all intervals
    for (const [chainId, interval] of this.intervals) {
      clearInterval(interval);
      logger.info(`Stopped scraping for chain ${chainId}`);
    }
    this.intervals.clear();
    
    // Update scraper states
    await this.updateAllScraperStates('stopped');
    
    this.isRunning = false;
    logger.info('✅ Scraper service stopped');
  }

  async startChain(chainId: number): Promise<void> {
    try {
      const chainConfig = await ChainConfigurationModel.findOne({ chainId });
      if (!chainConfig) {
        throw new Error(`Chain ${chainId} not found or not enabled`);
      }

      // Check if already running
      if (this.intervals.has(chainId)) {
        logger.warn(`Chain ${chainId} is already being scraped`);
        return;
      }

      logger.info(`Starting scraper for chain ${chainId} (${chainConfig.name})`);
      
      // Update worker status
      await ChainConfigurationModel.findOneAndUpdate(
        { chainId },
        { 
          workerStatus: 'starting',
          lastWorkerStart: new Date(),
        }
      );

      // Update blockchain provider
      await blockchainService.addProvider(chainId, chainConfig.rpcUrl, chainConfig.contractAddress);

      // Process initial block range
      await this.processChain(chainId);
      
      // Set up interval for continuous scraping
      const interval = setInterval(async () => {
        try {
          await this.processChain(chainId);
        } catch (error) {
          logger.error(`Error processing chain ${chainId}:`, error);
          await this.handleChainError(chainId, error);
        }
      }, chainConfig.scanInterval);

      this.intervals.set(chainId, interval);
      
      // Update worker status to running
      await ChainConfigurationModel.findOneAndUpdate(
        { chainId },
        { workerStatus: 'running' }
      );
      
      logger.info(`✅ Started scraper for chain ${chainId}`);
      
    } catch (error) {
      logger.error(`Failed to start scraper for chain ${chainId}:`, error);
      await this.handleChainError(chainId, error);
      throw error;
    }
  }

  async stopChain(chainId: number): Promise<void> {
    const interval = this.intervals.get(chainId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(chainId);
      
      // Update worker status
      await ChainConfigurationModel.findOneAndUpdate(
        { chainId },
        { workerStatus: 'stopped' }
      );
      
      logger.info(`Stopped scraper for chain ${chainId}`);
    } else {
      logger.warn(`Chain ${chainId} is not currently being scraped`);
    }
  }

  private async startAllChains(): Promise<void> {
    const enabledChains = await ChainConfigurationModel.find({ isEnabled: true });
    
    for (const chainConfig of enabledChains) {
      try {
        await this.startChain(chainConfig.chainId);
      } catch (error) {
        logger.error(`Failed to start chain ${chainConfig.chainId}:`, error);
        // Continue with other chains
      }
    }
  }

  private async processChain(chainId: number): Promise<void> {
    try {
      // Calculate next block range to process
      const blockRange = await eventProcessor.calculateBlockRange(chainId);
      
      if (!blockRange) {
        logger.debug(`No new blocks to process for chain ${chainId}`);
        return;
      }
      
      // Process the block range
      const result = await eventProcessor.processBlockRange(
        blockRange.chainId,
        blockRange.fromBlock,
        blockRange.toBlock
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown processing error');
      }
      
      logger.debug(`Processed ${result.processedEvents} events for chain ${chainId} in ${result.processingTime}ms`);
      
    } catch (error) {
      logger.error(`Error processing chain ${chainId}:`, error);
      await this.handleChainError(chainId, error);
      throw error;
    }
  }

  private async handleChainError(chainId: number, error: any): Promise<void> {
    try {
      // Update scraper state with error
      await ScraperStateModel.findOneAndUpdate(
        { chainId },
        {
          $inc: { errorCount: 1 },
          lastError: error instanceof Error ? error.message : 'Unknown error',
          lastRunAt: new Date(),
        },
        { upsert: true }
      );
      
      // Update chain configuration with error status
      await ChainConfigurationModel.findOneAndUpdate(
        { chainId },
        {
          workerStatus: 'error',
          lastWorkerError: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      
      logger.error(`Updated error state for chain ${chainId}`);
      
    } catch (updateError) {
      logger.error(`Failed to update error state for chain ${chainId}:`, updateError);
    }
  }

  private async updateAllScraperStates(status: 'running' | 'stopped' | 'error'): Promise<void> {
    try {
      await ChainConfigurationModel.updateMany(
        { isEnabled: true },
        { workerStatus: status }
      );
    } catch (error) {
      logger.error('Failed to update scraper states:', error);
    }
  }

  async getStatus(): Promise<{
    isRunning: boolean;
    activeChains: number;
    totalChains: number;
    chainStatuses: Array<{
      chainId: number;
      name: string;
      status: string;
      lastRunAt: Date | null;
      errorCount: number;
    }>;
  }> {
    const chainConfigs = await ChainConfigurationModel.find();
    const activeChains = this.intervals.size;
    
    const chainStatuses = await Promise.all(
      chainConfigs.map(async (config) => {
        const scraperState = await ScraperStateModel.findOne({ chainId: config.chainId });
        return {
          chainId: config.chainId,
          name: config.name,
          status: config.workerStatus,
          lastRunAt: scraperState?.lastRunAt || null,
          errorCount: scraperState?.errorCount || 0,
        };
      })
    );

    return {
      isRunning: this.isRunning,
      activeChains,
      totalChains: chainConfigs.length,
      chainStatuses,
    };
  }

  async gracefulShutdown(): Promise<void> {
    logger.info('Received shutdown signal, performing graceful shutdown...');
    
    const shutdownPromise = this.stop();
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Shutdown timeout')), this.shutdownTimeout);
    });
    
    try {
      await Promise.race([shutdownPromise, timeoutPromise]);
      logger.info('Graceful shutdown completed');
    } catch (error) {
      logger.error('Graceful shutdown failed:', error);
      // Force shutdown
      process.exit(1);
    }
  }

  async updateChainInterval(chainId: number, scanInterval: number): Promise<void> {
    const interval = this.intervals.get(chainId);
    if (interval) {
      clearInterval(interval);
    }
    this.intervals.set(chainId, setInterval(async () => {
      await this.processChain(chainId);
    }, scanInterval));
  }
}

export const scraperService = new ScraperService(); 