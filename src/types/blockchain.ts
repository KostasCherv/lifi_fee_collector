import { BigNumber } from 'ethers';

export interface ParsedFeeCollectedEvent {
  token: string; // the address of the token that was collected
  integrator: string; // the integrator that triggered the fee collection
  integratorFee: BigNumber; // the share collected for the integrator
  lifiFee: BigNumber; // the share collected for lifi
}

export interface BlockchainEvent {
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
}

export interface ChainProvider {
  chainId: number;
  provider: any; // ethers.js provider
  contract: any; // ethers.js contract instance
  isHealthy: boolean;
  lastHealthCheck: Date;
  errorCount: number;
}

export interface BlockRange {
  fromBlock: number;
  toBlock: number;
  chainId: number;
}

export interface EventProcessingResult {
  chainId: number;
  processedEvents: number;
  fromBlock: number;
  toBlock: number;
  success: boolean;
  error?: string;
  processingTime: number;
} 