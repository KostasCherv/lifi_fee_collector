import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Skeleton,
  Pagination,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  CalendarToday as CalendarIcon,
  OpenInNew as ExternalLinkIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';
import type { Event, ChainsStatusResponse } from '../types/api';

interface EventsProps {
  chainsStatus: ChainsStatusResponse | null;
}

// Map chainId to block explorer base URLs
const BLOCK_EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io', // Ethereum Mainnet
  137: 'https://polygonscan.com', // Polygon
  56: 'https://bscscan.com', // BSC
  10: 'https://optimistic.etherscan.io', // Optimism
  42161: 'https://arbiscan.io', // Arbitrum
  43114: 'https://snowtrace.io', // Avalanche
  100: 'https://gnosisscan.io', // Gnosis
  8453: 'https://basescan.org', // Base
  // Add more as needed
};

const getExplorerTxUrl = (chainId: number, txHash: string) => {
  const base = BLOCK_EXPLORERS[chainId] || 'https://etherscan.io';
  return `${base}/tx/${txHash}`;
};

export const Events: React.FC<EventsProps> = ({ chainsStatus }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    integrator: '',
    chainId: '',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params: {
        page: number;
        limit: number;
        integrator?: string;
        chainId?: number;
        startDate?: string;
        endDate?: string;
      } = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filters.integrator) params.integrator = filters.integrator;
      if (filters.chainId) params.chainId = parseInt(filters.chainId);
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await apiService.getEvents(params);
      setEvents(response.data.events);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchEvents();
  };

  const handleClearFilters = () => {
    setFilters({
      integrator: '',
      chainId: '',
      startDate: '',
      endDate: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCopyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch (error) {
      console.error('Failed to copy hash:', error);
    }
  };

  const getChainName = (chainId: number) => {
    if (!chainsStatus) return `Chain ${chainId}`;
    const chain = chainsStatus.data.chains.find(c => c.chainId === chainId);
    return chain ? chain.name : `Chain ${chainId}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // No formatting needed for fee, just print as string
  const printFee = (fee: string) => fee;

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  if (loading && events.length === 0) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="30%" height={32} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={80} />
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Filters */}
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <FilterIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" color="primary">
              Filters
            </Typography>
          </Box>
          
          <Box component="form" onSubmit={handleFilterSubmit}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
              <TextField
                fullWidth
                label="Integrator Address"
                placeholder="0x..."
                value={filters.integrator}
                onChange={(e) => handleFilterChange('integrator', e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />

              <FormControl fullWidth>
                <InputLabel>Chain</InputLabel>
                <Select
                  value={filters.chainId}
                  label="Chain"
                  onChange={(e) => handleFilterChange('chainId', e.target.value)}
                >
                  <MenuItem value="">All Chains</MenuItem>
                  {chainsStatus?.data.chains.map((chain) => (
                    <MenuItem key={chain.chainId} value={chain.chainId}>
                      {chain.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Start Date"
                type="datetime-local"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />

              <TextField
                fullWidth
                label="End Date"
                type="datetime-local"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Box>

            <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<FilterIcon />}
              >
                Apply Filters
              </Button>
              
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Typography variant="h6" color="primary">
              Latest Events
            </Typography>
            <Chip 
              label={`${pagination.total} events found`} 
              color="primary" 
              variant="outlined"
            />
          </Box>

          {events.length === 0 ? (
            <Alert severity="info" sx={{ textAlign: 'center' }}>
              <Typography variant="body1" gutterBottom>
                No events found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your filters or check back later
              </Typography>
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {events.map((event) => (
                <Card key={event._id} variant="outlined" sx={{ '&:hover': { boxShadow: 2 } }}>
                  <CardContent>
                    <Box display="flex" alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                      <Box flex={1} minWidth={0}>
                        <Box display="flex" alignItems="center" gap={2} mb={2}>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {getChainName(event.chainId)}
                          </Typography>
                          <Chip 
                            label={`Block #${event.blockNumber}`} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>
                        
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3, mb: 2 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Token
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {event.token}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Integrator
                            </Typography>
                            <Typography variant="body2" fontFamily="monospace" fontSize="0.875rem">
                              {event.integrator}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Transaction Hash
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" fontFamily="monospace" fontSize="0.875rem" noWrap>
                                {event.transactionHash}
                              </Typography>
                              <Tooltip title={copiedHash === event.transactionHash ? "Copied!" : "Copy hash"}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleCopyHash(event.transactionHash)}
                                  color={copiedHash === event.transactionHash ? "success" : "default"}
                                >
                                  {copiedHash === event.transactionHash ? <CheckIcon /> : <CopyIcon />}
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                              label={<><b>Integrator Fee</b></>}
                              size="small"
                              sx={{ bgcolor: 'success.lighter', color: 'success.main', fontWeight: 500 }}
                            />
                            <Typography variant="body2" fontWeight="medium" color="success.main" sx={{ ml: 1 }}>
                              {printFee(event.integratorFee)}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                              label={<><b>LiFi Fee</b></>}
                              size="small"
                              sx={{ bgcolor: 'primary.lighter', color: 'primary.main', fontWeight: 500 }}
                            />
                            <Typography variant="body2" fontWeight="medium" color="primary.main" sx={{ ml: 1 }}>
                              {printFee(event.lifiFee)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      
                      <Box minWidth={120} textAlign="right" alignSelf={{ xs: 'flex-end', sm: 'center' }}>
                        <Typography variant="caption" color="text.secondary" display="block" mb={1} sx={{ whiteSpace: 'nowrap' }}>
                          {formatTimestamp(event.timestamp)}
                        </Typography>
                        <Tooltip title="View on Block Explorer">
                          <IconButton
                            size="small"
                            component="a"
                            href={getExplorerTxUrl(event.chainId, event.transactionHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            color="primary"
                          >
                            <ExternalLinkIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4} pt={2}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}; 