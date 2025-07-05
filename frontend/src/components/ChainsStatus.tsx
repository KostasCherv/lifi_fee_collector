import React from 'react';
import { Play, Square, AlertCircle, CheckCircle, Clock, Activity } from 'lucide-react';
import type { ChainStatus } from '../types/api';
import { apiService } from '../services/api';

interface ChainsStatusProps {
  chains: ChainStatus[];
  summary: {
    totalChains: number;
    activeChains: number;
    runningWorkers: number;
    errorWorkers: number;
  };
  loading: boolean;
  onRefresh: () => void;
}

export const ChainsStatus: React.FC<ChainsStatusProps> = ({ 
  chains, 
  summary, 
  loading, 
  onRefresh 
}) => {
  const handleChainAction = async (chainId: number, action: 'start' | 'stop') => {
    try {
      if (action === 'start') {
        await apiService.startChain(chainId);
      } else {
        await apiService.stopChain(chainId);
      }
      onRefresh();
    } catch (error) {
      console.error(`Failed to ${action} chain ${chainId}:`, error);
    }
  };

  const getStatusIcon = (status: ChainStatus['workerStatus']) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-error" />;
      case 'starting':
        return <Clock className="h-5 w-5 text-warning" />;
      default:
        return <Square className="h-5 w-5 text-secondary" />;
    }
  };

  const getStatusColor = (status: ChainStatus['workerStatus']) => {
    switch (status) {
      case 'running':
        return 'text-success';
      case 'error':
        return 'text-error';
      case 'starting':
        return 'text-warning';
      default:
        return 'text-secondary';
    }
  };

  const getStatusBg = (status: ChainStatus['workerStatus']) => {
    switch (status) {
      case 'running':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'starting':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="material-card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="material-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="material-title text-primary">Chain Status</h3>
        <div className="flex space-x-4 text-sm">
          <div className="flex items-center text-secondary">
            <CheckCircle className="h-4 w-4 text-success mr-2" />
            <span>{summary.runningWorkers} Running</span>
          </div>
          <div className="flex items-center text-secondary">
            <AlertCircle className="h-4 w-4 text-error mr-2" />
            <span>{summary.errorWorkers} Errors</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {chains.map((chain) => (
          <div 
            key={chain.chainId} 
            className={`p-4 rounded-lg border ${getStatusBg(chain.workerStatus)} smooth-transition`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getStatusIcon(chain.workerStatus)}
                <div>
                  <div className="material-subtitle font-medium">{chain.name}</div>
                  <div className={`material-caption ${getStatusColor(chain.workerStatus)}`}>
                    {chain.workerStatus.charAt(0).toUpperCase() + chain.workerStatus.slice(1)}
                  </div>
                  {chain.lastProcessedBlock && (
                    <div className="material-caption text-secondary mt-1">
                      Block: {chain.lastProcessedBlock.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {chain.workerStatus === 'running' ? (
                  <button
                    onClick={() => handleChainAction(chain.chainId, 'stop')}
                    className="btn-secondary ripple flex items-center text-error border-error hover:bg-red-50"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() => handleChainAction(chain.chainId, 'start')}
                    className="btn-secondary ripple flex items-center text-success border-success hover:bg-green-50"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {chains.length === 0 && (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 mx-auto mb-4 text-secondary" />
          <p className="material-subtitle text-secondary">No chains available</p>
        </div>
      )}
    </div>
  );
}; 