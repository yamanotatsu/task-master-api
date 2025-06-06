/**
 * Dependency Injection Pattern for API Testing
 * この方法でモックエラーを完全に回避できます
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { mockTasks, createMockTask } from '../fixtures/api-test-data.js';

// モック関数を作成
const mockDependencies = {
  listTasksDirect: jest.fn(),
  showTaskDirect: jest.fn(),
  addTaskDirect: jest.fn(),
  updateTaskByIdDirect: jest.fn(),
  removeTaskDirect: jest.fn(),
  setTaskStatusDirect: jest.fn(),
  prepareDirectFunctionArgs: jest.fn(),
  ensureProjectDirectory: jest.fn(),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
};

// 依存性注入を使用したルートハンドラー
function createTasksRoutes(deps) {
  const router = express.Router();
  
  // Validation schemas
  const taskCreateSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
    dependencies: z.array(z.number()).optional().default([])
  });
  
  const statusUpdateSchema = z.object({
    status: z.enum(['pending', 'in-progress', 'completed', 'blocked'])
  });
  
  // GET /tasks
  router.get('/', async (req, res) => {
    try {
      deps.ensureProjectDirectory();
      const { filter, format = 'json' } = req.query;
      
      const args = deps.prepareDirectFunctionArgs('listTasks', { filter, format });
      const result = await deps.listTasksDirect(args, deps.logger, { session: {} });
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'LIST_TASKS_ERROR',
            message: result.error
          }
        });
      }
      
      res.json({
        success: true,
        data: {
          tasks: result.data?.tasks || [],
          totalTasks: result.data?.tasks?.length || 0,
          filteredBy: filter || 'all'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list tasks'
        }
      });
    }
  });
  
  // GET /tasks/:id
  router.get('/:id', async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TASK_ID',
            message: 'Task ID must be a number'
          }
        });
      }
      
      deps.ensureProjectDirectory();
      const args = deps.prepareDirectFunctionArgs('showTask', { taskId });
      const result = await deps.showTaskDirect(args, deps.logger, { session: {} });
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: result.error || `Task ${taskId} not found`
          }
        });
      }
      
      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get task'
        }
      });
    }
  });
  
  // POST /tasks
  router.post('/', async (req, res) => {
    try {
      const parseResult = taskCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid task data',
            details: parseResult.error.errors
          }
        });
      }
      
      deps.ensureProjectDirectory();
      
      const { title, ...otherFields } = parseResult.data;
      const args = deps.prepareDirectFunctionArgs('addTask', {
        title,
        details: otherFields.details || `Description: ${otherFields.description || 'No description'}`,
        dependencies: otherFields.dependencies?.join(',') || ''
      });
      
      const result = await deps.addTaskDirect(args, deps.logger, { session: {} });
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CREATE_TASK_ERROR',
            message: result.error || 'Failed to create task'
          }
        });
      }
      
      res.status(201).json({
        success: true,
        data: result.data,
        message: 'Task created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create task'
        }
      });
    }
  });
  
  // PATCH /tasks/:id/status
  router.patch('/:id/status', async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TASK_ID',
            message: 'Task ID must be a number'
          }
        });
      }
      
      const parseResult = statusUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status data',
            details: parseResult.error.errors
          }
        });
      }
      
      deps.ensureProjectDirectory();
      
      const { status } = parseResult.data;
      const args = deps.prepareDirectFunctionArgs('setTaskStatus', { 
        taskId, 
        status 
      });
      
      const result = await deps.setTaskStatusDirect(args, deps.logger, { session: {} });
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'UPDATE_STATUS_ERROR',
            message: result.error || `Failed to update status for task ${taskId}`
          }
        });
      }
      
      res.json({
        success: true,
        data: result.data,
        message: `Task ${taskId} status updated to ${status}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update task status'
        }
      });
    }
  });
  
  return router;
}

// テスト用アプリケーション作成
function createTestApp(dependencies = mockDependencies) {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/tasks', createTasksRoutes(dependencies));
  return app;
}

describe('API Routes - Dependency Injection Pattern', () => {
  let app;
  
  beforeEach(() => {
    // モックをリセット
    Object.values(mockDependencies).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockReset();
      }
    });
    
    // デフォルトの実装を設定
    mockDependencies.ensureProjectDirectory.mockReturnValue(undefined);
    mockDependencies.prepareDirectFunctionArgs.mockImplementation((action, params) => params);
    
    app = createTestApp();
  });
  
  describe('GET /api/v1/tasks', () => {
    test('should return all tasks without filter', async () => {
      const mockResponse = {
        success: true,
        data: { tasks: mockTasks }
      };
      mockDependencies.listTasksDirect.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/v1/tasks')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          tasks: mockTasks,
          totalTasks: mockTasks.length,
          filteredBy: 'all'
        }
      });
      
      expect(mockDependencies.listTasksDirect).toHaveBeenCalledWith(
        expect.any(Object),
        mockDependencies.logger,
        expect.any(Object)
      );
    });
    
    test('should handle direct function errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Failed to read tasks file'
      };
      mockDependencies.listTasksDirect.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'LIST_TASKS_ERROR',
          message: 'Failed to read tasks file'
        }
      });
    });
    
    test('should handle unexpected errors', async () => {
      mockDependencies.listTasksDirect.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list tasks'
        }
      });
    });
  });
  
  describe('GET /api/v1/tasks/:id', () => {
    test('should return a specific task', async () => {
      const task = mockTasks[0];
      const mockResponse = {
        success: true,
        data: task
      };
      mockDependencies.showTaskDirect.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/v1/tasks/1')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: task
      });
    });
    
    test('should return 400 for non-numeric task ID', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/abc')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_TASK_ID',
          message: 'Task ID must be a number'
        }
      });
      
      expect(mockDependencies.showTaskDirect).not.toHaveBeenCalled();
    });
  });
  
  describe('POST /api/v1/tasks', () => {
    test('should create a task with required fields only', async () => {
      const newTask = {
        title: 'New Task'
      };
      const mockResponse = {
        success: true,
        data: createMockTask({ ...newTask, id: 'task_006' })
      };
      mockDependencies.addTaskDirect.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/v1/tasks')
        .send(newTask)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Task created successfully'
      });
    });
    
    test('should reject task without title', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({ description: 'No title' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid task data'
        }
      });
      
      expect(mockDependencies.addTaskDirect).not.toHaveBeenCalled();
    });
  });
  
  describe('PATCH /api/v1/tasks/:id/status', () => {
    test('should update task status', async () => {
      const mockResponse = {
        success: true,
        data: { status: 'completed' }
      };
      mockDependencies.setTaskStatusDirect.mockResolvedValue(mockResponse);

      const response = await request(app)
        .patch('/api/v1/tasks/1/status')
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Task 1 status updated to completed'
      });
    });
    
    test('should reject invalid status values', async () => {
      const response = await request(app)
        .patch('/api/v1/tasks/1/status')
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status data'
        }
      });
    });
  });
});