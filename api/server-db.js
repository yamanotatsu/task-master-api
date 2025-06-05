import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv with path to .env file
dotenv.config({ path: join(__dirname, '.env') });

// Import new database-backed routes
import projectsRouter from './routes/projects-db.js';
import membersRouter from './routes/members.js';
import tasksRouter from './routes/tasks-db.js';
import generateTasksRouter from './routes/generate-tasks-db.js';
import statisticsRouter from './routes/statistics.js';

const app = express();
const PORT = process.env.API_PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Mount routers
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/members', membersRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1/generate-tasks-from-prd', generateTasksRouter);
app.use('/api/v1', statisticsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'supabase'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `The endpoint ${req.method} ${req.path} does not exist`
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload is too large. Maximum size is 10MB.'
      }
    });
  }
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Task Master API (Database Version) running on port ${PORT}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL}`);
});