# Deployment Guide

## Vercel Deployment

### Required Environment Variables

Before deploying to Vercel, make sure to set the following environment variables in your Vercel project settings:

1. **NEXT_PUBLIC_SUPABASE_URL** (Required)

   - Your Supabase project URL
   - Example: `https://your-project.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY** (Required)

   - Your Supabase anonymous key
   - Found in your Supabase project settings

3. **NEXT_PUBLIC_API_URL** (Required)

   - Your backend API URL
   - Production example: `https://your-api.com`
   - Development: `http://localhost:8080`

4. **NEXT_PUBLIC_SKIP_AUTH** (Optional)
   - Set to `true` to skip authentication (development only)
   - Default: `false`

### Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with the appropriate value
4. Deploy or redeploy your project

### Local Development

Copy `.env.example` to `.env.local` and update with your values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual values.
