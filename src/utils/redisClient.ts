import Redis from 'ioredis';
import config from '@/config';
import { logger } from './logger';

let redisInstance: Redis | null = null;

const getRedis = (): Redis => {
  if (!redisInstance) {
    redisInstance = new Redis(config.redis.url);
    
    redisInstance.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redisInstance.on('error', (err) => {
      logger.error('Redis error:', err);
    });
  }
  return redisInstance;
};

// Export a function to close the Redis connection
export const closeRedis = async (): Promise<void> => {
  if (redisInstance && redisInstance.status === 'ready') {
    await redisInstance.quit();
    redisInstance = null;
    logger.info('Redis connection closed');
  }
};

// Export the getter function instead of calling it immediately
export default getRedis; 