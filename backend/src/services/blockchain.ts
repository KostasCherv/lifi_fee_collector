import { ethers } from 'ethers';
import { logger } from '@/utils/logger';
import { ChainProvider, BlockchainEvent } from '@/types/blockchain';
import { ChainConfigurationModel } from '@/models';

// FeeCollector contract ABI (minimal for FeesCollected event)
const FEE_COLLECTOR_ABI = [
  'event FeesCollected(address indexed token, address indexed integrator, uint256 integratorFee, uint256 lifiFee)',
];

class BlockchainService {
  private providers: Map<number, ChainProvider> = new Map();
  private readonly healthCheckInterval = 60000; // 1 minute
  private healthCheckTimer: NodeJS.Timeout | null = null;

  async initializeProviders(): Promise<void> {
    try {
      logger.info('Initializing blockchain providers...');
      
      // Load chain configurations from database
      const chainConfigs = await ChainConfigurationModel.find({ isEnabled: true });
      
      for (const config of chainConfigs) {
        await this.addProvider(config.chainId, config.rpcUrl, config.contractAddress);
      }
      
      logger.info(`✅ Initialized ${this.providers.size} blockchain providers`);
      
      // Start health monitoring only in non-test environments
      if (process.env['NODE_ENV'] !== 'test') {
        this.startHealthMonitoring();
      }
      
    } catch (error) {
      logger.error('Failed to initialize blockchain providers:', error);
      throw error;
    }
  }

  async addProvider(chainId: number, rpcUrl: string, contractAddress: string): Promise<void> {
    try {

      logger.info(`Adding provider for chain ${chainId} with RPC: ${rpcUrl}`);
      
      // Create provider
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      
      // Create contract instance
      const contract = new ethers.Contract(contractAddress, FEE_COLLECTOR_ABI, provider);
      
      // Test connection
      await this.testProviderHealth(provider, contract);
      
      const chainProvider: ChainProvider = {
        chainId,
        provider,
        contract,
        isHealthy: true,
        lastHealthCheck: new Date(),
        errorCount: 0,
      };
      
      this.providers.set(chainId, chainProvider);
      logger.info(`✅ Provider for chain ${chainId} added successfully`);
      
    } catch (error) {
      logger.error(`Failed to add provider for chain ${chainId}:`, error);
      throw error;
    }
  }

  async removeProvider(chainId: number): Promise<void> {
    const provider = this.providers.get(chainId);
    if (provider) {
      // Clean up provider connection
      if (provider.provider) {
        // Note: ethers.js providers don't have explicit cleanup methods
        // The garbage collector will handle cleanup
      }
      this.providers.delete(chainId);
      logger.info(`Provider for chain ${chainId} removed`);
    }
  }

  getProvider(chainId: number): ChainProvider | undefined {
    return this.providers.get(chainId);
  }

  getAllProviders(): ChainProvider[] {
    return Array.from(this.providers.values());
  }

  async getLatestBlockNumber(chainId: number): Promise<number> {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`No provider found for chain ${chainId}`);
    }

    // Fetch retryAttempts from ChainConfiguration
    const chainConfig = await ChainConfigurationModel.findOne({ chainId });
    const retryAttempts = chainConfig?.retryAttempts || 3;
    let lastError: any = null;
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        return await provider.provider.getBlockNumber();
      } catch (error) {
        lastError = error;
        logger.error(`Failed to get latest block for chain ${chainId} (attempt ${attempt}/${retryAttempts}):`, error);
        if (attempt < retryAttempts) {
          // Wait 1 second before retrying
          await new Promise(res => setTimeout(res, 1000));
        }
      }
    }
    logger.error(`All ${retryAttempts} attempts failed to get latest block for chain ${chainId}`);
    throw lastError;
  }

  async loadFeeCollectorEvents(
    chainId: number,
    fromBlock: number,
    toBlock: number
  ): Promise<ethers.Event[]> {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`No provider found for chain ${chainId}`);
    }

    // Fetch retryAttempts from ChainConfiguration
    const chainConfig = await ChainConfigurationModel.findOne({ chainId });
    const retryAttempts = chainConfig?.retryAttempts || 3;
    let lastError: any = null;
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        logger.info(`Loading events for chain ${chainId} from block ${fromBlock} to ${toBlock} (attempt ${attempt}/${retryAttempts})`);
        const filter = provider.contract.filters.FeesCollected();
        const events = await provider.contract.queryFilter(filter, fromBlock, toBlock);
        logger.info(`Found ${events.length} events for chain ${chainId}`);
        return events;
      } catch (error) {
        lastError = error;
        logger.error(`Failed to load events for chain ${chainId} (attempt ${attempt}/${retryAttempts}):`, error);
        if (attempt < retryAttempts) {
          // Wait 1 second before retrying
          await new Promise(res => setTimeout(res, 1000));
        }
      }
    }
    logger.error(`All ${retryAttempts} attempts failed to load events for chain ${chainId}`);
    throw lastError;
  }

  async parseFeeCollectorEvents(events: ethers.Event[], chainId: number): Promise<BlockchainEvent[]> {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`No provider found for chain ${chainId}`);
    }

    // Group events by block number to minimize RPC calls
    const eventsByBlock = new Map<number, ethers.Event[]>();
    for (const event of events) {
      const blockNumber = event.blockNumber;
      if (blockNumber && !eventsByBlock.has(blockNumber)) {
        eventsByBlock.set(blockNumber, []);
      }
      if (blockNumber) {
        eventsByBlock.get(blockNumber)!.push(event);
      }
    }

    // Fetch block timestamps efficiently with parallel processing and rate limiting
    const blockTimestamps = await this.fetchBlockTimestamps(provider.provider, Array.from(eventsByBlock.keys()), chainId);

    return await Promise.all(events.map(async event => {
      const parsedEvent = provider.contract.interface.parseLog(event);
      const blockNumber = event.blockNumber;
      const blockTimestamp = blockNumber ? blockTimestamps.get(blockNumber) || Math.floor(Date.now() / 1000) : Math.floor(Date.now() / 1000);
      
      return {
        chainId,
        blockNumber: blockNumber || 0,
        blockHash: event.blockHash || '',
        transactionHash: event.transactionHash || '',
        logIndex: event.logIndex || 0,
        token: parsedEvent.args[0],
        integrator: parsedEvent.args[1],
        integratorFee: parsedEvent.args[2].toString(),
        lifiFee: parsedEvent.args[3].toString(),
        timestamp: new Date(blockTimestamp * 1000), // Convert Unix timestamp to Date
      };
    }));
  }

  private async testProviderHealth(provider: any, contract: any): Promise<void> {
    try {
      // Test basic provider functionality
      await provider.getBlockNumber();
      
      // Test contract interface
      await contract.filters.FeesCollected();
      
    } catch (error) {
      logger.error('Provider health check failed:', error);
      throw new Error('Provider health check failed');
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      for (const [chainId, provider] of this.providers) {
        try {
          await this.testProviderHealth(provider.provider, provider.contract);
          provider.isHealthy = true;
          provider.errorCount = 0;
          provider.lastHealthCheck = new Date();
        } catch (error) {
          provider.isHealthy = false;
          provider.errorCount++;
          provider.lastHealthCheck = new Date();
          logger.warn(`Health check failed for chain ${chainId}, error count: ${provider.errorCount}`);
        }
      }
    }, this.healthCheckInterval);
  }



  private async fetchBlockTimestamps(
    provider: any, 
    blockNumbers: number[], 
    chainId: number,
    batchSize: number = 5,
    delayBetweenBatches: number = 200
  ): Promise<Map<number, number>> {
    const blockTimestamps = new Map<number, number>();
    
    if (blockNumbers.length === 0) {
      return blockTimestamps;
    }

    logger.info(`Fetching timestamps for ${blockNumbers.length} unique blocks for chain ${chainId} (batch size: ${batchSize})`);

    // Process blocks in batches to avoid overwhelming the RPC
    for (let i = 0; i < blockNumbers.length; i += batchSize) {
      const batch = blockNumbers.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(blockNumbers.length / batchSize);
      
      logger.info(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} blocks) for chain ${chainId}`);
      
      // Fetch all blocks in current batch in parallel
      const batchPromises = batch.map(async (blockNumber) => {
        try {
          const block = await provider.getBlock(blockNumber);
          if (block && block.timestamp) {
            return { blockNumber, timestamp: block.timestamp };
          } else {
            logger.warn(`Block ${blockNumber} on chain ${chainId} has no timestamp, using current time`);
            return { blockNumber, timestamp: Math.floor(Date.now() / 1000) };
          }
        } catch (error) {
          logger.warn(`Failed to fetch block ${blockNumber} on chain ${chainId}:`, error);
          return { blockNumber, timestamp: Math.floor(Date.now() / 1000) };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Store results
      for (const { blockNumber, timestamp } of batchResults) {
        blockTimestamps.set(blockNumber, timestamp);
      }

      // Add delay between batches to respect rate limits (except for the last batch)
      if (i + batchSize < blockNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    logger.info(`✅ Completed fetching timestamps for ${blockNumbers.length} blocks for chain ${chainId}`);
    return blockTimestamps;
  }

  async validateProvider(rpcUrl: string): Promise<void> {
    try {
      logger.info(`Validating RPC provider: ${rpcUrl}`);
      
      // Create a temporary provider to test connectivity
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      
      // Test basic functionality
      await provider.getBlockNumber();
      
      logger.info(`✅ RPC provider validation successful: ${rpcUrl}`);
    } catch (error) {
      logger.error(`RPC provider validation failed: ${rpcUrl}`, error);
      throw new Error(`RPC validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down blockchain service...');
    
    // Clear health monitoring interval
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    // Clear providers
    this.providers.clear();
    logger.info('Blockchain service shutdown complete');
  }
}

export const blockchainService = new BlockchainService(); 