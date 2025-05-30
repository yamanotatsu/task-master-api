import { z } from 'zod';
import path from 'path';
import { 
  initializeProjectDirect,
  generateTaskFilesDirect
} from '../../mcp-server/src/core/task-master-core.js';
import { logger } from '../utils/logger.js';
import { prepareDirectFunctionArgs, ensureProjectDirectory } from '../utils/direct-function-helpers.js';

// Validation schemas
const initializeProjectSchema = z.object({
  projectName: z.string().min(1).max(100),
  projectPath: z.string().optional(),
  template: z.enum(['basic', 'web', 'api', 'mobile', 'ml']).optional().default('basic'),
  aiProvider: z.enum(['anthropic', 'openai', 'google', 'perplexity']).optional(),
  includeRooFiles: z.boolean().optional().default(false)
});

// POST /api/v1/projects/initialize - Initialize new project
export async function initializeProjectHandler(req, res) {
  try {
    const validation = initializeProjectSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid project configuration',
          details: validation.error.errors
        }
      });
    }
    
    const projectPath = validation.data.projectPath || 
      path.join(process.cwd(), 'projects', validation.data.projectName);
    
    const args = prepareDirectFunctionArgs('initializeProject', {
      projectName: validation.data.projectName,
      projectPath,
      template: validation.data.template,
      aiProvider: validation.data.aiProvider,
      includeRooFiles: validation.data.includeRooFiles
    });
    const result = await initializeProjectDirect(args, logger, { session: {} });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INITIALIZE_PROJECT_ERROR',
          message: result.error
        }
      });
    }
    
    res.status(201).json({
      success: true,
      data: {
        projectPath: result.projectPath,
        filesCreated: result.filesCreated,
        message: result.message
      }
    });
    
  } catch (error) {
    console.error('Error initializing project:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to initialize project'
      }
    });
  }
}

// POST /api/v1/projects/generate-task-files - Generate task markdown files
export async function generateTaskFilesHandler(req, res) {
  try {
    const projectRoot = ensureProjectDirectory();
    const args = prepareDirectFunctionArgs('generateTaskFiles', {});
    const result = await generateTaskFilesDirect(args, logger, { session: {} });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'GENERATE_FILES_ERROR',
          message: result.error
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        filesGenerated: result.filesGenerated || 0,
        message: result.message
      }
    });
    
  } catch (error) {
    console.error('Error generating task files:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate task files'
      }
    });
  }
}