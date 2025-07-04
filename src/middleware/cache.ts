import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import getRedis from '@/utils/redisClient';
import config from '@/config';

function generateCacheKey(req: Request): string {
  // Use method, originalUrl, query, and params for cache key
  const keyData = {
    method: req.method,
    url: req.originalUrl,
    params: req.params,
    query: req.query,
  };
  return 'api-cache:' + crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
}

export function redisCacheMiddleware(ttlSeconds: number = config.redis.cacheTtl) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const key = generateCacheKey(req);
    try {
      const redis = getRedis();
      const cached = await redis.get(key);
      if (cached) {
        if (!res.headersSent) {
          res.setHeader('X-Cache', 'HIT');
        }
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      // Log but do not block request
      // eslint-disable-next-line no-console
      console.warn('Redis cache read error:', err);
    }

    // Cache miss: override res.json
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      (async () => {
        try {
          const redis = getRedis();
          await redis.set(key, JSON.stringify(body), 'EX', ttlSeconds);
          if (!res.headersSent) {
            res.setHeader('X-Cache', 'MISS');
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Redis cache write error:', err);
        }
      })();
      return originalJson(body);
    };

    next();
  };
}

// Utility to clear all API cache (useful after POST/PUT/DELETE)
export async function clearApiCache() {
  const redis = getRedis();
  const keys = await redis.keys('api-cache:*');
  if (keys.length > 0) {
    await redis.del(keys);
  }
} 