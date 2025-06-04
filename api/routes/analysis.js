import { z } from 'zod';
import { 
  nextTaskDirect,
  analyzeTaskComplexityDirect,
  complexityReportDirect
} from '../../mcp-server/src/core/task-master-core.js';
import { logger } from '../utils/logger.js';
import { prepareDirectFunctionArgs, ensureProjectDirectory } from '../utils/direct-function-helpers.js';

// Validation schemas
const analyzeComplexitySchema = z.object({
  taskId: z.number().int().positive()
});

// GET /api/v1/tasks/next - Get next recommended task
export async function getNextTaskHandler(req, res) {
  try {
    const projectRoot = ensureProjectDirectory();
    const args = prepareDirectFunctionArgs('nextTask', {});
    const result = await nextTaskDirect(args, logger, { session: {} });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NEXT_TASK_ERROR',
          message: result.error
        }
      });
    }
    
    if (!result.task) {
      return res.json({
        success: true,
        data: {
          task: null,
          message: 'No pending tasks found',
          recommendation: result.recommendation
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
export async function analyzeTaskComplexityHandler(req, res) {
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
    
    const projectRoot = ensureProjectDirectory();
    const args = prepareDirectFunctionArgs('analyzeTaskComplexity', {
      taskId: validation.data.taskId,
      session: {}
    });
    const result = await analyzeTaskComplexityDirect(args, logger, { session: {} });
    
    if (!result.success) {
      const statusCode = (result.error?.message?.includes('not found') || result.error?.code === 'TASK_NOT_FOUND') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? 'TASK_NOT_FOUND' : 'ANALYZE_COMPLEXITY_ERROR',
          message: result.error
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        taskId: validation.data.taskId,
        complexity: result.complexity || result.data?.fullReport?.complexityAnalysis?.[0]?.complexityScore,
        factors: result.factors || result.data?.fullReport?.complexityAnalysis?.[0]?.factors,
        recommendations: result.recommendations || result.data?.fullReport?.recommendations,
        reportPath: result.data?.reportPath,
        reportSummary: result.data?.reportSummary,
        telemetryData: result.telemetryData || result.data?.telemetryData
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
export async function getComplexityReportHandler(req, res) {
  try {
    const projectRoot = ensureProjectDirectory();
    const args = prepareDirectFunctionArgs('complexityReport', {});
    const result = await complexityReportDirect(args, logger, { session: {} });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'COMPLEXITY_REPORT_ERROR',
          message: result.error
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        report: result.report,
        summary: result.summary,
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