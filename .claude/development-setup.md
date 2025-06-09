# Claude Task Master Development Setup Guide

## Prerequisites

### Required Software
- **Node.js**: v20.18.0 or higher
- **PostgreSQL**: v14+ or Supabase CLI
- **Git**: Latest version
- **npm**: v10+ (comes with Node.js)

### Recommended Tools
- **VS Code**: With recommended extensions
- **Docker**: For local PostgreSQL (optional)
- **Postman/Insomnia**: For API testing
- **pgAdmin**: For database management

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/claude-task-master.git
cd claude-task-master
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install API dependencies
cd api
npm install

# Install frontend dependencies
cd ../frontend/task-master-ui
npm install
cd ../..
```

### 3. Database Setup

#### Option A: Using Supabase (Recommended)

1. Create a Supabase project at https://supabase.com
2. Get your project URL and keys
3. Run migrations:

```bash
# From project root
cd supabase
# Apply all migrations in order
psql -h [your-db-host] -U postgres -d postgres -f migrations/[migration-file].sql
```

#### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create database:

```bash
createdb claude_task_master
```

3. Run migrations:

```bash
cd supabase
psql -d claude_task_master -f schema.sql
# Then run all migration files in order
```

### 4. Environment Configuration

#### API Environment (.env)

Create `api/.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/claude_task_master
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Server
PORT=3001
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# AI Providers (optional for local dev)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Email (optional)
EMAIL_FROM=noreply@claudetaskmaster.com
SENDGRID_API_KEY=...

# Security
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=10

# Google reCAPTCHA (optional)
RECAPTCHA_SITE_KEY=...
RECAPTCHA_SECRET_KEY=...
```

#### Frontend Environment (.env.local)

Create `frontend/task-master-ui/.env.local`:

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App
NEXT_PUBLIC_APP_NAME=Claude Task Master
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Running the Application

### Development Mode

#### 1. Start the API Server

```bash
cd api
npm run dev
# Server starts on http://localhost:3001
```

#### 2. Start the Frontend

```bash
cd frontend/task-master-ui
npm run dev
# App starts on http://localhost:3000
```

#### 3. Start the MCP Server (Optional)

```bash
cd mcp-server
npm start
# MCP server starts on configured port
```

### Using the Development CLI

```bash
# From project root
npm run dev
# Interactive CLI for local task management
```

## Database Migrations

### Creating New Migrations

1. Create a new file in `supabase/migrations/`:
```bash
touch supabase/migrations/$(date +%Y%m%d)_description.sql
```

2. Write your migration:
```sql
-- Description of changes
BEGIN;

-- Your SQL here

COMMIT;
```

3. Apply the migration:
```bash
psql -d your_database -f supabase/migrations/your_migration.sql
```

### Migration Best Practices

- Always use transactions
- Include rollback instructions in comments
- Test migrations on a copy first
- Version control all migrations
- Never modify existing migrations

## Testing

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# API tests
cd api && npm test

# Frontend tests
cd frontend/task-master-ui && npm test
```

### Test Database

Create a separate test database:

```bash
createdb claude_task_master_test
# Apply schema
psql -d claude_task_master_test -f supabase/schema.sql
```

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes
# Write tests
# Run tests
npm test

# Commit changes
git add .
git commit -m "feat: add new feature"
```

### 2. Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run typecheck
```

### 3. Pre-commit Checks

Install pre-commit hooks:

```bash
npm run prepare
```

This runs:
- ESLint
- Prettier
- Tests
- Type checking

## Common Development Tasks

### Adding a New API Endpoint

1. Create route file in `api/routes/`
2. Add validation schema in `api/schemas/`
3. Implement business logic
4. Add tests
5. Update API documentation

### Adding a Frontend Component

1. Create component in appropriate directory
2. Add TypeScript types
3. Write component tests
4. Update Storybook (if applicable)
5. Use in pages/features

### Database Schema Changes

1. Create migration file
2. Update TypeScript types
3. Update API validators
4. Test with existing data
5. Document changes

## Debugging

### API Debugging

```bash
# Enable debug logs
DEBUG=* npm run dev

# Inspect database queries
DATABASE_LOG=true npm run dev
```

### Frontend Debugging

- Use React Developer Tools
- Enable source maps in development
- Check browser console for errors
- Use Redux DevTools (if applicable)

### Database Debugging

```sql
-- Check active connections
SELECT * FROM pg_stat_activity;

-- View query performance
EXPLAIN ANALYZE [your query];

-- Check table sizes
SELECT pg_size_pretty(pg_relation_size('table_name'));
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3001
# Kill process
kill -9 [PID]
```

#### Database Connection Failed
- Check DATABASE_URL format
- Ensure PostgreSQL is running
- Verify credentials
- Check firewall/network

#### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Errors
```bash
# Rebuild TypeScript
npm run build:types
```

## Performance Profiling

### API Performance

```javascript
// Add to server.js for request timing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${duration}ms`);
  });
  next();
});
```

### Database Performance

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Check slow queries
SELECT * FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

## VS Code Configuration

### Recommended Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "streetsidesoftware.code-spell-checker",
    "christian-kohler.path-intellisense"
  ]
}
```

### Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.updateImportsOnFileMove.enabled": "always"
}
```

## Additional Resources

- [API Documentation](./api-reference.md)
- [Database Schema](./database-schema.md)
- [Security Guide](./security-guide.md)
- [Architecture Overview](./architecture-overview.md)

## Getting Help

- Check existing issues on GitHub
- Ask in the development Slack channel
- Email: dev-support@claudetaskmaster.com