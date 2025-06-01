// API Test Setup
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set test environment
process.env.NODE_ENV = 'test';

// Set the Anthropic API key
process.env.ANTHROPIC_API_KEY = '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';

// Disable console logs during tests (optional)
if (process.env.DISABLE_TEST_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };
}

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to generate unique test data
  generateUniqueId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Helper to create test task data
  createTestTask: (overrides = {}) => ({
    title: `Test Task ${Date.now()}`,
    description: 'This is a test task',
    priority: 'medium',
    dependencies: [],
    ...overrides
  }),
  
  // Helper to create test PRD
  createTestPRD: (size = 'small') => {
    const templates = {
      small: 'Build a simple TODO application with basic CRUD operations',
      medium: `
        # Project Management Tool
        Build a web-based project management tool with:
        - User authentication
        - Project creation and management
        - Task assignment and tracking
        - Basic reporting
      `,
      large: `
        # Enterprise Resource Planning System
        
        ## Overview
        Develop a comprehensive ERP system for medium-sized businesses.
        
        ## Core Modules
        1. Human Resources Management
        2. Financial Management
        3. Supply Chain Management
        4. Customer Relationship Management
        5. Business Intelligence and Analytics
        
        ## Technical Requirements
        - Microservices architecture
        - Multi-tenant support
        - Real-time data synchronization
        - Mobile applications
        - API-first design
      `
    };
    
    return templates[size] || templates.small;
  }
};

// Increase timeout for CI environments
if (process.env.CI) {
  jest.setTimeout(60000); // 60 seconds for CI
}

// Clean up after all tests
afterAll(async () => {
  // Give time for any pending async operations
  await global.testUtils.wait(100);
});