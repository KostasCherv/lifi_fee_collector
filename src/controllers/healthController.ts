// This file contains only Swagger documentation for health endpoints
// The actual health endpoint implementations are in src/index.ts

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get API information
 *     description: Get basic information about the API and its current status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Fee Collector Scraper API'
 *                 status:
 *                   type: string
 *                   example: 'running'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2024-01-15T10:30:00Z'
 *                 environment:
 *                   type: string
 *                   example: 'development'
 *                 database:
 *                   type: string
 *                   example: 'connected'
 *             example:
 *               message: 'Fee Collector Scraper API'
 *               status: 'running'
 *               timestamp: '2024-01-15T10:30:00Z'
 *               environment: 'development'
 *               database: 'connected'
 * 
 * /health:
 *   get:
 *     summary: Get overall system health
 *     description: Check the health status of all system components including database and scraper service
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               success: true
 *               data:
 *                 status: 'healthy'
 *                 services:
 *                   database: 'connected'
 *                   scraper: 'running'
 *                   redis: 'connected'
 *                 uptime: 3600
 *                 timestamp: '2024-01-15T10:30:00Z'
 *               timestamp: '2024-01-15T10:30:00Z'
 *       503:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'unhealthy'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2024-01-15T10:30:00Z'
 *                 database:
 *                   type: string
 *                   example: 'disconnected'
 *                 scraper:
 *                   type: object
 *                   properties:
 *                     isRunning:
 *                       type: boolean
 *                       example: false
 *                     activeChains:
 *                       type: integer
 *                       example: 0
 *                     totalChains:
 *                       type: integer
 *                       example: 0
 *                     error:
 *                       type: string
 *                       example: 'Connection timeout'
 * 
 * /health/database:
 *   get:
 *     summary: Get database health status
 *     description: Check the connection status and health of the database
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database is connected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: ['connected', 'disconnected']
 *                   example: 'connected'
 *                 state:
 *                   type: string
 *                   example: 'connected'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2024-01-15T10:30:00Z'
 *             example:
 *               status: 'connected'
 *               state: 'connected'
 *               timestamp: '2024-01-15T10:30:00Z'
 *       503:
 *         description: Database is disconnected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'disconnected'
 *                 state:
 *                   type: string
 *                   example: 'disconnected'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2024-01-15T10:30:00Z'
 * 
 * /health/scraper:
 *   get:
 *     summary: Get scraper service health status
 *     description: Check the status and health of the event scraper service
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Scraper service is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: ['running', 'stopped', 'error']
 *                   example: 'running'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2024-01-15T10:30:00Z'
 *                 isRunning:
 *                   type: boolean
 *                   example: true
 *                 activeChains:
 *                   type: integer
 *                   example: 2
 *                 totalChains:
 *                   type: integer
 *                   example: 3
 *                 lastRunAt:
 *                   type: string
 *                   format: date-time
 *                   example: '2024-01-15T10:30:00Z'
 *             example:
 *               status: 'running'
 *               timestamp: '2024-01-15T10:30:00Z'
 *               isRunning: true
 *               activeChains: 2
 *               totalChains: 3
 *               lastRunAt: '2024-01-15T10:30:00Z'
 *       503:
 *         description: Scraper service has errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'error'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2024-01-15T10:30:00Z'
 *                 error:
 *                   type: string
 *                   example: 'Connection timeout'
 */ 