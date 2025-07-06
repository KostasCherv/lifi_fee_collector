import { Router } from 'express';
import eventsRoutes from './events';
import chainsRoutes from './chains';

const router = Router();

// API version prefix
const API_PREFIX = '/api/v1';

// Mount routes
router.use(`${API_PREFIX}/events`, eventsRoutes);
router.use(`${API_PREFIX}/chains`, chainsRoutes);

// API documentation endpoint
router.get(`${API_PREFIX}`, (_req, res) => {
  res.json({
    message: 'Fee Collector Event Scraper API',
    version: '1.0.0',
    endpoints: {
      events: {
        'GET /events/integrator/:integrator': 'Query events by integrator address',
        'GET /events/chain/:chainId': 'Query events for a specific chain',
        'GET /events': 'Query events with filters',
      },
      chains: {
        'GET /chains/status': 'Get status of all chains',
        'GET /chains/:chainId/status': 'Get status of specific chain',
        'POST /chains': 'Add and start a new chain worker',
        'PUT /chains/:chainId/start': 'Start a specific chain worker',
        'PUT /chains/:chainId/stop': 'Stop a specific chain worker',
        'PUT /chains/:chainId/update': 'Update chain configuration',
        'DELETE /chains/:chainId': 'Delete chain configuration',
      },
      health: {
        'GET /health': 'Overall system health',
        'GET /health/database': 'Database connection health',
        'GET /health/scraper': 'Scraper service health',
      },
    },
    timestamp: new Date().toISOString(),
  });
});

export default router; 