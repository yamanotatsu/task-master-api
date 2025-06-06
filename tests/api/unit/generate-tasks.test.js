/**
 * Task Generation API Tests with Dependency Injection
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createTaskGenerationHandlers } from '../../../api/routes/generate-tasks-di.js';
import { createTestDependencies } from '../../../api/utils/dependency-factory.js';
import { mockTasks } from '../fixtures/api-test-data.js';

// Test App Factory for Task Generation
function createTestApp(dependencies) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  const taskGenerationHandlers = createTaskGenerationHandlers(dependencies);
  
  // Mount task generation routes
  app.post('/api/v1/tasks/generate-from-prd', taskGenerationHandlers.generateTasksFromPRDHandler);
  
  return app;
}

// Sample PRD content for testing
const samplePRD = `
# Project: Task Management System

## Overview
Create a modern task management system with real-time collaboration features.

## Core Features
1. User authentication and authorization
2. Project creation and management
3. Task creation, editing, and assignment
4. Real-time notifications
5. Dashboard and analytics

## Technical Requirements
- Frontend: React.js with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL
- Real-time: WebSocket integration
- Authentication: JWT tokens

## Success Criteria
- Support 1000+ concurrent users
- 99.9% uptime
- Mobile responsive design
`;

describe('Task Generation API Tests', () => {
  let dependencies;
  let app;
  
  beforeEach(() => {
    dependencies = createTestDependencies({}, jest);
    app = createTestApp(dependencies);
  });
  
  describe('POST /api/v1/tasks/generate-from-prd', () => {
    describe('Success cases', () => {
      test('should generate tasks from PRD with default parameters', async () => {
        // Arrange
        const requestData = {
          prd_content: samplePRD
        };
        const mockResponse = {
          success: true,
          tasks: mockTasks.slice(0, 10), // 10 default tasks
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
        };
        dependencies.generateTasksFromPrdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            tasks: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                title: expect.any(String)
              })
            ]),
            metadata: expect.objectContaining({
              totalTasks: 10,
              averageComplexity: 'medium'
            }),
            telemetryData: expect.objectContaining({
              tokensUsed: expect.any(Number)
            })
          }
        });
        
        expect(dependencies.ensureProjectDirectory).toHaveBeenCalled();
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'generateTasksFromPrd',
          expect.objectContaining({
            prdContent: samplePRD,
            numTasks: 10, // default
            useResearch: false // default
          })
        );
        expect(dependencies.generateTasksFromPrdDirect).toHaveBeenCalledWith(
          expect.any(Object),
          dependencies.logger,
          { session: {} }
        );
      });

      test('should generate tasks with custom parameters', async () => {
        // Arrange
        const requestData = {
          prd_content: samplePRD,
          target_task_count: 20,
          use_research_mode: true
        };
        const mockResponse = {
          success: true,
          tasks: Array.from({ length: 20 }, (_, i) => ({
            ...mockTasks[i % mockTasks.length],
            id: `task_${String(i + 1).padStart(3, '0')}`
          })),
          metadata: {
            totalTasks: 20,
            averageComplexity: 'high',
            estimatedDuration: '8-12 weeks',
            generationTime: 2345,
            researchMode: true
          },
          telemetryData: {
            tokensUsed: 4500,
            provider: 'openai',
            model: 'gpt-4'
          }
        };
        dependencies.generateTasksFromPrdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(200);

        // Assert
        expect(response.body.data.tasks).toHaveLength(20);
        expect(response.body.data.metadata.researchMode).toBe(true);
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'generateTasksFromPrd',
          expect.objectContaining({
            numTasks: 20,
            useResearch: true
          })
        );
      });

      test('should handle small PRD content', async () => {
        // Arrange
        const smallPRD = 'Create a simple todo app with basic CRUD operations.';
        const requestData = {
          prd_content: smallPRD,
          target_task_count: 5
        };
        const mockResponse = {
          success: true,
          tasks: mockTasks.slice(0, 5),
          metadata: {
            totalTasks: 5,
            averageComplexity: 'low',
            estimatedDuration: '1-2 weeks',
            generationTime: 567
          },
          telemetryData: {
            tokensUsed: 800,
            provider: 'anthropic',
            model: 'claude-3-haiku'
          }
        };
        dependencies.generateTasksFromPrdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(200);

        // Assert
        expect(response.body.data.metadata.averageComplexity).toBe('low');
        expect(response.body.data.telemetryData.tokensUsed).toBeLessThan(1000);
      });

      test('should handle maximum task count', async () => {
        // Arrange
        const requestData = {
          prd_content: samplePRD,
          target_task_count: 100 // maximum allowed
        };
        const mockResponse = {
          success: true,
          tasks: Array.from({ length: 100 }, (_, i) => ({
            id: `task_${String(i + 1).padStart(3, '0')}`,
            title: `Generated Task ${i + 1}`,
            description: 'Auto-generated task from PRD',
            status: 'not-started',
            priority: 'medium'
          })),
          metadata: {
            totalTasks: 100,
            averageComplexity: 'high',
            estimatedDuration: '20-30 weeks',
            generationTime: 5678
          },
          telemetryData: {
            tokensUsed: 10000,
            provider: 'openai',
            model: 'gpt-4-turbo'
          }
        };
        dependencies.generateTasksFromPrdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(200);

        // Assert
        expect(response.body.data.tasks).toHaveLength(100);
        expect(response.body.data.metadata.totalTasks).toBe(100);
      });

      test('should handle empty response data gracefully', async () => {
        // Arrange
        const requestData = {
          prd_content: samplePRD
        };
        const mockResponse = {
          success: true
          // missing tasks, metadata, telemetryData
        };
        dependencies.generateTasksFromPrdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(200);

        // Assert
        expect(response.body.data.tasks).toEqual([]);
        expect(response.body.data.metadata).toEqual({});
        expect(response.body.data.telemetryData).toEqual({});
      });
    });

    describe('Validation errors', () => {
      test('should reject missing PRD content', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send({})
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid request body'
          }
        });
        expect(dependencies.generateTasksFromPrdDirect).not.toHaveBeenCalled();
      });

      test('should reject empty PRD content', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send({ prd_content: '' })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_INPUT');
      });

      test('should reject invalid target_task_count', async () => {
        const invalidCounts = [0, -1, 101, 1.5, 'ten', null];
        
        for (const target_task_count of invalidCounts) {
          const response = await request(app)
            .post('/api/v1/tasks/generate-from-prd')
            .send({ 
              prd_content: samplePRD,
              target_task_count 
            })
            .expect(400);

          expect(response.body.error.code).toBe('INVALID_INPUT');
        }
      });

      test('should reject invalid use_research_mode', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send({ 
            prd_content: samplePRD,
            use_research_mode: 'yes'
          })
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_INPUT');
      });

      test('should reject non-string PRD content', async () => {
        const invalidContents = [123, { content: 'test' }, ['item1', 'item2'], null];
        
        for (const prd_content of invalidContents) {
          const response = await request(app)
            .post('/api/v1/tasks/generate-from-prd')
            .send({ prd_content })
            .expect(400);

          expect(response.body.error.code).toBe('INVALID_INPUT');
        }
      });
    });

    describe('Error handling', () => {
      test('should handle missing API key error', async () => {
        // Arrange
        const requestData = {
          prd_content: samplePRD
        };
        const mockResponse = {
          success: false,
          error: { code: 'MISSING_API_KEY', message: 'No API key configured' }
        };
        dependencies.generateTasksFromPrdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(401);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'MISSING_API_KEY'
          }
        });
      });

      test('should handle rate limit exceeded error', async () => {
        // Arrange
        const requestData = {
          prd_content: samplePRD
        };
        const mockResponse = {
          success: false,
          error: { code: 'RATE_LIMIT_EXCEEDED', message: 'API rate limit exceeded' }
        };
        dependencies.generateTasksFromPrdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(429);

        // Assert
        expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      });

      test('should handle PRD parse error', async () => {
        // Arrange
        const requestData = {
          prd_content: 'Invalid PRD format!!!'
        };
        const mockResponse = {
          success: false,
          error: { code: 'PRD_PARSE_ERROR', message: 'Cannot parse PRD content' }
        };
        dependencies.generateTasksFromPrdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('PRD_PARSE_ERROR');
      });

      test('should handle general task generation errors', async () => {
        // Arrange
        const requestData = {
          prd_content: samplePRD
        };
        const mockResponse = {
          success: false,
          error: 'AI service temporarily unavailable'
        };
        dependencies.generateTasksFromPrdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('TASK_GENERATION_ERROR');
      });

      test('should handle unexpected exceptions', async () => {
        // Arrange
        const requestData = {
          prd_content: samplePRD
        };
        dependencies.generateTasksFromPrdDirect.mockRejectedValue(new Error('Network timeout'));

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('TASK_GENERATION_ERROR');
        expect(response.body.error.message).toContain('Network timeout');
      });

      test('should handle API key error from exception', async () => {
        // Arrange
        const requestData = {
          prd_content: samplePRD
        };
        dependencies.generateTasksFromPrdDirect.mockRejectedValue(new Error('API key is invalid or missing'));

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(401);

        // Assert
        expect(response.body.error.code).toBe('MISSING_API_KEY');
      });

      test('should handle rate limit error from exception', async () => {
        // Arrange
        const requestData = {
          prd_content: samplePRD
        };
        dependencies.generateTasksFromPrdDirect.mockRejectedValue(new Error('Rate limit exceeded for this endpoint'));

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(429);

        // Assert
        expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      });

      test('should handle PRD parse error from exception', async () => {
        // Arrange
        const requestData = {
          prd_content: samplePRD
        };
        dependencies.generateTasksFromPrdDirect.mockRejectedValue(new Error('PRD_PARSE_ERROR: Invalid format'));

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('PRD_PARSE_ERROR');
      });
    });

    describe('Edge cases and stress testing', () => {
      test('should handle very large PRD content', async () => {
        // Arrange
        const largePRD = 'A'.repeat(50000); // 50KB of content
        const requestData = {
          prd_content: largePRD,
          target_task_count: 50
        };
        const mockResponse = {
          success: true,
          tasks: Array.from({ length: 50 }, (_, i) => ({
            id: `task_${String(i + 1).padStart(3, '0')}`,
            title: `Large PRD Task ${i + 1}`,
            description: 'Generated from large PRD',
            status: 'not-started',
            priority: 'medium'
          })),
          metadata: {
            totalTasks: 50,
            averageComplexity: 'very-high',
            estimatedDuration: '15-20 weeks',
            generationTime: 8000
          },
          telemetryData: {
            tokensUsed: 15000,
            provider: 'anthropic',
            model: 'claude-3-opus'
          }
        };
        dependencies.generateTasksFromPrdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(200);

        // Assert
        expect(response.body.data.tasks).toHaveLength(50);
        expect(response.body.data.metadata.averageComplexity).toBe('very-high');
        expect(response.body.data.telemetryData.tokensUsed).toBeGreaterThan(10000);
      });

      test('should handle PRD with special characters and unicode', async () => {
        // Arrange
        const unicodePRD = `
        # プロジェクト: タスク管理システム 🚀
        
        ## 概要
        Create a system with émojis: 🎯📱💻
        
        ## Features
        - Supports UTF-8: こんにちは, Привет, مرحبا
        - Special chars: @#$%^&*()_+-={}[]|\\:";'<>?,./
        - Math symbols: ∑∆∇∞±≠≤≥∈∉∪∩⊂⊃
        `;
        const requestData = {
          prd_content: unicodePRD
        };
        const mockResponse = {
          success: true,
          tasks: mockTasks.slice(0, 10),
          metadata: {
            totalTasks: 10,
            averageComplexity: 'medium',
            unicodeSupport: true
          },
          telemetryData: {
            tokensUsed: 2000,
            provider: 'anthropic'
          }
        };
        dependencies.generateTasksFromPrdDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/generate-from-prd')
          .send(requestData)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.metadata.unicodeSupport).toBe(true);
      });
    });
  });
});