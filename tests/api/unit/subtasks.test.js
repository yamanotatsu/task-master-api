/**
 * Subtask Management API Tests with Dependency Injection
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createSubtaskHandlers } from '../../../api/routes/subtasks-di.js';
import { createTestDependencies } from '../../../api/utils/dependency-factory.js';
import { mockTasks } from '../fixtures/api-test-data.js';

// Test App Factory for Subtasks
function createTestApp(dependencies) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  const subtaskHandlers = createSubtaskHandlers(dependencies);
  
  // Mount subtask routes
  app.post('/api/v1/tasks/:id/subtasks', subtaskHandlers.addSubtaskHandler);
  app.put('/api/v1/tasks/:id/subtasks/:subtaskId', subtaskHandlers.updateSubtaskHandler);
  app.delete('/api/v1/tasks/:id/subtasks/:subtaskId', subtaskHandlers.removeSubtaskHandler);
  
  return app;
}

describe('Subtask Management API Tests', () => {
  let dependencies;
  let app;
  
  beforeEach(() => {
    dependencies = createTestDependencies({}, jest);
    app = createTestApp(dependencies);
  });
  
  describe('POST /api/v1/tasks/:id/subtasks', () => {
    describe('Success cases', () => {
      test('should add subtask with required fields only', async () => {
        // Arrange
        const newSubtask = {
          title: 'New Subtask'
        };
        const mockResponse = {
          success: true,
          task: { ...mockTasks[0], subtasks: [{ id: 'sub_001_1', title: 'New Subtask' }] },
          subtask: { id: 'sub_001_1', title: 'New Subtask' },
          message: 'Subtask added successfully'
        };
        dependencies.addSubtaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/subtasks')
          .send(newSubtask)
          .expect(201);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            task: expect.any(Object),
            subtask: expect.objectContaining({
              title: 'New Subtask'
            }),
            message: 'Subtask added successfully'
          }
        });
        
        expect(dependencies.ensureProjectDirectory).toHaveBeenCalled();
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'addSubtask',
          expect.objectContaining({
            parentTaskId: 1,
            title: 'New Subtask'
          })
        );
        expect(dependencies.addSubtaskDirect).toHaveBeenCalledWith(
          expect.any(Object),
          dependencies.logger,
          { session: {} }
        );
      });

      test('should add subtask with all fields', async () => {
        // Arrange
        const newSubtask = {
          title: 'Complete Subtask',
          description: 'Detailed subtask description',
          assignee: 'john.doe@example.com'
        };
        const mockResponse = {
          success: true,
          task: mockTasks[0],
          subtask: { id: 'sub_001_2', ...newSubtask },
          message: 'Subtask added successfully'
        };
        dependencies.addSubtaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/subtasks')
          .send(newSubtask)
          .expect(201);

        // Assert
        expect(response.body.data.subtask).toMatchObject({
          title: 'Complete Subtask',
          description: 'Detailed subtask description',
          assignee: 'john.doe@example.com'
        });
      });
    });

    describe('Validation errors', () => {
      test('should reject subtask without title', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/subtasks')
          .send({ description: 'No title' })
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid subtask data'
          }
        });
        expect(dependencies.addSubtaskDirect).not.toHaveBeenCalled();
      });

      test('should reject empty title', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/subtasks')
          .send({ title: '' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_INPUT');
      });

      test('should reject invalid task ID', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks/abc/subtasks')
          .send({ title: 'Valid Title' })
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INVALID_TASK_ID',
            message: 'Task ID must be a number'
          }
        });
        expect(dependencies.addSubtaskDirect).not.toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      test('should handle task not found error', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' }
        };
        dependencies.addSubtaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/999/subtasks')
          .send({ title: 'Valid Title' })
          .expect(404);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND'
          }
        });
      });

      test('should handle other add subtask errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Duplicate subtask title'
        };
        dependencies.addSubtaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/subtasks')
          .send({ title: 'Duplicate' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('ADD_SUBTASK_ERROR');
      });

      test('should handle unexpected errors', async () => {
        // Arrange
        dependencies.addSubtaskDirect.mockRejectedValue(new Error('Database error'));

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/subtasks')
          .send({ title: 'Valid Title' })
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });

  describe('PUT /api/v1/tasks/:id/subtasks/:subtaskId', () => {
    describe('Success cases', () => {
      test('should update subtask with partial data', async () => {
        // Arrange
        const updates = {
          title: 'Updated Subtask Title'
        };
        const mockResponse = {
          success: true,
          task: mockTasks[0],
          subtask: { id: 'sub_001_1', title: 'Updated Subtask Title' },
          message: 'Subtask updated successfully'
        };
        dependencies.updateSubtaskByIdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1/subtasks/1')
          .send(updates)
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            task: expect.any(Object),
            subtask: expect.objectContaining({
              title: 'Updated Subtask Title'
            }),
            message: 'Subtask updated successfully'
          }
        });
        
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'updateSubtaskById',
          expect.objectContaining({
            parentTaskId: 1,
            subtaskId: 1,
            title: 'Updated Subtask Title'
          })
        );
      });

      test('should update subtask with all fields', async () => {
        // Arrange
        const updates = {
          title: 'Complete Update',
          description: 'New description',
          assignee: 'jane.doe@example.com',
          status: 'completed'
        };
        const mockResponse = {
          success: true,
          task: mockTasks[0],
          subtask: { id: 'sub_001_1', ...updates },
          message: 'Subtask updated successfully'
        };
        dependencies.updateSubtaskByIdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1/subtasks/1')
          .send(updates)
          .expect(200);

        // Assert
        expect(response.body.data.subtask).toMatchObject(updates);
      });

      test('should handle empty updates gracefully', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          task: mockTasks[0],
          subtask: { id: 'sub_001_1', title: 'Original Title' },
          message: 'Subtask updated successfully'
        };
        dependencies.updateSubtaskByIdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1/subtasks/1')
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
          .put('/api/v1/tasks/abc/subtasks/1')
          .send({ title: 'Updated' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_ID');
      });

      test('should reject invalid subtask ID', async () => {
        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1/subtasks/abc')
          .send({ title: 'Updated' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_ID');
      });

      test('should reject empty title', async () => {
        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1/subtasks/1')
          .send({ title: '' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_INPUT');
      });

      test('should reject invalid status', async () => {
        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1/subtasks/1')
          .send({ status: 'invalid' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_INPUT');
      });
    });

    describe('Error handling', () => {
      test('should handle task not found error', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' }
        };
        dependencies.updateSubtaskByIdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .put('/api/v1/tasks/999/subtasks/1')
          .send({ title: 'Updated' })
          .expect(404);

        // Assert
        expect(response.body.error.code).toBe('TASK_NOT_FOUND');
      });

      test('should handle subtask not found error', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'SUBTASK_NOT_FOUND', message: 'Subtask not found' }
        };
        dependencies.updateSubtaskByIdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1/subtasks/999')
          .send({ title: 'Updated' })
          .expect(404);

        // Assert
        expect(response.body.error.code).toBe('SUBTASK_NOT_FOUND');
      });

      test('should handle other update errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Update validation failed'
        };
        dependencies.updateSubtaskByIdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .put('/api/v1/tasks/1/subtasks/1')
          .send({ title: 'Invalid Update' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('UPDATE_SUBTASK_ERROR');
      });
    });
  });

  describe('DELETE /api/v1/tasks/:id/subtasks/:subtaskId', () => {
    describe('Success cases', () => {
      test('should remove subtask successfully', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          task: { ...mockTasks[0], subtasks: [] },
          removedSubtask: { id: 'sub_001_1', title: 'Removed Subtask' },
          message: 'Subtask removed successfully'
        };
        dependencies.removeSubtaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1/subtasks/1')
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            task: expect.any(Object),
            removedSubtask: expect.objectContaining({
              title: 'Removed Subtask'
            }),
            message: 'Subtask removed successfully'
          }
        });
        
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'removeSubtask',
          expect.objectContaining({
            parentTaskId: 1,
            subtaskId: 1
          })
        );
      });
    });

    describe('Validation errors', () => {
      test('should reject invalid task ID', async () => {
        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/abc/subtasks/1')
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_ID');
        expect(dependencies.removeSubtaskDirect).not.toHaveBeenCalled();
      });

      test('should reject invalid subtask ID', async () => {
        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1/subtasks/abc')
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_ID');
      });
    });

    describe('Error handling', () => {
      test('should handle task not found error', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' }
        };
        dependencies.removeSubtaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/999/subtasks/1')
          .expect(404);

        // Assert
        expect(response.body.error.code).toBe('TASK_NOT_FOUND');
      });

      test('should handle subtask not found error', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'SUBTASK_NOT_FOUND', message: 'Subtask not found' }
        };
        dependencies.removeSubtaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1/subtasks/999')
          .expect(404);

        // Assert
        expect(response.body.error.code).toBe('SUBTASK_NOT_FOUND');
      });

      test('should handle other removal errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Cannot remove subtask with dependencies'
        };
        dependencies.removeSubtaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1/subtasks/1')
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('REMOVE_SUBTASK_ERROR');
        expect(response.body.error.message).toContain('Cannot remove subtask');
      });

      test('should handle unexpected errors', async () => {
        // Arrange
        dependencies.removeSubtaskDirect.mockRejectedValue(new Error('Database error'));

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1/subtasks/1')
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });
});