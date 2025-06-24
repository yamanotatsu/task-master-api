# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Task Master is an AI-driven task management system designed for AI-powered development. It consists of:

- **Backend API**: Express.js server with Supabase integration (port 8080)
- **Frontend**: Next.js 15 with React 19 and TypeScript (port 3000)
- **MCP Server**: Model Context Protocol integration for AI tools
- **CLI Tools**: Task management and PRD parsing utilities

## Essential Commands

### Development

```bash
# Install dependencies
npm install

# Start both API and frontend (in separate terminals)
npm run dev:api      # API server on :8080
npm run dev:frontend # Frontend on :3000

# Run tests
npm test             # All tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Code formatting (runs automatically on commit)
npm run format       # Format all files
npm run format-check # Check formatting

# Linting (frontend only)
cd frontend/task-master-ui && npm run lint
```

### Task Management CLI

```bash
# Initialize project
task-master init

# Parse PRD and generate tasks
task-master parse-prd scripts/prd.txt

# Manage tasks
task-master list                            # View all tasks
task-master next                            # Get next task
task-master set-status --id=1 --status=done # Update status
task-master add-task --prompt="description"  # Add new task
task-master expand --id=1                   # Expand task into subtasks
```

## Architecture

### Backend (`/api`)

- **Routes**: Auth, projects, tasks, organizations endpoints
- **Services**: Task generation, PRD analysis, AI integration
- **Middleware**: Security (Helmet), auth, rate limiting, sanitization
- **Database**: Supabase with comprehensive schema in `/supabase/schema.sql`
- **Validation**: Zod schemas for all API endpoints

### Frontend (`/frontend/task-master-ui`)

- **Framework**: Next.js 15 with App Router
- **UI**: Custom components with Radix UI primitives
- **Styling**: Tailwind CSS v4
- **State**: React hooks and Supabase real-time subscriptions
- **Auth**: Supabase Auth with protected routes

### AI Integration (`/src/ai-providers`)

Multiple provider support: Anthropic, OpenAI, Google, Perplexity, xAI, Mistral, Ollama

## Critical Environment Variables

### API (`api/.env.local`)

```
# Supabase (Required)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# AI Provider (at least one required)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=

# Server
API_PORT=8080
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/task-master-ui/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Important Notes

1. **Pre-commit Hook**: Automatically formats code with Prettier on commit
2. **Build Configuration**: Frontend ignores ESLint and TypeScript errors during build
3. **Test Coverage**: Target 80% coverage for all metrics
4. **Database**: Full schema at `/supabase/schema.sql` - includes users, organizations, projects, tasks
5. **Authentication**: All API endpoints require Supabase auth except health check
6. **AI Models**: Configure models in `.taskmasterconfig` file

## Common Tasks

### Adding New API Endpoint

1. Create route in `/api/routes/`
2. Add Zod schema in `/api/schemas/`
3. Implement service logic in `/api/services/`
4. Add tests in `/tests/`

### Adding Frontend Feature

1. Create components in `/frontend/task-master-ui/components/`
2. Add API client functions in `/frontend/task-master-ui/lib/api/`
3. Use existing UI components from `/frontend/task-master-ui/components/ui/`
4. Follow existing patterns for auth and error handling

### Database Changes

1. Modify schema in `/supabase/schema.sql`
2. Update relevant API services
3. Test with local Supabase instance

## Testing Strategy

- Unit tests with Jest for both backend and frontend
- E2E tests available via `npm run test:e2e`
- Coverage requirements: 80% for all metrics
- Mock Supabase client for API tests
