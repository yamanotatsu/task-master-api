/**
 * Analysis API Tests with Dependency Injection
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createAnalysisHandlers } from '../../../api/routes/analysis-di.js';
import { createTestDependencies } from '../../../api/utils/dependency-factory.js';
import { mockTasks, mockComplexityAnalysis, mockComplexityReport } from '../fixtures/api-test-data.js';

// Test App Factory for Analysis
function createTestApp(dependencies) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  const analysisHandlers = createAnalysisHandlers(dependencies);
  
  // Mount analysis routes
  app.post('/api/v1/tasks/:id/analyze', analysisHandlers.analyzeTaskComplexityHandler);
  app.get('/api/v1/analytics/complexity-report', analysisHandlers.getComplexityReportHandler);
  
  return app;
}

describe('Analysis API Tests', () => {
  let dependencies;
  let app;
  
  beforeEach(() => {
    dependencies = createTestDependencies({}, jest);
    app = createTestApp(dependencies);
  });
  
  describe('POST /api/v1/tasks/:id/analyze', () => {
    describe('Success cases', () => {
      test('should analyze task complexity successfully', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          analysis: {
            ...mockComplexityAnalysis,
            taskId: 'task_001',
            complexity: {
              score: 75,
              level: 'high',
              factors: {
                dependencies: 30,
                subtasks: 20,
                technical: 15,
                integration: 10
              }
            },
            recommendations: [
              'Consider breaking down into smaller tasks',
              'Add more detailed acceptance criteria',
              'Identify potential technical risks early'
            ],
            estimatedEffort: {
              hours: 40,
              confidence: 0.7,
              range: { min: 32, max: 48 }
            }
          },
          telemetryData: {
            tokensUsed: 800,
            provider: 'anthropic',
            model: 'claude-3-sonnet',
            analysisTime: 1250
          }
        };
        dependencies.analyzeTaskComplexityDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/analyze')
          .send({})
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            analysis: expect.objectContaining({
              taskId: 'task_001',
              complexity: expect.objectContaining({
                score: 75,
                level: 'high'
              }),
              recommendations: expect.arrayContaining([
                expect.stringContaining('breaking down')
              ]),
              estimatedEffort: expect.objectContaining({
                hours: 40,
                confidence: 0.7
              })
            }),
            telemetryData: expect.objectContaining({
              tokensUsed: 800,
              analysisTime: 1250
            })
          }
        });
        
        expect(dependencies.ensureProjectDirectory).toHaveBeenCalled();
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'analyzeTaskComplexity',
          expect.objectContaining({
            taskId: 1
          })
        );
        expect(dependencies.analyzeTaskComplexityDirect).toHaveBeenCalledWith(
          expect.any(Object),
          dependencies.logger,
          { session: {} }
        );
      });

      test('should analyze task with additional parameters', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          analysis: {
            ...mockComplexityAnalysis,
            taskId: 'task_002',
            complexity: {
              score: 90,
              level: 'very-high',
              factors: {
                dependencies: 40,
                subtasks: 35,
                technical: 10,
                integration: 5
              }
            },
            subtaskAnalysis: [
              {
                id: 'sub_002_1',
                complexity: { score: 60, level: 'medium' },
                estimatedHours: 8
              },
              {
                id: 'sub_002_2', 
                complexity: { score: 70, level: 'high' },
                estimatedHours: 16
              }
            ],
            dependencyImpact: {
              criticalPath: true,
              blockingRisk: 'high',
              parallelizationOpportunities: ['sub_002_1', 'sub_002_3']
            }
          },
          telemetryData: {
            tokensUsed: 1500,
            provider: 'openai',
            model: 'gpt-4',
            analysisTime: 2340
          }
        };
        dependencies.analyzeTaskComplexityDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/2/analyze?includeSubtasks=true&analyzeDependencies=true&detailLevel=comprehensive')
          .send({})
          .expect(200);

        // Assert
        expect(response.body.data.analysis.subtaskAnalysis).toBeDefined();
        expect(response.body.data.analysis.dependencyImpact).toBeDefined();
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'analyzeTaskComplexity',
          expect.objectContaining({
            taskId: 2,
            includeSubtasks: true,
            analyzeDependencies: true,
            detailLevel: 'comprehensive'
          })
        );
      });

      test('should handle simple task analysis', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          analysis: {
            taskId: 'task_005',
            complexity: {
              score: 25,
              level: 'low',
              factors: {
                dependencies: 0,
                subtasks: 5,
                technical: 15,
                integration: 5
              }
            },
            recommendations: [
              'Task is straightforward and can be completed quickly',
              'Consider adding automated tests',
              'Good candidate for junior developer'
            ],
            estimatedEffort: {
              hours: 4,
              confidence: 0.9,
              range: { min: 3, max: 6 }
            }
          },
          telemetryData: {
            tokensUsed: 300,
            provider: 'anthropic',
            model: 'claude-3-haiku',
            analysisTime: 650
          }
        };
        dependencies.analyzeTaskComplexityDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/5/analyze')
          .send({})
          .expect(200);

        // Assert
        expect(response.body.data.analysis.complexity.level).toBe('low');
        expect(response.body.data.analysis.estimatedEffort.hours).toBe(4);
        expect(response.body.data.telemetryData.tokensUsed).toBe(300);
      });

      test('should handle task with no additional data', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          analysis: {
            taskId: 'task_003',
            complexity: {
              score: 50,
              level: 'medium',
              factors: {
                dependencies: 15,
                subtasks: 10,
                technical: 20,
                integration: 5
              }
            },
            recommendations: [
              'Standard complexity task',
              'Ensure proper testing coverage'
            ],
            estimatedEffort: {
              hours: 16,
              confidence: 0.8,
              range: { min: 12, max: 24 }
            }
          }
          // No telemetryData provided
        };
        dependencies.analyzeTaskComplexityDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/3/analyze')
          .send({})
          .expect(200);

        // Assert
        expect(response.body.data.analysis.complexity.level).toBe('medium');
        expect(response.body.data.telemetryData).toEqual({});
      });
    });

    describe('Validation errors', () => {
      test('should reject invalid task ID', async () => {
        // Act
        const response = await request(app)
          .post('/api/v1/tasks/abc/analyze')
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
        expect(dependencies.analyzeTaskComplexityDirect).not.toHaveBeenCalled();
      });

      test('should handle query parameters gracefully', async () => {
        // Arrange - Query params are treated as strings and converted
        const mockResponse = {
          success: true,
          analysis: mockComplexityAnalysis
        };
        dependencies.analyzeTaskComplexityDirect.mockResolvedValue(mockResponse);

        // Test various query parameter formats
        const queryParams = [
          'includeSubtasks=yes', // Will be treated as string, not boolean
          'analyzeDependencies=1', // Will be treated as string
          'detailLevel=detailed', // Valid string
        ];

        for (const params of queryParams) {
          const response = await request(app)
            .post(`/api/v1/tasks/1/analyze?${params}`)
            .send({})
            .expect(200);

          expect(response.body.success).toBe(true);
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
        dependencies.analyzeTaskComplexityDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/999/analyze')
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

      test('should handle AI service errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'AI_SERVICE_ERROR', message: 'Analysis service temporarily unavailable' }
        };
        dependencies.analyzeTaskComplexityDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/analyze')
          .send({})
          .expect(503);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'AI_SERVICE_ERROR'
          }
        });
      });

      test('should handle analysis errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Task content insufficient for analysis'
        };
        dependencies.analyzeTaskComplexityDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/analyze')
          .send({})
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('ANALYSIS_ERROR');
      });

      test('should handle unexpected exceptions', async () => {
        // Arrange
        dependencies.analyzeTaskComplexityDirect.mockRejectedValue(new Error('Network timeout'));

        // Act
        const response = await request(app)
          .post('/api/v1/tasks/1/analyze')
          .send({})
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });
  });

  describe('GET /api/v1/analytics/complexity-report', () => {
    describe('Success cases', () => {
      test('should generate complexity report for all tasks', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          report: {
            ...mockComplexityReport,
            generatedAt: new Date().toISOString(),
            projectSummary: {
              totalTasks: 25,
              analyzedTasks: 20,
              averageComplexity: 55.5,
              totalEstimatedHours: 320,
              criticalPathTasks: ['task_001', 'task_003', 'task_007'],
              highRiskTasks: ['task_003', 'task_008']
            },
            complexityDistribution: {
              low: { count: 8, percentage: 40 },
              medium: { count: 7, percentage: 35 },
              high: { count: 4, percentage: 20 },
              'very-high': { count: 1, percentage: 5 }
            },
            recommendations: [
              'Focus on breaking down high complexity tasks',
              'Consider parallel development opportunities',
              'Add more detailed requirements for unclear tasks',
              'Allocate senior developers to critical path items'
            ],
            riskAssessment: {
              overallRisk: 'medium',
              factors: [
                { type: 'dependency_complexity', level: 'high', impact: 'schedule_risk' },
                { type: 'technical_debt', level: 'medium', impact: 'quality_risk' },
                { type: 'resource_availability', level: 'low', impact: 'delivery_risk' }
              ]
            }
          },
          telemetryData: {
            totalTokensUsed: 5000,
            averageTokensPerTask: 250,
            totalAnalysisTime: 15000,
            provider: 'anthropic',
            model: 'claude-3-sonnet'
          }
        };
        dependencies.complexityReportDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/analytics/complexity-report')
          .expect(200);

        // Assert
        expect(response.body).toMatchObject({
          success: true,
          data: {
            report: expect.objectContaining({
              projectSummary: expect.objectContaining({
                totalTasks: 25,
                analyzedTasks: 20,
                averageComplexity: 55.5
              }),
              complexityDistribution: expect.objectContaining({
                low: expect.objectContaining({ count: 8, percentage: 40 }),
                high: expect.objectContaining({ count: 4, percentage: 20 })
              }),
              recommendations: expect.arrayContaining([
                expect.stringContaining('breaking down')
              ]),
              riskAssessment: expect.objectContaining({
                overallRisk: 'medium'
              })
            }),
            telemetryData: expect.objectContaining({
              totalTokensUsed: 5000,
              totalAnalysisTime: 15000
            })
          }
        });
        
        expect(dependencies.ensureProjectDirectory).toHaveBeenCalled();
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'complexityReport',
          expect.objectContaining({
            includeRecommendations: true,
            includeRiskAssessment: true
          })
        );
      });

      test('should generate report with custom parameters', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          report: {
            generatedAt: new Date().toISOString(),
            projectSummary: {
              totalTasks: 10,
              analyzedTasks: 10,
              averageComplexity: 45.0,
              totalEstimatedHours: 120
            },
            complexityDistribution: {
              low: { count: 4, percentage: 40 },
              medium: { count: 4, percentage: 40 },
              high: { count: 2, percentage: 20 },
              'very-high': { count: 0, percentage: 0 }
            },
            filteredBy: {
              status: 'pending',
              priority: 'high'
            }
          },
          telemetryData: {
            totalTokensUsed: 2000,
            totalAnalysisTime: 8000
          }
        };
        dependencies.complexityReportDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/analytics/complexity-report?status=pending&priority=high&includeRecommendations=false')
          .expect(200);

        // Assert
        expect(response.body.data.report.filteredBy).toEqual({
          status: 'pending',
          priority: 'high'
        });
        expect(dependencies.prepareDirectFunctionArgs).toHaveBeenCalledWith(
          'complexityReport',
          expect.objectContaining({
            status: 'pending',
            priority: 'high',
            includeRecommendations: false
          })
        );
      });

      test('should handle empty project report', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          report: {
            generatedAt: new Date().toISOString(),
            projectSummary: {
              totalTasks: 0,
              analyzedTasks: 0,
              averageComplexity: 0,
              totalEstimatedHours: 0
            },
            complexityDistribution: {
              low: { count: 0, percentage: 0 },
              medium: { count: 0, percentage: 0 },
              high: { count: 0, percentage: 0 },
              'very-high': { count: 0, percentage: 0 }
            },
            recommendations: [
              'No tasks found for analysis',
              'Consider adding tasks to the project'
            ]
          },
          telemetryData: {
            totalTokensUsed: 0,
            totalAnalysisTime: 100
          }
        };
        dependencies.complexityReportDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/analytics/complexity-report')
          .expect(200);

        // Assert
        expect(response.body.data.report.projectSummary.totalTasks).toBe(0);
        expect(response.body.data.report.recommendations).toContain('No tasks found for analysis');
      });

      test('should handle missing optional data gracefully', async () => {
        // Arrange
        const mockResponse = {
          success: true,
          report: {
            projectSummary: {
              totalTasks: 5,
              analyzedTasks: 5,
              averageComplexity: 50
            },
            complexityDistribution: {
              medium: { count: 5, percentage: 100 }
            }
            // Missing recommendations, riskAssessment, telemetryData
          }
        };
        dependencies.complexityReportDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/analytics/complexity-report')
          .expect(200);

        // Assert
        expect(response.body.data.report.projectSummary.totalTasks).toBe(5);
        expect(response.body.data.recommendations).toEqual([]);
        expect(response.body.data.riskAssessment).toEqual({});
        expect(response.body.data.telemetryData).toEqual({});
      });
    });

    describe('Error handling', () => {
      test('should handle report generation errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'REPORT_GENERATION_ERROR', message: 'Unable to generate complexity report' }
        };
        dependencies.complexityReportDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/analytics/complexity-report')
          .expect(500);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'REPORT_GENERATION_ERROR'
          }
        });
      });

      test('should handle AI service unavailable', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: { code: 'AI_SERVICE_UNAVAILABLE', message: 'Analysis service is currently unavailable' }
        };
        dependencies.complexityReportDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/analytics/complexity-report')
          .expect(503);

        // Assert
        expect(response.body.error.code).toBe('AI_SERVICE_UNAVAILABLE');
      });

      test('should handle insufficient data errors', async () => {
        // Arrange
        const mockResponse = {
          success: false,
          error: 'Insufficient task data for meaningful analysis'
        };
        dependencies.complexityReportDirect.mockResolvedValue(mockResponse);

        // Act
        const response = await request(app)
          .get('/api/v1/analytics/complexity-report')
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('COMPLEXITY_REPORT_ERROR');
      });

      test('should handle unexpected exceptions', async () => {
        // Arrange
        dependencies.complexityReportDirect.mockRejectedValue(new Error('Database connection failed'));

        // Act
        const response = await request(app)
          .get('/api/v1/analytics/complexity-report')
          .expect(500);

        // Assert
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      });
    });

    describe('Query parameter validation', () => {
      test('should validate status filter', async () => {
        // Act
        const response = await request(app)
          .get('/api/v1/analytics/complexity-report?status=invalid-status')
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INVALID_QUERY_PARAMS',
            message: 'Invalid query parameters'
          }
        });
      });

      test('should validate priority filter', async () => {
        // Act
        const response = await request(app)
          .get('/api/v1/analytics/complexity-report?priority=invalid-priority')
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe('INVALID_QUERY_PARAMS');
      });

      test('should validate boolean parameters', async () => {
        const invalidBooleans = ['yes', 'no', '1', '0', 'invalid'];
        
        for (const value of invalidBooleans) {
          const response = await request(app)
            .get(`/api/v1/analytics/complexity-report?includeRecommendations=${value}`)
            .expect(400);

          expect(response.body.error.code).toBe('INVALID_QUERY_PARAMS');
        }
      });
    });
  });
});