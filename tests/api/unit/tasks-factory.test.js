/**
 * Factory Pattern for API Testing
 * モックの管理を簡素化し、エラーを防ぐ方法
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { mockTasks } from '../fixtures/api-test-data.js';

// Mock Factory - 一元的にモックを管理
class MockFactory {
  constructor() {
    this.mocks = {
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
    
    this.setupDefaults();
  }
  
  setupDefaults() {
    this.mocks.ensureProjectDirectory.mockReturnValue(undefined);
    this.mocks.prepareDirectFunctionArgs.mockImplementation((action, params) => params);
  }
  
  resetAll() {
    Object.values(this.mocks).forEach(mock => {
      if (typeof mock === 'function' && mock.mockReset) {
        mock.mockReset();
      }
    });
    this.setupDefaults();
  }
  
  // 便利なセットアップメソッド
  setupSuccessfulListTasks(tasks = mockTasks) {
    this.mocks.listTasksDirect.mockResolvedValue({
      success: true,
      data: { tasks }
    });
  }
  
  setupFailedListTasks(error = 'Database error') {
    this.mocks.listTasksDirect.mockResolvedValue({
      success: false,
      error
    });
  }
  
  setupTaskNotFound() {
    this.mocks.showTaskDirect.mockResolvedValue({
      success: false,
      error: 'Task not found'
    });
  }
  
  setupSuccessfulTaskCreation(taskData) {
    this.mocks.addTaskDirect.mockResolvedValue({
      success: true,
      data: { id: 'task_006', ...taskData }
    });
  }
}

// Test App Factory - アプリケーションの作成を簡素化
class TestAppFactory {
  static create(mockFactory) {
    const app = express();
    app.use(express.json());
    
    // シンプルなルート実装（実際のルートと同じロジック）
    app.get('/api/v1/tasks', async (req, res) => {
      try {
        mockFactory.mocks.ensureProjectDirectory();
        const result = await mockFactory.mocks.listTasksDirect({}, mockFactory.mocks.logger, {});
        
        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: { code: 'LIST_TASKS_ERROR', message: result.error }
          });
        }
        
        res.json({
          success: true,
          data: {
            tasks: result.data?.tasks || [],
            totalTasks: result.data?.tasks?.length || 0,
            filteredBy: 'all'
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list tasks' }
        });
      }
    });
    
    app.get('/api/v1/tasks/:id', async (req, res) => {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_TASK_ID', message: 'Task ID must be a number' }
        });
      }
      
      try {
        const result = await mockFactory.mocks.showTaskDirect({}, mockFactory.mocks.logger, {});
        
        if (!result.success) {
          return res.status(404).json({
            success: false,
            error: { code: 'TASK_NOT_FOUND', message: result.error }
          });
        }
        
        res.json({ success: true, data: result.data });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get task' }
        });
      }
    });
    
    app.post('/api/v1/tasks', async (req, res) => {
      const { title, priority } = req.body;
      
      if (!title || title.trim() === '') {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Title is required' }
        });
      }
      
      if (priority && !['low', 'medium', 'high'].includes(priority)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid priority' }
        });
      }
      
      try {
        const result = await mockFactory.mocks.addTaskDirect({}, mockFactory.mocks.logger, {});
        
        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: { code: 'CREATE_TASK_ERROR', message: result.error }
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
          error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create task' }
        });
      }
    });
    
    return app;
  }
}

describe('API Routes - Factory Pattern', () => {
  let mockFactory;
  let app;
  
  beforeEach(() => {
    mockFactory = new MockFactory();
    app = TestAppFactory.create(mockFactory);
  });
  
  describe('GET /api/v1/tasks', () => {
    test('should return all tasks successfully', async () => {
      // Setup - ファクトリーを使用して簡単にセットアップ
      mockFactory.setupSuccessfulListTasks();
      
      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(200);
      
      expect(response.body).toMatchObject({
        success: true,
        data: {
          tasks: mockTasks,
          totalTasks: mockTasks.length,
          filteredBy: 'all'
        }
      });
    });
    
    test('should handle database errors', async () => {
      // Setup - エラーケースも簡単にセットアップ
      mockFactory.setupFailedListTasks('Database connection failed');
      
      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(400);
      
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'LIST_TASKS_ERROR',
          message: 'Database connection failed'
        }
      });
    });
    
    test('should handle unexpected exceptions', async () => {
      // Setup - 例外のセットアップ
      mockFactory.mocks.listTasksDirect.mockRejectedValue(new Error('Network error'));
      
      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(500);
      
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
  
  describe('GET /api/v1/tasks/:id', () => {
    test('should return specific task', async () => {
      const mockTask = mockTasks[0];
      mockFactory.mocks.showTaskDirect.mockResolvedValue({
        success: true,
        data: mockTask
      });
      
      const response = await request(app)
        .get('/api/v1/tasks/1')
        .expect(200);
      
      expect(response.body.data).toEqual(mockTask);
    });
    
    test('should handle invalid task ID', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/invalid')
        .expect(400);
      
      expect(response.body.error.code).toBe('INVALID_TASK_ID');
      // モックが呼ばれていないことを確認
      expect(mockFactory.mocks.showTaskDirect).not.toHaveBeenCalled();
    });
    
    test('should handle task not found', async () => {
      mockFactory.setupTaskNotFound();
      
      const response = await request(app)
        .get('/api/v1/tasks/999')
        .expect(404);
      
      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });
  });
  
  describe('POST /api/v1/tasks', () => {
    test('should create task successfully', async () => {
      const newTask = { title: 'New Task', priority: 'high' };
      mockFactory.setupSuccessfulTaskCreation(newTask);
      
      const response = await request(app)
        .post('/api/v1/tasks')
        .send(newTask)
        .expect(201);
      
      expect(response.body).toMatchObject({
        success: true,
        message: 'Task created successfully'
      });
    });
    
    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({ priority: 'high' })  // titleが欠如
        .expect(400);
      
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockFactory.mocks.addTaskDirect).not.toHaveBeenCalled();
    });
    
    test('should validate enum fields', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Task', priority: 'urgent' })  // 無効な優先度
        .expect(400);
      
      expect(response.body.error.message).toBe('Invalid priority');
    });
  });
});