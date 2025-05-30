import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { 
  listTasksDirect,
  showTaskDirect,
  addTaskDirect,
  updateTaskByIdDirect,
  removeTaskDirect,
  setTaskStatusDirect
} from '../../mcp-server/src/core/task-master-core.js';
import { logger } from '../utils/logger.js';
import { 
  prepareDirectFunctionArgs, 
  ensureProjectDirectory,
  getTasksJsonPath
} from '../utils/direct-function-helpers.js';
import { updateTaskSimple, updateTaskStatus } from '../services/task-updater.js';

// Validation schemas
const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  dependencies: z.array(z.number()).optional().default([]),
  details: z.string().optional(),
  testStrategy: z.string().optional()
});

const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  dependencies: z.array(z.number()).optional(),
  details: z.string().optional(),
  testStrategy: z.string().optional()
});

const statusUpdateSchema = z.object({
  status: z.enum(['pending', 'in-progress', 'completed', 'blocked'])
});


// GET /api/v1/tasks - List all tasks
export async function listTasksHandler(req, res) {
  try {
    ensureProjectDirectory();
    const { filter, format = 'json' } = req.query;
    
    const args = prepareDirectFunctionArgs('listTasks', { filter, format });
    const result = await listTasksDirect(args, logger, { session: {} });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'LIST_TASKS_ERROR',
          message: result.error
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        tasks: result.data?.tasks || [],
        totalTasks: result.data?.tasks?.length || 0,
        filteredBy: filter || 'all'
      }
    });
    
  } catch (error) {
    console.error('Error listing tasks:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to list tasks'
      }
    });
  }
}

// GET /api/v1/tasks/:id - Get specific task
export async function getTaskHandler(req, res) {
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
    const args = prepareDirectFunctionArgs('showTask', { taskId });
    const result = await showTaskDirect(args, logger, { session: {} });
    
    if (!result.success) {
      const statusCode = (result.error?.message?.includes('not found') || result.error?.code === 'TASK_NOT_FOUND') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? 'TASK_NOT_FOUND' : 'GET_TASK_ERROR',
          message: result.error
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        task: result.task
      }
    });
    
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get task'
      }
    });
  }
}

// POST /api/v1/tasks - Create new task
export async function createTaskHandler(req, res) {
  try {
    const validation = taskCreateSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid task data',
          details: validation.error.errors
        }
      });
    }
    
    ensureProjectDirectory();
    const args = prepareDirectFunctionArgs('addTask', validation.data);
    const result = await addTaskDirect(args, logger, { session: {} });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_TASK_ERROR',
          message: result.error
        }
      });
    }
    
    res.status(201).json({
      success: true,
      data: {
        task: result.task,
        message: result.message
      }
    });
    
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create task'
      }
    });
  }
}

// PUT /api/v1/tasks/:id - Update task
export async function updateTaskHandler(req, res) {
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
    
    const validation = taskUpdateSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid update data',
          details: validation.error.errors
        }
      });
    }
    
    ensureProjectDirectory();
    const tasksJsonPath = getTasksJsonPath();
    
    // Use simple update for API
    const result = updateTaskSimple(tasksJsonPath, taskId, validation.data);
    
    if (!result.success) {
      const statusCode = (result.error?.message?.includes('not found') || result.error?.code === 'TASK_NOT_FOUND') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? 'TASK_NOT_FOUND' : 'UPDATE_TASK_ERROR',
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
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update task'
      }
    });
  }
}

// DELETE /api/v1/tasks/:id - Delete task
export async function deleteTaskHandler(req, res) {
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
    const args = prepareDirectFunctionArgs('removeTask', { taskId });
    const result = await removeTaskDirect(args, logger, { session: {} });
    
    if (!result.success) {
      const statusCode = (result.error?.message?.includes('not found') || result.error?.code === 'TASK_NOT_FOUND') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? 'TASK_NOT_FOUND' : 'DELETE_TASK_ERROR',
          message: result.error
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        message: result.message,
        removedTask: result.removedTask
      }
    });
    
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete task'
      }
    });
  }
}

// PATCH /api/v1/tasks/:id/status - Update task status
export async function updateTaskStatusHandler(req, res) {
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
    
    const validation = statusUpdateSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid status',
          details: validation.error.errors
        }
      });
    }
    
    ensureProjectDirectory();
    const tasksJsonPath = getTasksJsonPath();
    
    // Use simple status update for API
    const result = updateTaskStatus(tasksJsonPath, taskId, validation.data.status);
    
    if (!result.success) {
      const statusCode = (result.error?.message?.includes('not found') || result.error?.code === 'TASK_NOT_FOUND') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? 'TASK_NOT_FOUND' : 'UPDATE_STATUS_ERROR',
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
    console.error('Error updating task status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update task status'
      }
    });
  }
}