import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import config from '@/config';
import { logger } from '@/utils/logger';

export const createRateLimiter = (
  windowMs: number = config.api.rateLimitWindowMs,
  maxRequests: number = config.api.rateLimitMaxRequests
) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      error: {
        message: `Too many requests from this IP, please try again after ${Math.ceil(windowMs / 1000)} seconds`,
      },
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: _req.ip,
        url: _req.url,
        method: _req.method,
        userAgent: _req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      });
      
      res.status(429).json({
        success: false,
        error: {
          message: `Too many requests from this IP, please try again after ${Math.ceil(windowMs / 1000)} seconds`,
        },
        timestamp: new Date().toISOString(),
      });
    },
  });
};

// Test-specific rate limiter (much more lenient)
export const createTestRateLimiter = () => {
  return rateLimit({
    windowMs: 1000, // 1 second
    max: 10000, // 10000 requests per second (increased from 1000)
    message: {
      success: false,
      error: {
        message: 'Test rate limit exceeded',
      },
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          message: 'Test rate limit exceeded',
        },
        timestamp: new Date().toISOString(),
      });
    },
  });
};

// Specific rate limiters for different endpoints
export const apiRateLimiter = process.env['NODE_ENV'] === 'test' 
  ? createTestRateLimiter() 
  : createRateLimiter();

export const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes
export const chainManagementRateLimiter = process.env['NODE_ENV'] === 'test'
  ? createTestRateLimiter()
  : createRateLimiter(60 * 1000, 10); // 10 requests per minute 