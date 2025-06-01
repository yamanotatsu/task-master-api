# Task Master API Test Suite

This directory contains comprehensive tests for the Task Master REST API. The test suite covers all API endpoints, edge cases, error scenarios, and end-to-end workflows.

## Overview

The test suite is organized into two main test files:

1. **comprehensive-api.test.js** - Tests all API endpoints with standard use cases
2. **edge-cases.test.js** - Tests edge cases, error scenarios, and boundary conditions

## Prerequisites

- Node.js 14+ installed
- Jest testing framework (installed via npm)
- Anthropic API key (hardcoded in tests as provided)

## Running the Tests

### Quick Start

```bash
# Run all API tests
npm test tests/integration/api/

# Run only comprehensive tests
npm test tests/integration/api/comprehensive-api.test.js

# Run only edge case tests
npm test tests/integration/api/edge-cases.test.js

# Run with coverage
npm run test:coverage -- tests/integration/api/
```

### Using the Test Runner Script

A convenience script is provided to run all tests with proper setup:

```bash
# Make the script executable (first time only)
chmod +x tests/integration/api/run-api-tests.sh

# Run all tests (will start API server if needed)
./tests/integration/api/run-api-tests.sh

# Run tests with existing API server
./tests/integration/api/run-api-tests.sh --no-server
```

## Test Coverage

### Comprehensive API Tests

The comprehensive test suite covers:

1. **Health Check**
   - Server health endpoint

2. **PRD Processing**
   - Generate tasks from PRD content
   - Input validation
   - AI integration

3. **Task Management**
   - List all tasks (with filtering)
   - Get specific task
   - Create new task
   - Update task
   - Update task status
   - Delete task

4. **Task Expansion**
   - Expand single task with AI
   - Expand all tasks
   - Clear subtasks

5. **Subtask Management**
   - Add subtask
   - Update subtask
   - Remove subtask

6. **Dependency Management**
   - Add dependency
   - Remove dependency
   - Validate dependencies
   - Fix dependencies
   - Circular dependency prevention

7. **Analysis Endpoints**
   - Get next task recommendation
   - Analyze task complexity
   - Get complexity report

8. **Project Management**
   - Initialize project
   - Generate task files

9. **End-to-End Workflow**
   - Complete workflow from PRD to task completion

### Edge Cases and Error Scenarios

The edge cases test suite covers:

1. **Input Validation**
   - Long titles
   - Special characters
   - Empty/whitespace inputs
   - Boundary values
   - Invalid data types

2. **Concurrency**
   - Concurrent task creation
   - Concurrent updates
   - Race conditions

3. **PRD Processing Edge Cases**
   - Empty PRD
   - Very short PRD
   - Technical jargon
   - Large PRD content

4. **Dependency Graph**
   - Self-dependencies
   - Complex circular dependencies
   - Deep dependency chains

5. **Status Transitions**
   - Invalid transitions
   - Rapid status changes

6. **Subtask Management**
   - Subtask limits
   - Nested references

7. **AI Provider Issues**
   - Rate limiting
   - Malformed responses

8. **Internationalization**
   - Unicode support
   - Mixed direction text (RTL/LTR)
   - Various languages

## Test Data

### Sample PRD

A sample PRD file is included for testing: `tests/fixtures/sample-prd-api-test.txt`

This PRD describes an e-commerce platform MVP with comprehensive requirements that exercise all aspects of the task generation system.

### API Key

The Anthropic API key is hardcoded in the tests as provided:
```
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
```

## Test Dependencies

The tests follow a logical order to respect API dependencies:

1. First, generate tasks from PRD
2. Use generated tasks for CRUD operations
3. Test subtask operations on existing tasks
4. Test dependency operations between tasks
5. Test analysis on populated data

## Assertions and Expectations

Each test includes comprehensive assertions for:

- HTTP status codes
- Response structure
- Data integrity
- Error messages
- Side effects

## Timeout Configuration

Some tests have extended timeouts for AI operations:
- PRD processing: 30 seconds
- Task expansion: 20 seconds
- Full workflow: 60 seconds

## Error Handling

The tests verify proper error handling for:
- Invalid inputs (400 errors)
- Missing resources (404 errors)
- Rate limiting (429 errors)
- Server errors (500 errors)

## Best Practices

1. **Test Isolation**: Each test suite can run independently
2. **Data Cleanup**: Tests clean up after themselves
3. **Descriptive Names**: Test names clearly describe what they test
4. **Comprehensive Coverage**: Both happy path and error cases
5. **Performance**: Tests run efficiently with appropriate timeouts

## Debugging

To debug failing tests:

```bash
# Run tests in watch mode
npm run test:watch -- tests/integration/api/

# Run specific test by name
npm test -- tests/integration/api/comprehensive-api.test.js -t "should generate tasks from PRD"

# Run with verbose output
npm test -- tests/integration/api/ --verbose
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions configuration
- name: Run API Tests
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    npm install
    npm run api &
    sleep 5
    npm test tests/integration/api/
```

## Contributing

When adding new API endpoints:

1. Add tests to `comprehensive-api.test.js` for standard cases
2. Add tests to `edge-cases.test.js` for error scenarios
3. Update this README with the new coverage
4. Ensure tests pass before submitting PR

## Troubleshooting

### Common Issues

1. **Port already in use**: The tests use port 0 (random port) to avoid conflicts
2. **API key issues**: Ensure the Anthropic API key is valid
3. **Timeout errors**: Increase timeout for slow connections
4. **Memory issues**: Run tests individually if system has limited memory

### Test Failures

If tests fail:
1. Check API server logs for errors
2. Verify environment variables are set
3. Ensure all dependencies are installed
4. Check network connectivity for AI API calls

## Future Improvements

- Add performance benchmarking
- Add load testing scenarios
- Add security testing (authentication/authorization when implemented)
- Add contract testing with OpenAPI/Swagger
- Add visual regression testing for generated outputs