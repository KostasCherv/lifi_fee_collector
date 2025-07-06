import { eventProcessor } from '../services/eventProcessor';
import { blockchainService } from '../services/blockchain';
import { ChainConfigurationModel, FeeCollectedEventModel, ScraperStateModel } from '../models';

jest.mock('../services/blockchain');
jest.mock('../models');

const mockChainId = 137;
const mockFromBlock = 100;
const mockToBlock = 110;
const mockEvents = [
  {
    chainId: mockChainId,
    blockNumber: 101,
    blockHash: '0xHash',
    transactionHash: '0xTx',
    logIndex: 0,
    token: '0xToken',
    integrator: '0xIntegrator',
    integratorFee: '1000',
    lifiFee: '500',
    timestamp: new Date(),
  },
];

describe('EventProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processBlockRange', () => {
    it('should process and store events successfully', async () => {
      (blockchainService.loadFeeCollectorEvents as jest.Mock).mockResolvedValue(mockEvents);
      (blockchainService.parseFeeCollectorEvents as jest.Mock).mockResolvedValue(mockEvents);
      (FeeCollectedEventModel.find as jest.Mock).mockResolvedValue([]);
      (FeeCollectedEventModel.insertMany as jest.Mock).mockResolvedValue(mockEvents);
      (ScraperStateModel.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      const result = await eventProcessor.processBlockRange(mockChainId, mockFromBlock, mockToBlock);
      expect(result.success).toBe(true);
      expect(result.processedEvents).toBe(1);
    });

    it('should handle no events found', async () => {
      (blockchainService.loadFeeCollectorEvents as jest.Mock).mockResolvedValue([]);

      const result = await eventProcessor.processBlockRange(mockChainId, mockFromBlock, mockToBlock);
      expect(result.success).toBe(true);
      expect(result.processedEvents).toBe(0);
    });

    it('should handle all events as duplicates', async () => {
      (blockchainService.loadFeeCollectorEvents as jest.Mock).mockResolvedValue(mockEvents);
      (blockchainService.parseFeeCollectorEvents as jest.Mock).mockResolvedValue(mockEvents);
      (FeeCollectedEventModel.find as jest.Mock).mockResolvedValue(mockEvents);

      const result = await eventProcessor.processBlockRange(mockChainId, mockFromBlock, mockToBlock);
      expect(result.success).toBe(true);
      expect(result.processedEvents).toBe(0);
    });

    it('should handle errors in processing', async () => {
      (blockchainService.loadFeeCollectorEvents as jest.Mock).mockRejectedValue(new Error('fail'));
      const result = await eventProcessor.processBlockRange(mockChainId, mockFromBlock, mockToBlock);
      expect(result.success).toBe(false);
      expect(result.error).toBe('fail');
    });
  });

  describe('calculateBlockRange', () => {
    it('should calculate next block range', async () => {
      (ScraperStateModel.findOne as jest.Mock).mockResolvedValue({ lastProcessedBlock: 70000000 });
      (blockchainService.getLatestBlockNumber as jest.Mock).mockResolvedValue(70001000);
      (ChainConfigurationModel.findOne as jest.Mock).mockResolvedValue({ maxBlockRange: 1000 });
      const range = await eventProcessor.calculateBlockRange(mockChainId);
      expect(range).toMatchObject({ fromBlock: 70000001, toBlock: 70001000 });
    });

    it('should return null if no new blocks', async () => {
      (ScraperStateModel.findOne as jest.Mock).mockResolvedValue({ lastProcessedBlock: 70001000 });
      (blockchainService.getLatestBlockNumber as jest.Mock).mockResolvedValue(70001000);
      (ChainConfigurationModel.findOne as jest.Mock).mockResolvedValue({ maxBlockRange: 1000 });
      const range = await eventProcessor.calculateBlockRange(mockChainId);
      expect(range).toBeNull();
    });

    it('should handle errors in block range calculation', async () => {
      (ScraperStateModel.findOne as jest.Mock).mockRejectedValue(new Error('fail'));
      await expect(eventProcessor.calculateBlockRange(mockChainId)).rejects.toThrow('fail');
    });
  });

  describe('getProcessingStats', () => {
    it('should return processing stats', async () => {
      (FeeCollectedEventModel.countDocuments as jest.Mock).mockResolvedValue(5);
      (ScraperStateModel.findOne as jest.Mock).mockResolvedValue({ lastProcessedBlock: 123, lastRunAt: new Date('2022-01-01'), errorCount: 2 });

      const stats = await eventProcessor.getProcessingStats(mockChainId);
      expect(stats.totalEvents).toBe(5);
      expect(stats.lastProcessedBlock).toBe(123);
      expect(stats.lastRunAt).toEqual(new Date('2022-01-01'));
      expect(stats.errorCount).toBe(2);
    });

    it('should handle missing scraper state', async () => {
      (FeeCollectedEventModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (ScraperStateModel.findOne as jest.Mock).mockResolvedValue(null);

      const stats = await eventProcessor.getProcessingStats(mockChainId);
      expect(stats.lastProcessedBlock).toBe(0);
      expect(stats.lastRunAt).toBeNull();
      expect(stats.errorCount).toBe(0);
    });

    it('should handle errors in stats', async () => {
      (FeeCollectedEventModel.countDocuments as jest.Mock).mockRejectedValue(new Error('fail'));
      await expect(eventProcessor.getProcessingStats(mockChainId)).rejects.toThrow('fail');
    });
  });
}); 