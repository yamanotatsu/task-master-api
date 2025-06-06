# Supabase Setup Instructions

## Database Migration

To set up the Task Master database in your Supabase project, follow these steps:

### 1. Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor section
3. Click on "New Query"

### 2. Run the Database Schema

Copy and paste the entire contents of `/supabase/schema.sql` into the SQL editor and run it.

This will create:
- All required tables (projects, members, tasks, etc.)
- Indexes for performance
- Row Level Security policies
- Triggers for automatic timestamp updates

### 3. Verify the Setup

After running the migration, verify that all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see these tables:
- ai_dialogue_messages
- ai_dialogue_sessions
- members
- project_members
- projects
- subtasks
- task_dependencies
- tasks

## Running the API

### Development Mode (with hot reload)

```bash
# Run the database-backed API server
npm run api:db:dev
```

### Production Mode

```bash
# Run the database-backed API server
npm run api:db
```

The API will start on port 8080 (configurable via `API_PORT` environment variable).

## Environment Variables

Make sure you have the following in your `/api/.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://lcftedzchwncdjsbpzji.supabase.co
SUPABASE_SERVICE_KEY=<your-service-key>

# Port
API_PORT=8080

# AI Service API Keys
ANTHROPIC_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
# ... other AI service keys
```

## Frontend Configuration

The frontend is already configured to use the API at `http://localhost:8080`. 

To run the frontend:

```bash
cd frontend/task-master-ui
npm install
npm run dev
```

## Testing the Integration

1. Start the API server: `npm run api:db`
2. Start the frontend: `cd frontend/task-master-ui && npm run dev`
3. Navigate to `http://localhost:3000`
4. Create a new project and verify that data is being stored in Supabase

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. Verify your Supabase URL and service key are correct
2. Check that your Supabase project is active
3. Ensure RLS policies are enabled (they are set to allow all operations by default)

### Missing Tables

If tables are missing, re-run the schema.sql file in the SQL editor.

### API Errors

Check the API server logs for detailed error messages. Most errors will include helpful details about what went wrong.