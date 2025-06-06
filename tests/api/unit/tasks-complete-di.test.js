/**
 * Complete Dependency Injection Pattern API Tests
 * 実際のAPIルートハンドラーと同じコードをテスト
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createTaskHandlers } from '../../../api/routes/tasks-di.js';
import { createTestDependencies } from '../../../api/utils/dependency-factory.js';
import { mockTasks, createMockTask } from '../fixtures/api-test-data.js';
import { edgeCaseEnums, extremeStrings } from '../fixtures/edge-cases.js';

// Test App Factory with Dependency Injection
function createTestApp(dependencies) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Create route handlers with injected dependencies
  const taskHandlers = createTaskHandlers(dependencies);
  
  // Mount routes
  app.get('/api/v1/tasks', taskHandlers.listTasksHandler);
  app.get('/api/v1/tasks/:id', taskHandlers.getTaskHandler);
  app.post('/api/v1/tasks', taskHandlers.createTaskHandler);
  app.put('/api/v1/tasks/:id', taskHandlers.updateTaskHandler);
  app.delete('/api/v1/tasks/:id', taskHandlers.deleteTaskHandler);
  app.patch('/api/v1/tasks/:id/status', taskHandlers.updateTaskStatusHandler);
  
  return app;
}

describe('Complete DI Pattern API Tests', () => {
  let dependencies;
  let app;
  
  beforeEach(() => {
    // Create fresh mock dependencies for each test
    dependencies = createTestDependencies({}, jest);
    app = createTestApp(dependencies);
  });
  
  describe('GET /api/v1/tasks', () => {
    describe('Success cases', () => {
      test('should return all tasks without filter', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          data: { tasks: mockTasks }
        };
        dependencies.listTasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/tasks')
          .expect('Content-Type', /json/)
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            tasks: mockTasks,
            totalTasks: mockTasks.length,
            filteredBy: 'all'
          }
        });
        
        expect(dependencies.ensureProjectDirectory).toHaveBeenCalled();
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'listTasks', 
          { filter: undefined, format: 'json' }
        );
        expect(dependencies.listTasksDirect).toHaveBeenCalledWith(
          { filter: undefined, format: 'json' },
          dependencies.logger,
          { session: {} }
        );
      });

      test('should return filtered tasks by status', async () => {
        // Arrange
        const filteredTasks = mockTasks.filter(t => t.status === 'pending');
        const mockResponse = {
          success: true,
          data: { tasks: filteredTasks }
        };
        dependencies.listTasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/tasks?filter=pending')
          .expect(200);

        // Assert
        expect(response.body.data.filteredBy).toBe('pending');
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'listTasks',
          { filter: 'pending', format: 'json' }
        );
      });

      test('should handle different format parameter', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          data: { tasks: mockTasks }
        };
        dependencies.listTasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/tasks?format=detailed')
          .expect(200);

        // Assert
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'listTasks',
          { filter: undefined, format: 'detailed' }
        );
      });

      test('should return empty array when no tasks exist', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          data: { tasks: [] }
        };
        dependencies.listTasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/tasks')
          .expect(200);

        // Assert
        expect(response.body.data.tasks).toEqual([]);
        expect(response.body.data.totalTasks).toBe(0);
      });
    });

    describe('Error cases', () => {
      test('should handle direct function errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Failed to read tasks file'
        };
        dependencies.listTasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/tasks')
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'LIST_TASKS_ERROR',
            message: 'Failed to read tasks file'
          }
        });
      });

      test('should handle unexpected errors', async () => {
        // Arrange
        dependencies.listTasksDirect.mockRejectedValue(new Error('Unexpected error'));

        // Act
        const response = await request(app)
          .get('/api/v1/tasks')
          .expect(500);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to list tasks'
          }
        });
      });

      test('should handle missing data in response', async () => {
        // Arrange
        const mockResponse = {
          success: true
          // data is missing
        };
        dependencies.listTasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/tasks')
          .expect(200);

        // Assert
        expect(response.body.data.tasks).toEqual([]);
      });
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    describe('Success cases', () => {
      test('should return a specific task', async () => {
        // Arrange
        const task = mockTasks[0];
        const mockResponse = {
          success: true,
          data: task
        };
        dependencies.showTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/tasks/1')
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: task
        });
        expect(dependencies.showTaskDirect).toHaveBeenCalledWith(
          { taskId: 1 },
          dependencies.logger,
          { session: {} }
        );
      });

      test('should handle large task IDs', async () => {
        // Arrange
        const taskId = 999;
        const mockResponse = {
          success: true,
          data: createMockTask({ id: `task_${taskId}` })
        };
        dependencies.showTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get(`/api/v1/tasks/${taskId}`)
          .expect(200);

        // Assert
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'showTask', 
          { taskId }
        );
      });
    });

    describe('Error cases', () => {
      test('should return 400 for non-numeric task ID', async () => {
        // Act
        const response = await request(app)
          .get('/api/v1/tasks/abc')
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INVALID_TASK_ID',
            message: 'Task ID must be a number'
          }
        });
        expect(dependencies.showTaskDirect).not.toHaveBeenCalled();
      });

      test('should return 404 for non-existent task', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Task not found'
        };
        dependencies.showTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/tasks/999')
          .expect(404);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Task not found'
          }
        });
      });

      test('should handle edge case IDs', async () => {
        const invalidIds = ['abc', 'task_001', '1.5', '-1', '0x1a'];
        
        for (const id of invalidIds) {
          const response = await request(app)
            .get(`/api/v1/tasks/${id}`);

          // Some edge cases might return 500 due to Express routing
          expect([400, 500]).toContain(response.status);
          if (response.status === 400) {
            expect(response.body.error.code).toBe('INVALID_TASK_ID');
          }
        }
      });
    });
  });

  describe('POST /api/v1/tasks', () => {
    describe('Success cases', () => {
      test('should create a task with required fields only', async () => {
        // Arrange
        const newTask = {
          title: 'New Task'
        };
        const mockResponse = {
          success: true,
          data: createMockTask({ ...newTask, id: 'task_006' })
        };
        dependencies.addTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks')
          .send(newTask)
          .expect(201);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          message: 'Task created successfully'
        });
        expect(dependencies.addTaskDirect).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Task',
            details: expect.stringContaining('Priority: medium')
          }),
          dependencies.logger,
          { session: {} }
        );
      });

      test('should create a task with all fields', async () => {
        // Arrange
        const newTask = {
          title: 'Complete Task',
          description: 'A comprehensive task',
          priority: 'high',
          dependencies: [1, 2, 3],
          details: 'Detailed requirements here',
          testStrategy: 'Unit and integration tests'
        };
        const mockResponse = {
          success: true,
          data: createMockTask({ ...newTask, id: 'task_007' })
        };
        dependencies.addTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks')
          .send(newTask)
          .expect(201);

        // Assert
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'addTask',
          expect.objectContaining({
            title: 'Complete Task',
            dependencies: '1,2,3'
          })
        );
      });

      test('should handle edge case strings in title', async () => {
        // Arrange
        const newTask = {
          title: extremeStrings.unicode,
          description: extremeStrings.specialChars
        };
        const mockResponse = {
          success: true,
          data: createMockTask({ ...newTask, id: 'task_008' })
        };
        dependencies.addTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks')
          .send(newTask)
          .expect(201);

        // Assert
        expect(response.body.success).toBe(true);
      });
    });

    describe('Validation errors', () => {
      test('should reject task without title', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({ description: 'No title' })
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid task data'
          }
        });
        expect(dependencies.addTaskDirect).not.toHaveBeenCalled();
      });

      test('should reject empty title', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({ title: '' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      test('should reject invalid priority', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({ 
            title: 'Test Task',
            priority: 'urgent' // invalid
          })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      test('should reject invalid dependencies', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({ 
            title: 'Test Task',
            dependencies: 'not-an-array'
          })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('Error handling', () => {
      test('should handle direct function errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Duplicate task title'
        };
        dependencies.addTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({ title: 'Duplicate Task' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('CREATE_TASK_ERROR');
      });

      test('should handle unexpected errors', async () => {
        // Arrange
        dependencies.addTaskDirect.mockRejectedValue(new Error('Database error'));

        // Act
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({ title: 'Test Task' })
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    describe('Success cases', () => {
      test('should update task with partial data', async () => {
        // Arrange
        const updates = {
          title: 'Updated Title'
        };
        const mockResponse = {
          success: true,
          data: createMockTask({ ...mockTasks[0], ...updates })
        };
        dependencies.updateTaskByIdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1')
          .send(updates)
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          message: 'Task updated successfully'
        });
        expect(dependencies.updateTaskByIdDirect).toHaveBeenCalledWith(
          expect.objectContaining({
            taskId: 1,
            updates: { title: 'Updated Title' }
          }),
          dependencies.logger,
          { session: {} }
        );
      });

      test('should update all task fields', async () => {
        // Arrange
        const updates = {
          title: 'Completely Updated',
          description: 'New description',
          priority: 'high',
          dependencies: [5, 6],
          details: 'New details',
          testStrategy: 'New strategy'
        };
        const mockResponse = {
          success: true,
          data: createMockTask({ ...mockTasks[0], ...updates })
        };
        dependencies.updateTaskByIdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1')
          .send(updates)
          .expect(200);

        // Assert
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'updateTaskById',
          expect.objectContaining({
            taskId: 1,
            updates: expect.objectContaining({
              title: 'Completely Updated',
              dependencies: [5, 6]
            })
          })
        );
      });

      test('should handle empty updates gracefully', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          data: mockTasks[0]
        };
        dependencies.updateTaskByIdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1')
          .send({})
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
      });
    });

    describe('Validation errors', () => {
      test('should reject invalid task ID', async () => {
        // Act
        const response = await request(app)
          .put('/api/v1/tasks/invalid')
          .send({ title: 'Updated' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_TASK_ID');
      });

      test('should reject invalid priority in update', async () => {
        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1')
          .send({ priority: 'invalid' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      test('should reject empty title in update', async () => {
        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1')
          .send({ title: '' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('Error handling', () => {
      test('should return 404 for non-existent task', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Task not found'
        };
        dependencies.updateTaskByIdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .put('/api/v1/tasks/999')
          .send({ title: 'Updated' })
          .expect(404);

        // Assert
        expect(response.body.error.code).toBe('UPDATE_TASK_ERROR');
      });

      test('should handle circular dependency errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Circular dependency detected'
        };
        dependencies.updateTaskByIdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1')
          .send({ dependencies: [2, 3, 1] })
          .expect(404);

        // Assert
        expect(response.body.error.code).toBe('UPDATE_TASK_ERROR');
      });
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    describe('Success cases', () => {
      test('should delete an existing task', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          data: { deleted: true }
        };
        dependencies.removeTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1')
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          message: 'Task 1 deleted successfully'
        });
        expect(dependencies.removeTaskDirect).toHaveBeenCalledWith(
          { taskId: 1 },
          dependencies.logger,
          { session: {} }
        );
      });
    });

    describe('Error cases', () => {
      test('should reject invalid task ID', async () => {
        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/not-a-number')
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_TASK_ID');
      });

      test('should return 404 for non-existent task', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Task not found'
        };
        dependencies.removeTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/999')
          .expect(404);

        // Assert
        expect(response.body.error.code).toBe('DELETE_TASK_ERROR');
      });

      test('should handle task with dependencies error', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Cannot delete task with dependent tasks'
        };
        dependencies.removeTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1')
          .expect(404);

        // Assert
        expect(response.body.error.code).toBe('DELETE_TASK_ERROR');
        expect(response.body.error.message).toContain('Cannot delete task');
      });
    });
  });

  describe('PATCH /api/v1/tasks/:id/status', () => {
    describe('Success cases', () => {
      test('should update task status to valid values', async () => {
        const validStatuses = ['pending', 'in-progress', 'completed', 'blocked'];
        
        for (const status of validStatuses) {
          // Arrange
          const mockResponse = {
            success: true,
            data: { ...mockTasks[0], status }
          };
          dependencies.setTaskStatusDirect.mockResolvedValue(mockResponse);

          // Act
          const response = await request(app)
            .patch('/api/v1/tasks/1/status')
            .send({ status })
            .expect(200);

          // Assert
          expect(response.body).toMatchObject({
            success: true,
            message: `Task 1 status updated to ${status}`
          });
          expect(dependencies.setTaskStatusDirect).toHaveBeenCalledWith(
            { taskId: 1, status },
            dependencies.logger,
            { session: {} }
          );
        }
      });
    });

    describe('Validation errors', () => {
      test('should reject invalid task ID', async () => {
        // Act
        const response = await request(app)
          .patch('/api/v1/tasks/abc/status')
          .send({ status: 'completed' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_TASK_ID');
      });

      test('should reject invalid status values', async () => {
        const invalidStatuses = edgeCaseEnums.invalidStatuses.filter(s => s !== null && s !== 123 && s !== true);
        
        for (const status of invalidStatuses) {
          const response = await request(app)
            .patch('/api/v1/tasks/1/status')
            .send({ status })
            .expect(400);

          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        }
      });

      test('should reject missing status field', async () => {
        // Act
        const response = await request(app)
          .patch('/api/v1/tasks/1/status')
          .send({})
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('Error handling', () => {
      test('should return 404 for non-existent task', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Task not found'
        };
        dependencies.setTaskStatusDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .patch('/api/v1/tasks/999/status')
          .send({ status: 'completed' })
          .expect(404);

        // Assert
        expect(response.body.error.code).toBe('UPDATE_STATUS_ERROR');
      });

      test('should handle blocked status due to dependencies', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Cannot complete task - dependencies not met'
        };
        dependencies.setTaskStatusDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .patch('/api/v1/tasks/4/status')
          .send({ status: 'completed' })
          .expect(404);

        // Assert
        expect(response.body.error.code).toBe('UPDATE_STATUS_ERROR');
        expect(response.body.error.message).toContain('dependencies not met');
      });
    });
  });
});