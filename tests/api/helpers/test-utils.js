import { jest } from '@jest/globals';
import express from 'express';
import cors from 'cors';
import request from 'supertest';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a test Express application with proper middleware setup
 * @param {Object} options - Configuration options
 * @returns {Express} Configured Express app instance
 */
export const createTestApp = (options = {}) => {
	const app = express();

	// Basic middleware
	app.use(cors());
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	// Import routes
	const apiRouter = express.Router();

	// Add test-specific middleware if provided
	if (options.middleware) {
		options.middleware.forEach((mw) => app.use(mw));
	}

	// Mount API routes
	app.use('/api/v1', apiRouter);

	// Error handling middleware
	app.use((err, req, res, next) => {
		res.status(err.status || 500).json({
			success: false,
			error: {
				code: err.code || 'INTERNAL_ERROR',
				message: err.message || 'Internal server error',
				details: err.details
			}
		});
	});

	return { app, apiRouter };
};

/**
 * Create an authenticated request helper
 * @param {Express} app - Express app instance
 * @returns {Function} Authenticated request function
 */
export const authenticatedRequest = (app) => {
	return (method, url) => {
		const req = request(app)[method.toLowerCase()](url);
		// Add authentication headers if needed in the future
		// req.set('Authorization', 'Bearer test-token');
		return req;
	};
};

/**
 * Helper to assert error responses
 * @param {Object} response - Supertest response object
 * @param {string} code - Expected error code
 * @param {number} statusCode - Expected HTTP status code
 */
export const expectErrorResponse = (response, code, statusCode = 500) => {
	expect(response.status).toBe(statusCode);
	expect(response.body).toMatchObject({
		success: false,
		error: expect.objectContaining({
			code,
			message: expect.any(String)
		})
	});
};

/**
 * Helper to assert successful responses
 * @param {Object} response - Supertest response object
 * @param {number} statusCode - Expected HTTP status code
 */
export const expectSuccessResponse = (response, statusCode = 200) => {
	expect(response.status).toBe(statusCode);
	expect(response.body).toMatchObject({
		success: true
	});
};

/**
 * Wait for async operations to complete
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock environment variables for testing
 * @param {Object} envVars - Environment variables to set
 * @returns {Function} Cleanup function to restore original values
 */
export const mockEnv = (envVars) => {
	const originalEnv = { ...process.env };

	Object.entries(envVars).forEach(([key, value]) => {
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	});

	return () => {
		Object.keys(envVars).forEach((key) => {
			if (originalEnv[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = originalEnv[key];
			}
		});
	};
};

/**
 * Create a mock request object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock request object
 */
export const createMockRequest = (overrides = {}) => ({
	params: {},
	query: {},
	body: {},
	headers: {},
	...overrides
});

/**
 * Create a mock response object
 * @returns {Object} Mock response object
 */
export const createMockResponse = () => {
	const res = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
		set: jest.fn().mockReturnThis(),
		setHeader: jest.fn().mockReturnThis()
	};
	return res;
};

/**
 * Create a mock next function
 * @returns {Function} Mock next function
 */
export const createMockNext = () => jest.fn();

/**
 * Helper to test async route handlers
 * @param {Function} handler - Route handler function
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 * @returns {Promise}
 */
export const testAsyncHandler = async (handler, req, res, next) => {
	try {
		await handler(req, res, next);
	} catch (error) {
		if (next) {
			next(error);
		} else {
			throw error;
		}
	}
};

/**
 * Validate task structure
 * @param {Object} task - Task object to validate
 */
export const expectValidTask = (task) => {
	expect(task).toMatchObject({
		id: expect.stringMatching(/^task_\d{3}$/),
		title: expect.any(String),
		description: expect.any(String),
		status: expect.stringMatching(/^(pending|in-progress|completed|blocked)$/),
		priority: expect.stringMatching(/^(low|medium|high|critical)$/),
		dependencies: expect.any(Array),
		subtasks: expect.any(Array)
	});
};

/**
 * Validate subtask structure
 * @param {Object} subtask - Subtask object to validate
 */
export const expectValidSubtask = (subtask) => {
	expect(subtask).toMatchObject({
		id: expect.any(String),
		title: expect.any(String),
		completed: expect.any(Boolean)
	});
};

/**
 * Validate error structure
 * @param {Object} error - Error object to validate
 * @param {string} expectedCode - Expected error code
 */
export const expectValidError = (error, expectedCode) => {
	expect(error).toMatchObject({
		code: expectedCode,
		message: expect.any(String)
	});
};

/**
 * Create a test context with common setup
 * @returns {Object} Test context
 */
export const createTestContext = () => {
	const ctx = {
		projectPath: '/test/projects/test-project',
		tasksFile: '/test/projects/test-project/tasks.json',
		mocks: {
			fs: {
				readFile: jest.fn(),
				writeFile: jest.fn(),
				mkdir: jest.fn(),
				access: jest.fn(),
				unlink: jest.fn()
			},
			logger: {
				info: jest.fn(),
				error: jest.fn(),
				warn: jest.fn(),
				debug: jest.fn()
			}
		}
	};

	// Setup default mock implementations
	ctx.mocks.fs.access.mockResolvedValue(undefined);
	ctx.mocks.fs.mkdir.mockResolvedValue(undefined);
	ctx.mocks.fs.writeFile.mockResolvedValue(undefined);

	return ctx;
};
