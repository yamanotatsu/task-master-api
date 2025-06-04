/**
 * Dependency Management API Tests with Dependency Injection
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createDependencyHandlers } from '../../../api/routes/dependencies-di.js';
import { createTestDependencies } from '../../../api/utils/dependency-factory.js';
import { mockTasks } from '../fixtures/api-test-data.js';

// Test App Factory for Dependencies
function createTestApp(dependencies) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  const dependencyHandlers = createDependencyHandlers(dependencies);
  
  // Mount dependency routes
  app.post('/api/v1/tasks/:id/dependencies', dependencyHandlers.addDependencyHandler);
  app.delete('/api/v1/tasks/:id/dependencies/:depId', dependencyHandlers.removeDependencyHandler);
  app.post('/api/v1/tasks/validate-dependencies', dependencyHandlers.validateDependenciesHandler);
  app.post('/api/v1/tasks/fix-dependencies', dependencyHandlers.fixDependenciesHandler);
  
  return app;
}

describe('Dependency Management API Tests', () => {
  let dependencies;
  let app;
  
  beforeEach(() => {
    dependencies = createTestDependencies({}, jest);
    app = createTestApp(dependencies);
  });
  
  describe('POST /api/v1/tasks/:id/dependencies', () => {
    describe('Success cases', () => {
      test('should add dependency to task', async () => {
        // Arrange
        const dependencyData = {
          dependencyId: 2
        };
        const mockResponse = {
          success: true,
          task: { 
            ...mockTasks[0], 
            dependencies: [1, 2] 
          },
          message: 'Dependency added successfully'
        };
        dependencies.addDependencyDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/dependencies')
          .send(dependencyData)
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            task: expect.objectContaining({
              dependencies: expect.arrayContaining([2])
            }),
            message: 'Dependency added successfully'
          }
        });
        
        expect(dependencies.ensureProjectDirectory).toHaveBeenCalled();
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'addDependency',
          expect.objectContaining({
            taskId: 1,
            dependencyId: 2
          })
        );
        expect(dependencies.addDependencyDirect).toHaveBeenCalledWith(
          expect.any(Object),
          dependencies.logger,
          { session: {} }
        );
      });

      test('should handle adding multiple dependencies', async () => {
        // Arrange
        const dependencyData = {
          dependencyId: 5
        };
        const mockResponse = {
          success: true,
          task: { 
            ...mockTasks[3], 
            dependencies: [1, 2, 3, 5] 
          },
          message: 'Dependency added successfully'
        };
        dependencies.addDependencyDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/4/dependencies')
          .send(dependencyData)
          .expect(200);

        // Assert
        expect(response.body.data.task.dependencies).toContain(5);
      });
    });

    describe('Validation errors', () => {
      test('should reject invalid task ID', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks/abc/dependencies')
          .send({ dependencyId: 2 })
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INVALID_TASK_ID',
            message: 'Task ID must be a number'
          }
        });
        expect(dependencies.addDependencyDirect).not.toHaveBeenCalled();
      });

      test('should reject missing dependencyId', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/dependencies')
          .send({})
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid dependency data'
          }
        });
      });

      test('should reject invalid dependencyId', async () => {
        const invalidIds = [-1, 0, 'abc', 1.5, null];
        
        for (const dependencyId of invalidIds) {
          const response = await request(app)
            .post('/api/v1/tasks/1/dependencies')
            .send({ dependencyId })
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
        dependencies.addDependencyDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/999/dependencies')
          .send({ dependencyId: 2 })
          .expect(404);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND'
          }
        });
      });

      test('should handle circular dependency error', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'CIRCULAR_DEPENDENCY', message: 'Circular dependency detected' }
        };
        dependencies.addDependencyDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/dependencies')
          .send({ dependencyId: 1 })
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'CIRCULAR_DEPENDENCY'
          }
        });
      });

      test('should handle dependency already exists error', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'DEPENDENCY_EXISTS', message: 'Dependency already exists' }
        };
        dependencies.addDependencyDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/4/dependencies')
          .send({ dependencyId: 1 })
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'DEPENDENCY_EXISTS'
          }
        });
      });

      test('should handle other dependency errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Invalid dependency configuration'
        };
        dependencies.addDependencyDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/dependencies')
          .send({ dependencyId: 2 })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('ADD_DEPENDENCY_ERROR');
      });

      test('should handle unexpected errors', async () => {
        // Arrange
        dependencies.addDependencyDirect.mockRejectedValue(new Error('Database error'));

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/dependencies')
          .send({ dependencyId: 2 })
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });

  describe('DELETE /api/v1/tasks/:id/dependencies/:depId', () => {
    describe('Success cases', () => {
      test('should remove dependency from task', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          task: { 
            ...mockTasks[3], 
            dependencies: [2, 3] // removed dependency 1
          },
          message: 'Dependency removed successfully'
        };
        dependencies.removeDependencyDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/4/dependencies/1')
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            task: expect.objectContaining({
              dependencies: expect.not.arrayContaining([1])
            }),
            message: 'Dependency removed successfully'
          }
        });
        
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'removeDependency',
          expect.objectContaining({
            taskId: 4,
            dependencyId: 1
          })
        );
      });

      test('should handle removing last dependency', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          task: { 
            ...mockTasks[0], 
            dependencies: [] 
          },
          message: 'Dependency removed successfully'
        };
        dependencies.removeDependencyDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1/dependencies/1')
          .expect(200);

        // Assert
        expect(response.body.data.task.dependencies).toEqual([]);
      });
    });

    describe('Validation errors', () => {
      test('should reject invalid task ID', async () => {
        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/abc/dependencies/1')
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_ID');
        expect(dependencies.removeDependencyDirect).not.toHaveBeenCalled();
      });

      test('should reject invalid dependency ID', async () => {
        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1/dependencies/abc')
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
        dependencies.removeDependencyDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/999/dependencies/1')
          .expect(404);

        // Assert
        expect(response.body.error.code).toBe('TASK_NOT_FOUND');
      });

      test('should handle dependency not found error', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'DEPENDENCY_NOT_FOUND', message: 'Dependency not found' }
        };
        dependencies.removeDependencyDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1/dependencies/999')
          .expect(404);

        // Assert
        expect(response.body.error.code).toBe('DEPENDENCY_NOT_FOUND');
      });

      test('should handle other removal errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Cannot remove critical dependency'
        };
        dependencies.removeDependencyDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1/dependencies/2')
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('REMOVE_DEPENDENCY_ERROR');
      });

      test('should handle unexpected errors', async () => {
        // Arrange
        dependencies.removeDependencyDirect.mockRejectedValue(new Error('Database error'));

        // Act
        const response = await request(app)
          .delete('/api/v1/tasks/1/dependencies/2')
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });

  describe('POST /api/v1/tasks/validate-dependencies', () => {
    describe('Success cases', () => {
      test('should validate dependencies without autoFix', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          valid: true,
          issues: [],
          message: 'All dependencies are valid'
        };
        dependencies.validateDependenciesDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/validate-dependencies')
          .send({ autoFix: false })
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            valid: true,
            issues: [],
            message: 'All dependencies are valid'
          }
        });
        
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'validateDependencies',
          expect.objectContaining({
            autoFix: false
          })
        );
      });

      test('should validate and identify issues', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          valid: false,
          issues: [
            { type: 'circular', tasks: [1, 2, 1] },
            { type: 'missing', taskId: 3, dependencyId: 999 }
          ],
          message: '2 dependency issues found'
        };
        dependencies.validateDependenciesDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/validate-dependencies')
          .send({})
          .expect(200);

        // Assert
        expect(response.body.data.valid).toBe(false);
        expect(response.body.data.issues).toHaveLength(2);
      });

      test('should validate and auto-fix issues', async () => {
        // Arrange
        const validateResponse = {
          success: true,
          valid: false,
          issues: [
            { type: 'circular', tasks: [1, 2, 1] }
          ],
          message: '1 dependency issue found'
        };
        const fixResponse = {
          success: true,
          fixedIssues: [
            { type: 'circular', tasks: [1, 2, 1], action: 'removed' }
          ],
          message: 'Fixed 1 dependency issue'
        };
        dependencies.validateDependenciesDirect.mockResolvedValue(validateResponse);
        dependencies.fixDependenciesDirect.mockResolvedValue(fixResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/validate-dependencies')
          .send({ autoFix: true })
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            valid: false,
            issues: expect.any(Array),
            fixed: true,
            fixedIssues: expect.any(Array)
          }
        });
        
        expect(dependencies.fixDependenciesDirect).toHaveBeenCalled();
      });

      test('should handle empty request body with defaults', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          valid: true,
          issues: [],
          message: 'Validation complete'
        };
        dependencies.validateDependenciesDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/validate-dependencies')
          .send({})
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'validateDependencies',
          expect.objectContaining({
            autoFix: false // default value
          })
        );
      });
    });

    describe('Validation errors', () => {
      test('should reject invalid autoFix parameter', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks/validate-dependencies')
          .send({ autoFix: 'yes' })
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid validation parameters'
          }
        });
      });
    });

    describe('Error handling', () => {
      test('should handle validation errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'VALIDATION_FAILED', message: 'Failed to validate dependencies' }
        };
        dependencies.validateDependenciesDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/validate-dependencies')
          .send({})
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATE_DEPENDENCIES_ERROR'
          }
        });
      });

      test('should handle unexpected errors', async () => {
        // Arrange
        dependencies.validateDependenciesDirect.mockRejectedValue(new Error('System error'));

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/validate-dependencies')
          .send({})
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });

  describe('POST /api/v1/tasks/fix-dependencies', () => {
    describe('Success cases', () => {
      test('should fix dependency issues successfully', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          fixedIssues: [
            { type: 'circular', tasks: [1, 2, 1], action: 'removed' },
            { type: 'missing', taskId: 3, dependencyId: 999, action: 'cleaned' }
          ],
          message: 'Fixed 2 dependency issues'
        };
        dependencies.fixDependenciesDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/fix-dependencies')
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            fixedIssues: expect.arrayContaining([
              expect.objectContaining({
                type: 'circular',
                action: 'removed'
              })
            ]),
            message: 'Fixed 2 dependency issues'
          }
        });
        
        expect(dependencies.ensureProjectDirectory).toHaveBeenCalled();
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith('fixDependencies', {});
      });

      test('should handle no issues to fix', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          fixedIssues: [],
          message: 'No dependency issues found'
        };
        dependencies.fixDependenciesDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/fix-dependencies')
          .expect(200);

        // Assert
        expect(response.body.data.fixedIssues).toEqual([]);
      });
    });

    describe('Error handling', () => {
      test('should handle fix operation errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'FIX_FAILED', message: 'Unable to fix some issues' }
        };
        dependencies.fixDependenciesDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/fix-dependencies')
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'FIX_DEPENDENCIES_ERROR'
          }
        });
      });

      test('should handle unexpected errors', async () => {
        // Arrange
        dependencies.fixDependenciesDirect.mockRejectedValue(new Error('System failure'));

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/fix-dependencies')
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });
});