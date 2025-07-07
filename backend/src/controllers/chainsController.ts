import { Request, Response, NextFunction } from 'express';
import { ChainConfigurationModel } from '@/models/ChainConfiguration';
import { ScraperStateModel } from '@/models/ScraperState';
import { scraperService } from '@/services/scraper';
import { blockchainService } from '@/services/blockchain';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import Joi from 'joi';
import { clearApiCache } from '@/middleware/cache';

/**
 * @swagger
 * /api/v1/chains/status:
 *   get:
 *     summary: Get status of all chains
 *     description: Retrieve the status and health information for all configured chains
 *     tags: [Chains]
 *     responses:
 *       200:
 *         description: Chain status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChainsStatusResponse'
 *             example:
 *               success: true
 *               data:
 *                 chains:
 *                   - chainId: 137
 *                     name: 'Polygon'
 *                     isEnabled: true
 *                     workerStatus: 'running'
 *                     lastWorkerStart: '2024-01-15T10:30:00Z'
 *                     lastWorkerError: null
 *                     lastProcessedBlock: 70000001
 *                     errorCount: 0
 *                     eventCount: 150
 *                 summary:
 *                   totalChains: 1
 *                   activeChains: 1
 *                   totalEvents: 150
 *               timestamp: '2024-01-15T10:30:00Z'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/v1/chains/{chainId}/status:
 *   get:
 *     summary: Get status of specific chain
 *     description: Retrieve detailed status and configuration for a specific chain
 *     tags: [Chains]
 *     parameters:
 *       - $ref: '#/components/parameters/chainIdParam'
 *     responses:
 *       200:
 *         description: Chain status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     chainId:
 *                       type: integer
 *                       example: 137
 *                     name:
 *                       type: string
 *                       example: 'Polygon'
 *                     isEnabled:
 *                       type: boolean
 *                       example: true
 *                     workerStatus:
 *                       type: string
 *                       enum: ['running', 'stopped', 'error', 'starting']
 *                       example: 'running'
 *                     lastWorkerStart:
 *                       type: string
 *                       format: date-time
 *                       example: '2024-01-15T10:30:00Z'
 *                     lastWorkerError:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     lastProcessedBlock:
 *                       type: integer
 *                       example: 70000001
 *                     errorCount:
 *                       type: integer
 *                       example: 0
 *                     configuration:
 *                       type: object
 *                       properties:
 *                         rpcUrl:
 *                           type: string
 *                           example: 'https://polygon-rpc.com'
 *                         contractAddress:
 *                           type: string
 *                           example: '0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9'
 *                         startingBlock:
 *                           type: integer
 *                           example: 70000000
 *                         scanInterval:
 *                           type: integer
 *                           example: 30000
 *                         maxBlockRange:
 *                           type: integer
 *                           example: 1000
 *                         retryAttempts:
 *                           type: integer
 *                           example: 3
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2024-01-15T10:30:00Z'
 *       400:
 *         description: Invalid chain ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Chain not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/v1/chains:
 *   post:
 *     summary: Add and start a new chain worker
 *     description: Add a new chain configuration and start the event scraper worker for it.
 *     tags: [Chains]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chainId
 *               - name
 *               - rpcUrl
 *               - contractAddress
 *             properties:
 *               chainId:
 *                 type: integer
 *                 description: EVM chain ID
 *                 example: 137
 *               name:
 *                 type: string
 *                 description: Human-readable chain name
 *                 example: Polygon
 *               rpcUrl:
 *                 type: string
 *                 description: RPC endpoint URL
 *                 example: https://polygon-rpc.com
 *               contractAddress:
 *                 type: string
 *                 description: FeeCollector contract address
 *                 pattern: '^0x[a-fA-F0-9]{40}$'
 *                 example: 0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9
 *               startingBlock:
 *                 type: integer
 *                 description: Starting block for event scanning
 *                 example: 70000000
 *               scanInterval:
 *                 type: integer
 *                 description: Scan interval in milliseconds (5000-300000)
 *                 example: 30000
 *                 minimum: 5000
 *                 maximum: 300000
 *               maxBlockRange:
 *                 type: integer
 *                 description: Maximum blocks to scan per iteration (100-10000)
 *                 example: 1000
 *                 minimum: 100
 *                 maximum: 10000
 *               retryAttempts:
 *                 type: integer
 *                 description: Number of retry attempts for failed operations (1-10)
 *                 example: 3
 *                 minimum: 1
 *                 maximum: 10
 *           example:
 *             chainId: 137
 *             name: Polygon
 *             rpcUrl: https://polygon-rpc.com
 *             contractAddress: 0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9
 *             startingBlock: 70000000
 *             scanInterval: 30000
 *             maxBlockRange: 1000
 *             retryAttempts: 3
 *     responses:
 *       201:
 *         description: Chain worker started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Chain worker started successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     chainId:
 *                       type: integer
 *                       example: 137
 *                     workerStatus:
 *                       type: string
 *                       example: running
 *                     lastWorkerStart:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Chain already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/v1/chains/{chainId}/start:
 *   put:
 *     summary: Start a chain worker
 *     description: Start the event scraper worker for a specific chain.
 *     tags: [Chains]
 *     parameters:
 *       - $ref: '#/components/parameters/chainIdParam'
 *     responses:
 *       200:
 *         description: Chain worker started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Chain worker started successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     chainId:
 *                       type: integer
 *                       example: 137
 *                     workerStatus:
 *                       type: string
 *                       example: running
 *                     lastWorkerStart:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Chain not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/v1/chains/{chainId}/stop:
 *   put:
 *     summary: Stop a chain worker
 *     description: Stop the event scraper worker for a specific chain.
 *     tags: [Chains]
 *     parameters:
 *       - $ref: '#/components/parameters/chainIdParam'
 *     responses:
 *       200:
 *         description: Chain worker stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Chain worker stopped successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     chainId:
 *                       type: integer
 *                       example: 137
 *                     workerStatus:
 *                       type: string
 *                       example: stopped
 *       404:
 *         description: Chain not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/v1/chains/{chainId}/update:
 *   put:
 *     summary: Update chain configuration
 *     description: Update the configuration for a specific chain.
 *     tags: [Chains]
 *     parameters:
 *       - $ref: '#/components/parameters/chainIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChainConfiguration'
 *     responses:
 *       200:
 *         description: Chain configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Chain configuration updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     chainId:
 *                       type: integer
 *                       example: 137
 *                     name:
 *                       type: string
 *                       example: Polygon
 *                     workerStatus:
 *                       type: string
 *                       example: running
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Chain not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/v1/chains/{chainId}:
 *   delete:
 *     summary: Delete a chain configuration
 *     description: Delete a chain configuration and its scraper state.
 *     tags: [Chains]
 *     parameters:
 *       - $ref: '#/components/parameters/chainIdParam'
 *     responses:
 *       200:
 *         description: Chain configuration deleted successfullyworkerStatus
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Chain configuration deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     chainId:
 *                       type: integer
 *                       example: 137
 *                     name:
 *                       type: string
 *                       example: Polygon
 *       404:
 *         description: Chain not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

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

export const addChain = async (
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

    // Update blockchain provider
    await blockchainService.addProvider(value.chainId, value.rpcUrl, value.contractAddress);

    // Initialize scraper state
    const scraperState = new ScraperStateModel({
      chainId: value.chainId,
      lastProcessedBlock: value.startingBlock || 70000000,
      isActive: true,
      lastRunAt: new Date(),
      workerStatus: 'running',
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

export const startChain = async (
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

    // Start the chain worker
    await scraperService.startChain(chainIdNum);

    // Update configuration
    chainConfig.workerStatus = 'running';
    chainConfig.isEnabled = true;
    chainConfig.lastWorkerStart = new Date();
    await chainConfig.save();

    logger.info('Chain started successfully', {
      chainId: chainIdNum,
      name: chainConfig.name,
    });

    // Update scraper state
    await ScraperStateModel.findOneAndUpdate(
      { chainId: chainIdNum },
      { isActive: true, workerStatus: 'running' },
      { upsert: true }
    );

    await clearApiCache();

    res.json({
      success: true,
      message: 'Chain worker started successfully',
      data: {
        chainId: chainIdNum,
        workerStatus: 'running',
        lastWorkerStart: chainConfig.lastWorkerStart?.toISOString(),
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
      { isActive: false, workerStatus: 'stopped' },
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

    // Update blockchain provider if RPC URL or contract address changed
    if (value.rpcUrl || value.contractAddress) {
      const rpcUrl = value.rpcUrl || chainConfig.rpcUrl;
      const contractAddress = value.contractAddress || chainConfig.contractAddress;
      await blockchainService.addProvider(chainIdNum, rpcUrl, contractAddress);
    }

    // Update the interval of the scraper if scanInterval changed
    if (value.scanInterval) {
      await scraperService.updateChainInterval(chainIdNum, value.scanInterval);
    }

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