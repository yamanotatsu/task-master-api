import { z } from 'zod';
import { 
  addDependencyDirect,
  removeDependencyDirect,
  validateDependenciesDirect,
  fixDependenciesDirect
} from '../../mcp-server/src/core/task-master-core.js';
import { logger } from '../utils/logger.js';
import { prepareDirectFunctionArgs, ensureProjectDirectory } from '../utils/direct-function-helpers.js';

// Validation schemas
const addDependencySchema = z.object({
  dependencyId: z.number().int().positive()
});

const validateDependenciesSchema = z.object({
  autoFix: z.boolean().optional().default(false)
});

// POST /api/v1/tasks/:id/dependencies - Add dependency to task
export async function addDependencyHandler(req, res) {
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
    
    const validation = addDependencySchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid dependency data',
          details: validation.error.errors
        }
      });
    }
    
    const projectRoot = ensureProjectDirectory();
    const args = prepareDirectFunctionArgs('addDependency', {
      taskId,
      dependencyId: validation.data.dependencyId
    });
    const result = await addDependencyDirect(args, logger, { session: {} });
    
    if (!result.success) {
      let statusCode = 400;
      let errorCode = 'ADD_DEPENDENCY_ERROR';
      
      if (result.error?.message?.includes('not found') || result.error?.code === 'TASK_NOT_FOUND') {
        statusCode = 404;
        errorCode = 'TASK_NOT_FOUND';
      } else if (result.error?.message?.includes('circular') || result.error?.message?.includes('cycle') || result.error?.code === 'CIRCULAR_DEPENDENCY') {
        errorCode = 'CIRCULAR_DEPENDENCY';
      } else if (result.error?.message?.includes('already exists') || result.error?.code === 'DEPENDENCY_EXISTS') {
        errorCode = 'DEPENDENCY_EXISTS';
      }
      
      return res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
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
        message: 'Failed to add dependency'
      }
    });
  }
}

// DELETE /api/v1/tasks/:id/dependencies/:depId - Remove dependency
export async function removeDependencyHandler(req, res) {
  try {
    const taskId = parseInt(req.params.id);
    const dependencyId = parseInt(req.params.depId);
    
    if (isNaN(taskId) || isNaN(dependencyId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Task ID and dependency ID must be numbers'
        }
      });
    }
    
    const projectRoot = ensureProjectDirectory();
    const args = prepareDirectFunctionArgs('removeDependency', {
      taskId,
      dependencyId
    });
    const result = await removeDependencyDirect(args, logger, { session: {} });
    
    if (!result.success) {
      const statusCode = (result.error?.message?.includes('not found') || result.error?.code === 'TASK_NOT_FOUND') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? 'TASK_NOT_FOUND' : 'REMOVE_DEPENDENCY_ERROR',
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
        message: 'Failed to remove dependency'
      }
    });
  }
}

// POST /api/v1/tasks/validate-dependencies - Validate all dependencies
export async function validateDependenciesHandler(req, res) {
  try {
    const validation = validateDependenciesSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid validation parameters',
          details: validation.error.errors
        }
      });
    }
    
    const projectRoot = ensureProjectDirectory();
    const args = prepareDirectFunctionArgs('validateDependencies', {
      autoFix: validation.data.autoFix
    });
    const result = await validateDependenciesDirect(args, logger, { session: {} });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATE_DEPENDENCIES_ERROR',
          message: result.error
        }
      });
    }
    
    // If there are issues and autoFix is requested, fix them
    if (validation.data.autoFix && result.issues && result.issues.length > 0) {
      const fixArgs = prepareDirectFunctionArgs('fixDependencies', {});
      const fixResult = await fixDependenciesDirect(fixArgs, logger, { session: {} });
      
      return res.json({
        success: true,
        data: {
          valid: false,
          issues: result.issues,
          fixed: fixResult.success,
          fixedIssues: fixResult.fixedIssues || [],
          message: fixResult.message || result.message
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        valid: result.valid,
        issues: result.issues || [],
        message: result.message
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to validate dependencies'
      }
    });
  }
}

// POST /api/v1/tasks/fix-dependencies - Fix dependency issues
export async function fixDependenciesHandler(req, res) {
  try {
    const projectRoot = ensureProjectDirectory();
    const args = prepareDirectFunctionArgs('fixDependencies', {});
    const result = await fixDependenciesDirect(args, logger, { session: {} });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FIX_DEPENDENCIES_ERROR',
          message: result.error
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        fixedIssues: result.fixedIssues || [],
        message: result.message
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fix dependencies'
      }
    });
  }
}