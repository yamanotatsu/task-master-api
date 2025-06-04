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

  // POST /api/v1/tasks/analyze-complexity - Analyze task complexity
  async function analyzeTaskComplexityHandler(req, res) {
    try {
      const validation = analyzeComplexitySchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid task ID',
            details: validation.error.errors
          }
        });
      }
      
      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('analyzeTaskComplexity', {
        taskId: validation.data.taskId
      });
      const result = await analyzeTaskComplexityDirect(args, logger, { session: {} });
      
      if (!result.success) {
        let statusCode = 400;
        let errorCode = 'ANALYZE_COMPLEXITY_ERROR';
        let message = result.error;

        // Handle error objects vs error strings
        if (typeof result.error === 'object' && result.error !== null) {
          if (result.error.code === 'TASK_NOT_FOUND') {
            statusCode = 404;
            errorCode = 'TASK_NOT_FOUND';
          } else if (result.error.code === 'MISSING_API_KEY') {
            statusCode = 401;
            errorCode = 'MISSING_API_KEY';
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
          taskId: validation.data.taskId,
          complexity: result.complexity,
          factors: result.factors || [],
          recommendations: result.recommendations || [],
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

  // GET /api/v1/tasks/complexity-report - Get complexity report for all tasks
  async function getComplexityReportHandler(req, res) {
    try {
      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('complexityReport', {});
      const result = await complexityReportDirect(args, logger, { session: {} });
      
      if (!result.success) {
        let message = result.error;
        if (typeof result.error === 'object' && result.error !== null) {
          message = result.error.message || result.error.code || 'Complexity report failed';
        }

        return res.status(400).json({
          success: false,
          error: {
            code: 'COMPLEXITY_REPORT_ERROR',
            message: message
          }
        });
      }
      
      res.json({
        success: true,
        data: {
          report: result.report || {},
          summary: result.summary || {},
          highComplexityTasks: result.highComplexityTasks || [],
          recommendations: result.recommendations || []
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