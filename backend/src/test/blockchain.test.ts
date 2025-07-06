// Mock ethers.js to avoid real network calls
jest.mock('ethers', () => {
  const mockProvider = {
    getBlockNumber: jest.fn().mockResolvedValue(70000001),
  };
  
  const mockContract = {
    filters: {
      FeesCollected: jest.fn().mockReturnValue({}),
    },
    interface: {
      parseLog: jest.fn().mockReturnValue({
        args: ['0xToken', '0xIntegrator', '1000000000000000000', '500000000000000000'],
      }),
    },
    queryFilter: jest.fn().mockResolvedValue([]),
  };

  return {
    ethers: {
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => mockProvider),
      },
      Contract: jest.fn().mockImplementation(() => mockContract),
    }
  };
});

import { blockchainService } from '../services/blockchain';
import { databaseService } from '../services/database';
import { ChainConfigurationModel } from '../models';
import { closeRedis } from '../utils/redisClient';

describe('Blockchain Service Tests', () => {
  beforeAll(async () => {
    // Connect to database first
    await databaseService.connect();
    
    // Create a test chain configuration
    await ChainConfigurationModel.findOneAndUpdate(
      { chainId: 137 },
      {
        chainId: 137,
        name: 'Polygon Test',
        rpcUrl: 'https://polygon-rpc.com',
        contractAddress: '0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9',
        startingBlock: 70000000,
        isEnabled: true,
        scanInterval: 30000,
        maxBlockRange: 1000,
        retryAttempts: 3,
        workerStatus: 'stopped',
      },
      { upsert: true, new: true }
    );
  });

  afterAll(async () => {
    await blockchainService.shutdown();
    await ChainConfigurationModel.deleteMany({});
    await databaseService.disconnect();
    await closeRedis();
  });

  test('should initialize providers', async () => {
    // Initialize providers without starting health monitoring
    await blockchainService.initializeProviders();
    const providers = blockchainService.getAllProviders();
    expect(providers.length).toBeGreaterThan(0);
  });

  test('should get provider for chain', async () => {
    // Make sure providers are initialized first
    await blockchainService.initializeProviders();
    const provider = blockchainService.getProvider(137);
    expect(provider).toBeDefined();
    expect(provider?.chainId).toBe(137);
  });

  test('should get latest block number', async () => {
    // Make sure providers are initialized first
    await blockchainService.initializeProviders();
    const blockNumber = await blockchainService.getLatestBlockNumber(137);
    expect(blockNumber).toBeGreaterThan(0);
  });
}); 