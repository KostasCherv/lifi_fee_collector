import request from 'supertest';
import { app } from '../../index';
import { databaseService } from '../../services/database';
import { scraperService } from '../../services/scraper';
import { closeRedis } from '../../utils/redisClient';

// Mock services
jest.mock('../../services/database', () => ({
  databaseService: {
    isConnectedToDatabase: jest.fn(),
    getConnectionState: jest.fn(),
  },
}));

jest.mock('../../services/scraper', () => ({
  scraperService: {
    getStatus: jest.fn(),
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

describe('Health Check API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeRedis();
  });

  describe('GET /health', () => {
    it('should return healthy status when all services are healthy', async () => {
      (databaseService.isConnectedToDatabase as jest.Mock).mockReturnValue(true);
      (databaseService.getConnectionState as jest.Mock).mockReturnValue('connected');
      (scraperService.getStatus as jest.Mock).mockResolvedValue({
        isRunning: true,
        activeChains: 2,
        totalChains: 2,
      });

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.database).toBe('connected');
      expect(response.body.scraper.isRunning).toBe(true);
      expect(response.body.scraper.activeChains).toBe(2);
      expect(response.body.scraper.totalChains).toBe(2);
    });

    it('should return unhealthy status when database is disconnected', async () => {
      (databaseService.isConnectedToDatabase as jest.Mock).mockReturnValue(false);
      (databaseService.getConnectionState as jest.Mock).mockReturnValue('disconnected');
      (scraperService.getStatus as jest.Mock).mockResolvedValue({
        isRunning: false,
        activeChains: 0,
        totalChains: 0,
      });

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.database).toBe('disconnected');
    });

    it('should handle scraper service errors gracefully', async () => {
      (databaseService.isConnectedToDatabase as jest.Mock).mockReturnValue(true);
      (databaseService.getConnectionState as jest.Mock).mockReturnValue('connected');
      (scraperService.getStatus as jest.Mock).mockRejectedValue(new Error('Scraper error'));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.database).toBe('connected');
    });
  });

  describe('GET /health/database', () => {
    it('should return connected status when database is healthy', async () => {
      (databaseService.isConnectedToDatabase as jest.Mock).mockReturnValue(true);
      (databaseService.getConnectionState as jest.Mock).mockReturnValue('connected');

      const response = await request(app)
        .get('/health/database')
        .expect(200);

      expect(response.body.status).toBe('connected');
      expect(response.body.state).toBe('connected');
    });

    it('should return disconnected status when database is unhealthy', async () => {
      (databaseService.isConnectedToDatabase as jest.Mock).mockReturnValue(false);
      (databaseService.getConnectionState as jest.Mock).mockReturnValue('disconnected');

      const response = await request(app)
        .get('/health/database')
        .expect(503);

      expect(response.body.status).toBe('disconnected');
      expect(response.body.state).toBe('disconnected');
    });
  });

  describe('GET /health/scraper', () => {
    it('should return running status when scraper is healthy', async () => {
      (scraperService.getStatus as jest.Mock).mockResolvedValue({
        isRunning: true,
        activeChains: 2,
        totalChains: 2,
        chainStatuses: [
          { chainId: 1, name: 'Ethereum', status: 'running', lastRunAt: new Date(), errorCount: 0 },
          { chainId: 137, name: 'Polygon', status: 'running', lastRunAt: new Date(), errorCount: 0 },
        ],
      });

      const response = await request(app)
        .get('/health/scraper')
        .expect(200);

      expect(response.body.status).toBe('running');
      expect(response.body.isRunning).toBe(true);
      expect(response.body.activeChains).toBe(2);
      expect(response.body.totalChains).toBe(2);
    });

    it('should return stopped status when scraper is not running', async () => {
      (scraperService.getStatus as jest.Mock).mockResolvedValue({
        isRunning: false,
        activeChains: 0,
        totalChains: 0,
        chainStatuses: [],
      });

      const response = await request(app)
        .get('/health/scraper')
        .expect(200);

      expect(response.body.status).toBe('stopped');
      expect(response.body.isRunning).toBe(false);
      expect(response.body.activeChains).toBe(0);
    });

    it('should return error status when scraper service fails', async () => {
      (scraperService.getStatus as jest.Mock).mockRejectedValue(new Error('Scraper service error'));

      const response = await request(app)
        .get('/health/scraper')
        .expect(503);

      expect(response.body.status).toBe('error');
      expect(response.body.error).toBe('Scraper service error');
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      (databaseService.isConnectedToDatabase as jest.Mock).mockReturnValue(true);
      (databaseService.getConnectionState as jest.Mock).mockReturnValue('connected');

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.message).toBe('Fee Collector Scraper API');
      expect(response.body.status).toBe('running');
      expect(response.body.environment).toBeDefined();
      expect(response.body.database).toBe('connected');
    });
  });

  describe('Response Format', () => {
    it('should include timestamp in all health responses', async () => {
      (databaseService.isConnectedToDatabase as jest.Mock).mockReturnValue(true);
      (databaseService.getConnectionState as jest.Mock).mockReturnValue('connected');
      (scraperService.getStatus as jest.Mock).mockResolvedValue({
        isRunning: true,
        activeChains: 1,
        totalChains: 1,
      });

      const healthResponse = await request(app).get('/health');
      const dbResponse = await request(app).get('/health/database');
      const scraperResponse = await request(app).get('/health/scraper');

      expect(healthResponse.body).toHaveProperty('timestamp');
      expect(dbResponse.body).toHaveProperty('timestamp');
      expect(scraperResponse.body).toHaveProperty('timestamp');

      // Timestamps should be valid ISO strings
      expect(new Date(healthResponse.body.timestamp).toISOString()).toBe(healthResponse.body.timestamp);
      expect(new Date(dbResponse.body.timestamp).toISOString()).toBe(dbResponse.body.timestamp);
      expect(new Date(scraperResponse.body.timestamp).toISOString()).toBe(scraperResponse.body.timestamp);
    });

    it('should return consistent error format for health endpoints', async () => {
      (scraperService.getStatus as jest.Mock).mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/health/scraper')
        .expect(503);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('error');
      expect(response.body.status).toBe('error');
    });
  });

  describe('API Documentation Endpoint', () => {
    it('should return API documentation at /api/v1', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.body.message).toBe('Fee Collector Event Scraper API');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.events).toBeDefined();
      expect(response.body.endpoints.chains).toBeDefined();
      expect(response.body.endpoints.health).toBeDefined();
    });
  });
}); 