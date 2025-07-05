import { Request, Response, NextFunction } from 'express';
import { FeeCollectedEventModel } from '@/models/FeeCollectedEvent';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

/**
 * @swagger
 * /api/v1/events/integrator/{integrator}:
 *   get:
 *     summary: Get events by integrator address
 *     description: Retrieve all FeeCollected events for a specific integrator address across all chains or a specific chain
 *     tags: [Events]
 *     parameters:
 *       - $ref: '#/components/parameters/integratorParam'
 *       - $ref: '#/components/parameters/pageQuery'
 *       - $ref: '#/components/parameters/limitQuery'
 *       - $ref: '#/components/parameters/fromDateQuery'
 *       - $ref: '#/components/parameters/toDateQuery'
 *       - $ref: '#/components/parameters/sortByQuery'
 *       - $ref: '#/components/parameters/sortOrderQuery'
 *       - name: chainId
 *         in: query
 *         description: Filter by specific chain ID
 *         schema:
 *           type: string
 *           pattern: '^\\d+$'
 *           example: '137'
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventsResponse'
 *             example:
 *               success: true
 *               data:
 *                 events:
 *                   - _id: '507f1f77bcf86cd799439011'
 *                     chainId: 137
 *                     blockNumber: 70000001
 *                     blockHash: '0x1234567890abcdef...'
 *                     transactionHash: '0xabcdef1234567890...'
 *                     logIndex: 0
 *                     token: '0xA0b86a33E6441b8c4C8C0C8C0C8C0C8C0C8C0C8C'
 *                     integrator: '0xB0b86a33E6441b8c4C8C0C8C0C8C0C8C0C8C0C8C'
 *                     integratorFee: '1000000000000000000'
 *                     lifiFee: '500000000000000000'
 *                     timestamp: '2024-01-15T10:30:00Z'
 *                     createdAt: '2024-01-15T10:30:00Z'
 *                     updatedAt: '2024-01-15T10:30:00Z'
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 1
 *                   pages: 1
 *               timestamp: '2024-01-15T10:30:00Z'
 *       400:
 *         description: Invalid parameters
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
 */

export interface EventsQueryParams {
  chainId?: string;
  fromDate?: string;
  toDate?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EventsResponse {
  success: boolean;
  data: {
    events: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}

/**
 * @swagger
 * /api/v1/events/chain/{chainId}:
 *   get:
 *     summary: Get events by chain ID
 *     description: Retrieve all FeeCollected events for a specific chain
 *     tags: [Events]
 *     parameters:
 *       - $ref: '#/components/parameters/chainIdParam'
 *       - $ref: '#/components/parameters/pageQuery'
 *       - $ref: '#/components/parameters/limitQuery'
 *       - $ref: '#/components/parameters/fromDateQuery'
 *       - $ref: '#/components/parameters/toDateQuery'
 *       - $ref: '#/components/parameters/sortByQuery'
 *       - $ref: '#/components/parameters/sortOrderQuery'
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventsResponse'
 *       400:
 *         description: Invalid chain ID
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
 */
export const getEventsByIntegrator = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { integrator } = req.params;
    const {
      chainId,
      fromDate,
      toDate,
      page = '1',
      limit = '50',
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = req.query as EventsQueryParams;

    // Validate integrator address
    if (!integrator || !/^0x[a-fA-F0-9]{40}$/.test(integrator)) {
      throw new AppError('Invalid integrator address', 400);
    }

    // Build query
    const query: any = { integrator };
    
    if (chainId) {
      query.chainId = parseInt(chainId, 10);
    }

    if (fromDate || toDate) {
      query.timestamp = {};
      if (fromDate) {
        query.timestamp.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.timestamp.$lte = new Date(toDate);
      }
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [events, total] = await Promise.all([
      FeeCollectedEventModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FeeCollectedEventModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    logger.info('Events queried by integrator', {
      integrator,
      chainId,
      count: events.length,
      total,
      page: pageNum,
      limit: limitNum,
    });

    const response: EventsResponse = {
      success: true,
      data: {
        events,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/events:
 *   get:
 *     summary: Get events with filters
 *     description: Retrieve FeeCollected events with optional filtering by integrator, chain, and date range
 *     tags: [Events]
 *     parameters:
 *       - $ref: '#/components/parameters/pageQuery'
 *       - $ref: '#/components/parameters/limitQuery'
 *       - $ref: '#/components/parameters/fromDateQuery'
 *       - $ref: '#/components/parameters/toDateQuery'
 *       - $ref: '#/components/parameters/sortByQuery'
 *       - $ref: '#/components/parameters/sortOrderQuery'
 *       - name: chainId
 *         in: query
 *         description: Filter by specific chain ID
 *         schema:
 *           type: string
 *           pattern: '^\\d+$'
 *           example: '137'
 *       - name: integrator
 *         in: query
 *         description: Filter by integrator address
 *         schema:
 *           type: string
 *           pattern: '^0x[a-fA-F0-9]{40}$'
 *           example: '0xB0b86a33E6441b8c4C8C0C8C0C8C0C8C0C8C0C8C'
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventsResponse'
 *       400:
 *         description: Invalid parameters
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
 */
export const getEventsByChain = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { chainId } = req.params;
    const {
      fromDate,
      toDate,
      page = '1',
      limit = '50',
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = req.query as EventsQueryParams;

    // Validate chainId
    if (!chainId) {
      throw new AppError('Chain ID is required', 400);
    }
    const chainIdNum = parseInt(chainId, 10);
    if (isNaN(chainIdNum)) {
      throw new AppError('Invalid chain ID', 400);
    }

    // Build query
    const query: any = { chainId: chainIdNum };
    
    if (fromDate || toDate) {
      query.timestamp = {};
      if (fromDate) {
        query.timestamp.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.timestamp.$lte = new Date(toDate);
      }
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [events, total] = await Promise.all([
      FeeCollectedEventModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FeeCollectedEventModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    logger.info('Events queried by chain', {
      chainId: chainIdNum,
      count: events.length,
      total,
      page: pageNum,
      limit: limitNum,
    });

    const response: EventsResponse = {
      success: true,
      data: {
        events,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getEventsWithFilters = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      chainId,
      integrator,
      fromDate,
      toDate,
      page = '1',
      limit = '50',
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = req.query as EventsQueryParams & { integrator?: string };

    // Build query
    const query: any = {};
    
    if (chainId) {
      query.chainId = parseInt(chainId, 10);
    }

    if (integrator) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(integrator)) {
        throw new AppError('Invalid integrator address', 400);
      }
      query.integrator = integrator
    }

    if (fromDate || toDate) {
      query.timestamp = {};
      if (fromDate) {
        query.timestamp.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.timestamp.$lte = new Date(toDate);
      }
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [events, total] = await Promise.all([
      FeeCollectedEventModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FeeCollectedEventModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    logger.info('Events queried with filters', {
      chainId,
      integrator,
      count: events.length,
      total,
      page: pageNum,
      limit: limitNum,
    });

    const response: EventsResponse = {
      success: true,
      data: {
        events,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}; 