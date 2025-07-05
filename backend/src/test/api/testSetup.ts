import { app } from '../../index';
import { databaseService } from '../../services/database';
import getRedis from '../../utils/redisClient';

// Mock external services for tests
jest.mock('../../services/blockchain', () => ({
  blockchainService: {
    validateProvider: jest.fn().mockResolvedValue(undefined),
    getProvider: jest.fn().mockReturnValue({
      getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
    }),
  },
}));

jest.mock('../../services/scraper', () => ({
  scraperService: {
    startChain: jest.fn().mockResolvedValue(undefined),
    stopChain: jest.fn().mockResolvedValue(undefined),
    getStatus: jest.fn().mockResolvedValue({
      isRunning: true,
      activeChains: 1,
      totalChains: 1,
    }),
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

// Test setup and teardown
export const setupTestEnvironment = async () => {
  // Ensure database is connected
  if (!databaseService.isConnectedToDatabase()) {
    await databaseService.connect();
  }

  // Clear Redis cache
  try {
    const redis = getRedis();
    await redis.flushall();
  } catch (error) {
    // Redis might not be available in tests, ignore
  }
};

export const teardownTestEnvironment = async () => {
  // Clean up database
  try {
    await databaseService.disconnect();
  } catch (error) {
    // Ignore cleanup errors
  }

  // Close Redis connection
  try {
    const redis = getRedis();
    await redis.quit();
  } catch (error) {
    // Ignore cleanup errors
  }
};

// Export the app for testing
export { app }; 