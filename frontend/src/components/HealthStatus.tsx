import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip
} from '@mui/material';
import {
  Storage as DatabaseIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  PauseCircle as PauseCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import type { HealthResponse } from '../types/api';

interface HealthStatusProps {
  health: HealthResponse | null;
  loading: boolean;
}

export const HealthStatus: React.FC<HealthStatusProps> = ({ health, loading }) => {
  if (loading) {
    return (
      <Card sx={{ mb: 3, minWidth: 320, p: 0 }}>
        <CardContent sx={{ py: 1, px: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography color="text.secondary">Loading...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card sx={{ mb: 3, minWidth: 320, p: 0 }}>
        <CardContent sx={{ py: 1, px: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip label="Health check failed" color="error" icon={<ErrorIcon />} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  const isHealthy = health.status === 'healthy';

  return (
    <Card sx={{ mb: 3, minWidth: 320, p: 0 }}>
      <CardContent sx={{ py: 1, px: 2 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          {/* Overall Health */}
          <Chip
            label={isHealthy ? 'Healthy' : 'Unhealthy'}
            color={isHealthy ? 'success' : 'error'}
            icon={isHealthy ? <CheckCircleIcon /> : <ErrorIcon />}
            size="small"
            sx={{ fontWeight: 500 }}
          />
          {/* Database */}
          {health.database && (
            <>
              <DatabaseIcon color="primary" fontSize="small" />
              <Typography variant="body2" fontWeight={500} sx={{ mr: 0.5 }}>
                DB
              </Typography>
              <Chip
                label={health.database}
                color="success"
                size="small"
              />
            </>
          )}
          {/* Scraper */}
          {health.scraper && (
            <>
              {health.scraper.isRunning ? (
                <TrendingUpIcon color="success" fontSize="small" />
              ) : (
                <PauseCircleIcon color="error" fontSize="small" />
              )}
              <Typography variant="body2" fontWeight={500} sx={{ mr: 0.5 }}>
                Scraper
              </Typography>
              <Chip
                label={health.scraper.isRunning ? 'Running' : 'Stopped'}
                color={health.scraper.isRunning ? 'success' : 'error'}
                size="small"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                Active: {health.scraper.activeChains} / {health.scraper.totalChains}
              </Typography>
            </>
          )}
          {/* Scraper Error */}
          {health.scraper?.error && (
            <>
              <WarningIcon color="error" fontSize="small" />
              <Typography variant="body2" color="error" fontWeight={500}>
                {health.scraper.error}
              </Typography>
            </>
          )}
          {/* Last updated */}
          <TimeIcon color="action" fontSize="small" sx={{ ml: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {new Date(health.timestamp).toLocaleString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}; 