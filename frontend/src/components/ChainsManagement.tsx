import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  CircularProgress
} from '@mui/material';
import { PlayArrow, Stop, CheckCircle, Error as ErrorIcon, TrendingUp as TrendingUpIcon, PauseCircle as PauseCircleIcon, Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import type { ChainsStatusResponse, ChainStatus, Chain } from '../types/api';
import { apiService } from '../services/api';

interface ChainsManagementProps {
  chainsStatus: ChainsStatusResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

const statusIcon = (status: ChainStatus['workerStatus']) => {
  switch (status) {
    case 'running': return <CheckCircle color="success" fontSize="small" />;
    case 'error': return <ErrorIcon color="error" fontSize="small" />;
    case 'starting': return <TrendingUpIcon color="warning" fontSize="small" />;
    default: return <PauseCircleIcon color="disabled" fontSize="small" />;
  }
};

const initialForm = {
  chainId: '',
  name: '',
  rpcUrl: '',
  contractAddress: '',
  startingBlock: '',
  scanInterval: '',
  maxBlockRange: '',
  retryAttempts: '',
};

export const ChainsManagement: React.FC<ChainsManagementProps> = ({
  chainsStatus,
  loading,
  onRefresh,
}) => {
  // Modal state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [updateChainId, setUpdateChainId] = useState<number | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [rowLoading, setRowLoading] = useState<{ [chainId: number]: boolean }>({});

  const handleOpen = () => {
    setForm(initialForm);
    setFormError(null);
    setFormSuccess(null);
    setIsUpdate(false);
    setUpdateChainId(null);
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const handleEdit = async (chain: ChainStatus) => {
    setModalLoading(true);
    setFormError(null);
    setFormSuccess(null);
    setIsUpdate(true);
    setUpdateChainId(chain.chainId);
    setOpen(true);
    try {
      const fullChain = await apiService.getChain(chain.chainId);
      setForm({
        chainId: String(fullChain.chainId),
        name: fullChain.name || '',
        rpcUrl: fullChain.rpcUrl || '',
        contractAddress: fullChain.contractAddress || '',
        startingBlock: fullChain.startingBlock !== undefined ? String(fullChain.startingBlock) : '',
        scanInterval: fullChain.scanInterval !== undefined ? String(fullChain.scanInterval) : '',
        maxBlockRange: fullChain.maxBlockRange !== undefined ? String(fullChain.maxBlockRange) : '',
        retryAttempts: fullChain.retryAttempts !== undefined ? String(fullChain.retryAttempts) : '',
      });
    } catch {
      setFormError('Failed to load chain details');
    } finally {
      setModalLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.chainId || isNaN(Number(form.chainId))) return 'Chain ID is required and must be a number.';
    if (!form.name) return 'Name is required.';
    if (!form.rpcUrl) return 'RPC URL is required.';
    if (!form.contractAddress) return 'Contract address is required.';
    if (!form.startingBlock || isNaN(Number(form.startingBlock))) return 'Starting block is required and must be a number.';
    if (!form.scanInterval || isNaN(Number(form.scanInterval))) return 'Scan interval is required and must be a number.';
    if (!form.maxBlockRange || isNaN(Number(form.maxBlockRange))) return 'Max block range is required and must be a number.';
    if (!form.retryAttempts || isNaN(Number(form.retryAttempts))) return 'Retry attempts is required and must be a number.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    setSubmitting(true);
    try {
      const body: Chain = {
        chainId: Number(form.chainId),
        name: form.name,
        rpcUrl: form.rpcUrl,
        contractAddress: form.contractAddress,
        startingBlock: Number(form.startingBlock),
        scanInterval: Number(form.scanInterval),
        maxBlockRange: Number(form.maxBlockRange),
        retryAttempts: Number(form.retryAttempts),
      };
      let res;
      if (isUpdate && updateChainId !== null) {
        res = await apiService.updateChain(updateChainId, body);
      } else {
        res = await apiService.addChain(body);
      }
      if (res.success) {
        setFormSuccess(isUpdate ? 'Chain updated successfully!' : 'Chain added successfully!');
        setTimeout(() => {
          setOpen(false);
          onRefresh();
        }, 1000);
      } else {
        setFormError(res.message);
        setTimeout(() => {
          setOpen(false);
        }, 1000);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to submit chain');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChainAction = async (chainId: number, action: 'start' | 'stop') => {
    setRowLoading((prev) => ({ ...prev, [chainId]: true }));
    try {
      if (action === 'start') {
        await apiService.startChain(chainId);
      } else {
        await apiService.stopChain(chainId);
      }
      onRefresh();
    } catch {
      // Optionally show error feedback
    } finally {
      setRowLoading((prev) => ({ ...prev, [chainId]: false }));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Add Chain Button */}
      <Box display="flex" justifyContent="flex-end" mb={1}>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpen}>
          Add Chain
        </Button>
      </Box>

      {/* Add/Update Chain Modal */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isUpdate ? 'Update Chain' : 'Add New Chain'}
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {modalLoading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>Loading...</Box>
          ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2
            }}>
              <TextField
                label="Chain ID"
                name="chainId"
                value={form.chainId}
                onChange={handleChange}
                fullWidth
                required
                type="number"
                disabled={isUpdate}
              />
              <TextField
                label="Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                fullWidth
                required
              />
              <TextField
                label="RPC URL"
                name="rpcUrl"
                value={form.rpcUrl}
                onChange={handleChange}
                fullWidth
                required
              />
              <TextField
                label="Contract Address"
                name="contractAddress"
                value={form.contractAddress}
                onChange={handleChange}
                fullWidth
                required
              />
              <TextField
                label="Starting Block"
                name="startingBlock"
                value={form.startingBlock}
                onChange={handleChange}
                fullWidth
                required
                type="number"
              />
              <TextField
                label="Scan Interval (ms)"
                name="scanInterval"
                value={form.scanInterval}
                onChange={handleChange}
                fullWidth
                required
                type="number"
              />
              <TextField
                label="Max Block Range"
                name="maxBlockRange"
                value={form.maxBlockRange}
                onChange={handleChange}
                fullWidth
                required
                type="number"
              />
              <TextField
                label="Retry Attempts"
                name="retryAttempts"
                value={form.retryAttempts}
                onChange={handleChange}
                fullWidth
                required
                type="number"
              />
            </Box>
            {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
            {formSuccess && <Alert severity="success" sx={{ mt: 2 }}>{formSuccess}</Alert>}
            <DialogActions sx={{ mt: 2 }}>
              <Button onClick={handleClose} color="secondary" disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" color="primary" disabled={submitting} sx={{ minWidth: 120 }}>
                {submitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  isUpdate ? 'Update Chain' : 'Add Chain'
                )}
              </Button>
            </DialogActions>
          </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Chains Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, textAlign: 'left' }}>
            Chains
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Chain Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Block</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chainsStatus?.data.chains.map((chain) => (
                  <TableRow key={chain.chainId}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={500}>{chain.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {statusIcon(chain.workerStatus)}
                        <Typography
                          variant="body2"
                          color={
                            chain.workerStatus === 'running'
                              ? 'success.main'
                              : chain.workerStatus === 'error'
                              ? 'error.main'
                              : chain.workerStatus === 'starting'
                              ? 'warning.main'
                              : 'text.secondary'
                          }
                          fontWeight={500}
                        >
                          {chain.workerStatus.charAt(0).toUpperCase() + chain.workerStatus.slice(1)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {chain.lastProcessedBlock ? chain.lastProcessedBlock.toLocaleString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" gap={1} justifyContent="flex-end" alignItems="center">
                        {rowLoading[chain.chainId] ? (
                          <CircularProgress size={24} />
                        ) : <>
                          {chain.workerStatus === 'running' ? (
                            <Tooltip title="Stop Chain">
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<Stop />}
                                onClick={() => handleChainAction(chain.chainId, 'stop')}
                                disabled={loading || !!rowLoading[chain.chainId]}
                              >
                                Stop
                              </Button>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Start Chain">
                              <Button
                                variant="outlined"
                                color="success"
                                size="small"
                                startIcon={<PlayArrow />}
                                onClick={() => handleChainAction(chain.chainId, 'start')}
                                disabled={loading || !!rowLoading[chain.chainId]}
                              >
                                Start
                              </Button>
                            </Tooltip>
                          )}
                          <Tooltip title="Update Chain">
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              onClick={() => handleEdit(chain)}
                              disabled={loading || !!rowLoading[chain.chainId]}
                            >
                              Update
                            </Button>
                          </Tooltip>
                        </>}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {(!chainsStatus || chainsStatus.data.chains.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No chains found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {chainsStatus && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary" gutterBottom>
                {chainsStatus.data.summary.totalChains}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Chains
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" gutterBottom>
                {chainsStatus.data.summary.activeChains}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Chains
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" gutterBottom>
                {chainsStatus.data.summary.runningWorkers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Running Workers
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error" gutterBottom>
                {chainsStatus.data.summary.errorWorkers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Error Workers
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}; 