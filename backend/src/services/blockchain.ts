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
      
      // Start health monitoring
      this.startHealthMonitoring();
      
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
    
    try {
      return await provider.provider.getBlockNumber();
    } catch (error) {
      logger.error(`Failed to get latest block for chain ${chainId}:`, error);
      throw error;
    }
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

    try {
      logger.info(`Loading events for chain ${chainId} from block ${fromBlock} to ${toBlock}`);
      
      const filter = provider.contract.filters.FeesCollected();
      const events = await provider.contract.queryFilter(filter, fromBlock, toBlock);
      
      logger.info(`Found ${events.length} events for chain ${chainId}`);
      return events;
      
    } catch (error) {
      logger.error(`Failed to load events for chain ${chainId}:`, error);
      throw error;
    }
  }

  async parseFeeCollectorEvents(events: ethers.Event[], chainId: number): Promise<BlockchainEvent[]> {
    return await Promise.all(events.map(async event => {
      // Parse the event using the contract interface
      const provider = this.providers.get(chainId);
      if (!provider) {
        throw new Error(`No provider found for chain ${chainId}`);
      }
      
      const parsedEvent = provider.contract.interface.parseLog(event);
      
      return {
        chainId,
        blockNumber: event.blockNumber,
        blockHash: event.blockHash,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        token: parsedEvent.args[0],
        integrator: parsedEvent.args[1],
        integratorFee: parsedEvent.args[2].toString(),
        lifiFee: parsedEvent.args[3].toString(),
        timestamp: new Date(), // TODO: get the timestamp from the block (this operation is very slow and hits the rate limit of the provider)
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