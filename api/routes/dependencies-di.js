import { z } from 'zod';

// Validation schemas
const addDependencySchema = z.object({
  dependencyId: z.number().int().positive()
});

const validateDependenciesSchema = z.object({
  autoFix: z.boolean().optional().default(false)
});

/**
 * Create dependency handlers with dependency injection
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Dependency handlers
 */
export function createDependencyHandlers(dependencies) {
  const {
    addDependencyDirect,
    removeDependencyDirect,
    validateDependenciesDirect,
    fixDependenciesDirect,
    prepareDirectFunctionArgs,
    ensureProjectDirectory,
    logger
  } = dependencies;

  // POST /api/v1/tasks/:id/dependencies - Add dependency to task
  async function addDependencyHandler(req, res) {
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

      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('addDependency', {
        taskId,
        dependencyId: validation.data.dependencyId
      });
      const result = await addDependencyDirect(args, logger, { session: {} });

      if (!result.success) {
        let statusCode = 400;
        let errorCode = 'ADD_DEPENDENCY_ERROR';
        let message = result.error;

        // Handle error objects vs error strings
        if (typeof result.error === 'object' && result.error !== null) {
          if (result.error.code === 'TASK_NOT_FOUND') {
            statusCode = 404;
            errorCode = 'TASK_NOT_FOUND';
          } else if (result.error.code === 'CIRCULAR_DEPENDENCY') {
            errorCode = 'CIRCULAR_DEPENDENCY';
          } else if (result.error.code === 'DEPENDENCY_EXISTS') {
            errorCode = 'DEPENDENCY_EXISTS';
          }
          message = result.error.message || result.error.code || 'Add dependency failed';
        } else if (typeof result.error === 'string') {
          if (result.error.includes('not found')) {
            statusCode = 404;
            errorCode = 'TASK_NOT_FOUND';
          } else if (result.error.includes('circular') || result.error.includes('cycle')) {
            errorCode = 'CIRCULAR_DEPENDENCY';
          } else if (result.error.includes('already exists')) {
            errorCode = 'DEPENDENCY_EXISTS';
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
  async function removeDependencyHandler(req, res) {
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

      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('removeDependency', {
        taskId,
        dependencyId
      });
      const result = await removeDependencyDirect(args, logger, { session: {} });

      if (!result.success) {
        let statusCode = 400;
        let errorCode = 'REMOVE_DEPENDENCY_ERROR';
        let message = result.error;

        // Handle error objects vs error strings
        if (typeof result.error === 'object' && result.error !== null) {
          if (result.error.code === 'TASK_NOT_FOUND') {
            statusCode = 404;
            errorCode = 'TASK_NOT_FOUND';
          } else if (result.error.code === 'DEPENDENCY_NOT_FOUND') {
            statusCode = 404;
            errorCode = 'DEPENDENCY_NOT_FOUND';
          }
          message = result.error.message || result.error.code || 'Remove dependency failed';
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
          message: 'Failed to remove dependency'
        }
      });
    }
  }

  // POST /api/v1/tasks/validate-dependencies - Validate all dependencies
  async function validateDependenciesHandler(req, res) {
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

      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('validateDependencies', {
        autoFix: validation.data.autoFix
      });
      const result = await validateDependenciesDirect(args, logger, { session: {} });

      if (!result.success) {
        let message = result.error;
        if (typeof result.error === 'object' && result.error !== null) {
          message = result.error.message || result.error.code || 'Validation failed';
        }

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATE_DEPENDENCIES_ERROR',
            message: message
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
  async function fixDependenciesHandler(req, res) {
    try {
      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('fixDependencies', {});
      const result = await fixDependenciesDirect(args, logger, { session: {} });

      if (!result.success) {
        let message = result.error;
        if (typeof result.error === 'object' && result.error !== null) {
          message = result.error.message || result.error.code || 'Fix dependencies failed';
        }

        return res.status(400).json({
          success: false,
          error: {
            code: 'FIX_DEPENDENCIES_ERROR',
            message: message
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

  return {
    addDependencyHandler,
    removeDependencyHandler,
    validateDependenciesHandler,
    fixDependenciesHandler
  };
}