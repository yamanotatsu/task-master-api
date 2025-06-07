# Task Master Deployment Guide

This guide provides comprehensive step-by-step instructions for deploying the Task Master authentication system in both development and production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Supabase Setup](#supabase-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Migration](#database-migration)
6. [API Server Setup](#api-server-setup)
7. [Frontend Deployment](#frontend-deployment)
8. [Production Deployment](#production-deployment)
9. [Verification and Testing](#verification-and-testing)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying Task Master with authentication, ensure you have:

- Node.js (v14.0.0 or higher)
- npm or yarn package manager
- A Supabase account and project
- API keys for AI providers (at least one required)
- Git (for cloning the repository)

### Required API Keys

At least one of the following AI provider API keys is required:

- **Anthropic API Key** (Claude API) - Recommended
- OpenAI API Key
- Google Gemini API Key
- Perplexity API Key
- xAI API Key
- OpenRouter API Key

## System Requirements

### Development Environment
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Node.js**: v14.0.0 or higher
- **Database**: Supabase (cloud-hosted PostgreSQL)

### Production Environment
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space
- **Node.js**: v18.0.0 or higher (LTS recommended)
- **Database**: Supabase Pro plan recommended for production
- **Load Balancer**: Recommended for high availability

## Supabase Setup

### 1. Create Supabase Project

1. Sign up or log in to [Supabase](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Set project name (e.g., "task-master-prod")
5. Create a strong database password
6. Select a region closest to your users
7. Click "Create new project"

### 2. Obtain Supabase Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)
   - **service_role secret key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)

⚠️ **Security Note**: Keep the `service_role` key secret and never expose it in client-side code.

### 3. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Configure site URL:
   - Development: `http://localhost:3000`
   - Production: Your actual domain
3. Add redirect URLs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

## Environment Configuration

### 1. Create Environment Files

Create environment files in the appropriate locations:

#### API Environment (`/api/.env`)

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# API Configuration
API_PORT=8080
FRONTEND_URL=http://localhost:3000

# AI Provider API Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-proj-your-key-here
GOOGLE_API_KEY=your-google-key-here
PERPLEXITY_API_KEY=pplx-your-key-here
XAI_API_KEY=your-xai-key-here
OPENROUTER_API_KEY=your-openrouter-key-here
MISTRAL_API_KEY=your-mistral-key-here
AZURE_OPENAI_API_KEY=your-azure-key-here
OLLAMA_API_KEY=your-ollama-key-here

# Security Configuration (optional)
JWT_SECRET=your-custom-jwt-secret-here
ENCRYPTION_MASTER_KEY=your-encryption-key-here

# Production specific (for production deployment)
NODE_ENV=production
LOG_LEVEL=info
```

#### Frontend Environment (`/frontend/task-master-ui/.env.local`)

```env
# Public environment variables (safe to expose to browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8080

# Production values
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

#### Root Environment (`/.env`)

```env
# For MCP server and CLI tools
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-proj-your-key-here
GOOGLE_API_KEY=your-google-key-here
PERPLEXITY_API_KEY=pplx-your-key-here
XAI_API_KEY=your-xai-key-here
OPENROUTER_API_KEY=your-openrouter-key-here
```

### 2. Environment Security

- Never commit `.env` files to version control
- Use different keys for development and production
- Rotate API keys regularly
- Use secret management services in production

## Database Migration

### 1. Run Database Schema

1. Access your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `/supabase/schema.sql`
5. Paste into the SQL editor
6. Click **Run** to execute

This creates:
- All required tables with proper relationships
- Indexes for optimal performance
- Row Level Security (RLS) policies
- Automatic timestamp triggers

### 2. Verify Migration

Run this query to verify all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- `ai_dialogue_messages`
- `ai_dialogue_sessions`
- `members`
- `project_members`
- `projects`
- `subtasks`
- `task_dependencies`
- `tasks`

### 3. Test Database Connection

Create a test query to ensure connectivity:

```sql
SELECT 
    count(*) as table_count,
    'Database successfully connected' as status
FROM information_schema.tables 
WHERE table_schema = 'public';
```

## API Server Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install API dependencies (if separate)
cd api
npm install
```

### 2. Development Setup

```bash
# Start API server with hot reload
npm run api:db:dev

# Or start without hot reload
npm run api:db
```

The API server will start on `http://localhost:8080`.

### 3. Verify API Server

Test the API endpoints:

```bash
# Health check
curl http://localhost:8080/health

# Get projects (should return empty array initially)
curl http://localhost:8080/api/projects

# Create a test project
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "project_path": "/test/path",
    "description": "Test project for deployment verification"
  }'
```

### 4. API Authentication Setup

The API uses Supabase Auth for authentication. Key features:

- JWT-based authentication
- Row Level Security (RLS)
- Role-based access control
- Session management

## Frontend Deployment

### 1. Install Frontend Dependencies

```bash
cd frontend/task-master-ui
npm install
```

### 2. Development Setup

```bash
# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 3. Build for Production

```bash
# Create production build
npm run build

# Test production build locally
npm start
```

### 4. Frontend Configuration

Ensure the frontend can communicate with the API:

1. Update `NEXT_PUBLIC_API_URL` in `.env.local`
2. Verify CORS settings in the API server
3. Test authentication flow

## Production Deployment

### 1. Production Checklist

Before deploying to production:

- [ ] All environment variables are set with production values
- [ ] Database schema is applied to production Supabase project
- [ ] API keys are valid and have appropriate usage limits
- [ ] CORS settings allow your production domain
- [ ] SSL certificates are configured
- [ ] Monitoring and logging are set up
- [ ] Backup strategy is in place

### 2. API Server Production Deployment

#### Option A: Node.js Server (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'task-master-api',
    script: 'api/server-db.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      API_PORT: 8080
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Option B: Docker Deployment

```dockerfile
# Create Dockerfile for API
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY api/package*.json ./api/

# Install dependencies
RUN npm install
RUN cd api && npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Start API server
CMD ["npm", "run", "api:db"]
```

Build and run:

```bash
# Build Docker image
docker build -t task-master-api .

# Run container
docker run -d \
  --name task-master-api \
  -p 8080:8080 \
  --env-file api/.env \
  task-master-api
```

### 3. Frontend Production Deployment

#### Option A: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from frontend directory
cd frontend/task-master-ui
vercel --prod
```

#### Option B: Docker + Nginx

```dockerfile
# Dockerfile for frontend
FROM node:18-alpine AS builder

WORKDIR /app
COPY frontend/task-master-ui/package*.json ./
RUN npm install

COPY frontend/task-master-ui .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 4. Load Balancer Configuration

For high availability, configure a load balancer:

```nginx
upstream api_servers {
    server api1.yourdomain.com:8080;
    server api2.yourdomain.com:8080;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://api_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Verification and Testing

### 1. System Health Checks

```bash
# API health check
curl https://api.yourdomain.com/health

# Database connectivity
curl https://api.yourdomain.com/api/projects

# Frontend accessibility
curl https://yourdomain.com
```

### 2. Authentication Flow Testing

1. **User Registration**:
   - Visit the frontend application
   - Create a new account
   - Verify email confirmation (if enabled)

2. **User Login**:
   - Log in with created credentials
   - Verify JWT token is received
   - Check that protected routes work

3. **Project Management**:
   - Create a new project
   - Add tasks to the project
   - Verify data persistence

### 3. Performance Testing

```bash
# Load testing with curl
for i in {1..100}; do
  curl -w "%{time_total}\n" -o /dev/null -s https://api.yourdomain.com/health
done

# Or use dedicated tools like ab or wrk
ab -n 1000 -c 10 https://api.yourdomain.com/health
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Errors

**Problem**: `Error: connect ECONNREFUSED`

**Solutions**:
- Verify Supabase URL and keys are correct
- Check that Supabase project is active
- Ensure network connectivity to Supabase

#### 2. Authentication Failures

**Problem**: `Invalid JWT token`

**Solutions**:
- Verify `SUPABASE_ANON_KEY` is correct
- Check that RLS policies are properly configured
- Ensure frontend and API are using the same Supabase project

#### 3. CORS Errors

**Problem**: `Access-Control-Allow-Origin header`

**Solutions**:
- Update `FRONTEND_URL` in API environment variables
- Check CORS configuration in `api/server-db.js`
- Verify domain spelling and protocol (http vs https)

#### 4. API Key Issues

**Problem**: `Invalid API key` for AI providers

**Solutions**:
- Verify API keys are valid and not expired
- Check usage limits and billing status
- Ensure correct environment variable names

#### 5. Build Failures

**Problem**: `Module not found` or dependency issues

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version
```

### Monitoring and Logging

#### 1. API Server Monitoring

```javascript
// Add to your API server
app.use('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

#### 2. Database Monitoring

Monitor key metrics in Supabase dashboard:
- Active connections
- Query performance
- Storage usage
- API requests

#### 3. Error Logging

Set up structured logging:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Backup and Recovery

#### 1. Database Backups

Supabase automatically backs up your database. For additional protection:

1. Set up automated SQL dumps
2. Export critical data regularly
3. Test recovery procedures

#### 2. Configuration Backups

- Store environment files securely
- Document all configuration changes
- Maintain infrastructure as code

### Support and Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Task Master GitHub Issues](https://github.com/eyaltoledano/claude-task-master/issues)
- [Community Discord](https://discord.gg/taskmasterai)

For additional help, refer to:
- [QUICKSTART.md](./QUICKSTART.md) - Fast setup guide
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment configuration details
- [README.md](./README.md) - General project information