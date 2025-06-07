# Authentication API Test Suite

This directory contains comprehensive tests for the Task Master authentication system, including authentication endpoints, organization management, security measures, and integration flows.

## Test Structure

```
tests/api/
├── README.md                 # This file - test documentation
├── setup.js                  # Global test setup and configuration
├── auth.test.js              # Authentication endpoint tests
├── organizations.test.js     # Organization management tests
├── security.test.js          # Security and rate limiting tests
├── integration.test.js       # End-to-end integration tests
└── config/
    ├── test-db.js            # Database setup and utilities
    ├── auth-helpers.js       # Authentication test helpers
    └── mock-data.js          # Mock data generators
```

## Test Categories

### 1. Authentication Tests (`auth.test.js`)
- **Signup**: User registration with validation
- **Login**: Authentication with credentials
- **Logout**: Session termination
- **Token Refresh**: JWT token renewal
- **Password Reset**: Password recovery flows
- **Account Deletion**: User account removal

**Key Features Tested:**
- Input validation (email format, password strength)
- Error handling (duplicate emails, invalid credentials)
- Response format consistency
- Edge cases and malformed requests

### 2. Organization Tests (`organizations.test.js`)
- **Organization CRUD**: Create, read, update organizations
- **Member Management**: Invite, list, update, remove members
- **Role-Based Access**: Admin vs member permissions
- **Authorization**: Cross-organization security

**Key Features Tested:**
- Permission enforcement
- Invitation system
- Member role management
- Data isolation between organizations

### 3. Security Tests (`security.test.js`)
- **Rate Limiting**: Protection against brute force attacks
- **Input Sanitization**: XSS and injection prevention
- **SQL Injection**: Protection against SQL attacks
- **NoSQL Injection**: Protection against NoSQL attacks
- **Security Headers**: CSP and other security headers
- **Request Size Limits**: Protection against large payloads

**Key Features Tested:**
- Authentication endpoint rate limits (5 attempts/15min)
- Password reset rate limits (3 attempts/1min)
- Input sanitization and validation
- Security header presence
- Error information disclosure prevention

### 4. Integration Tests (`integration.test.js`)
- **Complete User Flows**: End-to-end user journeys
- **Multi-User Scenarios**: Organization collaboration workflows
- **Error Recovery**: Session expiration and token refresh
- **Concurrent Operations**: Race condition handling
- **Cross-Organization Security**: Data isolation verification

**Key Features Tested:**
- Full user registration and setup workflow
- Multi-user organization management
- Authentication error recovery
- Performance and reliability
- Data consistency across operations

## Prerequisites

### Required Dependencies
```bash
npm install --save-dev \
  jest \
  supertest \
  @supabase/supabase-js \
  jsonwebtoken \
  bcryptjs \
  express \
  express-rate-limit \
  helmet
```

### Environment Setup
Create a `.env.test` file with test environment variables:

```env
NODE_ENV=test
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key
JWT_SECRET=test-jwt-secret-key
APP_URL=http://localhost:3000
```

### Database Setup
1. **Local Supabase**: Run Supabase locally for testing
   ```bash
   npx supabase start
   ```

2. **Test Database**: Ensure test database schema is applied
   ```bash
   npx supabase db push --local
   ```

## Running Tests

### Run All Authentication Tests
```bash
npm test tests/api/
```

### Run Specific Test Suites
```bash
# Authentication endpoint tests
npm test tests/api/auth.test.js

# Organization management tests
npm test tests/api/organizations.test.js

# Security tests
npm test tests/api/security.test.js

# Integration tests
npm test tests/api/integration.test.js
```

### Run Tests with Coverage
```bash
npm run test:coverage -- tests/api/
```

### Run Tests in Watch Mode
```bash
npm run test:watch -- tests/api/
```

### Run Only Failed Tests
```bash
npm run test:fails -- tests/api/
```

## Test Configuration

### Jest Configuration
Tests use the project's Jest configuration with these additions:
- **Test Environment**: Node.js
- **Setup Files**: `tests/api/setup.js`
- **Test Timeout**: 30 seconds for database operations
- **Module Paths**: Absolute imports with `@/` prefix

### Test Database
- **Isolation**: Each test suite cleans up after itself
- **Transactions**: Tests use cleanup functions to ensure isolation
- **Seeding**: Base test data is seeded before each test
- **Mocking**: Database operations are mocked for unit tests

## Writing New Tests

### Test Structure Template
```javascript
import { jest } from '@jest/globals';
import request from 'supertest';
import { 
  setupTestDatabase, 
  cleanupTestData, 
  createTestUser 
} from './config/test-db.js';
import { expectSuccessResponse, expectErrorResponse } from './config/auth-helpers.js';

describe('Feature Tests', () => {
  let app;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createTestApp();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Success Cases', () => {
    it('should handle valid input', async () => {
      const response = await request(app)
        .post('/api/endpoint')
        .send({ valid: 'data' })
        .expect(200);

      expectSuccessResponse(response, 200);
    });
  });

  describe('Error Cases', () => {
    it('should reject invalid input', async () => {
      const response = await request(app)
        .post('/api/endpoint')
        .send({ invalid: 'data' })
        .expect(400);

      expectErrorResponse(response, 'ERROR_CODE', 400);
    });
  });
});
```

### Helper Functions
Use the provided helper functions for common operations:

```javascript
// Database helpers
const user = await createTestUser({ email: 'test@example.com' });
const tokens = await loginTestUser(user);
const { organization } = await createTestOrganization(user);

// Authentication helpers
const headers = createAuthHeaders(token);
const mockMiddleware = mockAuthMiddleware({ id: 'user-id' });

// Assertion helpers
expectSuccessResponse(response, 200);
expectErrorResponse(response, 'AUTH_INVALID_CREDENTIALS', 401);
expectValidationErrorResponse(response, ['email', 'password']);

// Security test helpers
const results = await simulateRateLimitRequests(requestFn, 10);
const xssPayloads = securityTestPayloads.xss;
```

## Test Data Management

### User Creation
```javascript
const user = await createTestUser({
  email: 'test@example.com',
  password: 'SecurePass123!',
  fullName: 'Test User'
});
```

### Organization Setup
```javascript
const { organization, membership } = await createTestOrganization(adminUser, {
  name: 'Test Organization',
  description: 'Test description'
});
```

### Token Management
```javascript
const tokens = await loginTestUser(user);
const { accessToken, refreshToken } = tokens;
```

## Debugging Tests

### Enable Debug Logging
```bash
DEBUG=test:* npm test tests/api/
```

### Run Single Test
```bash
npm test -- --testNamePattern="should create user"
```

### Verbose Output
```bash
npm test -- --verbose tests/api/auth.test.js
```

### Test Coverage Report
```bash
npm run test:coverage -- tests/api/
open coverage/lcov-report/index.html
```

## Common Issues and Solutions

### Database Connection Issues
- Ensure Supabase is running locally
- Check environment variables are set correctly
- Verify database schema is up to date

### Test Timeouts
- Increase Jest timeout in test files: `jest.setTimeout(60000)`
- Check for hanging promises or database connections
- Use `--detectOpenHandles` to find leaks

### Authentication Failures
- Verify test user creation
- Check token generation and validation
- Ensure proper cleanup between tests

### Rate Limiting Issues
- Tests may fail if rate limits are hit
- Ensure proper cleanup of rate limit state
- Use different test users for rate limit tests

## Continuous Integration

### GitHub Actions Example
```yaml
name: Authentication Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          npm run db:setup:test
      
      - name: Run authentication tests
        run: npm test tests/api/
        env:
          SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_ROLE_KEY }}
```

## Performance Considerations

### Test Execution Time
- Authentication tests: ~30 seconds
- Organization tests: ~45 seconds
- Security tests: ~60 seconds (includes rate limiting)
- Integration tests: ~90 seconds

### Optimization Tips
- Use `--maxWorkers=4` for parallel execution
- Run security tests separately due to rate limiting
- Use database transactions for faster cleanup
- Mock external services where possible

## Security Testing Notes

### Rate Limiting Tests
- Tests simulate real attack scenarios
- May take longer due to time-based limits
- Use separate test instances to avoid conflicts

### Input Validation Tests
- Comprehensive XSS payload testing
- SQL and NoSQL injection prevention
- Path traversal attack simulation

### Authentication Security
- Brute force protection verification
- Token expiration and refresh testing
- Session management validation

## Maintenance

### Updating Tests
1. Update test data when schema changes
2. Add new test cases for new features
3. Update security tests for new vulnerabilities
4. Maintain test documentation

### Test Data Cleanup
- Review and clean up unused test utilities
- Update mock data to match current schema
- Remove deprecated test cases

### Performance Monitoring
- Monitor test execution times
- Identify and optimize slow tests
- Balance between test coverage and speed