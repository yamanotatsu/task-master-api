import { z } from 'zod';

// Validation schemas
const expandTaskSchema = z.object({
  numSubtasks: z.number().int().min(1).max(20).optional().default(5),
  useResearch: z.boolean().optional().default(false)
});

/**
 * Create task expansion handlers with dependency injection
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Task expansion handlers
 */
export function createTaskExpansionHandlers(dependencies) {
  const {
    expandTaskDirect,
    clearSubtasksDirect,
    expandAllTasksDirect,
    prepareDirectFunctionArgs,
    ensureProjectDirectory,
    logger
  } = dependencies;

  // POST /api/v1/tasks/:id/expand - Expand task into subtasks
  async function expandTaskHandler(req, res) {
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
      
      const validation = expandTaskSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid expansion parameters',
            details: validation.error.errors
          }
        });
      }
      
      ensureProjectDirectory();
      
      const args = prepareDirectFunctionArgs('expandTask', {
        id: taskId,
        numSubtasks: validation.data.numSubtasks,
        research: validation.data.useResearch
      });
      
      const result = await expandTaskDirect(args, logger, { session: {} });
      
      if (!result.success) {
        let statusCode = 400;
        let errorCode = 'EXPAND_TASK_ERROR';
        let message = result.error;

        // Handle error objects vs error strings
        if (typeof result.error === 'object' && result.error !== null) {
          if (result.error.code === 'TASK_NOT_FOUND') {
            statusCode = 404;
            errorCode = 'TASK_NOT_FOUND';
          } else if (result.error.code === 'MISSING_API_KEY') {
            statusCode = 401;
            errorCode = 'MISSING_API_KEY';
          } else if (result.error.code === 'RATE_LIMIT_EXCEEDED') {
            statusCode = 429;
            errorCode = 'RATE_LIMIT_EXCEEDED';
          }
          message = result.error.message || result.error.code || 'Task expansion failed';
        } else if (typeof result.error === 'string') {
          if (result.error.includes('not found')) {
            statusCode = 404;
            errorCode = 'TASK_NOT_FOUND';
          } else if (result.error.includes('API key')) {
            statusCode = 401;
            errorCode = 'MISSING_API_KEY';
          } else if (result.error.includes('rate limit')) {
            statusCode = 429;
            errorCode = 'RATE_LIMIT_EXCEEDED';
          }
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
          task: result.task,
          subtasksGenerated: result.task?.subtasks?.length || 0,
          message: result.message,
          telemetryData: result.telemetryData || {}
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to expand task'
        }
      });
    }
  }

  // DELETE /api/v1/tasks/:id/subtasks - Clear all subtasks
  async function clearSubtasksHandler(req, res) {
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
      
      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('clearSubtasks', {
        taskId
      });
      const result = await clearSubtasksDirect(args, logger, { session: {} });
      
      if (!result.success) {
        let statusCode = 400;
        let errorCode = 'CLEAR_SUBTASKS_ERROR';
        let message = result.error;

        // Handle error objects vs error strings
        if (typeof result.error === 'object' && result.error !== null) {
          if (result.error.code === 'TASK_NOT_FOUND') {
            statusCode = 404;
            errorCode = 'TASK_NOT_FOUND';
          }
          message = result.error.message || result.error.code || 'Clear subtasks failed';
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
          task: result.task,
          message: result.message
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clear subtasks'
        }
      });
    }
  }

  // POST /api/v1/tasks/expand-all - Expand all pending tasks
  async function expandAllTasksHandler(req, res) {
    try {
      const validation = expandTaskSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid expansion parameters',
            details: validation.error.errors
          }
        });
      }
      
      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('expandAllTasks', {
        numSubtasks: validation.data.numSubtasks,
        useResearch: validation.data.useResearch
      });
      const result = await expandAllTasksDirect(args, logger, { session: {} });
      
      if (!result.success) {
        let message = result.error;
        if (typeof result.error === 'object' && result.error !== null) {
          message = result.error.message || result.error.code || 'Expand all tasks failed';
        }

        return res.status(400).json({
          success: false,
          error: {
            code: 'EXPAND_ALL_ERROR',
            message: message
          }
        });
      }
      
      res.json({
        success: true,
        data: {
          tasksExpanded: result.tasksExpanded || 0,
          message: result.message,
          telemetryData: result.telemetryData || {}
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to expand all tasks'
        }
      });
    }
  }

  return {
    expandTaskHandler,
    clearSubtasksHandler,
    expandAllTasksHandler
  };
}