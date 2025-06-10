import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { generateTasksFromPRDHandler } from './routes/generate-tasks.js';
import {
	listTasksHandler,
	getTaskHandler,
	createTaskHandler,
	updateTaskHandler,
	deleteTaskHandler,
	updateTaskStatusHandler
} from './routes/tasks.js';
import {
	expandTaskHandler,
	clearSubtasksHandler,
	expandAllTasksHandler
} from './routes/task-expansion.js';
import {
	addDependencyHandler,
	removeDependencyHandler,
	validateDependenciesHandler,
	fixDependenciesHandler
} from './routes/dependencies.js';
import {
	initializeProjectHandler,
	generateTaskFilesHandler
} from './routes/projects.js';
import {
	getNextTaskHandler,
	analyzeTaskComplexityHandler,
	getComplexityReportHandler
} from './routes/analysis.js';
import {
	addSubtaskHandler,
	updateSubtaskHandler,
	removeSubtaskHandler
} from './routes/subtasks.js';
import userRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import { rateLimiters } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
	req.startTime = Date.now();
	next();
});

// Authentication routes (with specific rate limiting)
app.use('/api/v1/auth', authRoutes);

// Apply general API rate limiting to all other routes
app.use('/api/v1', rateLimiters.api);

// PRD parsing endpoint
app.post('/api/v1/generate-tasks-from-prd', generateTasksFromPRDHandler);

// Task management endpoints (read operations with lenient rate limiting)
app.get('/api/v1/tasks', rateLimiters.read, listTasksHandler);
app.get('/api/v1/tasks/next', rateLimiters.read, getNextTaskHandler); // Must come before :id
app.get(
	'/api/v1/tasks/complexity-report',
	rateLimiters.read,
	getComplexityReportHandler
); // Must come before :id
app.get('/api/v1/tasks/:id', rateLimiters.read, getTaskHandler);
app.post('/api/v1/tasks', createTaskHandler);
app.put('/api/v1/tasks/:id', updateTaskHandler);
app.delete('/api/v1/tasks/:id', deleteTaskHandler);
app.patch('/api/v1/tasks/:id/status', updateTaskStatusHandler);

// Task expansion endpoints
app.post('/api/v1/tasks/:id/expand', expandTaskHandler);
app.delete('/api/v1/tasks/:id/subtasks', clearSubtasksHandler);
app.post('/api/v1/tasks/expand-all', expandAllTasksHandler);

// Subtask management endpoints
app.post('/api/v1/tasks/:id/subtasks', addSubtaskHandler);
app.put('/api/v1/tasks/:id/subtasks/:subtaskId', updateSubtaskHandler);
app.delete('/api/v1/tasks/:id/subtasks/:subtaskId', removeSubtaskHandler);

// Dependency management endpoints
app.post('/api/v1/tasks/:id/dependencies', addDependencyHandler);
app.delete('/api/v1/tasks/:id/dependencies/:depId', removeDependencyHandler);
app.post('/api/v1/tasks/validate-dependencies', validateDependenciesHandler);
app.post('/api/v1/tasks/fix-dependencies', fixDependenciesHandler);

// Project management endpoints
app.post('/api/v1/projects/initialize', initializeProjectHandler);
app.post('/api/v1/projects/generate-task-files', generateTaskFilesHandler);

// Analysis endpoints
app.post('/api/v1/tasks/analyze-complexity', analyzeTaskComplexityHandler);

// User profile management endpoints
app.get('/api/v1/users/profile', ...userRoutes.getProfileHandler);
app.put('/api/v1/users/profile', ...userRoutes.updateProfileHandler);
app.put('/api/v1/users/password', ...userRoutes.changePasswordHandler);
app.get('/api/v1/users/organizations', ...userRoutes.getOrganizationsHandler);
app.get('/api/v1/users/activities', ...userRoutes.getActivitiesHandler);
app.delete('/api/v1/users/account', ...userRoutes.deleteAccountHandler);

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
	res.status(404).json({
		success: false,
		error: {
			code: 'ENDPOINT_NOT_FOUND',
			message: `The endpoint ${req.method} ${req.path} does not exist`
		}
	});
});

app.use((err, req, res, next) => {
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
			message: 'An unexpected error occurred'
		}
	});
});

app.listen(PORT, () => {
	// Server started
});
