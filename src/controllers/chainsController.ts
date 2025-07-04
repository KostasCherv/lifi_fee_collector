import { Request, Response, NextFunction } from 'express';
import { ChainConfigurationModel } from '@/models/ChainConfiguration';
import { ScraperStateModel } from '@/models/ScraperState';
import { scraperService } from '@/services/scraper';
import { blockchainService } from '@/services/blockchain';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import Joi from 'joi';
import { clearApiCache } from '@/middleware/cache';

export interface ChainConfigRequest {
  chainId: number;
  name: string;
  rpcUrl: string;
  contractAddress: string;
  startingBlock?: number;
  scanInterval?: number;
  maxBlockRange?: number;
  retryAttempts?: number;
}

export interface ChainStatusResponse {
  success: boolean;
  data: {
    chains: Array<{
      chainId: number;
      name: string;
      isEnabled: boolean;
      workerStatus: string;
      lastWorkerStart?: string | undefined;
      lastWorkerError?: string | undefined;
      lastProcessedBlock?: number | undefined;
      errorCount: number;
    }>;
    summary: {
      totalChains: number;
      activeChains: number;
      runningWorkers: number;
      errorWorkers: number;
    };
  };
  timestamp: string;
}

// Validation schema for chain configuration
export const chainConfigSchema = Joi.object({
  chainId: Joi.number().integer().positive().required(),
  name: Joi.string().min(1).max(50).required(),
  rpcUrl: Joi.string().uri().required(),
  contractAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  startingBlock: Joi.number().integer().positive().optional(),
  scanInterval: Joi.number().integer().min(5000).max(300000).optional(),
  maxBlockRange: Joi.number().integer().min(100).max(10000).optional(),
  retryAttempts: Joi.number().integer().min(1).max(10).optional(),
});

// Validation schema for chain configuration updates (all fields optional)
export const chainUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(50).optional(),
  rpcUrl: Joi.string().uri().optional(),
  contractAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  startingBlock: Joi.number().integer().positive().optional(),
  scanInterval: Joi.number().integer().min(5000).max(300000).optional(),
  maxBlockRange: Joi.number().integer().min(100).max(10000).optional(),
  retryAttempts: Joi.number().integer().min(1).max(10).optional(),
});

export const getChainsStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get all chain configurations
    const chainConfigs = await ChainConfigurationModel.find().lean();
    
    // Get scraper states for all chains
    const scraperStates = await ScraperStateModel.find().lean();
    
    // Create a map of scraper states by chainId
    const scraperStateMap = new Map(
      scraperStates.map(state => [state.chainId, state])
    );

    // Build response data
    const chains = chainConfigs.map(config => {
      const state = scraperStateMap.get(config.chainId);
      return {
        chainId: config.chainId,
        name: config.name,
        isEnabled: config.isEnabled,
        workerStatus: config.workerStatus,
        lastWorkerStart: config.lastWorkerStart?.toISOString(),
        lastWorkerError: config.lastWorkerError,
        lastProcessedBlock: state?.lastProcessedBlock,
        errorCount: state?.errorCount || 0,
      };
    });

    // Calculate summary
    const summary = {
      totalChains: chains.length,
      activeChains: chains.filter(c => c.isEnabled).length,
      runningWorkers: chains.filter(c => c.workerStatus === 'running').length,
      errorWorkers: chains.filter(c => c.workerStatus === 'error').length,
    };

    const response: ChainStatusResponse = {
      success: true,
      data: {
        chains,
        summary,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info('Chain status queried', {
      totalChains: summary.totalChains,
      activeChains: summary.activeChains,
      runningWorkers: summary.runningWorkers,
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getChainStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { chainId } = req.params;
    
    if (!chainId) {
      throw new AppError('Chain ID is required', 400);
    }
    
    const chainIdNum = parseInt(chainId, 10);
    if (isNaN(chainIdNum)) {
      throw new AppError('Invalid chain ID', 400);
    }

    // Get chain configuration
    const chainConfig = await ChainConfigurationModel.findOne({ chainId: chainIdNum }).lean();
    if (!chainConfig) {
      throw new AppError('Chain configuration not found', 404);
    }

    // Get scraper state
    const scraperState = await ScraperStateModel.findOne({ chainId: chainIdNum }).lean();

    const response = {
      success: true,
      data: {
        chainId: chainConfig.chainId,
        name: chainConfig.name,
        isEnabled: chainConfig.isEnabled,
        workerStatus: chainConfig.workerStatus,
        lastWorkerStart: chainConfig.lastWorkerStart?.toISOString(),
        lastWorkerError: chainConfig.lastWorkerError,
        lastProcessedBlock: scraperState?.lastProcessedBlock,
        errorCount: scraperState?.errorCount || 0,
        configuration: {
          rpcUrl: chainConfig.rpcUrl,
          contractAddress: chainConfig.contractAddress,
          startingBlock: chainConfig.startingBlock,
          scanInterval: chainConfig.scanInterval,
          maxBlockRange: chainConfig.maxBlockRange,
          retryAttempts: chainConfig.retryAttempts,
        },
      },
      timestamp: new Date().toISOString(),
    };

    logger.info('Chain status queried', {
      chainId: chainIdNum,
      workerStatus: chainConfig.workerStatus,
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const startChain = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const chainConfig = req.body as ChainConfigRequest;

    // Validate input
    const { error, value } = chainConfigSchema.validate(chainConfig);
    if (error) {
      throw new AppError(`Validation error: ${error.details.map(d => d.message).join(', ')}`, 400);
    }

    // Check if chain already exists
    const existingChain = await ChainConfigurationModel.findOne({ chainId: value.chainId });
    if (existingChain) {
      throw new AppError(`Chain with ID ${value.chainId} already exists`, 409);
    }

    // Validate RPC connectivity
    try {
      await blockchainService.validateProvider(value.rpcUrl);
    } catch (error) {
      throw new AppError(`RPC validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 400);
    }

    // Create chain configuration
    const newChainConfig = new ChainConfigurationModel({
      ...value,
      isEnabled: true,
      workerStatus: 'starting',
      lastWorkerStart: new Date(),
    });

    await newChainConfig.save();

    // Initialize scraper state
    const scraperState = new ScraperStateModel({
      chainId: value.chainId,
      lastProcessedBlock: value.startingBlock || 70000000,
      isActive: true,
      lastRunAt: new Date(),
      errorCount: 0,
    });

    await scraperState.save();

    // Start the chain worker
    await scraperService.startChain(value.chainId);

    logger.info('Chain started successfully', {
      chainId: value.chainId,
      name: value.name,
    });

    await clearApiCache();

    res.status(201).json({
      success: true,
      message: 'Chain worker started successfully',
      data: {
        chainId: value.chainId,
        workerStatus: 'running',
        lastWorkerStart: newChainConfig.lastWorkerStart?.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const stopChain = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { chainId } = req.params;
    
    if (!chainId) {
      throw new AppError('Chain ID is required', 400);
    }
    
    const chainIdNum = parseInt(chainId, 10);
    if (isNaN(chainIdNum)) {
      throw new AppError('Invalid chain ID', 400);
    }

    // Check if chain exists
    const chainConfig = await ChainConfigurationModel.findOne({ chainId: chainIdNum });
    if (!chainConfig) {
      throw new AppError('Chain configuration not found', 404);
    }

    // Stop the chain worker
    await scraperService.stopChain(chainIdNum);

    // Update configuration
    chainConfig.isEnabled = false;
    chainConfig.workerStatus = 'stopped';
    await chainConfig.save();

    // Update scraper state
    await ScraperStateModel.findOneAndUpdate(
      { chainId: chainIdNum },
      { isActive: false },
      { upsert: true }
    );

    logger.info('Chain stopped successfully', {
      chainId: chainIdNum,
      name: chainConfig.name,
    });

    await clearApiCache();

    res.json({
      success: true,
      message: 'Chain worker stopped successfully',
      data: {
        chainId: chainIdNum,
        workerStatus: 'stopped',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateChain = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { chainId } = req.params;
    const updateData = req.body as Partial<ChainConfigRequest>;
    
    if (!chainId) {
      throw new AppError('Chain ID is required', 400);
    }
    
    const chainIdNum = parseInt(chainId, 10);
    if (isNaN(chainIdNum)) {
      throw new AppError('Invalid chain ID', 400);
    }

    // Check if chain exists
    const chainConfig = await ChainConfigurationModel.findOne({ chainId: chainIdNum });
    if (!chainConfig) {
      throw new AppError('Chain configuration not found', 404);
    }

    // Validate update data using the update schema
    const { error, value } = chainUpdateSchema.validate(updateData);
    if (error) {
      throw new AppError(`Validation error: ${error.details.map(d => d.message).join(', ')}`, 400);
    }

    // If RPC URL is being updated, validate it
    if (value.rpcUrl && value.rpcUrl !== chainConfig.rpcUrl) {
      try {
        await blockchainService.validateProvider(value.rpcUrl);
      } catch (error) {
        throw new AppError(`RPC validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 400);
      }
    }

    // Update configuration
    Object.assign(chainConfig, value);
    await chainConfig.save();

    logger.info('Chain configuration updated', {
      chainId: chainIdNum,
      updatedFields: Object.keys(value),
    });

    await clearApiCache();

    res.json({
      success: true,
      message: 'Chain configuration updated successfully',
      data: {
        chainId: chainIdNum,
        name: chainConfig.name,
        workerStatus: chainConfig.workerStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteChain = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { chainId } = req.params;
    
    if (!chainId) {
      throw new AppError('Chain ID is required', 400);
    }
    
    const chainIdNum = parseInt(chainId, 10);
    if (isNaN(chainIdNum)) {
      throw new AppError('Invalid chain ID', 400);
    }

    // Check if chain exists
    const chainConfig = await ChainConfigurationModel.findOne({ chainId: chainIdNum });
    if (!chainConfig) {
      throw new AppError('Chain configuration not found', 404);
    }

    // Stop the chain worker if running
    if (chainConfig.workerStatus === 'running') {
      await scraperService.stopChain(chainIdNum);
    }

    // Delete chain configuration and scraper state
    await Promise.all([
      ChainConfigurationModel.deleteOne({ chainId: chainIdNum }),
      ScraperStateModel.deleteOne({ chainId: chainIdNum }),
    ]);

    logger.info('Chain deleted successfully', {
      chainId: chainIdNum,
      name: chainConfig.name,
    });

    await clearApiCache();

    res.json({
      success: true,
      message: 'Chain configuration deleted successfully',
      data: {
        chainId: chainIdNum,
        name: chainConfig.name,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}; 