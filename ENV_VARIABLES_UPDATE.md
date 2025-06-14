# Environment Variables Update Guide

## Summary of Changes

This document outlines the environment variable consolidation performed as part of Phase 2 refactoring.

## Consolidated Variables

### 1. Project Root Directory
- **OLD**: `TASK_MASTER_PROJECT_ROOT` and `TASK_PROJECT_ROOT`
- **NEW**: `TASK_PROJECT_ROOT` (unified)
- **Files to update**:
  - `/mcp-server/src/tools/utils.js` - Change from TASK_MASTER_PROJECT_ROOT to TASK_PROJECT_ROOT

### 2. Frontend URL
- **OLD**: `APP_URL` and `FRONTEND_URL`
- **NEW**: `FRONTEND_URL` (unified)
- **Status**: Already using FRONTEND_URL in code, just need to update documentation

## Removed Variables

### Unused AI Provider Keys
The following are defined in env examples but never used in code:
- `MISTRAL_API_KEY` - No provider implementation exists
- `AZURE_OPENAI_API_KEY` - Provider exists but key is passed as parameter

### Unused Feature Flags
These are prepared but not implemented:
- Email configuration (SMTP_*, SENDGRID_*, AWS_SES_*)
- Redis configuration (REDIS_*)
- Security monitoring (SECURITY_*)
- Feature flags (ENABLE_*)

## Updated Environment Variable Structure

### Required Variables

```env
# Core Configuration
NODE_ENV=development
API_PORT=8080
LOG_LEVEL=info

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Security (Required for production)
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
ENCRYPTION_MASTER_KEY=your_encryption_key

# Frontend
FRONTEND_URL=http://localhost:3001

# Task Management
TASK_PROJECT_ROOT=/path/to/projects
```

### Optional Variables

```env
# AI Providers (only set what you use)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=
PERPLEXITY_API_KEY=
XAI_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_API_KEY=

# Advanced Security
TRUST_PROXY=false
ALLOWED_ORIGINS=http://localhost:3001

# Rate Limiting
ENABLE_RATE_LIMIT=false
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Variables

```env
# In frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Migration Steps

1. **Update code references**:
   ```bash
   # In mcp-server/src/tools/utils.js
   # Change: process.env.TASK_MASTER_PROJECT_ROOT
   # To: process.env.TASK_PROJECT_ROOT
   ```

2. **Update .env files**:
   - Remove duplicate variable definitions
   - Remove unused AI provider keys
   - Use the consolidated names

3. **Update documentation**:
   - Replace all references to APP_URL with FRONTEND_URL
   - Update setup guides with new variable names

## Benefits

- **Clarity**: Single source of truth for each configuration
- **Maintainability**: Less confusion about which variable to use
- **Efficiency**: Smaller .env files with only necessary variables
- **Documentation**: Clear separation of required vs optional variables