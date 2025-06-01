import { z } from 'zod';
import { generateTasksFromPRD } from '../services/task-generator.js';

const requestSchema = z.object({
  prd_content: z.string().min(1, 'PRD content is required'),
  target_task_count: z.number().int().min(1).max(100).optional().default(10),
  use_research_mode: z.boolean().optional().default(false)
});

export async function generateTasksFromPRDHandler(req, res) {
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
    
    const result = await generateTasksFromPRD({
      prdContent: prd_content,
      numTasks: target_task_count,
      useResearch: use_research_mode,
      apiKeys: extractApiKeysFromEnv()
    });
    
    // Save tasks to projects/default/tasks.json
    const { updateTasksInProject } = await import('../services/task-updater.js');
    await updateTasksInProject(result.tasks);
    
    const responseTime = Date.now() - req.startTime;
    
    res.status(200).json({
      success: true,
      data: {
        tasks: result.tasks,
        metadata: result.metadata,
        telemetryData: result.telemetryData
      }
    });
    
  } catch (error) {
    let errorCode = 'TASK_GENERATION_ERROR';
    let statusCode = 500;
    let errorMessage = error.message || 'Failed to generate tasks from PRD';
    
    if (error.message?.includes('API key')) {
      errorCode = 'MISSING_API_KEY';
      statusCode = 401;
    } else if (error.message?.includes('rate limit')) {
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

function extractApiKeysFromEnv() {
  const apiKeys = {};
  
  // Map environment variables directly (not provider names)
  const envKeys = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'PERPLEXITY_API_KEY',
    'XAI_API_KEY',
    'OPENROUTER_API_KEY',
    'MISTRAL_API_KEY',
    'AZURE_OPENAI_API_KEY',
    'OLLAMA_API_KEY'
  ];
  
  for (const envKey of envKeys) {
    if (process.env[envKey]) {
      apiKeys[envKey] = process.env[envKey];
    }
  }
  
  return apiKeys;
}