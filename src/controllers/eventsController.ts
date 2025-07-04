import { Request, Response, NextFunction } from 'express';
import { FeeCollectedEventModel } from '@/models/FeeCollectedEvent';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

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
    const query: any = { integrator: integrator.toLowerCase() };
    
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
      query.integrator = integrator.toLowerCase();
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