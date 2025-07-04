// Test setup file for Jest
import { config } from 'dotenv';
import path from 'path';

// Load environment variables for tests
config({ path: path.resolve(process.cwd(), '.env.test') });

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests unless there's an error
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
}); 