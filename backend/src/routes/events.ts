import { Router } from 'express';
import {
  getEventsByIntegrator,
  getEventsByChain,
  getEventsWithFilters,
} from '@/controllers/eventsController';
import { validateParams, validateQuery } from '@/middleware/validation';
import { apiRateLimiter } from '@/middleware/rateLimit';
import { redisCacheMiddleware } from '@/middleware/cache';
import Joi from 'joi';

const router = Router();

// Validation schemas
const integratorParamSchema = Joi.object({
  integrator: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
});

const chainIdParamSchema = Joi.object({
  chainId: Joi.string().pattern(/^\d+$/).required(),
});

const eventsQuerySchema = Joi.object({
  chainId: Joi.string().pattern(/^\d+$/).optional(),
  fromDate: Joi.string().isoDate().optional(),
  toDate: Joi.string().isoDate().optional(),
  page: Joi.string().pattern(/^\d+$/).optional(),
  limit: Joi.string().pattern(/^\d+$/).optional(),
  sortBy: Joi.string().valid('timestamp', 'blockNumber', 'chainId').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

const eventsWithFiltersQuerySchema = Joi.object({
  chainId: Joi.string().pattern(/^\d+$/).optional(),
  integrator: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  fromDate: Joi.string().isoDate().optional(),
  toDate: Joi.string().isoDate().optional(),
  page: Joi.string().pattern(/^\d+$/).optional(),
  limit: Joi.string().pattern(/^\d+$/).optional(),
  sortBy: Joi.string().valid('timestamp', 'blockNumber', 'chainId').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

// Routes
router.get(
  '/integrator/:integrator',
  apiRateLimiter,
  validateParams(integratorParamSchema),
  validateQuery(eventsQuerySchema),
  redisCacheMiddleware(),
  getEventsByIntegrator
);

router.get(
  '/chain/:chainId',
  apiRateLimiter,
  validateParams(chainIdParamSchema),
  validateQuery(eventsQuerySchema),
  redisCacheMiddleware(),
  getEventsByChain
);

router.get(
  '/',
  apiRateLimiter,
  validateQuery(eventsWithFiltersQuerySchema),
  redisCacheMiddleware(),
  getEventsWithFilters
);

export default router; 