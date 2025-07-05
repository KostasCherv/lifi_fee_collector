import cors from 'cors';
import config from '@/config';

const corsOptions = {
  origin: config.security.corsOrigin,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

export const corsMiddleware = cors(corsOptions); 