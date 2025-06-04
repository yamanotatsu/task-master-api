import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { 
  listTasksHandler,
  getTaskHandler,
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  updateTaskStatusHandler
} from '../../../api/routes/tasks.js';
import { mockTasks, createMockTask } from '../fixtures/api-test-data.js';
import { edgeCaseIds, edgeCaseEnums, extremeStrings, edgeCaseTasks } from '../fixtures/edge-cases.js';
import { 
  expectErrorResponse, 
  expectSuccessResponse,
  expectValidTask,
  mockEnv
} from '../helpers/test-utils.js';

// Mock all dependencies first
jest.mock('../../../mcp-server/src/core/task-master-core.js');
jest.mock('../../../api/utils/logger.js');
jest.mock('../../../api/utils/direct-function-helpers.js');
jest.mock('../../../api/services/task-updater.js');

// Import mocked modules
import { 
  listTasksDirect,
  showTaskDirect,
  addTaskDirect,
  updateTaskByIdDirect,
  removeTaskDirect,
  setTaskStatusDirect
} from '../../../mcp-server/src/core/task-master-core.js';
import { logger } from '../../../api/utils/logger.js';
import { 
  prepareDirectFunctionArgs,
  ensureProjectDirectory,
  getTasksJsonPath,
  getProjectRoot
} from '../../../api/utils/direct-function-helpers.js';

describe('API Route: /api/v1/tasks', () => {
  let app;
  let cleanupEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup test environment
    cleanupEnv = mockEnv({
      PROJECT_NAME: 'test-project',
      TM_DATA_DIR: '/test/projects'
    });
    
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Mount routes
    app.get('/api/v1/tasks', listTasksHandler);
    app.get('/api/v1/tasks/:id', getTaskHandler);
    app.post('/api/v1/tasks', createTaskHandler);
    app.put('/api/v1/tasks/:id', updateTaskHandler);
    app.delete('/api/v1/tasks/:id', deleteTaskHandler);
    app.patch('/api/v1/tasks/:id/status', updateTaskStatusHandler);
    
    // Setup mock implementations
    prepareDirectFunctionArgs.mockImplementation((action, params) => params);
    ensureProjectDirectory.mockImplementation(() => {});
    getTasksJsonPath.mockReturnValue('/test/tasks.json');
    getProjectRoot.mockReturnValue('/test/project');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    cleanupEnv();
  });

  describe('GET /api/v1/tasks', () => {
    describe('Success cases', () => {
      test('should return all tasks without filter', async () => {
        const mockResponse = {
          success: true,
          data: { tasks: mockTasks }
        };
        listTasksDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .get('/api/v1/tasks')
          .expect('Content-Type', /json/)
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.data).toMatchObject({
          tasks: mockTasks,
          totalTasks: mockTasks.length,
          filteredBy: 'all'
        });
        expect(listTasksDirect).toHaveBeenCalledWith(
          expect.any(Object),
          logger,
          expect.any(Object)
        );
      });

      test('should return filtered tasks by status', async () => {
        const filteredTasks = mockTasks.filter(t => t.status === 'pending');
        const mockResponse = {
          success: true,
          data: { tasks: filteredTasks }
        };
        listTasksDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .get('/api/v1/tasks?filter=pending')
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.data.filteredBy).toBe('pending');
        expect(prepareDirectFunctionArgs).toHaveBeenCalledWith('listTasks', {
          filter: 'pending',
          format: 'json'
        });
      });

      test('should handle different format parameter', async () => {
        const mockResponse = {
          success: true,
          data: { tasks: mockTasks }
        };
        listTasksDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .get('/api/v1/tasks?format=detailed')
          .expect(200);

        expectSuccessResponse(response);
        expect(prepareDirectFunctionArgs).toHaveBeenCalledWith('listTasks', {
          filter: undefined,
          format: 'detailed'
        });
      });

      test('should return empty array when no tasks exist', async () => {
        const mockResponse = {
          success: true,
          data: { tasks: [] }
        };
        listTasksDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .get('/api/v1/tasks')
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.data.tasks).toEqual([]);
        expect(response.body.data.totalTasks).toBe(0);
      });
    });

    describe('Error cases', () => {
      test('should handle direct function errors', async () => {
        const mockResponse = {
          success: false,
          error: 'Failed to read tasks file'
        };
        listTasksDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .get('/api/v1/tasks')
          .expect(400);

        expectErrorResponse(response, 'LIST_TASKS_ERROR', 400);
        expect(response.body.error.message).toBe('Failed to read tasks file');
      });

      test('should handle unexpected errors', async () => {
        listTasksDirect.mockRejectedValue(new Error('Unexpected error'));

        const response = await request(app)
          .get('/api/v1/tasks')
          .expect(500);

        expectErrorResponse(response, 'INTERNAL_SERVER_ERROR', 500);
      });

      test('should handle missing data in response', async () => {
        const mockResponse = {
          success: true,
          // data is missing
        };
        listTasksDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .get('/api/v1/tasks')
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.data.tasks).toEqual([]);
      });
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    describe('Success cases', () => {
      test('should return a specific task', async () => {
        const task = mockTasks[0];
        const mockResponse = {
          success: true,
          data: task
        };
        showTaskDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .get('/api/v1/tasks/1')
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.data).toEqual(task);
        expect(showTaskDirect).toHaveBeenCalledWith(
          { taskId: 1 },
          logger,
          expect.any(Object)
        );
      });

      test('should handle large task IDs', async () => {
        const taskId = 999;
        const mockResponse = {
          success: true,
          data: createMockTask({ id: `task_${taskId}` })
        };
        showTaskDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .get(`/api/v1/tasks/${taskId}`)
          .expect(200);

        expectSuccessResponse(response);
        expect(prepareDirectFunctionArgs).toHaveBeenCalledWith('showTask', { taskId });
      });
    });

    describe('Error cases', () => {
      test('should return 400 for non-numeric task ID', async () => {
        const response = await request(app)
          .get('/api/v1/tasks/abc')
          .expect(400);

        expectErrorResponse(response, 'INVALID_TASK_ID', 400);
        expect(showTaskDirect).not.toHaveBeenCalled();
      });

      test('should return 404 for non-existent task', async () => {
        const mockResponse = {
          success: false,
          error: 'Task not found'
        };
        showTaskDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .get('/api/v1/tasks/999')
          .expect(404);

        expectErrorResponse(response, 'TASK_NOT_FOUND', 404);
      });

      test('should handle edge case IDs', async () => {
        const invalidIds = ['', ' ', 'task_001', '1.5', '-1', '0x1a'];
        
        for (const id of invalidIds) {
          const response = await request(app)
            .get(`/api/v1/tasks/${id}`)
            .expect(400);

          expectErrorResponse(response, 'INVALID_TASK_ID', 400);
        }
      });
    });
  });

  describe('POST /api/v1/tasks', () => {
    describe('Success cases', () => {
      test('should create a task with required fields only', async () => {
        const newTask = {
          title: 'New Task'
        };
        const mockResponse = {
          success: true,
          data: createMockTask({ ...newTask, id: 'task_006' })
        };
        addTaskDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .post('/api/v1/tasks')
          .send(newTask)
          .expect(201);

        expectSuccessResponse(response, 201);
        expect(response.body.message).toBe('Task created successfully');
        expect(addTaskDirect).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Task',
            details: expect.stringContaining('Priority: medium')
          }),
          logger,
          expect.any(Object)
        );
      });

      test('should create a task with all fields', async () => {
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
        addTaskDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .post('/api/v1/tasks')
          .send(newTask)
          .expect(201);

        expectSuccessResponse(response, 201);
        expect(prepareDirectFunctionArgs).toHaveBeenCalledWith('addTask', 
          expect.objectContaining({
            title: 'Complete Task',
            dependencies: '1,2,3'
          })
        );
      });

      test('should handle edge case strings in title', async () => {
        const newTask = {
          title: extremeStrings.unicode,
          description: extremeStrings.specialChars
        };
        const mockResponse = {
          success: true,
          data: createMockTask({ ...newTask, id: 'task_008' })
        };
        addTaskDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .post('/api/v1/tasks')
          .send(newTask)
          .expect(201);

        expectSuccessResponse(response, 201);
      });
    });

    describe('Validation errors', () => {
      test('should reject task without title', async () => {
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({ description: 'No title' })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
        expect(response.body.error.details).toBeDefined();
        expect(addTaskDirect).not.toHaveBeenCalled();
      });

      test('should reject empty title', async () => {
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({ title: '' })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });

      test('should reject invalid priority', async () => {
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({ 
            title: 'Test Task',
            priority: 'urgent' // invalid
          })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });

      test('should reject invalid dependencies', async () => {
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({ 
            title: 'Test Task',
            dependencies: 'not-an-array'
          })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });
    });

    describe('Error handling', () => {
      test('should handle direct function errors', async () => {
        const mockResponse = {
          success: false,
          error: 'Duplicate task title'
        };
        addTaskDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .post('/api/v1/tasks')
          .send({ title: 'Duplicate Task' })
          .expect(400);

        expectErrorResponse(response, 'CREATE_TASK_ERROR', 400);
      });

      test('should handle unexpected errors', async () => {
        addTaskDirect.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .post('/api/v1/tasks')
          .send({ title: 'Test Task' })
          .expect(500);

        expectErrorResponse(response, 'INTERNAL_SERVER_ERROR', 500);
      });
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    describe('Success cases', () => {
      test('should update task with partial data', async () => {
        const updates = {
          title: 'Updated Title'
        };
        const mockResponse = {
          success: true,
          data: createMockTask({ ...mockTasks[0], ...updates })
        };
        updateTaskByIdDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .put('/api/v1/tasks/1')
          .send(updates)
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.message).toBe('Task updated successfully');
        expect(updateTaskByIdDirect).toHaveBeenCalledWith(
          expect.objectContaining({
            taskId: 1,
            updates: { title: 'Updated Title' }
          }),
          logger,
          expect.any(Object)
        );
      });

      test('should update all task fields', async () => {
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
        updateTaskByIdDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .put('/api/v1/tasks/1')
          .send(updates)
          .expect(200);

        expectSuccessResponse(response);
        expect(prepareDirectFunctionArgs).toHaveBeenCalledWith('updateTaskById',
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
        const mockResponse = {
          success: true,
          data: mockTasks[0]
        };
        updateTaskByIdDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .put('/api/v1/tasks/1')
          .send({})
          .expect(200);

        expectSuccessResponse(response);
      });
    });

    describe('Validation errors', () => {
      test('should reject invalid task ID', async () => {
        const response = await request(app)
          .put('/api/v1/tasks/invalid')
          .send({ title: 'Updated' })
          .expect(400);

        expectErrorResponse(response, 'INVALID_TASK_ID', 400);
      });

      test('should reject invalid priority in update', async () => {
        const response = await request(app)
          .put('/api/v1/tasks/1')
          .send({ priority: 'invalid' })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });

      test('should reject empty title in update', async () => {
        const response = await request(app)
          .put('/api/v1/tasks/1')
          .send({ title: '' })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });
    });

    describe('Error handling', () => {
      test('should return 404 for non-existent task', async () => {
        const mockResponse = {
          success: false,
          error: 'Task not found'
        };
        updateTaskByIdDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .put('/api/v1/tasks/999')
          .send({ title: 'Updated' })
          .expect(404);

        expectErrorResponse(response, 'UPDATE_TASK_ERROR', 404);
      });

      test('should handle circular dependency errors', async () => {
        const mockResponse = {
          success: false,
          error: 'Circular dependency detected'
        };
        updateTaskByIdDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .put('/api/v1/tasks/1')
          .send({ dependencies: [2, 3, 1] })
          .expect(404);

        expectErrorResponse(response, 'UPDATE_TASK_ERROR', 404);
      });
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    describe('Success cases', () => {
      test('should delete an existing task', async () => {
        const mockResponse = {
          success: true,
          data: { deleted: true }
        };
        removeTaskDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .delete('/api/v1/tasks/1')
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.message).toBe('Task 1 deleted successfully');
        expect(removeTaskDirect).toHaveBeenCalledWith(
          { taskId: 1 },
          logger,
          expect.any(Object)
        );
      });
    });

    describe('Error cases', () => {
      test('should reject invalid task ID', async () => {
        const response = await request(app)
          .delete('/api/v1/tasks/not-a-number')
          .expect(400);

        expectErrorResponse(response, 'INVALID_TASK_ID', 400);
      });

      test('should return 404 for non-existent task', async () => {
        const mockResponse = {
          success: false,
          error: 'Task not found'
        };
        removeTaskDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .delete('/api/v1/tasks/999')
          .expect(404);

        expectErrorResponse(response, 'DELETE_TASK_ERROR', 404);
      });

      test('should handle task with dependencies error', async () => {
        const mockResponse = {
          success: false,
          error: 'Cannot delete task with dependent tasks'
        };
        removeTaskDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .delete('/api/v1/tasks/1')
          .expect(404);

        expectErrorResponse(response, 'DELETE_TASK_ERROR', 404);
        expect(response.body.error.message).toContain('Cannot delete task');
      });
    });
  });

  describe('PATCH /api/v1/tasks/:id/status', () => {
    describe('Success cases', () => {
      test('should update task status to valid values', async () => {
        const validStatuses = ['pending', 'in-progress', 'completed', 'blocked'];
        
        for (const status of validStatuses) {
          const mockResponse = {
            success: true,
            data: { ...mockTasks[0], status }
          };
          setTaskStatusDirect.mockResolvedValue(mockResponse);

          const response = await request(app)
            .patch('/api/v1/tasks/1/status')
            .send({ status })
            .expect(200);

          expectSuccessResponse(response);
          expect(response.body.message).toBe(`Task 1 status updated to ${status}`);
          expect(setTaskStatusDirect).toHaveBeenCalledWith(
            { taskId: 1, status },
            logger,
            expect.any(Object)
          );
        }
      });
    });

    describe('Validation errors', () => {
      test('should reject invalid task ID', async () => {
        const response = await request(app)
          .patch('/api/v1/tasks/abc/status')
          .send({ status: 'completed' })
          .expect(400);

        expectErrorResponse(response, 'INVALID_TASK_ID', 400);
      });

      test('should reject invalid status values', async () => {
        const invalidStatuses = edgeCaseEnums.invalidStatuses;
        
        for (const status of invalidStatuses) {
          const response = await request(app)
            .patch('/api/v1/tasks/1/status')
            .send({ status })
            .expect(400);

          expectErrorResponse(response, 'VALIDATION_ERROR', 400);
        }
      });

      test('should reject missing status field', async () => {
        const response = await request(app)
          .patch('/api/v1/tasks/1/status')
          .send({})
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });
    });

    describe('Error handling', () => {
      test('should return 404 for non-existent task', async () => {
        const mockResponse = {
          success: false,
          error: 'Task not found'
        };
        setTaskStatusDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .patch('/api/v1/tasks/999/status')
          .send({ status: 'completed' })
          .expect(404);

        expectErrorResponse(response, 'UPDATE_STATUS_ERROR', 404);
      });

      test('should handle blocked status due to dependencies', async () => {
        const mockResponse = {
          success: false,
          error: 'Cannot complete task - dependencies not met'
        };
        setTaskStatusDirect.mockResolvedValue(mockResponse);

        const response = await request(app)
          .patch('/api/v1/tasks/4/status')
          .send({ status: 'completed' })
          .expect(404);

        expectErrorResponse(response, 'UPDATE_STATUS_ERROR', 404);
        expect(response.body.error.message).toContain('dependencies not met');
      });
    });
  });
});