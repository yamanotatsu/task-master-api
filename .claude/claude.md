# Task Master - Claude Code Guidelines

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📚 Documentation Structure

For comprehensive project information, refer to the following documents:
- [`project.md`](./project.md) - Project overview, purpose, and features
- [`architecture.md`](./architecture.md) - System architecture and design patterns
- [`api.md`](./api.md) - Complete API documentation and specifications
- [`database.md`](./database.md) - Database schema and design
- [`dependencies.md`](./dependencies.md) - Dependency information and versions
- [`context.md`](./context.md) - Current development context and status

**Important**: When making changes to the codebase that affect architecture, APIs, database schema, or dependencies, please update the corresponding documentation files to keep them synchronized.

## 🚀 Common Development Commands

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
npm run api:db           # Start database-backed API server
npm run api:db:dev       # Start database-backed API with hot reload
```

### Frontend Development
```bash
cd frontend/task-master-ui
npm install              # Install frontend dependencies
npm run dev              # Start Next.js dev server (port 3000)
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

## 🔑 Key Files to Understand

- `/mcp-server/src/core/task-master-core.js` - Core task management logic
- `/scripts/modules/task-manager.js` - CLI task operations
- `/api/routes/` - REST API endpoints
- `/scripts/modules/ai-services-unified.js` - AI provider abstraction
- `/mcp-server/src/tools/` - MCP tool definitions
- `/src/ai-providers/` - Provider-specific AI implementations

## 💡 Development Workflow

When implementing features:
1. Check existing patterns in similar components
2. Add appropriate tests (unit and integration)
3. Update documentation if adding new commands or APIs
4. Ensure MCP server compatibility for editor features
5. Consider multi-provider support for AI operations

## 🧪 Testing Strategy

### API Test Structure
- **Unit Tests** (`/tests/unit/`): Test individual functions with mocked dependencies
- **Integration Tests** (`/tests/integration/`): Test complete workflows
- **E2E Tests** (`/tests/e2e/`): Test full functionality with real data
- **Test Fixtures** (`/tests/fixtures/`): Reusable test data and edge cases

### Running API Tests
```bash
# Run all API tests with detailed output
npm test tests/api/

# Run with specific pattern
npm test tests/api/unit/tasks.test.js

# Generate coverage report
npm run test:coverage -- tests/api/
```

## 🔧 Configuration Management

### Project Configuration (`.taskmasterconfig`)
- Model selections (main, research, fallback)
- AI parameters (temperature, max tokens)
- Project settings (name, version, default subtasks)
- Managed via `task-master models` command

### API Keys (Environment Variables)
- Store in `.env` for CLI usage
- Store in `mcp.json` env section for MCP usage
- Never commit API keys to repository
- Required keys depend on selected AI providers

## 📝 Important Patterns

- **Error Handling**: All AI operations have fallback mechanisms and retry logic
- **File Operations**: Always use absolute paths, maintain backup files (.bak)
- **Testing**: Mock file system operations, use fixtures for consistent test data
- **Async Operations**: Heavy use of async/await for file I/O and AI calls
- **API Response Format**: Consistent structure with `success`, `data`, and `error` fields
- **Silent Mode**: MCP operations wrap console output to prevent interference with JSON responses

## 🔄 Documentation Maintenance

When you make changes:
- **Architecture changes** → Update `architecture.md`
- **API changes** → Update `api.md`
- **Database changes** → Update `database.md`
- **Dependency updates** → Update `dependencies.md`
- **Major feature additions** → Update `project.md` and relevant sections
- **Context changes** → Update `context.md` with current state

Keep all documentation synchronized with code changes to maintain accuracy.