import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set the hardcoded Anthropic API key
process.env.ANTHROPIC_API_KEY = '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';

let app;
let server;

describe('Task Master API - Edge Cases and Error Scenarios', () => {
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

  describe('Input Validation Edge Cases', () => {
    describe('Task Title Validation', () => {
      test('should handle extremely long task titles', async () => {
        const longTitle = 'A'.repeat(1000);
        
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({
            title: longTitle,
            description: 'Task with very long title'
          });

        // Should either accept or reject based on max length
        expect([200, 201, 400]).toContain(response.status);
      });

      test('should handle task titles with special characters', async () => {
        const specialTitles = [
          'Task with emoji 🚀',
          'Task with <script>alert("xss")</script>',
          'Task with SQL injection\'; DROP TABLE tasks;--',
          'Task with unicode: 你好世界',
          'Task with symbols: @#$%^&*()',
          'Task\nwith\nnewlines',
          'Task\twith\ttabs'
        ];

        for (const title of specialTitles) {
          const response = await request(app)
            .post('/api/v1/tasks')
            .send({
              title: title,
              description: 'Testing special characters'
            });

          expect(response.status).toBe(201);
          expect(response.body.data.task.title).toBe(title);
        }
      });

      test('should handle empty string title', async () => {
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({
            title: '',
            description: 'Task with empty title'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_INPUT');
      });

      test('should handle whitespace-only title', async () => {
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({
            title: '   ',
            description: 'Task with whitespace title'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_INPUT');
      });
    });

    describe('Numeric Input Edge Cases', () => {
      test('should handle boundary values for target_task_count', async () => {
        const boundaryValues = [0, 1, 100, 101, -1, 999999];
        
        for (const value of boundaryValues) {
          const response = await request(app)
            .post('/api/v1/generate-tasks-from-prd')
            .send({
              prd_content: 'Test PRD',
              target_task_count: value
            });

          if (value >= 1 && value <= 100) {
            expect(response.status).toBe(200);
          } else {
            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('INVALID_INPUT');
          }
        }
      });

      test('should handle non-integer task IDs', async () => {
        const invalidIds = ['1.5', '1e10', 'Infinity', '-Infinity', 'NaN'];
        
        for (const id of invalidIds) {
          const response = await request(app).get(`/api/v1/tasks/${id}`);
          
          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('INVALID_TASK_ID');
        }
      });

      test('should handle very large task IDs', async () => {
        const largeId = '9'.repeat(20);
        
        const response = await request(app).get(`/api/v1/tasks/${largeId}`);
        
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_TASK_ID');
      });
    });

    describe('Array Input Edge Cases', () => {
      test('should handle empty dependency array', async () => {
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({
            title: 'Task with empty dependencies',
            dependencies: []
          });

        expect(response.status).toBe(201);
        expect(response.body.data.task.dependencies).toEqual([]);
      });

      test('should handle duplicate dependencies', async () => {
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({
            title: 'Task with duplicate dependencies',
            dependencies: [1, 1, 2, 2, 3]
          });

        expect(response.status).toBe(201);
        // Should deduplicate
        const uniqueDeps = [...new Set(response.body.data.task.dependencies)];
        expect(response.body.data.task.dependencies.length).toBe(uniqueDeps.length);
      });

      test('should handle invalid dependency types', async () => {
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({
            title: 'Task with invalid dependencies',
            dependencies: ['string', null, undefined, {}, []]
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_INPUT');
      });
    });
  });

  describe('Concurrency and Race Conditions', () => {
    test('should handle concurrent task creation', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/v1/tasks')
            .send({
              title: `Concurrent Task ${i}`,
              description: 'Testing concurrent creation'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // All should have unique IDs
      const ids = responses.map(r => r.body.data.task.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toBe(ids.length);
    });

    test('should handle concurrent updates to same task', async () => {
      // First create a task
      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send({
          title: 'Task for concurrent updates',
          description: 'Original description'
        });

      const taskId = createResponse.body.data.task.id;

      // Try concurrent updates
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .patch(`/api/v1/tasks/${taskId}/status`)
            .send({ status: i % 2 === 0 ? 'in-progress' : 'completed' })
        );
      }

      const responses = await Promise.all(promises);
      
      // All should complete (though final state may vary)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('PRD Processing Edge Cases', () => {
    test('should handle empty PRD content', async () => {
      const response = await request(app)
        .post('/api/v1/generate-tasks-from-prd')
        .send({
          prd_content: '',
          target_task_count: 10
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    test('should handle PRD with only whitespace', async () => {
      const response = await request(app)
        .post('/api/v1/generate-tasks-from-prd')
        .send({
          prd_content: '   \n\t   ',
          target_task_count: 10
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    test('should handle very short PRD content', async () => {
      const response = await request(app)
        .post('/api/v1/generate-tasks-from-prd')
        .send({
          prd_content: 'TODO',
          target_task_count: 10
        });

      // Should either generate minimal tasks or return error
      expect([200, 400]).toContain(response.status);
    }, 20000);

    test('should handle PRD with technical jargon and acronyms', async () => {
      const response = await request(app)
        .post('/api/v1/generate-tasks-from-prd')
        .send({
          prd_content: `
            Build a K8s-native CI/CD pipeline with GitOps integration.
            Must support RBAC, mTLS, and integrate with existing SIEM.
            Deploy using Helm charts with Istio service mesh.
            Implement OAuth2/OIDC with PKCE flow.
          `,
          target_task_count: 5
        });

      expect(response.status).toBe(200);
      expect(response.body.data.tasks.length).toBeGreaterThan(0);
    }, 20000);
  });

  describe('Dependency Graph Edge Cases', () => {
    test('should handle self-dependency attempt', async () => {
      // Create a task
      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send({
          title: 'Task for self-dependency test'
        });

      const taskId = createResponse.body.data.task.id;

      // Try to make it depend on itself
      const response = await request(app)
        .post(`/api/v1/tasks/${taskId}/dependencies`)
        .send({ dependencyId: taskId });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('CIRCULAR_DEPENDENCY');
    });

    test('should handle complex circular dependency chains', async () => {
      // Create three tasks
      const tasks = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({ title: `Chain Task ${i}` });
        tasks.push(response.body.data.task.id);
      }

      // Create chain: 1 -> 2 -> 3
      await request(app)
        .post(`/api/v1/tasks/${tasks[1]}/dependencies`)
        .send({ dependencyId: tasks[0] });

      await request(app)
        .post(`/api/v1/tasks/${tasks[2]}/dependencies`)
        .send({ dependencyId: tasks[1] });

      // Try to complete the circle: 3 -> 1
      const response = await request(app)
        .post(`/api/v1/tasks/${tasks[0]}/dependencies`)
        .send({ dependencyId: tasks[2] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('CIRCULAR_DEPENDENCY');
    });
  });

  describe('Status Transition Edge Cases', () => {
    test('should handle invalid status transitions', async () => {
      // Create a task
      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Status transition test' });

      const taskId = createResponse.body.data.task.id;

      // Complete the task
      await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .send({ status: 'completed' });

      // Try to move completed task back to pending
      const response = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .send({ status: 'pending' });

      // Should either allow or prevent based on business rules
      expect([200, 400]).toContain(response.status);
    });

    test('should handle rapid status changes', async () => {
      // Create a task
      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Rapid status change test' });

      const taskId = createResponse.body.data.task.id;

      const statuses = ['in-progress', 'blocked', 'in-progress', 'completed'];
      
      for (const status of statuses) {
        const response = await request(app)
          .patch(`/api/v1/tasks/${taskId}/status`)
          .send({ status });

        expect(response.status).toBe(200);
      }
    });
  });

  describe('Subtask Management Edge Cases', () => {
    test('should handle subtask limit per task', async () => {
      // Create a task
      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Task with many subtasks' });

      const taskId = createResponse.body.data.task.id;

      // Try to add many subtasks
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .post(`/api/v1/tasks/${taskId}/subtasks`)
            .send({
              title: `Subtask ${i}`,
              description: 'Testing subtask limits'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // Should either accept all or start rejecting after a limit
      const successCount = responses.filter(r => r.status === 201).length;
      expect(successCount).toBeGreaterThan(0);
    });

    test('should handle nested subtask references', async () => {
      // Create a task with subtasks
      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Parent task' });

      const taskId = createResponse.body.data.task.id;

      // Add subtask
      const subtaskResponse = await request(app)
        .post(`/api/v1/tasks/${taskId}/subtasks`)
        .send({ title: 'Subtask 1' });

      const subtaskId = subtaskResponse.body.data.subtask.id;

      // Try to update subtask with reference to parent
      const response = await request(app)
        .put(`/api/v1/tasks/${taskId}/subtasks/${subtaskId}`)
        .send({
          title: `Subtask referencing task ${taskId}`,
          description: `This subtask is part of task ${taskId}`
        });

      expect(response.status).toBe(200);
    });
  });

  describe('AI Provider Edge Cases', () => {
    test('should handle rate limiting gracefully', async () => {
      // Make multiple rapid AI requests
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/v1/tasks/analyze-complexity')
            .send({ taskId: 1 })
        );
      }

      const responses = await Promise.all(promises);
      
      // Should handle rate limits gracefully
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
        if (response.status === 429) {
          expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        }
      });
    });

    test('should handle malformed AI responses', async () => {
      // This test would require mocking the AI service
      // For now, we just test that the endpoint handles errors
      const response = await request(app)
        .post('/api/v1/generate-tasks-from-prd')
        .send({
          prd_content: '```javascript\nthrow new Error("test");\n```',
          target_task_count: 5
        });

      // Should not crash the server
      expect([200, 400, 500]).toContain(response.status);
    }, 20000);
  });

  describe('Project Initialization Edge Cases', () => {
    test('should handle project names with special characters', async () => {
      const specialNames = [
        'project-with-dashes',
        'project_with_underscores',
        'project.with.dots',
        'project@special',
        '123-numeric-start',
        'UPPERCASE-PROJECT'
      ];

      for (const name of specialNames) {
        const response = await request(app)
          .post('/api/v1/projects/initialize')
          .send({
            projectName: name,
            template: 'basic'
          });

        // Should either sanitize or accept
        expect([201, 400]).toContain(response.status);
      }
    });

    test('should handle invalid template names', async () => {
      const response = await request(app)
        .post('/api/v1/projects/initialize')
        .send({
          projectName: 'test-project',
          template: 'non-existent-template'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    test('should handle requests for large numbers of tasks', async () => {
      const response = await request(app)
        .get('/api/v1/tasks?limit=10000');

      expect(response.status).toBe(200);
      // Should implement pagination or limits
      expect(response.body.data.tasks.length).toBeLessThanOrEqual(1000);
    });

    test('should handle deep task expansion', async () => {
      // Create a task
      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Task for deep expansion' });

      const taskId = createResponse.body.data.task.id;

      // Try to expand with large number
      const response = await request(app)
        .post(`/api/v1/tasks/${taskId}/expand`)
        .send({
          numSubtasks: 100,
          useResearch: false
        });

      // Should either limit or handle gracefully
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.data.subtasksGenerated).toBeLessThanOrEqual(20);
      }
    }, 30000);
  });

  describe('Unicode and Internationalization', () => {
    test('should handle various unicode characters', async () => {
      const unicodeTexts = [
        '任务管理系统', // Chinese
        'タスク管理', // Japanese
        'مهمة', // Arabic
        '🚀📋✅', // Emojis
        'Задача', // Russian
        'काम', // Hindi
      ];

      for (const text of unicodeTexts) {
        const response = await request(app)
          .post('/api/v1/tasks')
          .send({
            title: text,
            description: `Description in English for: ${text}`
          });

        expect(response.status).toBe(201);
        expect(response.body.data.task.title).toBe(text);
      }
    });

    test('should handle mixed direction text (RTL/LTR)', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({
          title: 'Task עם Hebrew and English',
          description: 'مزيج of Arabic و English'
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from database errors', async () => {
      // This would require mocking the database
      // For now, test that invalid data doesn't crash the server
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({
          title: 'Test task',
          // Send invalid data that might cause DB issues
          dependencies: [null, undefined, '', 'invalid']
        });

      // Should handle gracefully
      expect([201, 400]).toContain(response.status);
    });

    test('should handle missing required environment variables gracefully', async () => {
      // Test would require restarting server without API key
      // For now, just verify the server handles requests
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });
  });
});