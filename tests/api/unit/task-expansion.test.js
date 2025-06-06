/**
 * Task Expansion API Tests with Dependency Injection
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createTaskExpansionHandlers } from '../../../api/routes/task-expansion-di.js';
import { createTestDependencies } from '../../../api/utils/dependency-factory.js';
import { mockTasks } from '../fixtures/api-test-data.js';

// Test App Factory for Task Expansion
function createTestApp(dependencies) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  const taskExpansionHandlers = createTaskExpansionHandlers(dependencies);
  
  // Mount task expansion routes
  app.post('/api/v1/tasks/:id/expand', taskExpansionHandlers.expandTaskHandler);
  app.delete('/api/v1/tasks/:id/subtasks', taskExpansionHandlers.clearSubtasksHandler);
  app.post('/api/v1/tasks/expand-all', taskExpansionHandlers.expandAllTasksHandler);
  
  return app;
}

describe('Task Expansion API Tests', () => {
  let dependencies;
  let app;
  
  beforeEach(() => {
    dependencies = createTestDependencies({}, jest);
    app = createTestApp(dependencies);
  });
  
  describe('POST /api/v1/tasks/:id/expand', () => {
    describe('Success cases', () => {
      test('should expand task with default parameters', async () => {
        // Arrange
        const taskWithSubtasks = {
          ...mockTasks[0],
          subtasks: [
            { id: 'sub_001_1', title: 'Setup development environment', completed: false },
            { id: 'sub_001_2', title: 'Configure build tools', completed: false },
            { id: 'sub_001_3', title: 'Initialize version control', completed: false },
            { id: 'sub_001_4', title: 'Setup testing framework', completed: false },
            { id: 'sub_001_5', title: 'Document setup process', completed: false }
          ]
        };
        const mockResponse = {
          success: true,
          task: taskWithSubtasks,
          message: 'Task expanded successfully with 5 subtasks',
          telemetryData: {
            tokensUsed: 1500,
            provider: 'anthropic',
            model: 'claude-3-sonnet',
            expansionTime: 2340
          }
        };
        dependencies.expandTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/expand')
          .send({})
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            task: expect.objectContaining({
              subtasks: expect.arrayContaining([
                expect.objectContaining({
                  title: expect.any(String),
                  completed: false
                })
              ])
            }),
            subtasksGenerated: 5,
            message: 'Task expanded successfully with 5 subtasks',
            telemetryData: expect.objectContaining({
              tokensUsed: 1500
            })
          }
        });
        
        expect(dependencies.ensureProjectDirectory).toHaveBeenCalled();
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'expandTask',
          expect.objectContaining({
            id: 1,
            numSubtasks: 5, // default
            research: false // default
          })
        );
        expect(dependencies.expandTaskDirect).toHaveBeenCalledWith(
          expect.any(Object),
          dependencies.logger,
          { session: {} }
        );
      });

      test('should expand task with custom parameters', async () => {
        // Arrange
        const requestData = {
          numSubtasks: 8,
          useResearch: true
        };
        const taskWithSubtasks = {
          ...mockTasks[1],
          subtasks: Array.from({ length: 8 }, (_, i) => ({
            id: `sub_002_${i + 1}`,
            title: `Research-based subtask ${i + 1}`,
            completed: false
          }))
        };
        const mockResponse = {
          success: true,
          task: taskWithSubtasks,
          message: 'Task expanded with research mode - 8 subtasks generated',
          telemetryData: {
            tokensUsed: 3200,
            provider: 'openai',
            model: 'gpt-4',
            expansionTime: 4560,
            researchMode: true
          }
        };
        dependencies.expandTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/2/expand')
          .send(requestData)
          .expect(200);

        // Assert
        expect(response.body.data.subtasksGenerated).toBe(8);
        expect(response.body.data.telemetryData.researchMode).toBe(true);
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'expandTask',
          expect.objectContaining({
            numSubtasks: 8,
            research: true
          })
        );
      });

      test('should handle maximum subtasks limit', async () => {
        // Arrange
        const requestData = {
          numSubtasks: 20 // maximum allowed
        };
        const taskWithMaxSubtasks = {
          ...mockTasks[2],
          subtasks: Array.from({ length: 20 }, (_, i) => ({
            id: `sub_003_${i + 1}`,
            title: `Detailed subtask ${i + 1}`,
            completed: false
          }))
        };
        const mockResponse = {
          success: true,
          task: taskWithMaxSubtasks,
          message: 'Task expanded to maximum 20 subtasks',
          telemetryData: {
            tokensUsed: 5000,
            provider: 'anthropic',
            model: 'claude-3-opus',
            expansionTime: 7890
          }
        };
        dependencies.expandTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/3/expand')
          .send(requestData)
          .expect(200);

        // Assert
        expect(response.body.data.subtasksGenerated).toBe(20);
        expect(response.body.data.telemetryData.tokensUsed).toBeGreaterThan(4000);
      });

      test('should handle task already with subtasks', async () => {
        // Arrange
        const taskAlreadyExpanded = {
          ...mockTasks[0],
          subtasks: [
            { id: 'existing_1', title: 'Existing subtask 1', completed: true },
            { id: 'existing_2', title: 'Existing subtask 2', completed: false }
          ]
        };
        const updatedTask = {
          ...taskAlreadyExpanded,
          subtasks: [
            ...taskAlreadyExpanded.subtasks,
            { id: 'new_1', title: 'New subtask 1', completed: false },
            { id: 'new_2', title: 'New subtask 2', completed: false },
            { id: 'new_3', title: 'New subtask 3', completed: false }
          ]
        };
        const mockResponse = {
          success: true,
          task: updatedTask,
          message: 'Task re-expanded - 3 additional subtasks added',
          telemetryData: {
            tokensUsed: 1200,
            provider: 'anthropic',
            expansionTime: 1890
          }
        };
        dependencies.expandTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/expand')
          .send({})
          .expect(200);

        // Assert
        expect(response.body.data.subtasksGenerated).toBe(5); // total subtasks
        expect(response.body.data.message).toContain('3 additional subtasks');
      });
    });

    describe('Validation errors', () => {
      test('should reject invalid task ID', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks/abc/expand')
          .send({})
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INVALID_TASK_ID',
            message: 'Task ID must be a number'
          }
        });
        expect(dependencies.expandTaskDirect).not.toHaveBeenCalled();
      });

      test('should reject invalid numSubtasks', async () => {
        const invalidValues = [0, -1, 21, 1.5, 'five', null, true];
        
        for (const numSubtasks of invalidValues) {
          const response = await request(app)
            .post('/api/v1/tasks/1/expand')
            .send({ numSubtasks })
            .expect(400);

          expect(response.body.error.code).toBe('INVALID_INPUT');
        }
      });

      test('should reject invalid useResearch parameter', async () => {
        const invalidValues = ['true', 1, 'yes', null];
        
        for (const useResearch of invalidValues) {
          const response = await request(app)
            .post('/api/v1/tasks/1/expand')
            .send({ useResearch })
            .expect(400);

          expect(response.body.error.code).toBe('INVALID_INPUT');
        }
      });
    });

    describe('Error handling', () => {
      test('should handle task not found error', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' }
        };
        dependencies.expandTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/999/expand')
          .send({})
          .expect(404);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND'
          }
        });
      });

      test('should handle missing API key error', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'MISSING_API_KEY', message: 'No API key configured for expansion' }
        };
        dependencies.expandTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/expand')
          .send({})
          .expect(401);

        // Assert
        expect(response.body.error.code).toBe('MISSING_API_KEY');
      });

      test('should handle rate limit exceeded error', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'RATE_LIMIT_EXCEEDED', message: 'API rate limit exceeded' }
        };
        dependencies.expandTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/expand')
          .send({})
          .expect(429);

        // Assert
        expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      });

      test('should handle general expansion errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Task content too vague for expansion'
        };
        dependencies.expandTaskDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/expand')
          .send({})
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('EXPAND_TASK_ERROR');
      });

      test('should handle unexpected exceptions', async () => {
        // Arrange
        dependencies.expandTaskDirect.mockRejectedValue(new Error('Network timeout'));

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/expand')
          .send({})
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });

  describe('DELETE /api/v1/tasks/:id/subtasks', () => {
    describe('Success cases', () => {
      test('should clear all subtasks successfully', async () => {
        // Arrange
        const taskWithoutSubtasks = {
          ...mockTasks[0],
          subtasks: []
        };
        const mockResponse = {
          success: true,
          task: taskWithoutSubtasks,
          message: 'All subtasks cleared successfully'
        };
        dependencies.clearSubtasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1/subtasks')
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            task: expect.objectContaining({
              subtasks: []
            }),
            message: 'All subtasks cleared successfully'
          }
        });
        
        expect(dependencies.ensureProjectDirectory).toHaveBeenCalled();
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'clearSubtasks',
          expect.objectContaining({
            taskId: 1
          })
        );
      });

      test('should handle task with no subtasks to clear', async () => {
        // Arrange
        const taskWithoutSubtasks = {
          ...mockTasks[1],
          subtasks: []
        };
        const mockResponse = {
          success: true,
          task: taskWithoutSubtasks,
          message: 'No subtasks to clear'
        };
        dependencies.clearSubtasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/2/subtasks')
          .expect(200);

        // Assert
        expect(response.body.data.message).toContain('No subtasks');
      });
    });

    describe('Validation errors', () => {
      test('should reject invalid task ID', async () => {
        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/invalid/subtasks')
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_TASK_ID');
        expect(dependencies.clearSubtasksDirect).not.toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      test('should handle task not found error', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' }
        };
        dependencies.clearSubtasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/999/subtasks')
          .expect(404);

        // Assert
        expect(response.body.error.code).toBe('TASK_NOT_FOUND');
      });

      test('should handle clear subtasks errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Cannot clear subtasks with dependencies'
        };
        dependencies.clearSubtasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1/subtasks')
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('CLEAR_SUBTASKS_ERROR');
      });

      test('should handle unexpected exceptions', async () => {
        // Arrange
        dependencies.clearSubtasksDirect.mockRejectedValue(new Error('Database error'));

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1/subtasks')
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });

  describe('POST /api/v1/tasks/expand-all', () => {
    describe('Success cases', () => {
      test('should expand all tasks with default parameters', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          tasksExpanded: 8,
          message: 'Successfully expanded 8 tasks with 5 subtasks each',
          telemetryData: {
            totalTokensUsed: 12000,
            averageTokensPerTask: 1500,
            totalExpansionTime: 45000,
            provider: 'anthropic',
            model: 'claude-3-sonnet'
          }
        };
        dependencies.expandAllTasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/expand-all')
          .send({})
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            tasksExpanded: 8,
            message: 'Successfully expanded 8 tasks with 5 subtasks each',
            telemetryData: expect.objectContaining({
              totalTokensUsed: 12000,
              averageTokensPerTask: 1500
            })
          }
        });
        
        expect(dependencies.ensureProjectDirectory).toHaveBeenCalled();
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'expandAllTasks',
          expect.objectContaining({
            numSubtasks: 5, // default
            useResearch: false // default
          })
        );
      });

      test('should expand all tasks with custom parameters', async () => {
        // Arrange
        const requestData = {
          numSubtasks: 10,
          useResearch: true
        };
        const mockResponse = {
          success: true,
          tasksExpanded: 5,
          message: 'Successfully expanded 5 tasks with research mode - 10 subtasks each',
          telemetryData: {
            totalTokensUsed: 25000,
            averageTokensPerTask: 5000,
            totalExpansionTime: 120000,
            provider: 'openai',
            model: 'gpt-4',
            researchMode: true
          }
        };
        dependencies.expandAllTasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/expand-all')
          .send(requestData)
          .expect(200);

        // Assert
        expect(response.body.data.telemetryData.researchMode).toBe(true);
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'expandAllTasks',
          expect.objectContaining({
            numSubtasks: 10,
            useResearch: true
          })
        );
      });

      test('should handle no tasks to expand', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          tasksExpanded: 0,
          message: 'No tasks found that need expansion',
          telemetryData: {
            totalTokensUsed: 0,
            totalExpansionTime: 100
          }
        };
        dependencies.expandAllTasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/expand-all')
          .send({})
          .expect(200);

        // Assert
        expect(response.body.data.tasksExpanded).toBe(0);
        expect(response.body.data.message).toContain('No tasks found');
      });

      test('should handle partial expansion success', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          tasksExpanded: 3,
          message: 'Expanded 3 out of 5 tasks (2 failed due to API limits)',
          telemetryData: {
            totalTokensUsed: 9000,
            averageTokensPerTask: 3000,
            failedTasks: 2,
            totalExpansionTime: 30000
          }
        };
        dependencies.expandAllTasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/expand-all')
          .send({})
          .expect(200);

        // Assert
        expect(response.body.data.tasksExpanded).toBe(3);
        expect(response.body.data.telemetryData.failedTasks).toBe(2);
      });
    });

    describe('Validation errors', () => {
      test('should reject invalid numSubtasks', async () => {
        const invalidValues = [0, -1, 21, 1.5, 'ten'];
        
        for (const numSubtasks of invalidValues) {
          const response = await request(app)
            .post('/api/v1/tasks/expand-all')
            .send({ numSubtasks })
            .expect(400);

          expect(response.body.error.code).toBe('INVALID_INPUT');
        }
      });

      test('should reject invalid useResearch parameter', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks/expand-all')
          .send({ useResearch: 'maybe' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_INPUT');
      });
    });

    describe('Error handling', () => {
      test('should handle expand all errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'No API keys configured for batch expansion'
        };
        dependencies.expandAllTasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/expand-all')
          .send({})
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'EXPAND_ALL_ERROR',
            message: 'No API keys configured for batch expansion'
          }
        });
      });

      test('should handle object error responses', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'BATCH_EXPANSION_FAILED', message: 'Failed to expand multiple tasks' }
        };
        dependencies.expandAllTasksDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/expand-all')
          .send({})
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('EXPAND_ALL_ERROR');
        expect(response.body.error.message).toContain('Failed to expand multiple tasks');
      });

      test('should handle unexpected exceptions', async () => {
        // Arrange
        dependencies.expandAllTasksDirect.mockRejectedValue(new Error('System overload'));

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/expand-all')
          .send({})
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });
});