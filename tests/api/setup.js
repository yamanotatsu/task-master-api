import { jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { setupTestDatabase, cleanupTestData } from './config/test-db.js';

/**
 * Global test setup for authentication API tests
 * This file is run once before all tests in the suite
 */

// Set test timeout to 30 seconds for database operations
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  process.env.APP_URL = process.env.APP_URL || 'http://localhost:3000';

  // Setup test database
  try {
    await setupTestDatabase();
    console.log('Test database setup completed');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
});

// Global test cleanup
afterAll(async () => {
  try {
    await cleanupTestData();
    console.log('Test cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup test data:', error);
    // Don't throw here to avoid masking test failures
  }
});

// Mock console methods in test environment to reduce noise
if (process.env.NODE_ENV === 'test') {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  };

  // Mock console methods but allow error logging for debugging
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: originalConsole.error // Keep error logging for debugging
  };
}

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in tests
});

// Helper to suppress console output during tests
global.suppressConsole = () => {
  const originalMethods = {};
  ['log', 'warn', 'info', 'error'].forEach(method => {
    originalMethods[method] = console[method];
    console[method] = jest.fn();
  });

  return () => {
    Object.keys(originalMethods).forEach(method => {
      console[method] = originalMethods[method];
    });
  };
};

// Helper to restore console output
global.restoreConsole = () => {
  ['log', 'warn', 'info', 'error'].forEach(method => {
    if (jest.isMockFunction(console[method])) {
      console[method].mockRestore();
    }
  });
};

export default {
  setupTestDatabase,
  cleanupTestData
};