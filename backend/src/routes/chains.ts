import { Router } from 'express';
import {
  getChainsStatus,
  getChainStatus,
  addChain,
  stopChain,
  updateChain,
  deleteChain,
  chainConfigSchema,
  chainUpdateSchema,
  startChain,
} from '@/controllers/chainsController';
import { validateRequest, validateParams } from '@/middleware/validation';
import { chainManagementRateLimiter } from '@/middleware/rateLimit';
import Joi from 'joi';

const router = Router();

// Validation schemas
const chainIdParamSchema = Joi.object({
  chainId: Joi.string().pattern(/^\d+$/).required(),
});

// Routes
router.get(
  '/status',
  chainManagementRateLimiter,
  getChainsStatus
);

router.get(
  '/:chainId/status',
  chainManagementRateLimiter,
  validateParams(chainIdParamSchema),
  getChainStatus
);

router.post(
  '/',
  chainManagementRateLimiter,
  validateRequest(chainConfigSchema),
  addChain
);

router.put(
  '/:chainId/start',
  chainManagementRateLimiter,
  validateParams(chainIdParamSchema),
  startChain
);

router.put(
  '/:chainId/stop',
  chainManagementRateLimiter,
  validateParams(chainIdParamSchema),
  stopChain
);

router.put(
  '/:chainId/update',
  chainManagementRateLimiter,
  validateParams(chainIdParamSchema),
  validateRequest(chainUpdateSchema),
  updateChain
);

router.delete(
  '/:chainId',
  chainManagementRateLimiter,
  validateParams(chainIdParamSchema),
  deleteChain
);

export default router; 