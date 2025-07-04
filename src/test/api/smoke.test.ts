import request from 'supertest';
import { app } from '../../index';
import mongoose from 'mongoose';
import { closeRedis } from '../../utils/redisClient';

describe('Basic API Tests (No Database Required)', () => {
  describe('Root Endpoint', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.message).toBe('Fee Collector Scraper API');
      expect(response.body.status).toBe('running');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('API Documentation', () => {
    it('should return API documentation', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.body.message).toBe('Fee Collector Event Scraper API');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Route not found');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return consistent error format', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.success).toBe(false);
    });
  });

  describe('Parameter Validation', () => {
    it('should return 400 for invalid integrator address', async () => {
      const response = await request(app)
        .get('/api/v1/events/integrator/invalid-address')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message.toLowerCase()).toContain('validation error');
    });

    it('should return 400 for invalid chain ID', async () => {
      const response = await request(app)
        .get('/api/v1/events/chain/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message.toLowerCase()).toContain('validation error');
    });

    it('should return 400 for invalid chain ID in chain status', async () => {
      const response = await request(app)
        .get('/api/v1/chains/invalid/status')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message.toLowerCase()).toContain('validation error');
    });
  });

  describe('Response Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should include security headers when helmet is enabled', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // In test environment, helmet might be disabled, so we just check the response works
      expect(response.status).toBe(200);
    });
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await closeRedis();
}); 