# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Run tests
npm test                  # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report (target: 80%)
npm run test:fails       # Run only failing tests

# Run specific test categories
npm test tests/api        # Run API tests only
npm test tests/unit       # Run unit tests only
npm test tests/integration # Run integration tests only

# Run end-to-end tests
npm run test:e2e         # Run full e2e test suite
npm run test:e2e-report  # Run e2e tests with analysis report

# Code formatting
npm run format           # Format all code
npm run format-check     # Check code formatting

# Start servers
npm run mcp-server       # Start MCP server for editor integration
npm run api              # Start REST API server
npm run api:dev          # Start API server with hot reload
```

### Frontend Development
```bash
cd frontend/task-master-ui
npm install              # Install frontend dependencies
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run lint             # Run ESLint
```

### Testing Individual Components
```bash
# Run specific test file
npm test path/to/test.js

# Run tests matching pattern
npm test -- --testNamePattern="pattern"

# Debug tests
node --inspect-brk --experimental-vm-modules node_modules/.bin/jest --runInBand
```

## Architecture Overview

Task Master is an AI-driven task management system with multiple interfaces:

### Core Components
- **CLI Tool** (`/scripts/`) - Command-line interface for task management
- **MCP Server** (`/mcp-server/`) - Model Control Protocol server for editor integration
- **REST API** (`/api/`) - HTTP API for web frontends and third-party integrations
- **Frontend UI** (`/frontend/task-master-ui/`) - Next.js web interface
- **AI Services** (`/src/ai-providers/`) - Unified interface for multiple AI providers

### Data Flow
1. **Task Storage**: Central `tasks.json` file in project directories stores all task metadata
2. **Task Details**: Individual `task_XXX.txt` files contain detailed task descriptions
3. **Configuration**: `.taskmasterconfig` for project settings, environment variables for API keys
4. **State Management**: Tasks have status (not-started, in-progress, completed) and can have subtasks

### Key Integration Points
- **MCP Integration**: Uses FastMCP library, configured via mcp.json in editor configs
- **AI Providers**: Supports Anthropic, OpenAI, Google, Perplexity, xAI, OpenRouter, Ollama
- **Task Processing**: PRD parsing, complexity analysis, task expansion, dependency management

### API Architecture Patterns

The API implementation has two versions:

1. **Standard Implementation** (`/api/routes/*.js`):
   - Direct imports of core functions
   - Tightly coupled with implementation
   - Simpler structure for production use

2. **Dependency Injection Implementation** (`/api/routes/*-di.js`):
   - Uses dependency injection pattern for better testability
   - All dependencies injected via factory functions
   - Enables easy mocking for comprehensive testing
   - Production uses `createProductionDependencies()` from `/api/utils/dependency-factory.js`
   - Tests use `createTestDependencies()` with mocked functions

### Important Patterns
- **Error Handling**: All AI operations have fallback mechanisms and retry logic
- **File Operations**: Always use absolute paths, maintain backup files (.bak)
- **Testing**: Mock file system operations, use fixtures for consistent test data
- **Async Operations**: Heavy use of async/await for file I/O and AI calls
- **API Response Format**: Consistent structure with `success`, `data`, and `error` fields

## Development Workflow

When implementing features:
1. Check existing patterns in similar components
2. Add appropriate tests (unit and integration)
3. Update documentation if adding new commands or APIs
4. Ensure MCP server compatibility for editor features
5. Consider multi-provider support for AI operations

## Key Files to Understand
- `/mcp-server/src/core/task-master-core.js` - Core task management logic
- `/scripts/modules/task-manager.js` - CLI task operations
- `/api/routes/` - REST API endpoints (both standard and DI versions)
- `/scripts/modules/ai-services-unified.js` - AI provider abstraction
- `/mcp-server/src/tools/` - MCP tool definitions
- `/api/utils/dependency-factory.js` - Dependency injection factory for API testing

## Testing Strategy

### API Test Structure
- **Unit Tests** (`/tests/api/unit/`): Test individual route handlers with mocked dependencies
- **Integration Tests** (`/tests/api/integration/`): Test complete workflows
- **E2E Tests** (`/tests/api/e2e/`): Test full API functionality with in-memory data
- **Test Fixtures** (`/tests/api/fixtures/`): Reusable test data and edge cases
- **Mock Implementations** (`/tests/api/__mocks__/`): Mocked core functions

### Running API Tests
```bash
# Run all API tests with detailed output
npm test tests/api/

# Run with specific pattern
npm test tests/api/unit/tasks-di.test.js

# Generate coverage report
npm run test:coverage -- tests/api/
```

## API Development

The REST API provides programmatic access to all Task Master features:

### Key Endpoints
- **Task Generation**: `POST /api/v1/generate-tasks-from-prd` - Generate tasks from PRD using AI
- **Task CRUD**: Standard REST operations on `/api/v1/tasks`
- **Subtasks**: Manage subtasks via `/api/v1/tasks/:id/subtasks`
- **Dependencies**: Handle task dependencies via `/api/v1/tasks/:id/dependencies`
- **AI Operations**: Task expansion, complexity analysis via dedicated endpoints

### Starting the API Server
```bash
npm run api              # Production mode
npm run api:dev          # Development mode with auto-reload
```

Default port is 3000 (configurable via `API_PORT` environment variable)