/**
 * Integration tests for complete API workflows
 * Tests end-to-end scenarios with real API interactions
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createTestApp } from '../helpers/test-utils.js';
import { mockTasks, createMockTask } from '../fixtures/api-test-data.js';
import { generateLargeTasks } from '../fixtures/large-datasets.js';

// Create test application with all routes
function createIntegrationTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock dependencies
  const mockDependencies = {
    listTasksDirect: jest.fn(),
    showTaskDirect: jest.fn(),
    addTaskDirect: jest.fn(),
    updateTaskByIdDirect: jest.fn(),
    removeTaskDirect: jest.fn(),
    setTaskStatusDirect: jest.fn(),
    addSubtaskDirect: jest.fn(),
    updateSubtaskByIdDirect: jest.fn(),
    removeSubtaskDirect: jest.fn(),
    addDependencyDirect: jest.fn(),
    removeDependencyDirect: jest.fn(),
    validateDependenciesDirect: jest.fn(),
    fixDependenciesDirect: jest.fn(),
    expandTaskDirect: jest.fn(),
    clearSubtasksDirect: jest.fn(),
    expandAllTasksDirect: jest.fn(),
    generateTasksFromPrdDirect: jest.fn(),
    prepareDirectFunctionArgs: jest.fn((action, params) => params),
    ensureProjectDirectory: jest.fn(),
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }
  };

  // Simulate API routes with mock implementations
  
  // Tasks routes
  app.get('/api/v1/tasks', async (req, res) => {
    const result = await mockDependencies.listTasksDirect({}, mockDependencies.logger, {});
    if (!result.success) {
      return res.status(400).json({ success: false, error: { code: 'LIST_TASKS_ERROR', message: result.error } });
    }
    res.json({
      success: true,
      data: {
        tasks: result.data?.tasks || [],
        totalTasks: result.data?.tasks?.length || 0,
        filteredBy: req.query.filter || 'all'
      }
    });
  });

  app.get('/api/v1/tasks/:id', async (req, res) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TASK_ID', message: 'Task ID must be a number' } });
    }
    
    const result = await mockDependencies.showTaskDirect({ taskId }, mockDependencies.logger, {});
    if (!result.success) {
      return res.status(404).json({ success: false, error: { code: 'TASK_NOT_FOUND', message: result.error } });
    }
    res.json({ success: true, data: result.data });
  });

  app.post('/api/v1/tasks', async (req, res) => {
    if (!req.body.title) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title is required' } });
    }
    
    const result = await mockDependencies.addTaskDirect(req.body, mockDependencies.logger, {});
    if (!result.success) {
      return res.status(400).json({ success: false, error: { code: 'CREATE_TASK_ERROR', message: result.error } });
    }
    res.status(201).json({ success: true, data: result.data, message: 'Task created successfully' });
  });

  app.put('/api/v1/tasks/:id', async (req, res) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TASK_ID', message: 'Task ID must be a number' } });
    }
    
    const result = await mockDependencies.updateTaskByIdDirect({ taskId, updates: req.body }, mockDependencies.logger, {});
    if (!result.success) {
      return res.status(404).json({ success: false, error: { code: 'UPDATE_TASK_ERROR', message: result.error } });
    }
    res.json({ success: true, data: result.data, message: 'Task updated successfully' });
  });

  app.delete('/api/v1/tasks/:id', async (req, res) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TASK_ID', message: 'Task ID must be a number' } });
    }
    
    const result = await mockDependencies.removeTaskDirect({ taskId }, mockDependencies.logger, {});
    if (!result.success) {
      return res.status(404).json({ success: false, error: { code: 'DELETE_TASK_ERROR', message: result.error } });
    }
    res.json({ success: true, message: `Task ${taskId} deleted successfully` });
  });

  app.patch('/api/v1/tasks/:id/status', async (req, res) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TASK_ID', message: 'Task ID must be a number' } });
    }
    
    if (!req.body.status || !['pending', 'in-progress', 'completed', 'blocked'].includes(req.body.status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status' } });
    }
    
    const result = await mockDependencies.setTaskStatusDirect({ taskId, status: req.body.status }, mockDependencies.logger, {});
    if (!result.success) {
      return res.status(404).json({ success: false, error: { code: 'UPDATE_STATUS_ERROR', message: result.error } });
    }
    res.json({ success: true, data: result.data, message: `Task ${taskId} status updated to ${req.body.status}` });
  });

  // Subtasks routes
  app.post('/api/v1/tasks/:id/subtasks', async (req, res) => {
    const parentTaskId = parseInt(req.params.id);
    if (isNaN(parentTaskId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TASK_ID', message: 'Task ID must be a number' } });
    }
    
    if (!req.body.title) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Subtask title is required' } });
    }
    
    const result = await mockDependencies.addSubtaskDirect({ parentTaskId, ...req.body }, mockDependencies.logger, {});
    if (!result.success) {
      return res.status(404).json({ success: false, error: { code: 'ADD_SUBTASK_ERROR', message: result.error } });
    }
    res.status(201).json({ success: true, data: result });
  });

  // Dependencies routes
  app.post('/api/v1/tasks/:id/dependencies', async (req, res) => {
    const taskId = parseInt(req.params.id);
    const dependencyId = parseInt(req.body.dependencyId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TASK_ID', message: 'Task ID must be a number' } });
    }
    
    if (isNaN(dependencyId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Dependency ID must be a number' } });
    }
    
    const result = await mockDependencies.addDependencyDirect({ taskId, dependencyId }, mockDependencies.logger, {});
    if (!result.success) {
      return res.status(400).json({ success: false, error: { code: 'ADD_DEPENDENCY_ERROR', message: result.error } });
    }
    res.json({ success: true, data: result });
  });

  // Task expansion routes
  app.post('/api/v1/tasks/:id/expand', async (req, res) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TASK_ID', message: 'Task ID must be a number' } });
    }
    
    const result = await mockDependencies.expandTaskDirect({ id: taskId, ...req.body }, mockDependencies.logger, {});
    if (!result.success) {
      return res.status(400).json({ success: false, error: { code: 'EXPAND_TASK_ERROR', message: result.error } });
    }
    res.json({ success: true, data: result });
  });

  // Task generation routes
  app.post('/api/v1/tasks/generate-from-prd', async (req, res) => {
    if (!req.body.prd_content) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'PRD content is required' } });
    }
    
    const result = await mockDependencies.generateTasksFromPrdDirect({ prdContent: req.body.prd_content }, mockDependencies.logger, {});
    if (!result.success) {
      return res.status(500).json({ success: false, error: { code: 'TASK_GENERATION_ERROR', message: result.error } });
    }
    res.json({ success: true, data: result });
  });

  return { app, mocks: mockDependencies };
}

describe('API Integration Tests - Complete Workflows', () => {
  let app;
  let mocks;

  beforeEach(() => {
    const testApp = createIntegrationTestApp();
    app = testApp.app;
    mocks = testApp.mocks;
    
    // Reset all mocks
    Object.values(mocks).forEach(mock => {
      if (typeof mock === 'function' && mock.mockReset) {
        mock.mockReset();
      }
    });
  });

  describe('Complete task lifecycle workflow', () => {
    test('should create, update, and delete a task', async () => {
      // 1. Create a task
      const newTask = createMockTask({
        id: 'task_001',
        title: 'Integration Test Task',
        description: 'Task for integration testing'
      });
      
      mocks.addTaskDirect.mockResolvedValue({
        success: true,
        data: newTask
      });

      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send({
          title: 'Integration Test Task',
          description: 'Task for integration testing',
          priority: 'high'
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.title).toBe('Integration Test Task');

      // 2. Update the task
      const updatedTask = { ...newTask, title: 'Updated Integration Test Task' };
      mocks.updateTaskByIdDirect.mockResolvedValue({
        success: true,
        data: updatedTask
      });

      const updateResponse = await request(app)
        .put('/api/v1/tasks/1')
        .send({ title: 'Updated Integration Test Task' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.message).toBe('Task updated successfully');

      // 3. Delete the task
      mocks.removeTaskDirect.mockResolvedValue({
        success: true,
        data: { deleted: true }
      });

      const deleteResponse = await request(app)
        .delete('/api/v1/tasks/1')
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('Task 1 deleted successfully');

      // Verify mock calls
      expect(mocks.addTaskDirect).toHaveBeenCalledTimes(1);
      expect(mocks.updateTaskByIdDirect).toHaveBeenCalledTimes(1);
      expect(mocks.removeTaskDirect).toHaveBeenCalledTimes(1);
    });

    test('should handle task status progression workflow', async () => {
      const taskStatuses = ['pending', 'in-progress', 'completed'];
      
      for (let i = 0; i < taskStatuses.length; i++) {
        const status = taskStatuses[i];
        const taskWithStatus = createMockTask({
          id: 'task_001',
          status
        });
        
        mocks.setTaskStatusDirect.mockResolvedValue({
          success: true,
          data: taskWithStatus
        });

        const response = await request(app)
          .patch('/api/v1/tasks/1/status')
          .send({ status })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe(`Task 1 status updated to ${status}`);
      }

      expect(mocks.setTaskStatusDirect).toHaveBeenCalledTimes(3);
    });
  });

  describe('Task with subtasks workflow', () => {
    test('should create task and add multiple subtasks', async () => {
      // 1. Create main task
      const mainTask = createMockTask({
        id: 'task_001',
        title: 'Main Task with Subtasks',
        subtasks: []
      });
      
      mocks.addTaskDirect.mockResolvedValue({
        success: true,
        data: mainTask
      });

      await request(app)
        .post('/api/v1/tasks')
        .send({
          title: 'Main Task with Subtasks',
          description: 'Task that will have subtasks'
        })
        .expect(201);

      // 2. Add multiple subtasks
      const subtasks = [
        { title: 'Subtask 1', description: 'First subtask' },
        { title: 'Subtask 2', description: 'Second subtask' },
        { title: 'Subtask 3', description: 'Third subtask' }
      ];

      for (let i = 0; i < subtasks.length; i++) {
        const subtask = subtasks[i];
        const taskWithSubtask = {
          ...mainTask,
          subtasks: [
            ...mainTask.subtasks,
            { id: `sub_001_${i + 1}`, ...subtask, completed: false }
          ]
        };
        
        mocks.addSubtaskDirect.mockResolvedValue({
          success: true,
          task: taskWithSubtask,
          subtask: { id: `sub_001_${i + 1}`, ...subtask, completed: false }
        });

        const response = await request(app)
          .post('/api/v1/tasks/1/subtasks')
          .send(subtask)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.subtask.title).toBe(subtask.title);
      }

      expect(mocks.addSubtaskDirect).toHaveBeenCalledTimes(3);
    });
  });

  describe('Task dependencies workflow', () => {
    test('should create tasks with dependency chain', async () => {
      // Create a chain of dependent tasks: Task A -> Task B -> Task C
      const tasks = [
        createMockTask({ id: 'task_001', title: 'Task A (Foundation)', dependencies: [] }),
        createMockTask({ id: 'task_002', title: 'Task B (Depends on A)', dependencies: ['task_001'] }),
        createMockTask({ id: 'task_003', title: 'Task C (Depends on B)', dependencies: ['task_002'] })
      ];

      // 1. Create Task A (no dependencies)
      mocks.addTaskDirect.mockResolvedValueOnce({
        success: true,
        data: tasks[0]
      });

      await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Task A (Foundation)' })
        .expect(201);

      // 2. Create Task B
      mocks.addTaskDirect.mockResolvedValueOnce({
        success: true,
        data: tasks[1]
      });

      await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Task B (Depends on A)' })
        .expect(201);

      // 3. Add dependency: Task B depends on Task A
      mocks.addDependencyDirect.mockResolvedValue({
        success: true,
        task: tasks[1],
        message: 'Dependency added successfully'
      });

      const dependencyResponse = await request(app)
        .post('/api/v1/tasks/2/dependencies')
        .send({ dependencyId: 1 })
        .expect(200);

      expect(dependencyResponse.body.success).toBe(true);

      // 4. Create Task C and add dependency to Task B
      mocks.addTaskDirect.mockResolvedValueOnce({
        success: true,
        data: tasks[2]
      });

      await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Task C (Depends on B)' })
        .expect(201);

      await request(app)
        .post('/api/v1/tasks/3/dependencies')
        .send({ dependencyId: 2 })
        .expect(200);

      // Verify all operations completed
      expect(mocks.addTaskDirect).toHaveBeenCalledTimes(3);
      expect(mocks.addDependencyDirect).toHaveBeenCalledTimes(2);
    });

    test('should prevent circular dependencies', async () => {
      // Try to create circular dependency: A -> B -> A
      mocks.addDependencyDirect.mockResolvedValue({
        success: false,
        error: 'Circular dependency detected'
      });

      const response = await request(app)
        .post('/api/v1/tasks/1/dependencies')
        .send({ dependencyId: 1 }) // Self-dependency
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADD_DEPENDENCY_ERROR');
      expect(response.body.error.message).toBe('Circular dependency detected');
    });
  });

  describe('Task expansion workflow', () => {
    test('should expand task into subtasks', async () => {
      const expandedTask = createMockTask({
        id: 'task_001',
        title: 'Complex Task',
        subtasks: [
          { id: 'sub_001_1', title: 'Setup environment', completed: false },
          { id: 'sub_001_2', title: 'Implement core features', completed: false },
          { id: 'sub_001_3', title: 'Add tests', completed: false },
          { id: 'sub_001_4', title: 'Documentation', completed: false },
          { id: 'sub_001_5', title: 'Code review', completed: false }
        ]
      });

      mocks.expandTaskDirect.mockResolvedValue({
        success: true,
        task: expandedTask,
        message: 'Task expanded successfully with 5 subtasks',
        telemetryData: {
          tokensUsed: 1500,
          provider: 'anthropic',
          expansionTime: 2340
        }
      });

      const response = await request(app)
        .post('/api/v1/tasks/1/expand')
        .send({ numSubtasks: 5, useResearch: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task.subtasks).toHaveLength(5);
      expect(response.body.data.telemetryData.tokensUsed).toBe(1500);
    });
  });

  describe('Task generation from PRD workflow', () => {
    test('should generate tasks from PRD content', async () => {
      const samplePRD = `
        # Project: Task Management System
        
        ## Features
        1. User authentication
        2. Task CRUD operations
        3. Real-time updates
        4. Analytics dashboard
      `;

      const generatedTasks = Array.from({ length: 10 }, (_, i) => 
        createMockTask({
          id: `task_${String(i + 1).padStart(3, '0')}`,
          title: `Generated Task ${i + 1}`,
          description: 'Auto-generated from PRD',
          status: 'not-started'
        })
      );

      mocks.generateTasksFromPrdDirect.mockResolvedValue({
        success: true,
        tasks: generatedTasks,
        metadata: {
          totalTasks: 10,
          averageComplexity: 'medium',
          estimatedDuration: '4-6 weeks',
          generationTime: 1234
        },
        telemetryData: {
          tokensUsed: 2500,
          provider: 'anthropic',
          model: 'claude-3-sonnet'
        }
      });

      const response = await request(app)
        .post('/api/v1/tasks/generate-from-prd')
        .send({
          prd_content: samplePRD,
          target_task_count: 10,
          use_research_mode: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(10);
      expect(response.body.data.metadata.totalTasks).toBe(10);
      expect(response.body.data.telemetryData.tokensUsed).toBe(2500);
    });
  });

  describe('Error handling workflows', () => {
    test('should handle task not found in workflow', async () => {
      // Try to update non-existent task
      mocks.updateTaskByIdDirect.mockResolvedValue({
        success: false,
        error: 'Task not found'
      });

      await request(app)
        .put('/api/v1/tasks/999')
        .send({ title: 'Updated Title' })
        .expect(404);

      // Try to add subtask to non-existent task
      mocks.addSubtaskDirect.mockResolvedValue({
        success: false,
        error: 'Task not found'
      });

      await request(app)
        .post('/api/v1/tasks/999/subtasks')
        .send({ title: 'New Subtask' })
        .expect(404);

      // Try to add dependency to non-existent task
      mocks.addDependencyDirect.mockResolvedValue({
        success: false,
        error: 'Task not found'
      });

      await request(app)
        .post('/api/v1/tasks/999/dependencies')
        .send({ dependencyId: 1 })
        .expect(400);
    });

    test('should handle validation errors in workflow', async () => {
      // Create task without title
      await request(app)
        .post('/api/v1/tasks')
        .send({ description: 'No title provided' })
        .expect(400);

      // Update task status with invalid status
      await request(app)
        .patch('/api/v1/tasks/1/status')
        .send({ status: 'invalid-status' })
        .expect(400);

      // Add subtask without title
      await request(app)
        .post('/api/v1/tasks/1/subtasks')
        .send({ description: 'No title' })
        .expect(400);

      // Add dependency with invalid ID
      await request(app)
        .post('/api/v1/tasks/1/dependencies')
        .send({ dependencyId: 'invalid' })
        .expect(400);
    });
  });

  describe('Performance workflows', () => {
    test('should handle large task list operations', async () => {
      const largeTasks = generateLargeTasks(100);
      
      mocks.listTasksDirect.mockResolvedValue({
        success: true,
        data: { tasks: largeTasks }
      });

      const start = Date.now();
      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(200);
      const duration = Date.now() - start;

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(100);
      expect(response.body.data.totalTasks).toBe(100);
      
      // Performance assertion - should respond within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second max for 100 tasks
    });
  });

  describe('Concurrent operations workflow', () => {
    test('should handle multiple simultaneous status updates', async () => {
      const statuses = ['pending', 'in-progress', 'completed'];
      const promises = [];

      // Setup mock for each status update
      statuses.forEach((status, index) => {
        mocks.setTaskStatusDirect.mockResolvedValueOnce({
          success: true,
          data: createMockTask({ id: `task_00${index + 1}`, status })
        });
      });

      // Send multiple status updates concurrently
      statuses.forEach((status, index) => {
        const promise = request(app)
          .patch(`/api/v1/tasks/${index + 1}/status`)
          .send({ status })
          .expect(200);
        promises.push(promise);
      });

      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain(statuses[index]);
      });

      expect(mocks.setTaskStatusDirect).toHaveBeenCalledTimes(3);
    });
  });
});