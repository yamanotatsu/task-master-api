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
import { updateTasksInProject, getTaskById, deleteTaskById } from '../services/task-updater.js';

// Validation schemas
const taskCreateSchema = z.object({
  // For manual creation
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  dependencies: z.array(z.number()).optional().default([]),
  details: z.string().optional(),
  testStrategy: z.string().optional(),
  // For AI-driven creation
  prompt: z.string().optional(),
  research: z.boolean().optional().default(false)
}).refine(
  data => data.prompt || (data.title && data.description),
  {
    message: 'Either prompt or both title and description are required',
    path: ['prompt']
  }
);

const taskUpdateSchema = z.object({
  // For manual updates
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  dependencies: z.array(z.number()).optional(),
  details: z.string().optional(),
  testStrategy: z.string().optional(),
  // For AI-driven updates
  prompt: z.string().optional(),
  research: z.boolean().optional().default(false)
});

const statusUpdateSchema = z.object({
  status: z.enum(['pending', 'done', 'in-progress', 'review', 'deferred', 'cancelled'])
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
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: result.error || `Task ${taskId} not found`
        }
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get task'
      }
    });
  }
}

// POST /api/v1/tasks - Create a new task
export async function createTaskHandler(req, res) {
  try {
    const parseResult = taskCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid task data',
          details: parseResult.error.errors
        }
      });
    }
    
    ensureProjectDirectory();
    
    const data = parseResult.data;
    let args;
    
    // Check if this is AI-driven creation (has prompt) or manual creation
    if (data.prompt) {
      // AI-driven creation
      args = prepareDirectFunctionArgs('addTask', {
        prompt: data.prompt,
        research: data.research,
        dependencies: data.dependencies?.join(',') || '',
        priority: data.priority
      });
    } else {
      // Manual creation
      args = prepareDirectFunctionArgs('addTask', {
        title: data.title,
        description: data.description,
        details: data.details,
        testStrategy: data.testStrategy,
        dependencies: data.dependencies?.join(',') || '',
        priority: data.priority
      });
    }
    
    const result = await addTaskDirect(args, logger, { session: {} });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CREATE_TASK_ERROR',
          message: result.error?.message || result.error || 'Failed to create task'
        }
      });
    }
    
    res.status(201).json({
      success: true,
      data: result.data,
      message: 'Task created successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create task'
      }
    });
  }
}

// PUT /api/v1/tasks/:id - Update a task
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
    
    const parseResult = taskUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data',
          details: parseResult.error.errors
        }
      });
    }
    
    ensureProjectDirectory();
    
    const data = parseResult.data;
    let args;
    
    // Check if this is AI-driven update (has prompt) or manual update
    if (data.prompt) {
      // AI-driven update using updateTaskById
      args = prepareDirectFunctionArgs('updateTaskById', {
        taskId,
        prompt: data.prompt,
        research: data.research
      });
    } else {
      // Manual update - only update fields that were provided
      const updates = {};
      if (data.title !== undefined) updates.title = data.title;
      if (data.description !== undefined) updates.description = data.description;
      if (data.priority !== undefined) updates.priority = data.priority;
      if (data.dependencies !== undefined) updates.dependencies = data.dependencies;
      if (data.details !== undefined) updates.details = data.details;
      if (data.testStrategy !== undefined) updates.testStrategy = data.testStrategy;
      
      args = prepareDirectFunctionArgs('updateTaskById', {
        taskId,
        updates
      });
    }
    
    const result = await updateTaskByIdDirect(args, logger, { session: {} });
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'UPDATE_TASK_ERROR',
          message: result.error?.message || result.error || `Failed to update task ${taskId}`
        }
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      message: 'Task updated successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update task'
      }
    });
  }
}

// DELETE /api/v1/tasks/:id - Delete a task
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
      return res.status(404).json({
        success: false,
        error: {
          code: 'DELETE_TASK_ERROR',
          message: result.error || `Failed to delete task ${taskId}`
        }
      });
    }
    
    res.json({
      success: true,
      message: `Task ${taskId} deleted successfully`
    });
    
  } catch (error) {
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
    
    const parseResult = statusUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status data',
          details: parseResult.error.errors
        }
      });
    }
    
    ensureProjectDirectory();
    
    const { status } = parseResult.data;
    const args = prepareDirectFunctionArgs('setTaskStatus', { 
      taskId, 
      status 
    });
    
    const result = await setTaskStatusDirect(args, logger, { session: {} });
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'UPDATE_STATUS_ERROR',
          message: result.error || `Failed to update status for task ${taskId}`
        }
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      message: `Task ${taskId} status updated to ${status}`
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update task status'
      }
    });
  }
}