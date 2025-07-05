import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Tabs, 
  Tab, 
  Box,
  Container,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  List as ListIcon
} from '@mui/icons-material';
import { ChainsManagement } from './ChainsManagement';
import { Events } from './Events';
import { Loading } from './Loading';
import { apiService } from '../services/api';
import type { HealthResponse, ChainsStatusResponse } from '../types/api';
import { HealthStatus } from './HealthStatus';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const Dashboard: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [chainsStatus, setChainsStatus] = useState<ChainsStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const fetchData = async () => {
    try {
      const [healthData, chainsData] = await Promise.all([
        apiService.getHealth(),
        apiService.getChainsStatus(),
      ]);
      setHealth(healthData);
      setChainsStatus(chainsData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return <Loading message="Loading dashboard..." />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box flex={1} minWidth={220}>
              <Typography variant="h4" component="h1" color="primary" gutterBottom>
                LI.FI Fee Collector
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Monitor and manage multi-chain event scraping
              </Typography>
            </Box>
            <Box flexShrink={0} minWidth={320}>
              <HealthStatus health={health} loading={refreshing} />
            </Box>
            <Tooltip title="Refresh data">
              <IconButton
                onClick={handleRefresh}
                disabled={refreshing}
                color="primary"
                size="large"
                sx={{ alignSelf: 'flex-start' }}
              >
                <RefreshIcon 
                  sx={{ 
                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }} 
                />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="dashboard tabs"
          >
            <Tab 
              icon={<ListIcon />} 
              label="Events" 
              iconPosition="start"
            />
            <Tab 
              icon={<SettingsIcon />} 
              label="Chains Management" 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Events chainsStatus={chainsStatus} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <ChainsManagement
            chainsStatus={chainsStatus}
            loading={refreshing}
            onRefresh={handleRefresh}
          />
        </TabPanel>
      </Card>
    </Container>
  );
}; 