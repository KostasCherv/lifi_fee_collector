import { logger } from '@/utils/logger';
import { blockchainService } from '@/services/blockchain';
import { ChainConfigurationModel, FeeCollectedEventModel, ScraperStateModel } from '@/models';
import { BlockchainEvent, EventProcessingResult, BlockRange } from '@/types/blockchain';
import config from '@/config';

class EventProcessor {
  async processBlockRange(chainId: number, fromBlock: number, toBlock: number): Promise<EventProcessingResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Processing block range for chain ${chainId}: ${fromBlock} to ${toBlock}`);
      
      // Load events from blockchain
      const rawEvents = await blockchainService.loadFeeCollectorEvents(chainId, fromBlock, toBlock);
      
      if (rawEvents.length === 0) {
        logger.info(`No events found for chain ${chainId} in block range ${fromBlock}-${toBlock}`);
        await this.updateScraperState(chainId, toBlock);
        return {
          chainId,
          processedEvents: 0,
          fromBlock,
          toBlock,
          success: true,
          processingTime: Date.now() - startTime,
        };
      }
      
      // Parse events
      const parsedEvents = await blockchainService.parseFeeCollectorEvents(rawEvents, chainId);
      
      // Store events in database
      const storedEvents = await this.storeEvents(parsedEvents);
      
      // Update scraper state
      await this.updateScraperState(chainId, toBlock);
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`✅ Processed ${storedEvents.length} events for chain ${chainId} in ${processingTime}ms`);
      
      return {
        chainId,
        processedEvents: storedEvents.length,
        fromBlock,
        toBlock,
        success: true,
        processingTime,
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`Failed to process block range for chain ${chainId}:`, error);
      
      return {
        chainId,
        processedEvents: 0,
        fromBlock,
        toBlock,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  private async storeEvents(events: BlockchainEvent[]): Promise<any[]> {
    try {
      // Check for duplicates before inserting
      const existingEvents = await FeeCollectedEventModel.find({
        chainId: { $in: events.map(e => e.chainId) },
        transactionHash: { $in: events.map(e => e.transactionHash) },
        logIndex: { $in: events.map(e => e.logIndex) },
      });

      const existingKeys = new Set(
        existingEvents.map(e => `${e.chainId}-${e.transactionHash}-${e.logIndex}`)
      );

      const newEvents = events.filter(event => 
        !existingKeys.has(`${event.chainId}-${event.transactionHash}-${event.logIndex}`)
      );

      if (newEvents.length === 0) {
        logger.info('All events already exist in database');
        return [];
      }

      // Convert to database model format
      const eventDocuments = newEvents.map(event => ({
        chainId: event.chainId,
        blockNumber: event.blockNumber,
        blockHash: event.blockHash,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        token: event.token,
        integrator: event.integrator,
        integratorFee: event.integratorFee,
        lifiFee: event.lifiFee,
        timestamp: event.timestamp,
      }));

      // Insert new events
      const result = await FeeCollectedEventModel.insertMany(eventDocuments);
      
      logger.info(`Stored ${result.length} new events in database`);
      return result;
      
    } catch (error) {
      logger.error('Failed to store events:', error);
      throw error;
    }
  }

  private async updateScraperState(chainId: number, lastProcessedBlock: number): Promise<void> {
    try {
      await ScraperStateModel.findOneAndUpdate(
        { chainId },
        {
          lastProcessedBlock,
          lastRunAt: new Date(),
          errorCount: 0,
          lastError: undefined,
        },
        { upsert: true, new: true }
      );
      
      logger.debug(`Updated scraper state for chain ${chainId} to block ${lastProcessedBlock}`);
      
    } catch (error) {
      logger.error(`Failed to update scraper state for chain ${chainId}:`, error);
      throw error;
    }
  }

  async calculateBlockRange(chainId: number): Promise<BlockRange | null> {
    try {
      // Get current scraper state
      const scraperState = await ScraperStateModel.findOne({ chainId });
      const lastProcessedBlock = scraperState?.lastProcessedBlock || config.scraper.defaultStartingBlock;
      
      // Get latest block number
      const latestBlock = await blockchainService.getLatestBlockNumber(chainId);

      // Get the max block range from the chain configuration
      const chainConfig = await ChainConfigurationModel.findOne({ chainId });
      const maxBlockRange = chainConfig?.maxBlockRange || config.scraper.maxBlockRange;
      
      // Calculate next block range
      const fromBlock = lastProcessedBlock + 1;
      const toBlock = Math.min(
        fromBlock +  maxBlockRange - 1,
        latestBlock
      );
      
      // Check if there are blocks to process
      if (fromBlock > toBlock) {
        logger.debug(`No new blocks to process for chain ${chainId}`);
        return null;
      }
      
      return {
        chainId,
        fromBlock,
        toBlock,
      };
      
    } catch (error) {
      logger.error(`Failed to calculate block range for chain ${chainId}:`, error);
      throw error;
    }
  }

  async getProcessingStats(chainId: number): Promise<{
    totalEvents: number;
    lastProcessedBlock: number;
    lastRunAt: Date | null;
    errorCount: number;
  }> {
    try {
      const [totalEvents, scraperState] = await Promise.all([
        FeeCollectedEventModel.countDocuments({ chainId }),
        ScraperStateModel.findOne({ chainId }),
      ]);
      
      return {
        totalEvents,
        lastProcessedBlock: scraperState?.lastProcessedBlock || 0,
        lastRunAt: scraperState?.lastRunAt || null,
        errorCount: scraperState?.errorCount || 0,
      };
      
    } catch (error) {
      logger.error(`Failed to get processing stats for chain ${chainId}:`, error);
      throw error;
    }
  }
}

export const eventProcessor = new EventProcessor(); 