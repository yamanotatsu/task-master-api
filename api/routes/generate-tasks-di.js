import { z } from 'zod';

const requestSchema = z.object({
  prd_content: z.string().min(1, 'PRD content is required'),
  target_task_count: z.number().int().min(1).max(100).optional().default(10),
  use_research_mode: z.boolean().optional().default(false)
});

/**
 * Create task generation handlers with dependency injection
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Task generation handlers
 */
export function createTaskGenerationHandlers(dependencies) {
  const {
    generateTasksFromPrdDirect,
    prepareDirectFunctionArgs,
    ensureProjectDirectory,
    logger
  } = dependencies;

  async function generateTasksFromPRDHandler(req, res) {
    try {
      const validation = requestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid request body',
            details: validation.error.errors
          }
        });
      }
      
      const { prd_content, target_task_count, use_research_mode } = validation.data;
      
      ensureProjectDirectory();
      const args = prepareDirectFunctionArgs('generateTasksFromPrd', {
        prdContent: prd_content,
        numTasks: target_task_count,
        useResearch: use_research_mode
      });
      
      const result = await generateTasksFromPrdDirect(args, logger, { session: {} });
      
      if (!result.success) {
        let statusCode = 500;
        let errorCode = 'TASK_GENERATION_ERROR';
        let message = result.error;

        // Handle error objects vs error strings
        if (typeof result.error === 'object' && result.error !== null) {
          if (result.error.code === 'MISSING_API_KEY') {
            statusCode = 401;
            errorCode = 'MISSING_API_KEY';
          } else if (result.error.code === 'RATE_LIMIT_EXCEEDED') {
            statusCode = 429;
            errorCode = 'RATE_LIMIT_EXCEEDED';
          } else if (result.error.code === 'PRD_PARSE_ERROR') {
            statusCode = 400;
            errorCode = 'PRD_PARSE_ERROR';
          }
          message = result.error.message || result.error.code || 'Task generation failed';
        } else if (typeof result.error === 'string') {
          if (result.error.includes('API key')) {
            statusCode = 401;
            errorCode = 'MISSING_API_KEY';
          } else if (result.error.includes('rate limit')) {
            statusCode = 429;
            errorCode = 'RATE_LIMIT_EXCEEDED';
          } else if (result.error.includes('PRD_PARSE_ERROR')) {
            statusCode = 400;
            errorCode = 'PRD_PARSE_ERROR';
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
      
      res.status(200).json({
        success: true,
        data: {
          tasks: result.tasks || [],
          metadata: result.metadata || {},
          telemetryData: result.telemetryData || {}
        }
      });
      
    } catch (error) {
      let errorCode = 'TASK_GENERATION_ERROR';
      let statusCode = 500;
      let errorMessage = error.message || 'Failed to generate tasks from PRD';
      
      if (error.message?.includes('API key')) {
        errorCode = 'MISSING_API_KEY';
        statusCode = 401;
      } else if (error.message?.includes('Rate limit') || error.message?.includes('rate limit')) {
        errorCode = 'RATE_LIMIT_EXCEEDED';
        statusCode = 429;
      } else if (error.message?.includes('PRD_PARSE_ERROR')) {
        errorCode = 'PRD_PARSE_ERROR';
        statusCode = 400;
      }
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage
        }
      });
    }
  }

  return {
    generateTasksFromPRDHandler
  };
}