# Task Master Environment Configuration Guide

This guide explains all environment variables used in the Task Master authentication system, their purposes, and configuration options.

## Table of Contents

1. [Environment Files Overview](#environment-files-overview)
2. [Supabase Configuration](#supabase-configuration)
3. [AI Provider Configuration](#ai-provider-configuration)
4. [API Server Configuration](#api-server-configuration)
5. [Frontend Configuration](#frontend-configuration)
6. [Security Configuration](#security-configuration)
7. [Development vs Production](#development-vs-production)
8. [Troubleshooting](#troubleshooting)

## Environment Files Overview

Task Master uses multiple environment files for different components:

```
├── .env                              # Root: MCP server & CLI tools
├── api/.env                          # API server configuration
└── frontend/task-master-ui/.env.local # Frontend configuration
```

### Security Best Practices

- **Never commit `.env` files** to version control
- Use different keys for development and production
- Rotate API keys regularly
- Use environment-specific values
- Keep service keys secure and never expose them client-side

## Supabase Configuration

### Required Variables

#### `SUPABASE_URL`
- **Purpose**: Your Supabase project URL
- **Format**: `https://your-project-id.supabase.co`
- **Used in**: API server, Frontend
- **Example**: `https://abcdefgh12345678.supabase.co`

```env
# API (.env)
SUPABASE_URL=https://your-project.supabase.co

# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

#### `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Purpose**: Public key for client-side Supabase operations
- **Format**: JWT token starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
- **Security**: Safe to expose in browser
- **Used in**: API server, Frontend

```env
# API (.env)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### `SUPABASE_SERVICE_KEY`
- **Purpose**: Service role key for server-side operations
- **Format**: JWT token starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
- **Security**: **KEEP SECRET** - Never expose client-side
- **Used in**: API server only

```env
# API (.env) - SERVER SIDE ONLY
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### How to Obtain Supabase Keys

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the values from the "Project API keys" section

## AI Provider Configuration

Task Master supports multiple AI providers. **At least one API key is required**.

### Anthropic (Claude)

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

- **Purpose**: Access to Claude models (recommended)
- **Format**: Starts with `sk-ant-api03-`
- **Get key**: [Anthropic Console](https://console.anthropic.com/)
- **Models**: Claude 3.5 Sonnet, Claude 3 Haiku, etc.

### OpenAI

```env
OPENAI_API_KEY=sk-proj-your-key-here
```

- **Purpose**: Access to GPT models
- **Format**: Starts with `sk-proj-` (new format) or `sk-` (legacy)
- **Get key**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Models**: GPT-4, GPT-3.5-turbo, etc.

### Google (Gemini)

```env
GOOGLE_API_KEY=your-google-key-here
```

- **Purpose**: Access to Gemini models
- **Get key**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Models**: Gemini Pro, Gemini Flash, etc.

### Perplexity

```env
PERPLEXITY_API_KEY=pplx-your-key-here
```

- **Purpose**: Access to Perplexity models (good for research)
- **Format**: Starts with `pplx-`
- **Get key**: [Perplexity API](https://www.perplexity.ai/settings/api)

### xAI (Grok)

```env
XAI_API_KEY=your-xai-key-here
```

- **Purpose**: Access to Grok models
- **Get key**: [xAI Console](https://console.x.ai/)

### OpenRouter

```env
OPENROUTER_API_KEY=your-openrouter-key-here
```

- **Purpose**: Access to multiple models through OpenRouter
- **Get key**: [OpenRouter](https://openrouter.ai/keys)
- **Benefit**: Single key for multiple model providers

### Mistral

```env
MISTRAL_API_KEY=your-mistral-key-here
```

- **Purpose**: Access to Mistral models
- **Get key**: [Mistral Console](https://console.mistral.ai/)

### Azure OpenAI

```env
AZURE_OPENAI_API_KEY=your-azure-key-here
```

- **Purpose**: Access to OpenAI models through Azure
- **Requires**: Additional endpoint configuration in `.taskmasterconfig`

### Ollama

```env
OLLAMA_API_KEY=your-ollama-key-here
```

- **Purpose**: Authentication for remote Ollama servers
- **Note**: Only needed for remote servers requiring auth
- **Local**: Leave empty for local Ollama instances

## API Server Configuration

### Port Configuration

```env
API_PORT=8080
```

- **Purpose**: Port for the API server to listen on
- **Default**: 8080
- **Production**: Consider using standard ports (80, 443) with reverse proxy

### Frontend URL

```env
FRONTEND_URL=http://localhost:3000
```

- **Purpose**: CORS configuration and redirect URLs
- **Development**: `http://localhost:3000`
- **Production**: Your actual domain (e.g., `https://app.yourdomain.com`)

### Node Environment

```env
NODE_ENV=production
```

- **Purpose**: Environment mode
- **Values**: `development`, `production`, `test`
- **Effects**: Logging levels, error handling, optimizations

### Logging

```env
LOG_LEVEL=info
```

- **Purpose**: Control logging verbosity
- **Values**: `error`, `warn`, `info`, `debug`
- **Production**: Recommended `info` or `warn`

## Frontend Configuration

The frontend uses environment variables prefixed with `NEXT_PUBLIC_` to make them available in the browser.

### API URL

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

- **Purpose**: API server endpoint for frontend requests
- **Development**: `http://localhost:8080`
- **Production**: Your API domain (e.g., `https://api.yourdomain.com`)

### Feature Flags

```env
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=false
```

- **Purpose**: Enable/disable frontend features
- **Values**: `true`, `false`
- **Use case**: Feature toggles, A/B testing

## Security Configuration

### JWT Secret (Optional)

```env
JWT_SECRET=your-custom-jwt-secret-here
```

- **Purpose**: Custom JWT signing secret
- **Default**: Supabase handles JWT by default
- **Use case**: Additional JWT operations outside Supabase
- **Security**: Use a strong, random string (32+ characters)

### Encryption Master Key (Optional)

```env
ENCRYPTION_MASTER_KEY=your-encryption-key-here
```

- **Purpose**: Encrypt sensitive data at rest
- **Format**: Base64 encoded key
- **Use case**: Additional encryption beyond database
- **Security**: Generate with: `openssl rand -base64 32`

### Rate Limiting

```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

- **Purpose**: API rate limiting configuration
- **Window**: Time window in milliseconds (default: 15 minutes)
- **Max requests**: Maximum requests per window

## Development vs Production

### Development Configuration

```env
# Development .env example
NODE_ENV=development
LOG_LEVEL=debug
API_PORT=8080
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8080

# Development Supabase (use test project)
SUPABASE_URL=https://test-project.supabase.co
SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_KEY=your-test-service-key

# Development AI keys (use with lower limits)
ANTHROPIC_API_KEY=sk-ant-api03-test-key
```

### Production Configuration

```env
# Production .env example
NODE_ENV=production
LOG_LEVEL=info
API_PORT=8080
FRONTEND_URL=https://app.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Production Supabase (use production project)
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_KEY=your-prod-service-key

# Production AI keys (with higher limits)
ANTHROPIC_API_KEY=sk-ant-api03-prod-key

# Additional production security
JWT_SECRET=your-strong-production-secret
ENCRYPTION_MASTER_KEY=your-production-encryption-key
```

### Environment Separation Best Practices

1. **Use separate Supabase projects** for dev/staging/prod
2. **Use different AI API keys** with appropriate usage limits
3. **Never use production keys in development**
4. **Implement proper secret management** in production
5. **Use environment-specific domains and URLs**

## Environment Variable Validation

### Required Variables Check

Create a validation script to ensure all required variables are set:

```javascript
// scripts/validate-env.js
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:');
  missingVars.forEach(varName => console.error(`- ${varName}`));
  process.exit(1);
}

console.log('All required environment variables are set');
```

Run before starting services:

```bash
node scripts/validate-env.js && npm run api:db
```

## Troubleshooting

### Common Environment Issues

#### 1. Supabase Connection Errors

**Symptoms**:
- `Invalid API URL` errors
- `401 Unauthorized` responses
- Database connection timeouts

**Solutions**:
```bash
# Verify Supabase URL format
echo $SUPABASE_URL
# Should be: https://your-project.supabase.co

# Test connection
curl "$SUPABASE_URL/rest/v1/" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

#### 2. API Key Issues

**Symptoms**:
- `Invalid API key` errors
- `429 Rate limit exceeded`
- `403 Forbidden` responses

**Solutions**:
```bash
# Check if key is set
echo $ANTHROPIC_API_KEY | head -c 20

# Test key validity
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

#### 3. CORS Issues

**Symptoms**:
- `Access-Control-Allow-Origin` errors in browser
- Frontend can't reach API

**Solutions**:
```bash
# Check FRONTEND_URL matches your frontend domain
echo $FRONTEND_URL

# Verify CORS headers
curl -I -X OPTIONS http://localhost:8080/api/projects \
  -H "Origin: http://localhost:3000"
```

#### 4. Environment File Loading

**Symptoms**:
- Variables appear undefined
- Different behavior in different environments

**Debug steps**:
```bash
# Check if .env file exists
ls -la .env api/.env frontend/task-master-ui/.env.local

# Verify file contents (be careful with secrets)
grep -v "KEY\|SECRET" .env

# Test variable loading
node -e "require('dotenv').config(); console.log(process.env.NODE_ENV)"
```

### Environment Testing

Create test scripts to verify environment setup:

```javascript
// test-env.js
require('dotenv').config();

const tests = [
  {
    name: 'Supabase URL',
    test: () => process.env.SUPABASE_URL?.startsWith('https://'),
    fix: 'Set SUPABASE_URL to your Supabase project URL'
  },
  {
    name: 'At least one AI key',
    test: () => !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY),
    fix: 'Set at least one AI provider API key'
  },
  {
    name: 'Frontend URL set',
    test: () => !!process.env.FRONTEND_URL,
    fix: 'Set FRONTEND_URL for CORS configuration'
  }
];

tests.forEach(({ name, test, fix }) => {
  if (test()) {
    console.log(`✅ ${name}`);
  } else {
    console.log(`❌ ${name}: ${fix}`);
  }
});
```

### Secret Management in Production

For production deployments, consider using secret management services:

#### AWS Secrets Manager
```bash
# Store secret
aws secretsmanager create-secret \
  --name "task-master/api-keys" \
  --description "Task Master API keys" \
  --secret-string '{"ANTHROPIC_API_KEY":"sk-ant-..."}'

# Retrieve in application
aws secretsmanager get-secret-value \
  --secret-id "task-master/api-keys" \
  --query SecretString --output text
```

#### Kubernetes Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: task-master-secrets
type: Opaque
stringData:
  ANTHROPIC_API_KEY: sk-ant-api03-your-key
  SUPABASE_SERVICE_KEY: your-service-key
```

#### Docker Secrets
```bash
# Create secret
echo "sk-ant-api03-your-key" | docker secret create anthropic_key -

# Use in service
docker service create \
  --secret anthropic_key \
  --env ANTHROPIC_API_KEY_FILE=/run/secrets/anthropic_key \
  your-app
```

## Additional Resources

- [Supabase Environment Variables Guide](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Node.js Environment Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [12-Factor App Config](https://12factor.net/config)