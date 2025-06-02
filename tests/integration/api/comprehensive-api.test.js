import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Set the hardcoded Anthropic API key
process.env.ANTHROPIC_API_KEY = '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';

let app;
let server;

// Variables to store data between tests
let generatedTasks = [];
let taskIdMap = {};
let subtaskIdMap = {};

// Helper function to read the sample PRD
const readSamplePRD = () => {
  const prdPath = path.join(__dirname, '../../fixtures/sample-prd-api-test.txt');
  return fs.readFileSync(prdPath, 'utf8');
};

describe('Task Master API - Comprehensive Test Suite', () => {
  beforeAll(async () => {
    // Import the server
    const serverModule = await import('../../../api/server.js');
    app = serverModule.default;
    
    // Start the server
    server = app.listen(0); // Use port 0 to get a random available port
  });

  afterAll(async () => {
    // Close the server
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('1. Health Check', () => {
    test('GET /health - should return healthy status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('2. PRD Processing - Generate Tasks from PRD', () => {
    test('POST /api/v1/generate-tasks-from-prd - should generate tasks from PRD content', async () => {
      const prdContent = readSamplePRD();
      
      const response = await request(app)
        .post('/api/v1/generate-tasks-from-prd')
        .send({
          prd_content: prdContent,
          target_task_count: 15,
          use_research_mode: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tasks');
      expect(Array.isArray(response.body.data.tasks)).toBe(true);
      expect(response.body.data.tasks.length).toBeGreaterThan(0);
      expect(response.body.data.tasks.length).toBeLessThanOrEqual(20); // Allow some flexibility
      
      // Store generated tasks for later tests
      generatedTasks = response.body.data.tasks;
      
      // Verify task structure
      generatedTasks.forEach(task => {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('description');
        expect(task).toHaveProperty('status', 'pending');
        expect(task).toHaveProperty('priority');
        expect(task).toHaveProperty('dependencies');
        expect(Array.isArray(task.dependencies)).toBe(true);
        
        // Store task ID mapping
        taskIdMap[task.id] = task;
      });

      // Verify metadata
      expect(response.body.data).toHaveProperty('metadata');
      expect(response.body.data.metadata).toHaveProperty('totalTasks');
      expect(response.body.data.metadata).toHaveProperty('sourceLength');
      expect(response.body.data.metadata).toHaveProperty('generatedAt');

      // Verify telemetry data
      expect(response.body.data).toHaveProperty('telemetryData');
      expect(response.body.data.telemetryData).toHaveProperty('modelUsed');
      expect(response.body.data.telemetryData).toHaveProperty('providerName', 'anthropic');
    }, 30000); // Increase timeout for AI processing

    test('POST /api/v1/generate-tasks-from-prd - should fail with missing PRD content', async () => {
      const response = await request(app)
        .post('/api/v1/generate-tasks-from-prd')
        .send({
          target_task_count: 10
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
    });

    test('POST /api/v1/generate-tasks-from-prd - should fail with invalid target_task_count', async () => {
      const response = await request(app)
        .post('/api/v1/generate-tasks-from-prd')
        .send({
          prd_content: 'Test PRD',
          target_task_count: 101 // Exceeds maximum
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
    });
  });

  describe('3. Task Management', () => {
    describe('3.1 List Tasks', () => {
      test('GET /api/v1/tasks - should list all tasks', async () => {
        const response = await request(app).get('/api/v1/tasks');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('tasks');
        expect(Array.isArray(response.body.data.tasks)).toBe(true);
        expect(response.body.data).toHaveProperty('totalTasks');
        expect(response.body.data).toHaveProperty('filteredBy', 'all');
      });

      test('GET /api/v1/tasks?filter=pending - should list only pending tasks', async () => {
        const response = await request(app).get('/api/v1/tasks?filter=pending');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.filteredBy).toBe('pending');
        
        // All tasks should be pending
        response.body.data.tasks.forEach(task => {
          expect(task.status).toBe('pending');
        });
      });

      test('GET /api/v1/tasks?withSubtasks=true - should include subtasks', async () => {
        const response = await request(app).get('/api/v1/tasks?withSubtasks=true');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        // Tasks should have subtasks property
        response.body.data.tasks.forEach(task => {
          expect(task).toHaveProperty('subtasks');
          expect(Array.isArray(task.subtasks)).toBe(true);
        });
      });
    });

    describe('3.2 Get Specific Task', () => {
      test('GET /api/v1/tasks/:id - should get task by ID', async () => {
        const taskId = generatedTasks[0]?.id;
        if (!taskId) {
          console.warn('No tasks generated, skipping test');
          return;
        }

        const response = await request(app).get(`/api/v1/tasks/${taskId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('task');
        expect(response.body.data.task.id).toBe(taskId);
        expect(response.body.data.task).toHaveProperty('details');
        expect(response.body.data.task).toHaveProperty('testStrategy');
      });

      test('GET /api/v1/tasks/:id - should return 404 for non-existent task', async () => {
        const response = await request(app).get('/api/v1/tasks/99999');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'TASK_NOT_FOUND');
      });

      test('GET /api/v1/tasks/:id - should return 400 for invalid task ID', async () => {
        const response = await request(app).get('/api/v1/tasks/invalid');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'INVALID_TASK_ID');
      });
    });

    describe('3.3 Create Task', () => {
      test('POST /api/v1/tasks - should create a new task', async () => {
        const newTask = {
          title: 'Test Task - Manual Creation',
          description: 'This is a manually created test task',
          priority: 'medium',
          details: 'Detailed implementation notes for testing',
          testStrategy: 'Unit tests and integration tests',
          dependencies: []
        };

        const response = await request(app)
          .post('/api/v1/tasks')
          .send(newTask);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('task');
        expect(response.body.data.task).toHaveProperty('id');
        expect(response.body.data.task.title).toBe(newTask.title);
        expect(response.body.data.task.status).toBe('pending');
        
        // Store the created task
        taskIdMap[response.body.data.task.id] = response.body.data.task;
      });

      test('POST /api/v1/tasks - should fail without required title', async () => {
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({
            description: 'Task without title'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      });
    });

    describe('3.4 Update Task', () => {
      test('PUT /api/v1/tasks/:id - should update task properties', async () => {
        const taskId = generatedTasks[0]?.id;
        if (!taskId) {
          console.warn('No tasks generated, skipping test');
          return;
        }

        const updates = {
          title: 'Updated Task Title',
          description: 'Updated task description',
          priority: 'high',
          details: 'Updated implementation details'
        };

        const response = await request(app)
          .put(`/api/v1/tasks/${taskId}`)
          .send(updates);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.task.title).toBe(updates.title);
        expect(response.body.data.task.description).toBe(updates.description);
        expect(response.body.data.task.priority).toBe(updates.priority);
      });

      test('PUT /api/v1/tasks/:id - should return 404 for non-existent task', async () => {
        const response = await request(app)
          .put('/api/v1/tasks/99999')
          .send({ title: 'Updated' });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'TASK_NOT_FOUND');
      });
    });

    describe('3.5 Update Task Status', () => {
      test('PATCH /api/v1/tasks/:id/status - should update task status', async () => {
        const taskId = generatedTasks[0]?.id;
        if (!taskId) {
          console.warn('No tasks generated, skipping test');
          return;
        }

        const response = await request(app)
          .patch(`/api/v1/tasks/${taskId}/status`)
          .send({ status: 'in-progress' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.task.status).toBe('in-progress');
      });

      test('PATCH /api/v1/tasks/:id/status - should fail with invalid status', async () => {
        const taskId = generatedTasks[0]?.id;
        if (!taskId) {
          console.warn('No tasks generated, skipping test');
          return;
        }

        const response = await request(app)
          .patch(`/api/v1/tasks/${taskId}/status`)
          .send({ status: 'invalid-status' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      });
    });
  });

  describe('4. Task Expansion', () => {
    describe('4.1 Expand Single Task', () => {
      test('POST /api/v1/tasks/:id/expand - should generate subtasks for a task', async () => {
        const taskId = generatedTasks[0]?.id;
        if (!taskId) {
          console.warn('No tasks generated, skipping test');
          return;
        }

        const response = await request(app)
          .post(`/api/v1/tasks/${taskId}/expand`)
          .send({
            numSubtasks: 3,
            useResearch: false
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('task');
        expect(response.body.data).toHaveProperty('subtasksGenerated');
        expect(response.body.data.subtasksGenerated).toBeGreaterThan(0);
        
        // Store subtasks
        if (response.body.data.task.subtasks) {
          response.body.data.task.subtasks.forEach(subtask => {
            subtaskIdMap[subtask.id] = subtask;
          });
        }
      }, 20000); // Increase timeout for AI processing

      test('POST /api/v1/tasks/:id/expand - should fail for non-existent task', async () => {
        const response = await request(app)
          .post('/api/v1/tasks/99999/expand')
          .send({ numSubtasks: 3 });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'TASK_NOT_FOUND');
      });
    });

    describe('4.2 Expand All Tasks', () => {
      test('POST /api/v1/tasks/expand-all - should expand all eligible tasks', async () => {
        const response = await request(app)
          .post('/api/v1/tasks/expand-all')
          .send({
            numSubtasks: 2,
            useResearch: false
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('tasksExpanded');
        expect(response.body.data).toHaveProperty('message');
      }, 60000); // Increase timeout for multiple AI calls
    });

    describe('4.3 Clear Subtasks', () => {
      test('DELETE /api/v1/tasks/:id/subtasks - should clear all subtasks', async () => {
        const taskId = generatedTasks[0]?.id;
        if (!taskId) {
          console.warn('No tasks generated, skipping test');
          return;
        }

        const response = await request(app)
          .delete(`/api/v1/tasks/${taskId}/subtasks`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('message');
      });
    });
  });

  describe('5. Subtask Management', () => {
    let testTaskId;
    let testSubtaskId;

    beforeAll(() => {
      // Use the first generated task for subtask tests
      testTaskId = generatedTasks[0]?.id;
    });

    describe('5.1 Add Subtask', () => {
      test('POST /api/v1/tasks/:id/subtasks - should add a subtask', async () => {
        if (!testTaskId) {
          console.warn('No tasks generated, skipping test');
          return;
        }

        const subtask = {
          title: 'Test Subtask',
          description: 'This is a test subtask',
          assignee: 'test-user'
        };

        const response = await request(app)
          .post(`/api/v1/tasks/${testTaskId}/subtasks`)
          .send(subtask);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('subtask');
        expect(response.body.data.subtask).toHaveProperty('id');
        expect(response.body.data.subtask.title).toBe(subtask.title);
        
        // Store subtask ID for later tests
        testSubtaskId = response.body.data.subtask.id;
      });

      test('POST /api/v1/tasks/:id/subtasks - should fail without title', async () => {
        if (!testTaskId) {
          console.warn('No tasks generated, skipping test');
          return;
        }

        const response = await request(app)
          .post(`/api/v1/tasks/${testTaskId}/subtasks`)
          .send({
            description: 'Subtask without title'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      });
    });

    describe('5.2 Update Subtask', () => {
      test('PUT /api/v1/tasks/:id/subtasks/:subtaskId - should update subtask', async () => {
        if (!testTaskId || !testSubtaskId) {
          console.warn('No task or subtask available, skipping test');
          return;
        }

        const updates = {
          title: 'Updated Subtask Title',
          status: 'in-progress',
          assignee: 'updated-user'
        };

        const response = await request(app)
          .put(`/api/v1/tasks/${testTaskId}/subtasks/${testSubtaskId}`)
          .send(updates);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('message');
      });

      test('PUT /api/v1/tasks/:id/subtasks/:subtaskId - should fail for non-existent subtask', async () => {
        if (!testTaskId) {
          console.warn('No tasks generated, skipping test');
          return;
        }

        const response = await request(app)
          .put(`/api/v1/tasks/${testTaskId}/subtasks/invalid-id`)
          .send({ title: 'Updated' });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'SUBTASK_NOT_FOUND');
      });
    });

    describe('5.3 Remove Subtask', () => {
      test('DELETE /api/v1/tasks/:id/subtasks/:subtaskId - should remove subtask', async () => {
        if (!testTaskId || !testSubtaskId) {
          console.warn('No task or subtask available, skipping test');
          return;
        }

        const response = await request(app)
          .delete(`/api/v1/tasks/${testTaskId}/subtasks/${testSubtaskId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('message');
      });
    });
  });

  describe('6. Dependency Management', () => {
    let task1Id, task2Id, task3Id;

    beforeAll(() => {
      // Use generated tasks for dependency tests
      task1Id = generatedTasks[0]?.id;
      task2Id = generatedTasks[1]?.id;
      task3Id = generatedTasks[2]?.id;
    });

    describe('6.1 Add Dependency', () => {
      test('POST /api/v1/tasks/:id/dependencies - should add dependency', async () => {
        if (!task2Id || !task1Id) {
          console.warn('Not enough tasks generated, skipping test');
          return;
        }

        const response = await request(app)
          .post(`/api/v1/tasks/${task2Id}/dependencies`)
          .send({ dependencyId: task1Id });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('message');
      });

      test('POST /api/v1/tasks/:id/dependencies - should prevent circular dependencies', async () => {
        if (!task1Id || !task2Id) {
          console.warn('Not enough tasks generated, skipping test');
          return;
        }

        // Try to create circular dependency
        const response = await request(app)
          .post(`/api/v1/tasks/${task1Id}/dependencies`)
          .send({ dependencyId: task2Id });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'CIRCULAR_DEPENDENCY');
      });
    });

    describe('6.2 Remove Dependency', () => {
      test('DELETE /api/v1/tasks/:id/dependencies/:depId - should remove dependency', async () => {
        if (!task2Id || !task1Id) {
          console.warn('Not enough tasks generated, skipping test');
          return;
        }

        const response = await request(app)
          .delete(`/api/v1/tasks/${task2Id}/dependencies/${task1Id}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('message');
      });
    });

    describe('6.3 Validate Dependencies', () => {
      test('POST /api/v1/tasks/validate-dependencies - should validate all dependencies', async () => {
        const response = await request(app)
          .post('/api/v1/tasks/validate-dependencies')
          .send({ autoFix: false });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('issues');
        expect(Array.isArray(response.body.data.issues)).toBe(true);
      });
    });

    describe('6.4 Fix Dependencies', () => {
      test('POST /api/v1/tasks/fix-dependencies - should fix dependency issues', async () => {
        const response = await request(app)
          .post('/api/v1/tasks/fix-dependencies')
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('message');
      });
    });
  });

  describe('7. Analysis Endpoints', () => {
    describe('7.1 Get Next Task', () => {
      test('GET /api/v1/tasks/next - should recommend next task', async () => {
        const response = await request(app).get('/api/v1/tasks/next');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('task');
        
        if (response.body.data.task) {
          expect(response.body.data).toHaveProperty('recommendation');
          expect(response.body.data).toHaveProperty('reasoning');
        }
      });
    });

    describe('7.2 Analyze Task Complexity', () => {
      test('POST /api/v1/tasks/analyze-complexity - should analyze task complexity', async () => {
        const taskId = generatedTasks[0]?.id;
        if (!taskId) {
          console.warn('No tasks generated, skipping test');
          return;
        }

        const response = await request(app)
          .post('/api/v1/tasks/analyze-complexity')
          .send({ taskId });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('taskId', taskId);
        expect(response.body.data).toHaveProperty('complexity');
        expect(response.body.data.complexity).toHaveProperty('score');
        expect(response.body.data.complexity).toHaveProperty('level');
        expect(response.body.data).toHaveProperty('recommendations');
        expect(Array.isArray(response.body.data.recommendations)).toBe(true);
      }, 20000); // Increase timeout for AI processing

      test('POST /api/v1/tasks/analyze-complexity - should fail for non-existent task', async () => {
        const response = await request(app)
          .post('/api/v1/tasks/analyze-complexity')
          .send({ taskId: 99999 });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'TASK_NOT_FOUND');
      });
    });

    describe('7.3 Get Complexity Report', () => {
      test('GET /api/v1/tasks/complexity-report - should return complexity report', async () => {
        const response = await request(app).get('/api/v1/tasks/complexity-report');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('report');
        expect(response.body.data).toHaveProperty('summary');
        expect(response.body.data).toHaveProperty('recommendations');
        expect(Array.isArray(response.body.data.recommendations)).toBe(true);
      });
    });
  });

  describe('8. Project Management', () => {
    describe('8.1 Initialize Project', () => {
      test('POST /api/v1/projects/initialize - should initialize a new project', async () => {
        const response = await request(app)
          .post('/api/v1/projects/initialize')
          .send({
            projectName: 'test-project-api',
            template: 'web',
            aiProvider: 'anthropic',
            includeRooFiles: true
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('projectPath');
        expect(response.body.data).toHaveProperty('filesCreated');
        expect(Array.isArray(response.body.data.filesCreated)).toBe(true);
      });

      test('POST /api/v1/projects/initialize - should fail without project name', async () => {
        const response = await request(app)
          .post('/api/v1/projects/initialize')
          .send({
            template: 'web'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      });
    });

    describe('8.2 Generate Task Files', () => {
      test('POST /api/v1/projects/generate-task-files - should generate task files', async () => {
        const response = await request(app)
          .post('/api/v1/projects/generate-task-files')
          .send({
            outputDir: 'test-tasks'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('filesGenerated');
        expect(response.body.data).toHaveProperty('message');
      });
    });
  });

  describe('9. Task Deletion', () => {
    test('DELETE /api/v1/tasks/:id - should delete a task', async () => {
      // Create a task to delete
      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send({
          title: 'Task to Delete',
          description: 'This task will be deleted'
        });

      expect(createResponse.status).toBe(201);
      const taskId = createResponse.body.data.task.id;

      // Delete the task
      const deleteResponse = await request(app)
        .delete(`/api/v1/tasks/${taskId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.data).toHaveProperty('message');

      // Verify task is deleted
      const getResponse = await request(app).get(`/api/v1/tasks/${taskId}`);
      expect(getResponse.status).toBe(404);
    });

    test('DELETE /api/v1/tasks/:id - should fail for non-existent task', async () => {
      const response = await request(app).delete('/api/v1/tasks/99999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code', 'TASK_NOT_FOUND');
    });
  });

  describe('10. Error Handling', () => {
    test('should return 404 for unknown endpoints', async () => {
      const response = await request(app).get('/api/v1/unknown-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code', 'ENDPOINT_NOT_FOUND');
    });

    test('should handle invalid JSON body', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      expect(response.status).toBe(400);
    });

    test('should handle large request bodies', async () => {
      // Create a very large PRD content (over 10MB)
      const largePRD = 'x'.repeat(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/api/v1/generate-tasks-from-prd')
        .send({
          prd_content: largePRD,
          target_task_count: 10
        });

      expect(response.status).toBe(413); // Payload too large
    });
  });

  describe('11. End-to-End Workflow', () => {
    test('Complete workflow from PRD to task completion', async () => {
      // Step 1: Generate tasks from PRD
      const prdResponse = await request(app)
        .post('/api/v1/generate-tasks-from-prd')
        .send({
          prd_content: 'Build a simple TODO application with user authentication',
          target_task_count: 5
        });

      expect(prdResponse.status).toBe(200);
      const tasks = prdResponse.body.data.tasks;
      expect(tasks.length).toBeGreaterThan(0);

      // Step 2: Expand first task
      const expandResponse = await request(app)
        .post(`/api/v1/tasks/${tasks[0].id}/expand`)
        .send({ numSubtasks: 2 });

      expect(expandResponse.status).toBe(200);

      // Step 3: Update task status
      const statusResponse = await request(app)
        .patch(`/api/v1/tasks/${tasks[0].id}/status`)
        .send({ status: 'in-progress' });

      expect(statusResponse.status).toBe(200);

      // Step 4: Add dependency
      if (tasks.length > 1) {
        const depResponse = await request(app)
          .post(`/api/v1/tasks/${tasks[1].id}/dependencies`)
          .send({ dependencyId: tasks[0].id });

        expect(depResponse.status).toBe(200);
      }

      // Step 5: Get next task recommendation
      const nextResponse = await request(app).get('/api/v1/tasks/next');
      expect(nextResponse.status).toBe(200);

      // Step 6: Complete first task
      const completeResponse = await request(app)
        .patch(`/api/v1/tasks/${tasks[0].id}/status`)
        .send({ status: 'completed' });

      expect(completeResponse.status).toBe(200);

      // Step 7: Get complexity report
      const reportResponse = await request(app).get('/api/v1/tasks/complexity-report');
      expect(reportResponse.status).toBe(200);
    }, 60000); // Increase timeout for full workflow
  });
});

// Helper function to clean up test data after all tests
afterAll(async () => {
  // Clean up any test files created
  const testTasksDir = path.join(process.cwd(), 'test-tasks');
  if (fs.existsSync(testTasksDir)) {
    fs.rmSync(testTasksDir, { recursive: true, force: true });
  }
});