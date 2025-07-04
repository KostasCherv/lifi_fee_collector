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
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
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

// Specific rate limiters for different endpoints
export const apiRateLimiter = createRateLimiter();
export const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes
export const chainManagementRateLimiter = createRateLimiter(60 * 1000, 10); // 10 requests per minute 