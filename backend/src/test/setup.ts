// Test setup file for Jest
import { config } from 'dotenv';
import path from 'path';

// Load environment variables for tests
config({ path: path.resolve(process.cwd(), 'env.test') });

// Set test environment
process.env['NODE_ENV'] = 'test'; 