import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export interface Config {
  app: {
    port: number;
    nodeEnv: string;
  };
  database: {
    uri: string;
  };
  scraper: {
    defaultInterval: number;
    defaultStartingBlock: number;
    maxBlockRange: number;
    chainConfigPath?: string | undefined;
  };
  logging: {
    level: string;
    filePath: string;
  };
  api: {
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };
  security: {
    corsOrigin: string;
    helmetEnabled: boolean;
  };
  blockchain: {
    polygonRpcUrl: string;
    polygonContractAddress: string;
  };
}

const config: Config = {
  app: {
    port: parseInt(process.env['PORT'] || '3000', 10),
    nodeEnv: process.env['NODE_ENV'] || 'development',
  },
  database: {
    uri: process.env['MONGODB_URI'] || 'mongodb://localhost:27017/fee_collector',
  },
  scraper: {
    defaultInterval: parseInt(process.env['DEFAULT_SCRAPER_INTERVAL'] || '30000', 10),
    defaultStartingBlock: parseInt(process.env['DEFAULT_STARTING_BLOCK'] || '70000000', 10),
    maxBlockRange: parseInt(process.env['DEFAULT_MAX_BLOCK_RANGE'] || '1000', 10),
    chainConfigPath: process.env['CHAIN_CONFIG_PATH'],
  },
  logging: {
    level: process.env['LOG_LEVEL'] || 'info',
    filePath: process.env['LOG_FILE_PATH'] || path.join(process.cwd(), 'logs', 'app.log'),
  },
  api: {
    rateLimitWindowMs: parseInt(process.env['API_RATE_LIMIT_WINDOW_MS'] || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env['API_RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
  },
  security: {
    corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
    helmetEnabled: process.env['HELMET_ENABLED'] !== 'false',
  },
  blockchain: {
    polygonRpcUrl: process.env['POLYGON_RPC_URL'] || 'https://polygon-rpc.com',
    polygonContractAddress: process.env['POLYGON_CONTRACT_ADDRESS'] || '0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9',
  },
};

export default config; 