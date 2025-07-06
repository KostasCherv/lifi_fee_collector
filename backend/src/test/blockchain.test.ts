// Mock ethers.js to avoid real network calls
jest.mock('ethers', () => {
  const mockProvider = {
    getBlockNumber: jest.fn().mockResolvedValue(70000001),
    getBlock: jest.fn().mockResolvedValue({ timestamp: 1640995200 }), // 2022-01-01
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

  beforeEach(async () => {
    // Clear providers before each test
    blockchainService['providers'].clear();
  });

  describe('Provider Management', () => {
    test('should initialize providers', async () => {
      // Initialize providers without starting health monitoring
      await blockchainService.initializeProviders();
      const providers = blockchainService.getAllProviders();
      expect(providers.length).toBeGreaterThan(0);
    });

    test('should add provider successfully', async () => {
      await blockchainService.addProvider(1, 'https://test-rpc.com', '0xContract');
      const provider = blockchainService.getProvider(1);
      expect(provider).toBeDefined();
      expect(provider?.chainId).toBe(1);
      expect(provider?.isHealthy).toBe(true);
    });

    test('should remove provider successfully', async () => {
      await blockchainService.addProvider(2, 'https://test-rpc.com', '0xContract');
      expect(blockchainService.getProvider(2)).toBeDefined();
      
      await blockchainService.removeProvider(2);
      expect(blockchainService.getProvider(2)).toBeUndefined();
    });

    test('should remove non-existent provider gracefully', async () => {
      await expect(blockchainService.removeProvider(999)).resolves.not.toThrow();
    });

    test('should get all providers', async () => {
      await blockchainService.addProvider(1, 'https://test-rpc.com', '0xContract');
      await blockchainService.addProvider(2, 'https://test-rpc2.com', '0xContract2');
      
      const providers = blockchainService.getAllProviders();
      expect(providers).toHaveLength(2);
      expect(providers.map(p => p.chainId)).toContain(1);
      expect(providers.map(p => p.chainId)).toContain(2);
    });

    test('should return undefined for non-existent provider', async () => {
      const provider = blockchainService.getProvider(999);
      expect(provider).toBeUndefined();
    });
  });

  describe('Block Operations', () => {
    beforeEach(async () => {
      await blockchainService.addProvider(137, 'https://test-rpc.com', '0xContract');
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

    test('should throw error when getting block number for non-existent chain', async () => {
      await expect(blockchainService.getLatestBlockNumber(999)).rejects.toThrow('No provider found for chain 999');
    });

    test('should retry on provider failure', async () => {
      const mockProvider = blockchainService.getProvider(137);
      if (!mockProvider) throw new Error('Provider not found');
      
      // Mock provider to fail twice then succeed
      const originalGetBlockNumber = mockProvider.provider.getBlockNumber;
      let callCount = 0;
      mockProvider.provider.getBlockNumber = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Provider error');
        }
        return Promise.resolve(70000001);
      });

      const blockNumber = await blockchainService.getLatestBlockNumber(137);
      expect(blockNumber).toBe(70000001);
      expect(callCount).toBe(3);

      // Restore original method
      mockProvider.provider.getBlockNumber = originalGetBlockNumber;
    });

    test('should throw error after all retry attempts fail', async () => {
      const mockProvider = blockchainService.getProvider(137);
      if (!mockProvider) throw new Error('Provider not found');
      
      // Mock provider to always fail
      const originalGetBlockNumber = mockProvider.provider.getBlockNumber;
      mockProvider.provider.getBlockNumber = jest.fn().mockRejectedValue(new Error('Provider error'));

      await expect(blockchainService.getLatestBlockNumber(137)).rejects.toThrow('Provider error');

      // Restore original method
      mockProvider.provider.getBlockNumber = originalGetBlockNumber;
    });
  });

  describe('Event Operations', () => {
    beforeEach(async () => {
      await blockchainService.addProvider(137, 'https://test-rpc.com', '0xContract');
    });

    test('should load fee collector events', async () => {
      const events = await blockchainService.loadFeeCollectorEvents(137, 70000000, 70000001);
      expect(Array.isArray(events)).toBe(true);
    });

    test('should throw error when loading events for non-existent chain', async () => {
      await expect(blockchainService.loadFeeCollectorEvents(999, 70000000, 70000001))
        .rejects.toThrow('No provider found for chain 999');
    });

    test('should retry on event loading failure', async () => {
      const mockProvider = blockchainService.getProvider(137);
      if (!mockProvider) throw new Error('Provider not found');
      
      // Mock contract to fail twice then succeed
      const originalQueryFilter = mockProvider.contract.queryFilter;
      let callCount = 0;
      mockProvider.contract.queryFilter = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Contract error');
        }
        return Promise.resolve([]);
      });

      const events = await blockchainService.loadFeeCollectorEvents(137, 70000000, 70000001);
      expect(events).toEqual([]);
      expect(callCount).toBe(3);

      // Restore original method
      mockProvider.contract.queryFilter = originalQueryFilter;
    });

    test('should parse fee collector events', async () => {
      const mockEvents = [
        {
          blockNumber: 70000001,
          blockHash: '0xHash',
          transactionHash: '0xTxHash',
          logIndex: 0,
          args: ['0xToken', '0xIntegrator', '1000000000000000000', '500000000000000000']
        }
      ] as any;

      const parsedEvents = await blockchainService.parseFeeCollectorEvents(mockEvents, 137);
      expect(parsedEvents).toHaveLength(1);
      expect(parsedEvents[0]).toMatchObject({
        chainId: 137,
        blockNumber: 70000001,
        blockHash: '0xHash',
        transactionHash: '0xTxHash',
        logIndex: 0,
        token: '0xToken',
        integrator: '0xIntegrator',
        integratorFee: '1000000000000000000',
        lifiFee: '500000000000000000'
      });
    });

    test('should throw error when parsing events for non-existent chain', async () => {
      const mockEvents = [] as any;
      await expect(blockchainService.parseFeeCollectorEvents(mockEvents, 999))
        .rejects.toThrow('No provider found for chain 999');
    });

    test('should handle events with missing block numbers', async () => {
      const mockEvents = [
        {
          blockNumber: null,
          blockHash: '0xHash',
          transactionHash: '0xTxHash',
          logIndex: 0,
          args: ['0xToken', '0xIntegrator', '1000000000000000000', '500000000000000000']
        }
      ] as any;

      const parsedEvents = await blockchainService.parseFeeCollectorEvents(mockEvents, 137);
      expect(parsedEvents).toHaveLength(1);
      expect(parsedEvents[0]?.blockNumber).toBe(0);
    });
  });

  describe('Provider Validation', () => {
    test('should validate provider successfully', async () => {
      await expect(blockchainService.validateProvider('https://test-rpc.com')).resolves.not.toThrow();
    });

    test('should throw error on provider validation failure', async () => {
      // Mock ethers to throw error
      const { ethers } = require('ethers');
      const originalJsonRpcProvider = ethers.providers.JsonRpcProvider;
      ethers.providers.JsonRpcProvider = jest.fn().mockImplementation(() => ({
        getBlockNumber: jest.fn().mockRejectedValue(new Error('Connection failed'))
      }));

      await expect(blockchainService.validateProvider('https://invalid-rpc.com'))
        .rejects.toThrow('RPC validation failed: Connection failed');

      // Restore original
      ethers.providers.JsonRpcProvider = originalJsonRpcProvider;
    });
  });

  describe('Error Handling', () => {
    test('should handle provider health check failure', async () => {
      const mockProvider = {
        getBlockNumber: jest.fn().mockRejectedValue(new Error('Health check failed')),
      };
      const mockContract = {
        filters: {
          FeesCollected: jest.fn().mockReturnValue({}),
        },
      };

      await expect(blockchainService['testProviderHealth'](mockProvider, mockContract))
        .rejects.toThrow('Provider health check failed');
    });

    test('should handle contract health check failure', async () => {
      const mockProvider = {
        getBlockNumber: jest.fn().mockResolvedValue(70000001),
      };
      const mockContract = {
        filters: {
          FeesCollected: jest.fn().mockImplementation(() => {
            throw new Error('Contract error');
          }),
        },
      };

      await expect(blockchainService['testProviderHealth'](mockProvider, mockContract))
        .rejects.toThrow('Provider health check failed');
    });
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      await blockchainService.addProvider(1, 'https://test-rpc.com', '0xContract');
      expect(blockchainService.getAllProviders()).toHaveLength(1);
      
      await blockchainService.shutdown();
      expect(blockchainService.getAllProviders()).toHaveLength(0);
    });

    test('should handle shutdown when no providers exist', async () => {
      await expect(blockchainService.shutdown()).resolves.not.toThrow();
    });
  });
}); 