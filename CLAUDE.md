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

### Important Patterns
- **Error Handling**: All AI operations have fallback mechanisms and retry logic
- **File Operations**: Always use absolute paths, maintain backup files (.bak)
- **Testing**: Mock file system operations, use fixtures for consistent test data
- **Async Operations**: Heavy use of async/await for file I/O and AI calls

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
- `/api/routes/` - REST API endpoints
- `/scripts/modules/ai-services-unified.js` - AI provider abstraction
- `/mcp-server/src/tools/` - MCP tool definitions