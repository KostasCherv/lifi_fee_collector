import winston from 'winston';
import path from 'path';
import config from '@/config';

// Create logs directory if it doesn't exist
const logsDir = path.dirname(config.logging.filePath);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'fee-collector-scraper' },
  transports: [
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: config.logging.filePath,
    }),
  ],
});

logger.add(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
}));
