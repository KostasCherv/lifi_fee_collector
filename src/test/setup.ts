// Test setup file for Jest
import { config } from 'dotenv';

// Load environment variables for tests
config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(30000); 