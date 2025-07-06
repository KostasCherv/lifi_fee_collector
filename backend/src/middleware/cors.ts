import cors from 'cors';
import config from '@/config';

const corsOptions = {
  origin: config.security.corsOrigin,
  credentials: true,
  methods: ["*"],
  allowedHeaders: ["*"],
};

export const corsMiddleware = cors(corsOptions); 