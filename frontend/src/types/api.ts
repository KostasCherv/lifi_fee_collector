export interface ChainStatus {
  chainId: number;
  name: string;
  isEnabled: boolean;
  workerStatus: 'running' | 'stopped' | 'error' | 'starting';
  lastWorkerStart?: string;
  lastWorkerError?: string;
  lastProcessedBlock?: number;
  errorCount: number;
}

export interface ChainsStatusResponse {
  success: boolean;
  data: {
    chains: ChainStatus[];
    summary: {
      totalChains: number;
      activeChains: number;
      runningWorkers: number;
      errorWorkers: number;
    };
  };
  timestamp: string;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  database?: string;
  scraper?: {
    isRunning: boolean;
    activeChains: number;
    totalChains: number;
    error?: string;
  };
}

export interface Event {
  _id: string;
  chainId: number;
  blockNumber: number;
  transactionHash: string;
  token: string;
  integrator: string;
  integratorFee: string;
  lifiFee: string;
  timestamp: string;
}

export interface EventsResponse {
  success: boolean;
  data: {
    events: Event[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
} 

export interface Chain {
  chainId: number;
  name: string;
  rpcUrl: string;
  contractAddress: string;
  startingBlock: number;
  scanInterval: number;
  maxBlockRange: number;
  retryAttempts: number;
}