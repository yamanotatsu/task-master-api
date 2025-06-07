# Task Master Authentication System - Quick Start Guide

Get the Task Master authentication system running locally in under 10 minutes.

## Prerequisites

- Node.js 14+ installed
- A Supabase account
- At least one AI provider API key

## 🚀 Quick Setup (5 Steps)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/eyaltoledano/claude-task-master.git
cd claude-task-master

# Install dependencies
npm install
cd frontend/task-master-ui && npm install && cd ../..
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **API** and copy:
   - Project URL
   - anon public key
   - service_role secret key

### 3. Configure Environment

Create `/api/.env`:

```env
# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# API Configuration
API_PORT=8080
FRONTEND_URL=http://localhost:3000

# AI Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-proj-your-key-here
```

Create `/frontend/task-master-ui/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 4. Set Up Database

1. Go to your Supabase project → **SQL Editor**
2. Copy the contents of `/supabase/schema.sql`
3. Paste and run in the SQL editor

### 5. Start Services

```bash
# Terminal 1: Start API server
npm run api:db:dev

# Terminal 2: Start frontend
cd frontend/task-master-ui
npm run dev
```

🎉 **Done!** Visit http://localhost:3000

## 🐳 Docker Quick Start (Alternative)

If you prefer Docker:

```bash
# Clone repository
git clone https://github.com/eyaltoledano/claude-task-master.git
cd claude-task-master

# Set up environment files (same as step 3 above)
# Set up Supabase database (same as step 4 above)

# Run with Docker Compose
docker-compose up -d
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8080:8080"
    env_file:
      - api/.env
    command: npm run api:db

  frontend:
    build: ./frontend/task-master-ui
    ports:
      - "3000:3000"
    env_file:
      - frontend/task-master-ui/.env.local
    depends_on:
      - api
```

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] API health check: http://localhost:8080/health
- [ ] Frontend loads: http://localhost:3000
- [ ] Can create a new project
- [ ] Authentication flow works
- [ ] Tasks can be created and managed

## 🔧 Quick Troubleshooting

### API won't start
```bash
# Check environment variables
cat api/.env

# Check Supabase connection
curl http://localhost:8080/health
```

### Frontend won't load
```bash
# Check if API is running
curl http://localhost:8080/health

# Check frontend environment
cat frontend/task-master-ui/.env.local
```

### Database connection issues
1. Verify Supabase URL and keys
2. Check if database schema was applied
3. Ensure Supabase project is active

### Authentication not working
1. Verify `SUPABASE_ANON_KEY` matches in both frontend and API
2. Check that RLS policies are applied from schema.sql
3. Ensure CORS settings allow localhost:3000

## 🎯 Next Steps

Once running:

1. **Create your first project** at http://localhost:3000
2. **Set up MCP integration** (see main README.md)
3. **Configure AI models** for task generation
4. **Invite team members** to collaborate

## 📚 Additional Resources

- [Full Deployment Guide](./DEPLOYMENT.md) - Production setup
- [Environment Configuration](./ENVIRONMENT.md) - Detailed env vars
- [Main README](./README.md) - Complete project documentation
- [Authentication Docs](./requirements-docs/authentication/) - Auth system details

## 🆘 Need Help?

- Check [GitHub Issues](https://github.com/eyaltoledano/claude-task-master/issues)
- Join [Discord Community](https://discord.gg/taskmasterai)
- Review [Troubleshooting Guide](./DEPLOYMENT.md#troubleshooting)