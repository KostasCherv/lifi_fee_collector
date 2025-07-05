# Fee Collector Event Scraper - Technical Specification

## Overview

This document outlines the technical specification for building a Fee Collector event scraper system that monitors smart contract events, stores them in MongoDB, and provides REST API access. The system will be built in TypeScript with a focus on production-ready code quality.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Event Scraper │    │   MongoDB       │    │   REST API      │
│   Service       │───▶│   Database      │◀───│   Server        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Polygon RPC   │    │   Typegoose     │    │   Express.js    │
│   Provider      │    │   Models        │    │   Endpoints     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Core Components

### 1. Event Scraper Service
- **Purpose**: Continuously monitor FeeCollector contracts across multiple EVM chains for `FeesCollected` events
- **Technology**: TypeScript, ethers.js v5, Node.js
- **Key Features**:
  - Multi-chain block range scanning with state persistence per chain
  - Chain-specific event parsing and validation
  - Error handling and retry mechanisms per chain
  - Configurable scanning intervals per chain
  - Chain health monitoring and failover

### 2. Database Layer
- **Purpose**: Store parsed events and scraper state across all chains
- **Technology**: MongoDB with Typegoose ODM
- **Collections**:
  - `FeeCollectedEvents`: Stored events with chainId for multi-chain support
  - `ScraperState`: Current scanning state per chain (one record per chain)
  - `ChainConfigurations`: Chain-specific settings and contract addresses

### 3. REST API Server
- **Purpose**: Provide HTTP endpoints for querying events and managing chains dynamically
- **Technology**: Express.js with TypeScript
- **Endpoints**: 
  - **Event Queries**: Query events by integrator (all chains or specific chain)
  - **Chain Queries**: Query events by chain ID, chain status and health endpoints
  - **Chain Management**: Dynamic chain configuration, worker lifecycle management

### 4. Configuration Management
- **Purpose**: Manage multi-chain configurations and settings
- **Features**: 
  - Environment-based configuration
  - Chain-specific settings (RPC URLs, contract addresses, block ranges)
  - Dynamic chain configuration loading
  - Chain enable/disable functionality

## Database Schema

### FeeCollectedEvent Model
```typescript
interface FeeCollectedEvent {
  _id: ObjectId;
  chainId: number;
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
  logIndex: number;
  token: string;
  integrator: string;
  integratorFee: string; // BigNumber as string
  lifiFee: string; // BigNumber as string
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### ScraperState Model
```typescript
interface ScraperState {
  _id: ObjectId;
  chainId: number;
  lastProcessedBlock: number;
  isActive: boolean;
  lastRunAt: Date;
  errorCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### ChainConfiguration Model
```typescript
interface ChainConfiguration {
  _id: ObjectId;
  chainId: number;
  name: string;
  rpcUrl: string;
  contractAddress: string;
  startingBlock: number;
  isEnabled: boolean;
  scanInterval: number; // milliseconds
  maxBlockRange: number; // max blocks to scan per iteration
  retryAttempts: number;
  workerStatus: 'running' | 'stopped' | 'error' | 'starting';
  lastWorkerStart?: Date;
  lastWorkerError?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Chain Configuration Validation Schema
```typescript
interface ChainConfigValidation {
  chainId: number; // Required, must be unique
  name: string; // Required, 1-50 characters
  rpcUrl: string; // Required, valid URL format
  contractAddress: string; // Required, valid Ethereum address
  startingBlock?: number; // Optional, defaults to 70000000
  scanInterval?: number; // Optional, 5000-300000 ms, defaults to 30000
  maxBlockRange?: number; // Optional, 100-10000, defaults to 1000
  retryAttempts?: number; // Optional, 1-10, defaults to 3
}
```

## Implementation Steps

### Phase 1: Project Setup and Core Infrastructure

#### Step 1.1: Project Initialization
- **Duration**: 1-2 hours
- **Tasks**:
  - Initialize TypeScript project with proper configuration
  - Set up package.json with all dependencies
  - Configure ESLint and Prettier
  - Set up directory structure
  - Create Docker configuration
  - Set up environment configuration

#### Step 1.2: Database Setup
- **Duration**: 2-3 hours
- **Tasks**:
  - Set up MongoDB connection with Typegoose
  - Create FeeCollectedEvent model with Typegoose decorators
  - Create ScraperState model for tracking progress
  - Implement database connection management
  - Add connection error handling and retry logic

### Phase 2: Event Scraping Core

#### Step 2.1: Multi-Chain Blockchain Integration
- **Duration**: 4-5 hours
- **Tasks**:
  - Implement multi-chain provider management
  - Create FeeCollector contract interface with chain-specific addresses
  - Implement event loading functions for multiple chains (adapting provided code)
  - Add provider fallback and error handling per chain
  - Create dynamic chain configuration management
  - Implement chain health monitoring and failover logic

#### Step 2.2: Multi-Chain Event Processing Engine
- **Duration**: 5-6 hours
- **Tasks**:
  - Implement per-chain block range calculation logic
  - Create chain-specific event parsing and validation
  - Implement duplicate detection and prevention across chains
  - Add event storage with proper error handling and chain identification
  - Create per-chain state management for tracking processed blocks
  - Implement cross-chain event correlation and deduplication

#### Step 2.3: Multi-Chain Scraper Service
- **Duration**: 4-5 hours
- **Tasks**:
  - Implement main scraper loop with per-chain configurable intervals
  - Add graceful shutdown handling for all chains
  - Implement per-chain retry mechanisms for failed operations
  - Add comprehensive logging with chain identification
  - Create chain-specific health check endpoints
  - Implement chain enable/disable functionality
  - Add cross-chain monitoring and alerting

### Phase 3: REST API Development

#### Step 3.1: API Server Setup
- **Duration**: 2-3 hours
- **Tasks**:
  - Set up Express.js server with TypeScript
  - Implement middleware (CORS, body parsing, logging)
  - Add request validation
  - Set up error handling middleware
  - Create health check endpoints

#### Step 3.2: Multi-Chain Event Query Endpoints
- **Duration**: 4-5 hours
- **Tasks**:
  - Implement GET `/events/integrator/:integrator` endpoint with chain filtering
  - Implement GET `/events/chain/:chainId` endpoint for chain-specific queries
  - Implement GET `/chains/status` endpoint for chain health monitoring
  - Add pagination support with chain-aware filtering
  - Implement filtering by date range and chain ID
  - Add response caching with chain-specific keys
  - Create comprehensive API documentation with multi-chain examples

#### Step 3.3: Dynamic Chain Management Endpoints
- **Duration**: 4-5 hours
- **Tasks**:
  - Implement POST `/chains/start` endpoint for dynamic chain configuration and worker startup
  - Implement PUT `/chains/:chainId/stop` endpoint to stop specific chain workers
  - Implement PUT `/chains/:chainId/update` endpoint to update chain configuration
  - Implement DELETE `/chains/:chainId` endpoint to remove chain configuration
  - Add comprehensive input validation for chain configuration with detailed error messages
  - Implement chain configuration validation (RPC connectivity, contract address verification)
  - Add worker lifecycle management and health monitoring
  - Create chain configuration schema validation with Joi or Zod
  - Implement duplicate chain ID prevention
  - Add graceful worker shutdown and cleanup
  - Create chain configuration persistence and recovery

### Phase 4: Testing and Quality Assurance

#### Step 4.1: Unit Testing
- **Duration**: 4-5 hours
- **Tasks**:
  - Write unit tests for event parsing functions
  - Test database models and operations
  - Test API endpoints with mocked data
  - Test error handling scenarios
  - Achieve >80% code coverage

#### Step 4.2: Integration Testing
- **Duration**: 3-4 hours
- **Tasks**:
  - Test end-to-end event scraping flow
  - Test database integration
  - Test API integration with real data
  - Test error recovery scenarios
  - Performance testing with large datasets

### Phase 5: Production Readiness

#### Step 5.1: Error Handling and Monitoring
- **Duration**: 2-3 hours
- **Tasks**:
  - Implement comprehensive error handling
  - Add structured logging
  - Create monitoring endpoints
  - Implement circuit breakers for external calls
  - Add metrics collection

#### Step 5.2: Docker and Deployment
- **Duration**: 2-3 hours
- **Tasks**:
  - Create optimized Docker image
  - Set up Docker Compose for local development
  - Create deployment documentation
  - Add environment-specific configurations
  - Create startup scripts

## Technical Requirements

### Dependencies
- **Runtime**: Node.js 18+
- **Database**: MongoDB 5.0+
- **Blockchain**: ethers.js v5, lifi-contract-types
- **Web Framework**: Express.js
- **ORM**: Typegoose
- **Testing**: Jest, Supertest
- **Development**: TypeScript, ESLint, Prettier

### Configuration
- **Environment Variables**:
  - `MONGODB_URI`: Database connection string
  - `PORT`: API server port
  - `NODE_ENV`: Environment (development/production)
  - `DEFAULT_SCRAPER_INTERVAL`: Default event scanning interval (ms)
  - `DEFAULT_STARTING_BLOCK`: Default initial block to scan from
  - `CHAIN_CONFIG_PATH`: Path to chain configuration file (optional)

- **Chain Configuration** (JSON file or database):
  ```json
  {
    "chains": [
      {
        "chainId": 137,
        "name": "Polygon",
        "rpcUrl": "https://polygon-rpc.com",
        "contractAddress": "0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9",
        "startingBlock": 70000000,
        "isEnabled": true,
        "scanInterval": 30000,
        "maxBlockRange": 1000,
        "retryAttempts": 3
      }
    ]
  }
  ```

### Performance Considerations
- **Block Scanning**: Implement efficient block range processing
- **Database**: Use proper indexing on frequently queried fields
- **Caching**: Implement response caching for API endpoints
- **Rate Limiting**: Respect RPC provider rate limits
- **Memory Management**: Process events in batches

## Security Considerations
- **Input Validation**: Validate all API inputs
- **Rate Limiting**: Implement API rate limiting
- **Error Handling**: Avoid exposing sensitive information in errors
- **Database Security**: Use connection string authentication
- **Environment Variables**: Secure configuration management

## Monitoring and Observability
- **Health Checks**: Implement comprehensive health check endpoints
- **Logging**: Structured logging with different levels
- **Metrics**: Track scraping performance and API usage
- **Alerts**: Monitor for failed scraping attempts
- **Dashboard**: Basic monitoring dashboard (optional)

## API Endpoints

The system will provide the following REST API endpoints:

### Event Queries
- `GET /events/integrator/:integrator?chainId=137` - Query events by integrator with optional chain filtering
- `GET /events/chain/:chainId` - Query events for a specific chain
- `GET /events?chainId=137&fromDate=2024-01-01&toDate=2024-01-31` - Query events with filters

### Chain Management
- `GET /chains/status` - Get status of all chains
- `GET /chains/:chainId/status` - Get status of specific chain
- `POST /chains/start` - Start a new chain worker with configuration
- `PUT /chains/:chainId/stop` - Stop a specific chain worker
- `PUT /chains/:chainId/update` - Update chain configuration
- `DELETE /chains/:chainId` - Remove chain configuration and stop worker

### Health Checks
- `GET /health` - Overall system health
- `GET /health/scraper` - Scraper service health
- `GET /health/database` - Database connection health

### Chain Configuration Examples

#### POST /chains/start
```json
{
  "chainId": 1,
  "name": "Ethereum Mainnet",
  "rpcUrl": "https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY",
  "contractAddress": "0x1234567890123456789012345678901234567890",
  "startingBlock": 18000000,
  "scanInterval": 30000,
  "maxBlockRange": 1000,
  "retryAttempts": 3
}
```

#### Response
```json
{
  "success": true,
  "message": "Chain worker started successfully",
  "data": {
    "chainId": 1,
    "workerStatus": "running",
    "lastWorkerStart": "2024-01-15T10:30:00Z"
  }
}
```

## Future Enhancements
- **Additional EVM Chains**: Easy addition of new chains through configuration
- **Real-time Updates**: WebSocket support for real-time event notifications
- **Advanced Analytics**: Cross-chain event aggregation and reporting
- **Caching Layer**: Redis for improved performance with chain-aware caching
- **Load Balancing**: Horizontal scaling support with chain distribution
- **Chain Synchronization**: Cross-chain event correlation and deduplication

## Success Criteria
- [ ] Successfully scrape and store FeeCollected events from Polygon
- [ ] Implement multi-chain architecture ready for additional EVM chains
- [ ] Implement efficient block scanning with state persistence per chain
- [ ] Provide REST API for querying events by integrator across all chains
- [ ] Achieve >80% test coverage including multi-chain scenarios
- [ ] Docker containerization working
- [ ] Production-ready error handling and logging with chain identification
- [ ] Comprehensive documentation with multi-chain examples
- [ ] Chain configuration management system working

## Timeline Estimate
- **Total Development Time**: 35-45 hours (increased due to multi-chain complexity and dynamic chain management)
- **Recommended Timeline**: 1-2 weeks with proper testing and review cycles

## Risk Mitigation
- **RPC Provider Issues**: Implement fallback providers
- **Database Connection**: Robust connection management with retries
- **Blockchain Congestion**: Implement backoff strategies
- **Data Consistency**: Proper transaction handling and validation
- **Performance**: Monitor and optimize based on real usage patterns 