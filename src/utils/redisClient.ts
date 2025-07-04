import Redis from 'ioredis';
import config from '@/config';
import { logger } from './logger';

const redis = new Redis(config.redis.url);

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.error('Redis error:', err);
});

export default redis; 