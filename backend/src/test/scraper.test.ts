import { scraperService } from '../services/scraper';
import { databaseService } from '../services/database';
import { blockchainService } from '../services/blockchain';
import { eventProcessor } from '../services/eventProcessor';
import { ChainConfigurationModel, ScraperStateModel } from '../models';
import { logger } from '../utils/logger';

jest.mock('../services/database');
jest.mock('../services/blockchain');
jest.mock('../services/eventProcessor');
jest.mock('../models');

const mockChainConfig = {
  chainId: 1,
  name: 'TestChain',
  rpcUrl: 'https://test',
  contractAddress: '0xContract',
  scanInterval: 1000,
  isEnabled: true,
};

describe('scraperService', () => {
  beforeEach(() => {
    // Clear all intervals and state
    scraperService['isRunning'] = false;
    scraperService['intervals'].clear();
    jest.clearAllMocks();
  });

  describe('start/stop', () => {
    it('should start and stop successfully', async () => {
      (databaseService.isConnectedToDatabase as jest.Mock).mockReturnValue(true);
      (blockchainService.initializeProviders as jest.Mock).mockResolvedValue(undefined);
      (ChainConfigurationModel.find as jest.Mock).mockResolvedValue([mockChainConfig]);
      (ChainConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockChainConfig);
      (blockchainService.addProvider as jest.Mock).mockResolvedValue(undefined);
      (eventProcessor.calculateBlockRange as jest.Mock).mockResolvedValue(null);
      (eventProcessor.processBlockRange as jest.Mock).mockResolvedValue({ success: true, processedEvents: 1 });
      (ChainConfigurationModel.findOneAndUpdate as jest.Mock).mockResolvedValue({});
      (scraperService as any).updateAllScraperStates = jest.fn().mockResolvedValue(undefined);

      await scraperService.start();
      expect(scraperService['isRunning']).toBe(true);
      await scraperService.stop();
      expect(scraperService['isRunning']).toBe(false);
    });

    it('should not start if already running', async () => {
      scraperService['isRunning'] = true;
      const logSpy = jest.spyOn(logger, 'warn').mockImplementation();
      await scraperService.start();
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should not stop if not running', async () => {
      scraperService['isRunning'] = false;
      const logSpy = jest.spyOn(logger, 'warn').mockImplementation();
      await scraperService.stop();
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('startChain/stopChain', () => {
    beforeEach(() => {
      (ChainConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockChainConfig);
      (blockchainService.addProvider as jest.Mock).mockResolvedValue(undefined);
      (eventProcessor.calculateBlockRange as jest.Mock).mockResolvedValue(null);
      (eventProcessor.processBlockRange as jest.Mock).mockResolvedValue({ success: true, processedEvents: 1 });
      (ChainConfigurationModel.findOneAndUpdate as jest.Mock).mockResolvedValue({});
    });

    it('should start a chain successfully', async () => {
      await scraperService.startChain(1);
      expect(scraperService['intervals'].has(1)).toBe(true);
    });

    it('should not start a chain if already running', async () => {
      scraperService['intervals'].set(1, setInterval(() => {}, 1000));
      const logSpy = jest.spyOn(logger, 'warn').mockImplementation();
      await scraperService.startChain(1);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should handle missing chain config', async () => {
      (ChainConfigurationModel.findOne as jest.Mock).mockResolvedValue(null);
      await expect(scraperService.startChain(2)).rejects.toThrow('Chain 2 not found or not enabled');
    });

    it('should stop a chain successfully', async () => {
      scraperService['intervals'].set(1, setInterval(() => {}, 1000));
      (ChainConfigurationModel.findOneAndUpdate as jest.Mock).mockResolvedValue({});
      await scraperService.stopChain(1);
      expect(scraperService['intervals'].has(1)).toBe(false);
    });

    it('should warn if stopping a chain that is not running', async () => {
      const logSpy = jest.spyOn(logger, 'warn').mockImplementation();
      await scraperService.stopChain(2);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('getStatus', () => {
    it('should return status info', async () => {
      scraperService['isRunning'] = true;
      scraperService['intervals'].set(1, setInterval(() => {}, 1000));
      (ChainConfigurationModel.find as jest.Mock).mockResolvedValue([mockChainConfig]);
      (ScraperStateModel.findOne as jest.Mock).mockResolvedValue({ lastRunAt: new Date(), errorCount: 0 });

      const status = await scraperService.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.activeChains).toBe(1);
      expect(status.totalChains).toBe(1);
      expect(status.chainStatuses[0]?.chainId).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle errors in start', async () => {
      (databaseService.isConnectedToDatabase as jest.Mock).mockReturnValue(true);
      (blockchainService.initializeProviders as jest.Mock).mockRejectedValue(new Error('fail'));
      await expect(scraperService.start()).rejects.toThrow('fail');
    });

    it('should handle errors in startChain', async () => {
      (ChainConfigurationModel.findOne as jest.Mock).mockResolvedValue(mockChainConfig);
      (blockchainService.addProvider as jest.Mock).mockRejectedValue(new Error('fail'));
      await expect(scraperService.startChain(1)).rejects.toThrow('fail');
    });
  });
}); 