import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fee Collector Event Scraper API',
      version: '1.0.0',
      description: `
        A comprehensive REST API for monitoring and querying FeeCollector smart contract events across multiple EVM chains.
        
        ## Features
        - **Multi-chain Support**: Monitor events from multiple EVM chains simultaneously
        - **Event Querying**: Query events by integrator, chain, or with advanced filters
        - **Dynamic Chain Management**: Add, remove, and configure chains at runtime
        - **Real-time Monitoring**: Track chain health and scraper status
        - **Caching**: Redis-based caching for improved performance
      `
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Error description',
                },
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        FeeCollectedEvent: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            chainId: {
              type: 'integer',
              example: 137,
              description: 'EVM chain ID',
            },
            blockNumber: {
              type: 'integer',
              example: 70000001,
            },
            blockHash: {
              type: 'string',
              example: '0x1234567890abcdef...',
            },
            transactionHash: {
              type: 'string',
              example: '0xabcdef1234567890...',
            },
            logIndex: {
              type: 'integer',
              example: 0,
            },
            token: {
              type: 'string',
              example: '0xA0b86a33E6441b8c4C8C0C8C0C8C0C8C0C8C0C8C',
              description: 'Token contract address',
            },
            integrator: {
              type: 'string',
              example: '0xB0b86a33E6441b8c4C8C0C8C0C8C0C8C0C8C0C8C',
              description: 'Integrator contract address',
            },
            integratorFee: {
              type: 'string',
              example: '1000000000000000000',
              description: 'Integrator fee in wei',
            },
            lifiFee: {
              type: 'string',
              example: '500000000000000000',
              description: 'LiFi fee in wei',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1,
            },
            limit: {
              type: 'integer',
              example: 10,
            },
            total: {
              type: 'integer',
              example: 100,
            },
            pages: {
              type: 'integer',
              example: 10,
            },
          },
        },
        EventsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                events: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/FeeCollectedEvent',
                  },
                },
                pagination: {
                  $ref: '#/components/schemas/Pagination',
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        ChainConfiguration: {
          type: 'object',
          properties: {
            chainId: {
              type: 'integer',
              example: 137,
              description: 'EVM chain ID',
            },
            name: {
              type: 'string',
              example: 'Polygon',
              description: 'Human-readable chain name',
            },
            rpcUrl: {
              type: 'string',
              example: 'https://polygon-rpc.com',
              description: 'RPC endpoint URL',
            },
            contractAddress: {
              type: 'string',
              example: '0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9',
              description: 'FeeCollector contract address',
            },
            startingBlock: {
              type: 'integer',
              example: 70000000,
              description: 'Starting block for event scanning',
            },
            isEnabled: {
              type: 'boolean',
              example: true,
              description: 'Whether the chain is enabled for scanning',
            },
            scanInterval: {
              type: 'integer',
              example: 30000,
              description: 'Scan interval in milliseconds',
            },
            maxBlockRange: {
              type: 'integer',
              example: 1000,
              description: 'Maximum blocks to scan per iteration',
            },
            retryAttempts: {
              type: 'integer',
              example: 3,
              description: 'Number of retry attempts for failed operations',
            },
            workerStatus: {
              type: 'string',
              enum: ['running', 'stopped', 'error', 'starting'],
              example: 'running',
              description: 'Current worker status',
            },
            lastWorkerStart: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            lastWorkerError: {
              type: 'string',
              example: 'Connection timeout',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        ChainStatus: {
          type: 'object',
          properties: {
            chainId: {
              type: 'integer',
              example: 137,
            },
            name: {
              type: 'string',
              example: 'Polygon',
            },
            isEnabled: {
              type: 'boolean',
              example: true,
            },
            workerStatus: {
              type: 'string',
              enum: ['running', 'stopped', 'error', 'starting'],
              example: 'running',
            },
            lastProcessedBlock: {
              type: 'integer',
              example: 70000001,
            },
            lastRunAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            errorCount: {
              type: 'integer',
              example: 0,
            },
            lastError: {
              type: 'string',
              example: 'Connection timeout',
            },
            eventCount: {
              type: 'integer',
              example: 150,
              description: 'Total number of events collected for this chain',
            },
          },
        },
        ChainsStatusResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                chains: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/ChainStatus',
                  },
                },
                summary: {
                  type: 'object',
                  properties: {
                    totalChains: {
                      type: 'integer',
                      example: 3,
                    },
                    activeChains: {
                      type: 'integer',
                      example: 2,
                    },
                    totalEvents: {
                      type: 'integer',
                      example: 450,
                    },
                  },
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['healthy', 'unhealthy'],
                  example: 'healthy',
                },
                services: {
                  type: 'object',
                  properties: {
                    database: {
                      type: 'string',
                      enum: ['connected', 'disconnected'],
                      example: 'connected',
                    },
                    scraper: {
                      type: 'string',
                      enum: ['running', 'stopped', 'error'],
                      example: 'running',
                    },
                    redis: {
                      type: 'string',
                      enum: ['connected', 'disconnected'],
                      example: 'connected',
                    },
                  },
                },
                uptime: {
                  type: 'number',
                  example: 3600,
                  description: 'Server uptime in seconds',
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-01-15T10:30:00Z',
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
      },
      parameters: {
        integratorParam: {
          name: 'integrator',
          in: 'path',
          required: true,
          description: 'Integrator contract address (0x format)',
          schema: {
            type: 'string',
            pattern: '^0x[a-fA-F0-9]{40}$',
            example: '0xB0b86a33E6441b8c4C8C0C8C0C8C0C8C0C8C0C8C',
          },
        },
        chainIdParam: {
          name: 'chainId',
          in: 'path',
          required: true,
          description: 'EVM chain ID',
          schema: {
            type: 'string',
            pattern: '^\\d+$',
            example: '137',
          },
        },
        pageQuery: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination (default: 1)',
          schema: {
            type: 'string',
            pattern: '^\\d+$',
            example: '1',
          },
        },
        limitQuery: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page (default: 10, max: 100)',
          schema: {
            type: 'string',
            pattern: '^\\d+$',
            example: '10',
          },
        },
        fromDateQuery: {
          name: 'fromDate',
          in: 'query',
          description: 'Start date for filtering (ISO 8601 format)',
          schema: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00Z',
          },
        },
        toDateQuery: {
          name: 'toDate',
          in: 'query',
          description: 'End date for filtering (ISO 8601 format)',
          schema: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-31T23:59:59Z',
          },
        },
        sortByQuery: {
          name: 'sortBy',
          in: 'query',
          description: 'Field to sort by',
          schema: {
            type: 'string',
            enum: ['timestamp', 'blockNumber', 'chainId'],
            example: 'timestamp',
          },
        },
        sortOrderQuery: {
          name: 'sortOrder',
          in: 'query',
          description: 'Sort order',
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            example: 'desc',
          },
        },
      },
    },
    tags: [
      {
        name: 'Events',
        description: 'Event querying and filtering endpoints',
      },
      {
        name: 'Chains',
        description: 'Chain management and monitoring endpoints',
      },
      {
        name: 'Health',
        description: 'System health and status endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API docs
};

export const specs = swaggerJsdoc(options); 