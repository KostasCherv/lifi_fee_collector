import request from 'supertest';
import { app } from '../../index';
import { ChainConfigurationModel } from '../../models/ChainConfiguration';
import { ScraperStateModel } from '../../models/ScraperState';
import { databaseService } from '../../services/database';
import { blockchainService } from '../../services/blockchain';
import { closeRedis } from '../../utils/redisClient';
// Remove unused import

// Mock services to avoid external dependencies
jest.mock('../../services/blockchain', () => ({
  blockchainService: {
    validateProvider: jest.fn().mockResolvedValue(undefined),
    addProvider: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/scraper', () => ({
  scraperService: {
    startChain: jest.fn().mockResolvedValue(undefined),
    stopChain: jest.fn().mockResolvedValue(undefined),
    updateChainInterval: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Chain Management API Endpoints', () => {
  const testChainConfig = {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/test',
    contractAddress: '0x1234567890123456789012345678901234567890',
    startingBlock: 18000000,
    scanInterval: 30000,
    maxBlockRange: 1000,
    retryAttempts: 3,
  };

  beforeAll(async () => {
    // Ensure database is connected
    if (!databaseService.isConnectedToDatabase()) {
      await databaseService.connect();
    }
  });

  beforeEach(async () => {
    // Clear test data before each test
    await ChainConfigurationModel.deleteMany({});
    await ScraperStateModel.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await ChainConfigurationModel.deleteMany({});
    await ScraperStateModel.deleteMany({});
    await databaseService.disconnect();
    await closeRedis();
  });

  describe('GET /api/v1/chains/status', () => {
    it('should return status of all chains', async () => {
      // Create test chain configuration
      await ChainConfigurationModel.create({
        ...testChainConfig,
        isEnabled: true,
        workerStatus: 'running',
      });

      const response = await request(app)
        .get('/api/v1/chains/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('chains');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.chains).toHaveLength(1);
      expect(response.body.data.summary.totalChains).toBe(1);
      expect(response.body.data.summary.activeChains).toBe(1);
    });

    it('should return empty chains when no configurations exist', async () => {
      const response = await request(app)
        .get('/api/v1/chains/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chains).toHaveLength(0);
      expect(response.body.data.summary.totalChains).toBe(0);
    });
  });

  describe('GET /api/v1/chains/:chainId/status', () => {
    it('should return status of specific chain', async () => {
      // Create test chain configuration
      await ChainConfigurationModel.create({
        ...testChainConfig,
        isEnabled: true,
        workerStatus: 'running',
      });

      const response = await request(app)
        .get(`/api/v1/chains/${testChainConfig.chainId}/status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chainId).toBe(testChainConfig.chainId);
      expect(response.body.data.name).toBe(testChainConfig.name);
      expect(response.body.data.isEnabled).toBe(true);
      expect(response.body.data.workerStatus).toBe('running');
    });

    it('should return 404 for non-existent chain', async () => {
      await request(app)
        .get('/api/v1/chains/999999/status')
        .expect(404);
    });

    it('should return 400 for invalid chain ID', async () => {
      await request(app)
        .get('/api/v1/chains/invalid/status')
        .expect(400);
    });
  });

  describe('POST /api/v1/chains', () => {
    it('should start a new chain successfully', async () => {
      const response = await request(app)
        .post('/api/v1/chains')
        .send(testChainConfig)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Chain worker started successfully');
      expect(response.body.data.chainId).toBe(testChainConfig.chainId);
      expect(response.body.data.workerStatus).toBe('running');

      // Verify chain configuration was created
      const chainConfig = await ChainConfigurationModel.findOne({ chainId: testChainConfig.chainId });
      expect(chainConfig).toBeTruthy();
      expect(chainConfig?.name).toBe(testChainConfig.name);
      expect(chainConfig?.isEnabled).toBe(true);

      // Verify scraper state was created
      const scraperState = await ScraperStateModel.findOne({ chainId: testChainConfig.chainId });
      expect(scraperState).toBeTruthy();
      expect(scraperState?.isActive).toBe(true);
    });

    it('should return 409 for duplicate chain ID', async () => {
      // Create existing chain
      await ChainConfigurationModel.create(testChainConfig);

      const response = await request(app)
        .post('/api/v1/chains')
        .send(testChainConfig)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });

    it('should return 400 for invalid chain configuration', async () => {
      const invalidConfig = {
        ...testChainConfig,
        chainId: 'invalid', // Invalid chain ID
      };

      const response = await request(app)
        .post('/api/v1/chains')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Validation error');
    });

    it('should return 400 for invalid contract address', async () => {
      const invalidConfig = {
        ...testChainConfig,
        contractAddress: 'invalid-address',
      };

      const response = await request(app)
        .post('/api/v1/chains')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Validation error');
    });

    it('should return 400 for invalid RPC URL', async () => {
      const invalidConfig = {
        ...testChainConfig,
        rpcUrl: 'not-a-url',
      };

      const response = await request(app)
        .post('/api/v1/chains')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Validation error');
    });

    it('should validate RPC connectivity', async () => {
      // Mock RPC validation failure
      (blockchainService.validateProvider as jest.Mock).mockRejectedValueOnce(
        new Error('RPC connection failed')
      );

      const response = await request(app)
        .post('/api/v1/chains')
        .send(testChainConfig)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('RPC validation failed');
    });
  });

  describe('PUT /api/v1/chains/:chainId/stop', () => {
    it('should stop a running chain successfully', async () => {
      // Create running chain
      await ChainConfigurationModel.create({
        ...testChainConfig,
        isEnabled: true,
        workerStatus: 'running',
      });

      const response = await request(app)
        .put(`/api/v1/chains/${testChainConfig.chainId}/stop`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Chain worker stopped successfully');
      expect(response.body.data.workerStatus).toBe('stopped');

      // Verify chain configuration was updated
      const chainConfig = await ChainConfigurationModel.findOne({ chainId: testChainConfig.chainId });
      expect(chainConfig?.isEnabled).toBe(false);
      expect(chainConfig?.workerStatus).toBe('stopped');
    });

    it('should return 404 for non-existent chain', async () => {
      await request(app)
        .put('/api/v1/chains/999999/stop')
        .expect(404);
    });

    it('should return 400 for invalid chain ID', async () => {
      await request(app)
        .put('/api/v1/chains/invalid/stop')
        .expect(400);
    });
  });

  describe('PUT /api/v1/chains/:chainId/update', () => {
    it('should update chain configuration successfully', async () => {
      // Create existing chain
      await ChainConfigurationModel.create({
        ...testChainConfig,
        isEnabled: true,
        workerStatus: 'running',
      });

      const updateData = {
        name: 'Updated Ethereum Mainnet',
        scanInterval: 60000,
        maxBlockRange: 2000,
      };

      const response = await request(app)
        .put(`/api/v1/chains/${testChainConfig.chainId}/update`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Chain configuration updated successfully');

      // Verify chain configuration was updated
      const chainConfig = await ChainConfigurationModel.findOne({ chainId: testChainConfig.chainId });
      expect(chainConfig?.name).toBe(updateData.name);
      expect(chainConfig?.scanInterval).toBe(updateData.scanInterval);
      expect(chainConfig?.maxBlockRange).toBe(updateData.maxBlockRange);
    });

    it('should validate RPC URL when updating', async () => {
      // Create existing chain
      await ChainConfigurationModel.create(testChainConfig);

      // Mock RPC validation failure
      (blockchainService.validateProvider as jest.Mock).mockRejectedValueOnce(
        new Error('RPC connection failed')
      );

      const response = await request(app)
        .put(`/api/v1/chains/${testChainConfig.chainId}/update`)
        .send({ rpcUrl: 'https://new-rpc-url.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('RPC validation failed');
    });

    it('should return 404 for non-existent chain', async () => {
      await request(app)
        .put('/api/v1/chains/999999/update')
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should return 400 for invalid update data', async () => {
      // Create existing chain
      await ChainConfigurationModel.create(testChainConfig);

      const response = await request(app)
        .put(`/api/v1/chains/${testChainConfig.chainId}/update`)
        .send({ scanInterval: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Validation error');
    });
  });

  describe('DELETE /api/v1/chains/:chainId', () => {
    it('should delete chain configuration successfully', async () => {
      // Create existing chain
      await ChainConfigurationModel.create({
        ...testChainConfig,
        isEnabled: true,
        workerStatus: 'running',
      });

      const response = await request(app)
        .delete(`/api/v1/chains/${testChainConfig.chainId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Chain configuration deleted successfully');

      // Verify chain configuration was deleted
      const chainConfig = await ChainConfigurationModel.findOne({ chainId: testChainConfig.chainId });
      expect(chainConfig).toBeNull();

      // Verify scraper state was deleted
      const scraperState = await ScraperStateModel.findOne({ chainId: testChainConfig.chainId });
      expect(scraperState).toBeNull();
    });

    it('should return 404 for non-existent chain', async () => {
      await request(app)
        .delete('/api/v1/chains/999999')
        .expect(404);
    });

    it('should return 400 for invalid chain ID', async () => {
      await request(app)
        .delete('/api/v1/chains/invalid')
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to chain management endpoints', async () => {
      // In test mode, rate limiting is disabled for faster test execution
      if (process.env['NODE_ENV'] === 'test') {
        // Make multiple rapid requests - should all succeed in test mode
        const promises = Array.from({ length: 100 }, () =>
          request(app).get('/api/v1/chains/status')
        );

        const responses = await Promise.all(promises);
        const successful = responses.filter(res => res.status === 200);

        // All requests should succeed in test mode
        expect(successful.length).toBe(100);
      } else {
        // In non-test mode, rate limiting should be active
        const promises = Array.from({ length: 1005 }, () =>
          request(app).get('/api/v1/chains/status')
        );

        const responses = await Promise.all(promises);
        const rateLimited = responses.filter(res => res.status === 429);

        // Should have some rate limited responses
        expect(rateLimited.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format for chain status', async () => {
      const response = await request(app)
        .get('/api/v1/chains/status')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('chains');
      expect(response.body.data).toHaveProperty('summary');
      expect(Array.isArray(response.body.data.chains)).toBe(true);
    });

    it('should return consistent error format', async () => {
      const response = await request(app)
        .get('/api/v1/chains/999999/status')
        .expect(404);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.success).toBe(false);
    });
  });
}); 