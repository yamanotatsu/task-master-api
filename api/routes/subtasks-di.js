import { z } from 'zod';

// Validation schemas
const addSubtaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assignee: z.string().optional()
});

const updateSubtaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  assignee: z.string().optional(),
  status: z.enum(['pending', 'in-progress', 'completed']).optional()
});

/**
 * Create subtask handlers with dependency injection
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Subtask handlers
 */
export function createSubtaskHandlers(dependencies) {
  const {
    addSubtaskDirect,
    updateSubtaskByIdDirect,
    removeSubtaskDirect,
    prepareDirectFunctionArgs,
    ensureProjectDirectory,
    logger
  } = dependencies;

  // POST /api/v1/tasks/:id/subtasks - Add subtask to task
  async function addSubtaskHandler(req, res) {
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
      
      const validation = addSubtaskSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid subtask data',
            details: validation.error.errors
          }
        });
      }
      
      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('addSubtask', {
        parentTaskId: taskId,
        title: validation.data.title,
        description: validation.data.description
      });
      const result = await addSubtaskDirect(args, logger, { session: {} });
      
      if (!result.success) {
        let statusCode = 400;
        let errorCode = 'ADD_SUBTASK_ERROR';
        let message = result.error;
        
        // Handle error objects vs error strings
        if (typeof result.error === 'object' && result.error !== null) {
          if (result.error.code === 'TASK_NOT_FOUND') {
            statusCode = 404;
            errorCode = 'TASK_NOT_FOUND';
          }
          message = result.error.message || result.error.code || 'Add subtask failed';
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
      
      res.status(201).json({
        success: true,
        data: {
          task: result.task,
          subtask: result.subtask,
          message: result.message
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add subtask'
        }
      });
    }
  }

  // PUT /api/v1/tasks/:id/subtasks/:subtaskId - Update subtask
  async function updateSubtaskHandler(req, res) {
    try {
      const taskId = parseInt(req.params.id);
      const subtaskId = parseInt(req.params.subtaskId);
      
      if (isNaN(taskId) || isNaN(subtaskId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Task ID and subtask ID must be numbers'
          }
        });
      }
      
      const validation = updateSubtaskSchema.safeParse(req.body);
      
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
      const args = prepareDirectFunctionArgs('updateSubtaskById', {
        parentTaskId: taskId,
        subtaskId,
        title: validation.data.title,
        description: validation.data.description
      });
      const result = await updateSubtaskByIdDirect(args, logger, { session: {} });
      
      if (!result.success) {
        let statusCode = 400;
        let errorCode = 'UPDATE_SUBTASK_ERROR';
        let message = result.error;
        
        // Handle error objects vs error strings
        if (typeof result.error === 'object' && result.error !== null) {
          if (result.error.code === 'TASK_NOT_FOUND') {
            statusCode = 404;
            errorCode = 'TASK_NOT_FOUND';
          } else if (result.error.code === 'SUBTASK_NOT_FOUND') {
            statusCode = 404;
            errorCode = 'SUBTASK_NOT_FOUND';
          }
          message = result.error.message || result.error.code || 'Update subtask failed';
        } else if (typeof result.error === 'string') {
          if (result.error.includes('Task not found')) {
            statusCode = 404;
            errorCode = 'TASK_NOT_FOUND';
          } else if (result.error.includes('Subtask not found')) {
            statusCode = 404;
            errorCode = 'SUBTASK_NOT_FOUND';
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
          subtask: result.subtask,
          message: result.message
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update subtask'
        }
      });
    }
  }

  // DELETE /api/v1/tasks/:id/subtasks/:subtaskId - Remove subtask
  async function removeSubtaskHandler(req, res) {
    try {
      const taskId = parseInt(req.params.id);
      const subtaskId = parseInt(req.params.subtaskId);
      
      if (isNaN(taskId) || isNaN(subtaskId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Task ID and subtask ID must be numbers'
          }
        });
      }
      
      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('removeSubtask', {
        parentTaskId: taskId,
        subtaskId
      });
      const result = await removeSubtaskDirect(args, logger, { session: {} });
      
      if (!result.success) {
        let statusCode = 400;
        let errorCode = 'REMOVE_SUBTASK_ERROR';
        let message = result.error;
        
        // Handle error objects vs error strings
        if (typeof result.error === 'object' && result.error !== null) {
          if (result.error.code === 'TASK_NOT_FOUND') {
            statusCode = 404;
            errorCode = 'TASK_NOT_FOUND';
          } else if (result.error.code === 'SUBTASK_NOT_FOUND') {
            statusCode = 404;
            errorCode = 'SUBTASK_NOT_FOUND';
          }
          message = result.error.message || result.error.code || 'Remove subtask failed';
        } else if (typeof result.error === 'string') {
          if (result.error.includes('Task not found')) {
            statusCode = 404;
            errorCode = 'TASK_NOT_FOUND';
          } else if (result.error.includes('Subtask not found')) {
            statusCode = 404;
            errorCode = 'SUBTASK_NOT_FOUND';
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
          removedSubtask: result.removedSubtask,
          message: result.message
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove subtask'
        }
      });
    }
  }

  return {
    addSubtaskHandler,
    updateSubtaskHandler,
    removeSubtaskHandler
  };
}