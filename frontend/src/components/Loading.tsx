import React from 'react';
import { Box, Card, Typography, CircularProgress } from '@mui/material';

interface LoadingProps {
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Loading...' }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}
    >
      <Card sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {message}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              animation: 'bounce 1.4s ease-in-out infinite both',
              '&:nth-of-type(1)': { animationDelay: '-0.32s' },
              '&:nth-of-type(2)': { animationDelay: '-0.16s' },
              '@keyframes bounce': {
                '0%, 80%, 100%': {
                  transform: 'scale(0)',
                },
                '40%': {
                  transform: 'scale(1)',
                },
              },
            }}
          />
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              animation: 'bounce 1.4s ease-in-out infinite both',
              '&:nth-of-type(1)': { animationDelay: '-0.32s' },
              '&:nth-of-type(2)': { animationDelay: '-0.16s' },
              '@keyframes bounce': {
                '0%, 80%, 100%': {
                  transform: 'scale(0)',
                },
                '40%': {
                  transform: 'scale(1)',
                },
              },
            }}
          />
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              animation: 'bounce 1.4s ease-in-out infinite both',
              '&:nth-of-type(1)': { animationDelay: '-0.32s' },
              '&:nth-of-type(2)': { animationDelay: '-0.16s' },
              '@keyframes bounce': {
                '0%, 80%, 100%': {
                  transform: 'scale(0)',
                },
                '40%': {
                  transform: 'scale(1)',
                },
              },
            }}
          />
        </Box>
      </Card>
    </Box>
  );
}; 