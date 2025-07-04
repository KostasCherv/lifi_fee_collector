import { databaseService } from '../services/database';
import { FeeCollectedEventModel, ScraperStateModel, ChainConfigurationModel } from '../models';

describe('Database Tests', () => {
  beforeAll(async () => {
    await databaseService.connect();
  });

  afterAll(async () => {
    await databaseService.disconnect();
  });

  test('should connect to database', () => {
    expect(databaseService.isConnectedToDatabase()).toBe(true);
  });

  test('should create FeeCollectedEvent model', () => {
    expect(FeeCollectedEventModel).toBeDefined();
  });

  test('should create ScraperState model', () => {
    expect(ScraperStateModel).toBeDefined();
  });

  test('should create ChainConfiguration model', () => {
    expect(ChainConfigurationModel).toBeDefined();
  });

  test('should get connection state', () => {
    const state = databaseService.getConnectionState();
    expect(['connected', 'connecting', 'disconnected', 'disconnecting']).toContain(state);
  });
}); 