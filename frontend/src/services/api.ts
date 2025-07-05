import axios from 'axios';
import type { 
  ChainsStatusResponse, 
  HealthResponse, 
  EventsResponse, 
  Chain
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const apiService = {
  // Health check
  async getHealth(): Promise<HealthResponse> {
    const response = await api.get('/health');
    return response.data;
  },

  // Get events
  async getEvents(params?: {
    page?: number;
    limit?: number;
    integrator?: string;
    chainId?: number;
  }): Promise<EventsResponse> {
    const response = await api.get('/api/v1/events', { params });
    return response.data;
  },

    // Chains status
  async getChainsStatus(): Promise<ChainsStatusResponse> {
    const response = await api.get('/api/v1/chains/status');
    return response.data;
  },

  // Add chain
  async addChain(chain: Chain): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/api/v1/chains', chain);
    return response.data;
  },

  // Stop chain
  async stopChain(chainId: number): Promise<{ success: boolean; message: string }> {
    const response = await api.put(`/api/v1/chains/${chainId}/stop`);
    return response.data;
  },


  // Start chain
  async startChain(chainId: number): Promise<{ success: boolean; message: string }> {
    const response = await api.put(`/api/v1/chains/${chainId}/start`);
    return response.data;
  },

  // Update chain
  async updateChain(chainId: number, chain: Chain): Promise<{ success: boolean; message: string }> {
    const response = await api.put(`/api/v1/chains/${chainId}/update`, chain);
    return response.data;
  },

  // Get single chain details
  async getChain(chainId: number): Promise<Chain> {
    const response = await api.get(`/api/v1/chains/${chainId}/status`);
    const data = response.data.data;
    return {
      chainId: data.chainId,
      name: data.name,
      rpcUrl: data.configuration.rpcUrl,
      contractAddress: data.configuration.contractAddress,
      startingBlock: data.configuration.startingBlock,
      scanInterval: data.configuration.scanInterval,
      maxBlockRange: data.configuration.maxBlockRange,
      retryAttempts: data.configuration.retryAttempts,
    };
  },
}; 