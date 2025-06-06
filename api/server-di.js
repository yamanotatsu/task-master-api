import express from 'express';
import cors from 'cors';
import { createTaskHandlers } from './routes/tasks-di.js';
import { createProductionDependencies } from './utils/dependency-factory.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create production dependencies
const dependencies = createProductionDependencies();

// Create route handlers with dependencies
const taskHandlers = createTaskHandlers(dependencies);

// Task routes
app.get('/api/v1/tasks', taskHandlers.listTasksHandler);
app.get('/api/v1/tasks/:id', taskHandlers.getTaskHandler);
app.post('/api/v1/tasks', taskHandlers.createTaskHandler);
app.put('/api/v1/tasks/:id', taskHandlers.updateTaskHandler);
app.delete('/api/v1/tasks/:id', taskHandlers.deleteTaskHandler);
app.patch('/api/v1/tasks/:id/status', taskHandlers.updateTaskStatusHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  dependencies.logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error'
    }
  });
});

// Export app for testing
export default app;

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    dependencies.logger.info(`Task Master API server is running on port ${PORT}`);
  });
}