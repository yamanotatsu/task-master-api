import { z } from 'zod';
import { 
  expandTaskDirect,
  clearSubtasksDirect,
  expandAllTasksDirect
} from '../../mcp-server/src/core/task-master-core.js';
import { logger } from '../utils/logger.js';
import { prepareDirectFunctionArgs, ensureProjectDirectory } from '../utils/direct-function-helpers.js';

// Validation schemas
const expandTaskSchema = z.object({
  numSubtasks: z.number().int().min(1).max(20).optional().default(5),
  useResearch: z.boolean().optional().default(false)
});

// POST /api/v1/tasks/:id/expand - Expand task into subtasks
export async function expandTaskHandler(req, res) {
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
    
    const projectRoot = ensureProjectDirectory();
    
    logger.info(`Expanding task ${taskId} with params:`, {
      taskId,
      numSubtasks: validation.data.numSubtasks,
      useResearch: validation.data.useResearch
    });
    
    const args = prepareDirectFunctionArgs('expandTask', {
      id: taskId,
      numSubtasks: validation.data.numSubtasks,
      research: validation.data.useResearch,
      projectRoot
    });
    
    logger.info(`Prepared args for expandTask:`, args);
    
    // Add session with API keys for Direct Function
    const context = {
      session: {
        env: {
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
          PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
          XAI_API_KEY: process.env.XAI_API_KEY,
          OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY
        }
      }
    };
    
    const result = await expandTaskDirect(args, logger, context);
    
    if (!result.success) {
      const statusCode = (result.error?.message?.includes('not found') || result.error?.code === 'TASK_NOT_FOUND') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? 'TASK_NOT_FOUND' : 'EXPAND_TASK_ERROR',
          message: result.error
        }
      });
    }
    
    const responseTime = Date.now() - req.startTime;
    
    // Update the task in projects/default/tasks.json
    if (result.task) {
      const { updateTasksInProject } = await import('../services/task-updater.js');
      await updateTasksInProject([result.task]);
    }
    
    res.json({
      success: true,
      data: {
        task: result.task,
        subtasksGenerated: result.task?.subtasks?.length || 0,
        message: result.message,
        telemetryData: result.telemetryData
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
export async function clearSubtasksHandler(req, res) {
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
    
    const projectRoot = ensureProjectDirectory();
    const args = prepareDirectFunctionArgs('clearSubtasks', {
      taskId
    });
    const result = await clearSubtasksDirect(args, logger, { session: {} });
    
    if (!result.success) {
      const statusCode = (result.error?.message?.includes('not found') || result.error?.code === 'TASK_NOT_FOUND') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? 'TASK_NOT_FOUND' : 'CLEAR_SUBTASKS_ERROR',
          message: result.error
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
export async function expandAllTasksHandler(req, res) {
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
    
    const projectRoot = ensureProjectDirectory();
    const args = prepareDirectFunctionArgs('expandAllTasks', {
      numSubtasks: validation.data.numSubtasks,
      useResearch: validation.data.useResearch,
      session: {}
    });
    const result = await expandAllTasksDirect(args, logger, { session: {} });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EXPAND_ALL_ERROR',
          message: result.error
        }
      });
    }
    
    const responseTime = Date.now() - req.startTime;
    
    res.json({
      success: true,
      data: {
        tasksExpanded: result.tasksExpanded || 0,
        message: result.message,
        telemetryData: result.telemetryData
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