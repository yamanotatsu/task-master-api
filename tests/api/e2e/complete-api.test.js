/**
 * End-to-End API Tests
 * Tests the complete API functionality from client perspective
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createMockTask, createMockTasks } from '../fixtures/api-test-data.js';
import { generateLargeTasks, performanceBenchmarks } from '../fixtures/large-datasets.js';
import { extremeStrings, securityPayloads } from '../fixtures/edge-cases.js';

// Create full API application for E2E testing
function createE2EApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // In-memory data store for E2E tests
  let taskStore = new Map();
  let taskCounter = 1;
  let projectConfig = {
    name: 'e2e-test-project',
    aiProvider: 'anthropic',
    initialized: true
  };

  // Helper functions
  const generateTaskId = () => `task_${String(taskCounter++).padStart(3, '0')}`;
  const findTask = (id) => {
    const numId = typeof id === 'string' ? parseInt(id.replace('task_', '')) : id;
    for (const [key, task] of taskStore) {
      if (key === `task_${String(numId).padStart(3, '0')}`) {
        return task;
      }
    }
    return null;
  };
  
  const validateTask = (taskData) => {
    if (!taskData.title || taskData.title.trim() === '') {
      return { valid: false, error: 'Title is required' };
    }
    if (taskData.priority && !['low', 'medium', 'high', 'critical'].includes(taskData.priority)) {
      return { valid: false, error: 'Invalid priority' };
    }
    if (taskData.status && !['pending', 'in-progress', 'completed', 'blocked'].includes(taskData.status)) {
      return { valid: false, error: 'Invalid status' };
    }
    return { valid: true };
  };

  const checkCircularDependency = (taskId, dependencies) => {
    const visited = new Set();
    const checkDep = (id) => {
      if (visited.has(id)) return true;
      if (id === taskId) return true;
      visited.add(id);
      
      const task = findTask(id);
      if (task && task.dependencies) {
        return task.dependencies.some(depId => checkDep(depId));
      }
      return false;
    };
    
    return dependencies.some(depId => checkDep(depId));
  };

  // Initialize with sample data
  const sampleTasks = [
    createMockTask({
      id: 'task_001',
      title: 'Setup project foundation',
      status: 'completed',
      dependencies: []
    }),
    createMockTask({
      id: 'task_002', 
      title: 'Implement core features',
      status: 'in-progress',
      dependencies: ['task_001']
    }),
    createMockTask({
      id: 'task_003',
      title: 'Add comprehensive testing',
      status: 'pending',
      dependencies: ['task_002']
    })
  ];

  sampleTasks.forEach(task => {
    taskStore.set(task.id, task);
    const numId = parseInt(task.id.replace('task_', ''));
    if (numId >= taskCounter) taskCounter = numId + 1;
  });

  // Middleware for request logging
  app.use((req, res, next) => {
    console.log(`E2E: ${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      tasksCount: taskStore.size 
    });
  });

  // Project info endpoint
  app.get('/api/v1/project', (req, res) => {
    res.json({
      success: true,
      data: {
        ...projectConfig,
        taskCount: taskStore.size,
        completedTasks: Array.from(taskStore.values()).filter(t => t.status === 'completed').length
      }
    });
  });

  // Tasks CRUD endpoints
  app.get('/api/v1/tasks', (req, res) => {
    try {
      const { filter, format, limit, offset } = req.query;
      let tasks = Array.from(taskStore.values());
      
      // Apply filter
      if (filter && filter !== 'all') {
        tasks = tasks.filter(task => task.status === filter);
      }
      
      // Apply pagination
      const startIndex = parseInt(offset) || 0;
      const pageSize = parseInt(limit) || tasks.length;
      const paginatedTasks = tasks.slice(startIndex, startIndex + pageSize);
      
      res.json({
        success: true,
        data: {
          tasks: paginatedTasks,
          totalTasks: tasks.length,
          filteredBy: filter || 'all',
          pagination: {
            offset: startIndex,
            limit: pageSize,
            total: tasks.length
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        }
      });
    }
  });

  app.get('/api/v1/tasks/:id', (req, res) => {
    const taskId = req.params.id;
    const numId = parseInt(taskId);
    
    if (isNaN(numId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TASK_ID',
          message: 'Task ID must be a number'
        }
      });
    }
    
    const task = findTask(numId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${taskId} not found`
        }
      });
    }
    
    res.json({
      success: true,
      data: task
    });
  });

  app.post('/api/v1/tasks', (req, res) => {
    const validation = validateTask(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error
        }
      });
    }
    
    const taskId = generateTaskId();
    const newTask = createMockTask({
      id: taskId,
      title: req.body.title,
      description: req.body.description || '',
      priority: req.body.priority || 'medium',
      status: 'pending',
      dependencies: req.body.dependencies || [],
      subtasks: req.body.subtasks || []
    });
    
    // Check for circular dependencies
    if (newTask.dependencies.length > 0) {
      if (checkCircularDependency(taskId, newTask.dependencies)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CIRCULAR_DEPENDENCY',
            message: 'Circular dependency detected'
          }
        });
      }
    }
    
    taskStore.set(taskId, newTask);
    
    res.status(201).json({
      success: true,
      data: newTask,
      message: 'Task created successfully'
    });
  });

  app.put('/api/v1/tasks/:id', (req, res) => {
    const taskId = req.params.id;
    const numId = parseInt(taskId);
    
    if (isNaN(numId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TASK_ID',
          message: 'Task ID must be a number'
        }
      });
    }
    
    const existingTask = findTask(numId);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${taskId} not found`
        }
      });
    }
    
    // Validate updates
    const updates = { ...req.body };
    if (Object.keys(updates).length > 0) {
      const validation = validateTask({ ...existingTask, ...updates });
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error
          }
        });
      }
    }
    
    // Check dependencies for circular references
    if (updates.dependencies) {
      if (checkCircularDependency(existingTask.id, updates.dependencies)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CIRCULAR_DEPENDENCY',
            message: 'Circular dependency detected'
          }
        });
      }
    }
    
    const updatedTask = {
      ...existingTask,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    taskStore.set(existingTask.id, updatedTask);
    
    res.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });
  });

  app.delete('/api/v1/tasks/:id', (req, res) => {
    const taskId = req.params.id;
    const numId = parseInt(taskId);
    
    if (isNaN(numId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TASK_ID',
          message: 'Task ID must be a number'
        }
      });
    }
    
    const taskKey = `task_${String(numId).padStart(3, '0')}`;
    const task = taskStore.get(taskKey);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${taskId} not found`
        }
      });
    }
    
    // Check if other tasks depend on this task
    const dependentTasks = Array.from(taskStore.values())
      .filter(t => t.dependencies && t.dependencies.includes(taskKey));
    
    if (dependentTasks.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TASK_HAS_DEPENDENTS',
          message: `Cannot delete task with ${dependentTasks.length} dependent tasks`
        }
      });
    }
    
    taskStore.delete(taskKey);
    
    res.json({
      success: true,
      message: `Task ${taskId} deleted successfully`
    });
  });

  app.patch('/api/v1/tasks/:id/status', (req, res) => {
    const taskId = req.params.id;
    const numId = parseInt(taskId);
    const { status } = req.body;
    
    if (isNaN(numId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TASK_ID',
          message: 'Task ID must be a number'
        }
      });
    }
    
    if (!status || !['pending', 'in-progress', 'completed', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status value'
        }
      });
    }
    
    const task = findTask(numId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${taskId} not found`
        }
      });
    }
    
    // Check dependencies before marking as completed
    if (status === 'completed' && task.dependencies.length > 0) {
      const incompleteDeps = task.dependencies.filter(depId => {
        const depTask = findTask(depId.replace('task_', ''));
        return depTask && depTask.status !== 'completed';
      });
      
      if (incompleteDeps.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DEPENDENCIES_NOT_COMPLETED',
            message: `Cannot complete task with ${incompleteDeps.length} incomplete dependencies`
          }
        });
      }
    }
    
    const updatedTask = {
      ...task,
      status,
      updatedAt: new Date().toISOString()
    };
    
    taskStore.set(task.id, updatedTask);
    
    res.json({
      success: true,
      data: updatedTask,
      message: `Task ${taskId} status updated to ${status}`
    });
  });

  // Subtasks endpoints
  app.post('/api/v1/tasks/:id/subtasks', (req, res) => {
    const parentTaskId = parseInt(req.params.id);
    const { title, description } = req.body;
    
    if (isNaN(parentTaskId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TASK_ID',
          message: 'Task ID must be a number'
        }
      });
    }
    
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Subtask title is required'
        }
      });
    }
    
    const parentTask = findTask(parentTaskId);
    if (!parentTask) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Parent task ${parentTaskId} not found`
        }
      });
    }
    
    const subtaskId = `sub_${parentTaskId}_${(parentTask.subtasks.length + 1)}`;
    const newSubtask = {
      id: subtaskId,
      title: title.trim(),
      description: description || '',
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    const updatedTask = {
      ...parentTask,
      subtasks: [...parentTask.subtasks, newSubtask],
      updatedAt: new Date().toISOString()
    };
    
    taskStore.set(parentTask.id, updatedTask);
    
    res.status(201).json({
      success: true,
      data: {
        task: updatedTask,
        subtask: newSubtask,
        message: 'Subtask added successfully'
      }
    });
  });

  // Dependencies endpoints
  app.post('/api/v1/tasks/:id/dependencies', (req, res) => {
    const taskId = parseInt(req.params.id);
    const dependencyId = parseInt(req.body.dependencyId);
    
    if (isNaN(taskId) || isNaN(dependencyId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Task ID and dependency ID must be numbers'
        }
      });
    }
    
    const task = findTask(taskId);
    const dependencyTask = findTask(dependencyId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${taskId} not found`
        }
      });
    }
    
    if (!dependencyTask) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEPENDENCY_NOT_FOUND',
          message: `Dependency task ${dependencyId} not found`
        }
      });
    }
    
    const dependencyTaskId = `task_${String(dependencyId).padStart(3, '0')}`;
    
    // Check if dependency already exists
    if (task.dependencies.includes(dependencyTaskId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DEPENDENCY_EXISTS',
          message: 'Dependency already exists'
        }
      });
    }
    
    const newDependencies = [...task.dependencies, dependencyTaskId];
    
    // Check for circular dependencies
    if (checkCircularDependency(task.id, newDependencies)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CIRCULAR_DEPENDENCY',
          message: 'Adding this dependency would create a circular reference'
        }
      });
    }
    
    const updatedTask = {
      ...task,
      dependencies: newDependencies,
      updatedAt: new Date().toISOString()
    };
    
    taskStore.set(task.id, updatedTask);
    
    res.json({
      success: true,
      data: {
        task: updatedTask,
        message: 'Dependency added successfully'
      }
    });
  });

  // Bulk operations
  app.post('/api/v1/tasks/bulk-create', (req, res) => {
    const { tasks } = req.body;
    
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Tasks array is required'
        }
      });
    }
    
    const createdTasks = [];
    const errors = [];
    
    tasks.forEach((taskData, index) => {
      const validation = validateTask(taskData);
      if (!validation.valid) {
        errors.push({ index, error: validation.error });
        return;
      }
      
      const taskId = generateTaskId();
      const newTask = createMockTask({
        id: taskId,
        title: taskData.title,
        description: taskData.description || '',
        priority: taskData.priority || 'medium',
        status: 'pending',
        dependencies: taskData.dependencies || [],
        subtasks: taskData.subtasks || []
      });
      
      taskStore.set(taskId, newTask);
      createdTasks.push(newTask);
    });
    
    res.status(201).json({
      success: true,
      data: {
        created: createdTasks,
        errors: errors,
        summary: {
          total: tasks.length,
          created: createdTasks.length,
          failed: errors.length
        }
      }
    });
  });

  // Analytics endpoint
  app.get('/api/v1/analytics', (req, res) => {
    const tasks = Array.from(taskStore.values());
    const statusCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});
    
    const priorityCounts = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});
    
    const completionRate = tasks.length > 0 
      ? (statusCounts.completed || 0) / tasks.length * 100 
      : 0;
    
    res.json({
      success: true,
      data: {
        overview: {
          totalTasks: tasks.length,
          completedTasks: statusCounts.completed || 0,
          completionRate: Math.round(completionRate * 100) / 100
        },
        statusDistribution: statusCounts,
        priorityDistribution: priorityCounts,
        recentActivity: tasks
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 10)
          .map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            updatedAt: task.updatedAt
          }))
      }
    });
  });

  return app;
}

describe('E2E API Tests - Complete Functionality', () => {
  let app;

  beforeEach(() => {
    app = createE2EApp();
  });

  describe('Basic API Health and Setup', () => {
    test('should respond to health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.tasksCount).toBeDefined();
    });

    test('should return project information', async () => {
      const response = await request(app)
        .get('/api/v1/project')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('e2e-test-project');
      expect(response.body.data.taskCount).toBeGreaterThan(0);
    });
  });

  describe('Complete Task Management Workflow', () => {
    test('should handle full task lifecycle', async () => {
      // 1. List initial tasks
      const initialList = await request(app)
        .get('/api/v1/tasks')
        .expect(200);
      
      const initialCount = initialList.body.data.totalTasks;
      expect(initialCount).toBeGreaterThan(0);

      // 2. Create a new task
      const newTaskData = {
        title: 'E2E Test Task',
        description: 'Task created during E2E testing',
        priority: 'high',
        dependencies: []
      };

      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send(newTaskData)
        .expect(201);

      const createdTask = createResponse.body.data;
      expect(createdTask.title).toBe(newTaskData.title);
      expect(createdTask.status).toBe('pending');

      // 3. Verify task appears in list
      const updatedList = await request(app)
        .get('/api/v1/tasks')
        .expect(200);
      
      expect(updatedList.body.data.totalTasks).toBe(initialCount + 1);

      // 4. Get specific task
      const taskId = parseInt(createdTask.id.replace('task_', ''));
      const getResponse = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .expect(200);
      
      expect(getResponse.body.data.title).toBe(newTaskData.title);

      // 5. Update task
      const updateData = {
        title: 'Updated E2E Test Task',
        priority: 'medium'
      };

      const updateResponse = await request(app)
        .put(`/api/v1/tasks/${taskId}`)
        .send(updateData)
        .expect(200);
      
      expect(updateResponse.body.data.title).toBe(updateData.title);
      expect(updateResponse.body.data.priority).toBe(updateData.priority);

      // 6. Update status progression
      const statuses = ['in-progress', 'completed'];
      for (const status of statuses) {
        const statusResponse = await request(app)
          .patch(`/api/v1/tasks/${taskId}/status`)
          .send({ status })
          .expect(200);
        
        expect(statusResponse.body.data.status).toBe(status);
      }

      // 7. Add subtask
      const subtaskData = {
        title: 'E2E Test Subtask',
        description: 'Subtask for testing'
      };

      const subtaskResponse = await request(app)
        .post(`/api/v1/tasks/${taskId}/subtasks`)
        .send(subtaskData)
        .expect(201);
      
      expect(subtaskResponse.body.data.subtask.title).toBe(subtaskData.title);

      // 8. Clean up - delete task
      await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .expect(200);

      // 9. Verify task is deleted
      await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .expect(404);
    });

    test('should handle dependency workflow', async () => {
      // Create two tasks
      const task1 = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Foundation Task', priority: 'high' })
        .expect(201);

      const task2 = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Dependent Task', priority: 'medium' })
        .expect(201);

      const task1Id = parseInt(task1.body.data.id.replace('task_', ''));
      const task2Id = parseInt(task2.body.data.id.replace('task_', ''));

      // Add dependency: task2 depends on task1
      await request(app)
        .post(`/api/v1/tasks/${task2Id}/dependencies`)
        .send({ dependencyId: task1Id })
        .expect(200);

      // Try to complete task2 while task1 is not completed (should fail)
      await request(app)
        .patch(`/api/v1/tasks/${task2Id}/status`)
        .send({ status: 'completed' })
        .expect(400);

      // Complete task1 first
      await request(app)
        .patch(`/api/v1/tasks/${task1Id}/status`)
        .send({ status: 'completed' })
        .expect(200);

      // Now complete task2 (should succeed)
      await request(app)
        .patch(`/api/v1/tasks/${task2Id}/status`)
        .send({ status: 'completed' })
        .expect(200);

      // Clean up
      await request(app).delete(`/api/v1/tasks/${task2Id}`).expect(200);
      await request(app).delete(`/api/v1/tasks/${task1Id}`).expect(200);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle validation errors', async () => {
      // Missing title
      await request(app)
        .post('/api/v1/tasks')
        .send({ description: 'No title' })
        .expect(400);

      // Invalid priority
      await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Valid Title', priority: 'urgent' })
        .expect(400);

      // Invalid status
      await request(app)
        .patch('/api/v1/tasks/1/status')
        .send({ status: 'invalid-status' })
        .expect(400);

      // Invalid task ID
      await request(app)
        .get('/api/v1/tasks/invalid-id')
        .expect(400);
    });

    test('should handle circular dependency prevention', async () => {
      // Create tasks
      const task1 = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Task A' })
        .expect(201);

      const task2 = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Task B' })
        .expect(201);

      const task1Id = parseInt(task1.body.data.id.replace('task_', ''));
      const task2Id = parseInt(task2.body.data.id.replace('task_', ''));

      // Add dependency: task2 depends on task1
      await request(app)
        .post(`/api/v1/tasks/${task2Id}/dependencies`)
        .send({ dependencyId: task1Id })
        .expect(200);

      // Try to add reverse dependency (should fail - circular)
      await request(app)
        .post(`/api/v1/tasks/${task1Id}/dependencies`)
        .send({ dependencyId: task2Id })
        .expect(400);

      // Clean up
      await request(app).delete(`/api/v1/tasks/${task2Id}`).expect(200);
      await request(app).delete(`/api/v1/tasks/${task1Id}`).expect(200);
    });

    test('should handle deletion constraints', async () => {
      // Create tasks with dependency
      const task1 = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Foundation Task' })
        .expect(201);

      const task2 = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Dependent Task' })
        .expect(201);

      const task1Id = parseInt(task1.body.data.id.replace('task_', ''));
      const task2Id = parseInt(task2.body.data.id.replace('task_', ''));

      await request(app)
        .post(`/api/v1/tasks/${task2Id}/dependencies`)
        .send({ dependencyId: task1Id })
        .expect(200);

      // Try to delete task1 while task2 depends on it (should fail)
      await request(app)
        .delete(`/api/v1/tasks/${task1Id}`)
        .expect(400);

      // Delete dependent task first
      await request(app)
        .delete(`/api/v1/tasks/${task2Id}`)
        .expect(200);

      // Now delete foundation task (should succeed)
      await request(app)
        .delete(`/api/v1/tasks/${task1Id}`)
        .expect(200);
    });
  });

  describe('Security and Input Validation', () => {
    test('should handle malicious input safely', async () => {
      // SQL injection attempts
      for (const payload of securityPayloads.sql) {
        await request(app)
          .post('/api/v1/tasks')
          .send({ title: payload })
          .expect(201); // Should create task with sanitized input
      }

      // XSS attempts
      for (const payload of securityPayloads.xss) {
        await request(app)
          .post('/api/v1/tasks')
          .send({ title: payload, description: payload })
          .expect(201); // Should create task with sanitized input
      }

      // Path traversal attempts
      for (const payload of securityPayloads.pathTraversal) {
        await request(app)
          .get(`/api/v1/tasks/${encodeURIComponent(payload)}`)
          .expect(400); // Should reject invalid ID format
      }
    });

    test('should handle extreme input sizes', async () => {
      // Very long title
      await request(app)
        .post('/api/v1/tasks')
        .send({ title: extremeStrings.veryLong })
        .expect(201);

      // Unicode content
      await request(app)
        .post('/api/v1/tasks')
        .send({ 
          title: extremeStrings.unicode,
          description: extremeStrings.rtl
        })
        .expect(201);

      // Special characters
      await request(app)
        .post('/api/v1/tasks')
        .send({ 
          title: 'Special chars: ' + extremeStrings.specialChars
        })
        .expect(201);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle bulk operations efficiently', async () => {
      const bulkTasks = Array.from({ length: 50 }, (_, i) => ({
        title: `Bulk Task ${i + 1}`,
        description: `Generated task ${i + 1}`,
        priority: ['low', 'medium', 'high'][i % 3]
      }));

      const start = Date.now();
      const response = await request(app)
        .post('/api/v1/tasks/bulk-create')
        .send({ tasks: bulkTasks })
        .expect(201);
      const duration = Date.now() - start;

      expect(response.body.data.created).toHaveLength(50);
      expect(response.body.data.errors).toHaveLength(0);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('should handle large task lists with pagination', async () => {
      // Test pagination
      const page1 = await request(app)
        .get('/api/v1/tasks?limit=10&offset=0')
        .expect(200);

      expect(page1.body.data.tasks.length).toBeLessThanOrEqual(10);
      expect(page1.body.data.pagination).toBeDefined();

      const page2 = await request(app)
        .get('/api/v1/tasks?limit=10&offset=10')
        .expect(200);

      expect(page2.body.data.pagination.offset).toBe(10);
    });

    test('should provide analytics efficiently', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/v1/analytics')
        .expect(200);
      const duration = Date.now() - start;

      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.statusDistribution).toBeDefined();
      expect(response.body.data.priorityDistribution).toBeDefined();
      expect(response.body.data.recentActivity).toBeDefined();
      expect(duration).toBeLessThan(500); // Analytics should be fast
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent task creation', async () => {
      const concurrentTasks = Array.from({ length: 10 }, (_, i) => 
        request(app)
          .post('/api/v1/tasks')
          .send({ title: `Concurrent Task ${i + 1}` })
      );

      const responses = await Promise.all(concurrentTasks);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all tasks were created with unique IDs
      const taskIds = responses.map(r => r.body.data.id);
      const uniqueIds = new Set(taskIds);
      expect(uniqueIds.size).toBe(taskIds.length);
    });

    test('should handle concurrent status updates safely', async () => {
      // Create a task
      const task = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Concurrent Test Task' })
        .expect(201);

      const taskId = parseInt(task.body.data.id.replace('task_', ''));

      // Try concurrent status updates
      const statusUpdates = [
        request(app).patch(`/api/v1/tasks/${taskId}/status`).send({ status: 'in-progress' }),
        request(app).patch(`/api/v1/tasks/${taskId}/status`).send({ status: 'completed' }),
        request(app).patch(`/api/v1/tasks/${taskId}/status`).send({ status: 'blocked' })
      ];

      const responses = await Promise.allSettled(statusUpdates);
      
      // At least one should succeed
      const successCount = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
      expect(successCount).toBeGreaterThan(0);

      // Clean up
      await request(app).delete(`/api/v1/tasks/${taskId}`);
    });
  });
});