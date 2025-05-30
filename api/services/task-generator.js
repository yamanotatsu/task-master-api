import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateObjectService } from '../../scripts/modules/ai-services-unified.js';
import { getConfig } from '../../scripts/modules/config-manager.js';
import { resolveEnvVariable } from '../../scripts/modules/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the Zod schema for a SINGLE task object (from CLI)
const prdSingleTaskSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  details: z.string().optional().default(''),
  testStrategy: z.string().optional().default(''),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  dependencies: z.array(z.number().int().positive()).optional().default([]),
  status: z.string().optional().default('pending')
});

// Define the Zod schema for the ENTIRE expected AI response object (from CLI)
const prdResponseSchema = z.object({
  tasks: z.array(prdSingleTaskSchema),
  metadata: z.object({
    projectName: z.string(),
    totalTasks: z.number(),
    sourceFile: z.string(),
    generatedAt: z.string()
  })
});

export async function generateTasksFromPRD({ prdContent, numTasks, useResearch, apiKeys }) {
  const startTime = Date.now();
  
  const config = getConfig();
  
  const apiSession = {
    env: apiKeys || {},
    environment: 'api'
  };
  
  const apiLogger = {
    log: (message) => console.log(`[API] ${message}`),
    error: (message) => console.error(`[API ERROR] ${message}`),
    warn: (message) => console.warn(`[API WARN] ${message}`)
  };
  
  try {
    // Use exact same prompt logic as CLI
    const nextId = 1; // API always starts from 1 (no append support)
    
    // Research-specific enhancements to the system prompt (from CLI)
    const researchPromptAddition = useResearch
      ? `\nBefore breaking down the PRD into tasks, you will:
1. Research and analyze the latest technologies, libraries, frameworks, and best practices that would be appropriate for this project
2. Identify any potential technical challenges, security concerns, or scalability issues not explicitly mentioned in the PRD without discarding any explicit requirements or going overboard with complexity -- always aim to provide the most direct path to implementation, avoiding over-engineering or roundabout approaches
3. Consider current industry standards and evolving trends relevant to this project (this step aims to solve LLM hallucinations and out of date information due to training data cutoff dates)
4. Evaluate alternative implementation approaches and recommend the most efficient path
5. Include specific library versions, helpful APIs, and concrete implementation guidance based on your research
6. Always aim to provide the most direct path to implementation, avoiding over-engineering or roundabout approaches

Your task breakdown should incorporate this research, resulting in more detailed implementation guidance, more accurate dependency mapping, and more precise technology recommendations than would be possible from the PRD text alone, while maintaining all explicit requirements and best practices and all details and nuances of the PRD.`
      : '';

    // Base system prompt for PRD parsing (from CLI)
    const systemPrompt = `You are an AI assistant specialized in analyzing Product Requirements Documents (PRDs) and generating a structured, logically ordered, dependency-aware and sequenced list of development tasks in JSON format.${researchPromptAddition}

Analyze the provided PRD content and generate approximately ${numTasks} top-level development tasks. If the complexity or the level of detail of the PRD is high, generate more tasks relative to the complexity of the PRD
Each task should represent a logical unit of work needed to implement the requirements and focus on the most direct and effective way to implement the requirements without unnecessary complexity or overengineering. Include pseudo-code, implementation details, and test strategy for each task. Find the most up to date information to implement each task.
Assign sequential IDs starting from ${nextId}. Infer title, description, details, and test strategy for each task based *only* on the PRD content.
Set status to 'pending', dependencies to an empty array [], and priority to 'medium' initially for all tasks.
Respond ONLY with a valid JSON object containing a single key "tasks", where the value is an array of task objects adhering to the provided Zod schema. Do not include any explanation or markdown formatting.

Each task should follow this JSON structure:
{
    "id": number,
    "title": string,
    "description": string,
    "status": "pending",
    "dependencies": number[] (IDs of tasks this depends on),
    "priority": "high" | "medium" | "low",
    "details": string (implementation details),
    "testStrategy": string (validation approach)
}

Guidelines:
1. Unless complexity warrants otherwise, create exactly ${numTasks} tasks, numbered sequentially starting from ${nextId}
2. Each task should be atomic and focused on a single responsibility following the most up to date best practices and standards
3. Order tasks logically - consider dependencies and implementation sequence
4. Early tasks should focus on setup, core functionality first, then advanced features
5. Include clear validation/testing approach for each task
6. Set appropriate dependency IDs (a task can only depend on tasks with lower IDs, potentially including existing tasks with IDs less than ${nextId} if applicable)
7. Assign priority (high/medium/low) based on criticality and dependency order
8. Include detailed implementation guidance in the "details" field${useResearch ? ', with specific libraries and version recommendations based on your research' : ''}
9. If the PRD contains specific requirements for libraries, database schemas, frameworks, tech stacks, or any other implementation details, STRICTLY ADHERE to these requirements in your task breakdown and do not discard them under any circumstance
10. Focus on filling in any gaps left by the PRD or areas that aren't fully specified, while preserving all explicit requirements
11. Always aim to provide the most direct path to implementation, avoiding over-engineering or roundabout approaches${useResearch ? '\n12. For each task, include specific, actionable guidance based on current industry standards and best practices discovered through research' : ''}`;

    // Build user prompt with PRD content (from CLI)
    const userPrompt = `Here's the Product Requirements Document (PRD) to break down into approximately ${numTasks} tasks, starting IDs from ${nextId}:${useResearch ? '\n\nRemember to thoroughly research current best practices and technologies before task breakdown to provide specific, actionable implementation details.' : ''}\n\n${prdContent}\n\n

Return your response in this format:
{
    "tasks": [
        {
            "id": 1,
            "title": "Setup Project Repository",
            "description": "...",
            ...
        },
        ...
    ],
    "metadata": {
        "projectName": "PRD Implementation",
        "totalTasks": ${numTasks},
        "sourceFile": "api-request",
        "generatedAt": "YYYY-MM-DD"
    }
}`;
    
    // Call generateObjectService with the SAME parameters as CLI
    const result = await generateObjectService({
      role: useResearch ? 'research' : 'main',
      session: apiSession,
      projectRoot: path.join(__dirname, '..', '..'),
      schema: prdResponseSchema,
      objectName: 'tasks_data',
      systemPrompt: systemPrompt,
      prompt: userPrompt,
      commandName: 'parse-prd',
      outputType: 'cli'
    });
    
    // Robustly get the actual AI-generated object (from CLI)
    let generatedData = null;
    if (result?.mainResult) {
      if (
        typeof result.mainResult === 'object' &&
        result.mainResult !== null &&
        'tasks' in result.mainResult
      ) {
        // If mainResult itself is the object with a 'tasks' property
        generatedData = result.mainResult;
      } else if (
        typeof result.mainResult.object === 'object' &&
        result.mainResult.object !== null &&
        'tasks' in result.mainResult.object
      ) {
        // If mainResult.object is the object with a 'tasks' property
        generatedData = result.mainResult.object;
      }
    }

    if (!generatedData || !Array.isArray(generatedData.tasks)) {
      throw new Error(
        'AI service returned unexpected data structure after validation.'
      );
    }

    // Process tasks exactly like CLI does
    let currentId = nextId;
    const taskMap = new Map();
    const processedNewTasks = generatedData.tasks.map((task) => {
      const newId = currentId++;
      taskMap.set(task.id, newId);
      return {
        ...task,
        id: newId,
        status: 'pending',
        priority: task.priority || 'medium',
        dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
        subtasks: []
      };
    });

    // Remap dependencies for the NEWLY processed tasks (from CLI)
    processedNewTasks.forEach((task) => {
      task.dependencies = task.dependencies
        .map((depId) => taskMap.get(depId)) // Map old AI ID to new sequential ID
        .filter(
          (newDepId) =>
            newDepId != null && // Must exist
            newDepId < task.id && // Must be a lower ID
            processedNewTasks.some((t) => t.id === newDepId) // check if it exists in new tasks
        );
    });
    
    // Use metadata from AI response or create it
    const metadata = generatedData.metadata || {
      projectName: extractProjectName(prdContent),
      totalTasks: processedNewTasks.length,
      sourceFile: 'api-request',
      generatedAt: new Date().toISOString()
    };
    
    // Update metadata with actual values
    metadata.totalTasks = processedNewTasks.length;
    metadata.sourceLength = prdContent.length;
    
    const telemetryData = result.telemetryData || {
      timestamp: new Date().toISOString(),
      userId: 'api-user',
      commandName: 'api_generate_tasks_from_prd',
      modelUsed: config.models?.main?.modelId,
      providerName: 'unknown',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      currency: 'USD'
    };
    
    // Add processing time
    telemetryData.processingTime = Date.now() - startTime;
    
    return {
      tasks: processedNewTasks,
      metadata,
      telemetryData
    };
    
  } catch (error) {
    throw new Error(`PRD_PARSE_ERROR: ${error.message}`);
  }
}

function extractProjectName(prdContent) {
  const lines = prdContent.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') && !trimmed.startsWith('##')) {
      return trimmed.replace(/^#\s*/, '').trim();
    }
    if (trimmed.match(/^(Project|Product|App|Application|System)[\s:]+(.+)$/i)) {
      return trimmed.match(/^(?:Project|Product|App|Application|System)[\s:]+(.+)$/i)[1].trim();
    }
  }
  
  const titleMatch = prdContent.match(/(?:title|name|project)[\s:]+([^\n]+)/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  return 'Generated Project';
}