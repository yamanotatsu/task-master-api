import { z } from 'zod';

// Validation schemas
const analyzeComplexitySchema = z.object({
  taskId: z.number().int().positive()
});

/**
 * Create analysis handlers with dependency injection
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Analysis handlers
 */
export function createAnalysisHandlers(dependencies) {
  const {
    nextTaskDirect,
    analyzeTaskComplexityDirect,
    complexityReportDirect,
    prepareDirectFunctionArgs,
    ensureProjectDirectory,
    logger
  } = dependencies;

  // GET /api/v1/tasks/next - Get next recommended task
  async function getNextTaskHandler(req, res) {
    try {
      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('nextTask', {});
      const result = await nextTaskDirect(args, logger, { session: {} });
      
      if (!result.success) {
        let message = result.error;
        if (typeof result.error === 'object' && result.error !== null) {
          message = result.error.message || result.error.code || 'Failed to get next task';
        }

        return res.status(400).json({
          success: false,
          error: {
            code: 'NEXT_TASK_ERROR',
            message: message
          }
        });
      }
      
      if (!result.task) {
        return res.json({
          success: true,
          data: {
            task: null,
            message: 'No pending tasks found',
            recommendation: result.recommendation || 'All tasks completed or no tasks available'
          }
        });
      }
      
      res.json({
        success: true,
        data: {
          task: result.task,
          recommendation: result.recommendation,
          reasoning: result.reasoning
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get next task'
        }
      });
    }
  }

  // POST /api/v1/tasks/:id/analyze - Analyze task complexity
  async function analyzeTaskComplexityHandler(req, res) {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TASK_ID',
            message: 'Task ID must be a number'
          }
        });
      }

      // Parse query parameters
      const { includeSubtasks, analyzeDependencies, detailLevel } = req.query;
      
      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('analyzeTaskComplexity', {
        taskId,
        ...(includeSubtasks && { includeSubtasks: includeSubtasks === 'true' }),
        ...(analyzeDependencies && { analyzeDependencies: analyzeDependencies === 'true' }),
        ...(detailLevel && { detailLevel })
      });
      
      const result = await analyzeTaskComplexityDirect(args, logger, { session: {} });
      
      if (!result.success) {
        let statusCode = 400;
        let errorCode = 'ANALYSIS_ERROR';
        let message = result.error;

        // Handle error objects vs error strings
        if (typeof result.error === 'object' && result.error !== null) {
          if (result.error.code === 'TASK_NOT_FOUND') {
            statusCode = 404;
            errorCode = 'TASK_NOT_FOUND';
          } else if (result.error.code === 'AI_SERVICE_ERROR') {
            statusCode = 503;
            errorCode = 'AI_SERVICE_ERROR';
          }
          message = result.error.message || result.error.code || 'Complexity analysis failed';
        } else if (typeof result.error === 'string' && result.error.includes('not found')) {
          statusCode = 404;
          errorCode = 'TASK_NOT_FOUND';
        }

        return res.status(statusCode).json({
          success: false,
          error: {
            code: errorCode,
            message: message
          }
        });
      }
      
      res.json({
        success: true,
        data: {
          analysis: result.analysis || result,
          telemetryData: result.telemetryData || {}
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to analyze task complexity'
        }
      });
    }
  }

  // GET /api/v1/analytics/complexity-report - Get complexity report for all tasks
  async function getComplexityReportHandler(req, res) {
    try {
      // Validate query parameters
      const { status, priority, includeRecommendations, includeRiskAssessment } = req.query;
      
      // Validate status parameter
      if (status && !['pending', 'in-progress', 'completed', 'blocked'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUERY_PARAMS',
            message: 'Invalid query parameters'
          }
        });
      }
      
      // Validate priority parameter
      if (priority && !['low', 'medium', 'high', 'critical'].includes(priority)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUERY_PARAMS',
            message: 'Invalid query parameters'
          }
        });
      }
      
      // Validate boolean parameters
      if (includeRecommendations !== undefined && 
          includeRecommendations !== 'true' && 
          includeRecommendations !== 'false') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUERY_PARAMS',
            message: 'Invalid query parameters'
          }
        });
      }
      
      if (includeRiskAssessment !== undefined && 
          includeRiskAssessment !== 'true' && 
          includeRiskAssessment !== 'false') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUERY_PARAMS',
            message: 'Invalid query parameters'
          }
        });
      }
      
      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('complexityReport', {
        ...(status && { status }),
        ...(priority && { priority }),
        includeRecommendations: includeRecommendations !== 'false',
        includeRiskAssessment: includeRiskAssessment !== 'false'
      });
      
      const result = await complexityReportDirect(args, logger, { session: {} });
      
      if (!result.success) {
        let statusCode = 500;
        let errorCode = 'REPORT_GENERATION_ERROR';
        let message = result.error;

        if (typeof result.error === 'object' && result.error !== null) {
          if (result.error.code === 'AI_SERVICE_UNAVAILABLE') {
            statusCode = 503;
            errorCode = 'AI_SERVICE_UNAVAILABLE';
          }
          message = result.error.message || result.error.code || 'Complexity report failed';
        } else if (typeof result.error === 'string' && result.error.includes('Insufficient')) {
          statusCode = 400;
          errorCode = 'COMPLEXITY_REPORT_ERROR';
        }

        return res.status(statusCode).json({
          success: false,
          error: {
            code: errorCode,
            message: message
          }
        });
      }
      
      res.json({
        success: true,
        data: {
          report: result.report || {},
          recommendations: result.report?.recommendations || [],
          riskAssessment: result.report?.riskAssessment || {},
          telemetryData: result.telemetryData || {}
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate complexity report'
        }
      });
    }
  }

  return {
    getNextTaskHandler,
    analyzeTaskComplexityHandler,
    getComplexityReportHandler
  };
}