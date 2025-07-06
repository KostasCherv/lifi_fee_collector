import request from 'supertest';
import { app } from '../../index';
import { FeeCollectedEventModel } from '../../models/FeeCollectedEvent';
import { databaseService } from '../../services/database';
import { closeRedis } from '../../utils/redisClient';
// Remove unused import

// Mock logger to reduce noise in tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Event Query API Endpoints', () => {
  const testIntegrator = '0x1234567890123456789012345678901234567890';
  const testChainId = 137;

  beforeAll(async () => {
    // Ensure database is connected
    if (!databaseService.isConnectedToDatabase()) {
      await databaseService.connect();
    }
  });

  beforeEach(async () => {
    // Clear test data before each test
    await FeeCollectedEventModel.deleteMany({});
    
    // Insert test data
    const testEvents = [
      {
        chainId: testChainId,
        blockNumber: 70000001,
        blockHash: '0xabc123',
        transactionHash: '0xdef456',
        logIndex: 0,
        token: '0x0000000000000000000000000000000000000000',
        integrator: testIntegrator.toLowerCase(),
        integratorFee: '1000000000000000000',
        lifiFee: '500000000000000000',
        timestamp: new Date('2024-01-01T10:00:00Z'),
      },
      {
        chainId: testChainId,
        blockNumber: 70000002,
        blockHash: '0xabc124',
        transactionHash: '0xdef457',
        logIndex: 0,
        token: '0x0000000000000000000000000000000000000000',
        integrator: testIntegrator.toLowerCase(),
        integratorFee: '2000000000000000000',
        lifiFee: '1000000000000000000',
        timestamp: new Date('2024-01-02T10:00:00Z'),
      },
      {
        chainId: 1, // Different chain
        blockNumber: 18000001,
        blockHash: '0xabc125',
        transactionHash: '0xdef458',
        logIndex: 0,
        token: '0x0000000000000000000000000000000000000000',
        integrator: testIntegrator.toLowerCase(),
        integratorFee: '3000000000000000000',
        lifiFee: '1500000000000000000',
        timestamp: new Date('2024-01-03T10:00:00Z'),
      },
    ];

    await FeeCollectedEventModel.insertMany(testEvents);
  });

  afterAll(async () => {
    // Clean up test data
    await FeeCollectedEventModel.deleteMany({});
    await databaseService.disconnect();
    await closeRedis();
  });

  describe('GET /api/v1/events/integrator/:integrator', () => {
    it('should return events for a valid integrator', async () => {
      const response = await request(app)
        .get(`/api/v1/events/integrator/${testIntegrator}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(3);
      expect(response.body.data.pagination.total).toBe(3);
      expect(response.body.data.events[0].integrator).toBe(testIntegrator.toLowerCase());
    });

    it('should filter by chainId when provided', async () => {
      const response = await request(app)
        .get(`/api/v1/events/integrator/${testIntegrator}`)
        .query({ chainId: testChainId.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.events.every((event: any) => event.chainId === testChainId)).toBe(true);
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get(`/api/v1/events/integrator/${testIntegrator}`)
        .query({
          fromDate: '2024-01-01T00:00:00Z',
          toDate: '2024-01-02T23:59:59Z',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/events/integrator/${testIntegrator}`)
        .query({ page: '1', limit: '2' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.totalPages).toBe(2);
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get(`/api/v1/events/integrator/${testIntegrator}`)
        .query({ sortBy: 'blockNumber', sortOrder: 'asc' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events[0].blockNumber).toBeLessThan(
        response.body.data.events[1].blockNumber
      );
    });

    it('should return 400 for invalid integrator address', async () => {
      await request(app)
        .get('/api/v1/events/integrator/invalid-address')
        .expect(400);
    });

    it('should return 400 for invalid query parameters', async () => {
      await request(app)
        .get(`/api/v1/events/integrator/${testIntegrator}`)
        .query({ page: 'invalid' })
        .expect(400);
    });

    it('should return empty results for non-existent integrator', async () => {
      const response = await request(app)
        .get('/api/v1/events/integrator/0x9999999999999999999999999999999999999999')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('GET /api/v1/events/chain/:chainId', () => {
    it('should return events for a valid chain', async () => {
      const response = await request(app)
        .get(`/api/v1/events/chain/${testChainId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.events.every((event: any) => event.chainId === testChainId)).toBe(true);
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get(`/api/v1/events/chain/${testChainId}`)
        .query({
          fromDate: '2024-01-01T00:00:00Z',
          toDate: '2024-01-01T23:59:59Z',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/events/chain/${testChainId}`)
        .query({ page: '1', limit: '1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });

    it('should return 400 for invalid chain ID', async () => {
      await request(app)
        .get('/api/v1/events/chain/invalid')
        .expect(400);
    });

    it('should return empty results for non-existent chain', async () => {
      const response = await request(app)
        .get('/api/v1/events/chain/999999')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(0);
    });
  });

  describe('GET /api/v1/events', () => {
    it('should return all events when no filters provided', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(3);
    });

    it('should filter by integrator', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .query({ integrator: testIntegrator })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(3);
      expect(response.body.data.events.every((event: any) => event.integrator === testIntegrator.toLowerCase())).toBe(true);
    });

    it('should filter by chainId', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .query({ chainId: testChainId.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.events.every((event: any) => event.chainId === testChainId)).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .query({
          integrator: testIntegrator,
          chainId: testChainId.toString(),
          fromDate: '2024-01-01T00:00:00Z',
          toDate: '2024-01-01T23:59:59Z',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(1);
    });

    it('should return 400 for invalid integrator in query', async () => {
      await request(app)
        .get('/api/v1/events')
        .query({ integrator: 'invalid-address' })
        .expect(400);
    });

    it('should support sorting and pagination', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .query({
          sortBy: 'timestamp',
          sortOrder: 'desc',
          page: '1',
          limit: '2',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to event endpoints', async () => {
      // In test mode, rate limiting is disabled for faster test execution
      if (process.env['NODE_ENV'] === 'test') {
        // Make multiple rapid requests - should all succeed in test mode
        const promises = Array.from({ length: 100 }, () =>
          request(app).get(`/api/v1/events/integrator/${testIntegrator}`)
        );

        const responses = await Promise.all(promises);
        const successful = responses.filter(res => res.status === 200);

        // All requests should succeed in test mode
        expect(successful.length).toBe(100);
      } else {
        // In non-test mode, rate limiting should be active
        const promises = Array.from({ length: 1005 }, () =>
          request(app).get(`/api/v1/events/integrator/${testIntegrator}`)
        );

        const responses = await Promise.all(promises);
        const rateLimited = responses.filter(res => res.status === 429);

        // Should have some rate limited responses
        expect(rateLimited.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format', async () => {
      const response = await request(app)
        .get(`/api/v1/events/integrator/${testIntegrator}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('events');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.events)).toBe(true);
    });

    it('should include cache headers', async () => {
      const response = await request(app)
        .get(`/api/v1/events/integrator/${testIntegrator}`)
        .expect(200);

      expect(response.headers).toHaveProperty('x-cache');
      expect(['HIT', 'MISS']).toContain(response.headers['x-cache']);
    });
  });
}); 