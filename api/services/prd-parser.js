import { z } from 'zod';
import { generateObjectService } from '../../scripts/modules/ai-services-unified.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Define the Zod schema for a SINGLE task object
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

// Define the Zod schema for the ENTIRE expected AI response object
const prdResponseSchema = z.object({
	tasks: z.array(prdSingleTaskSchema),
	metadata: z.object({
		projectName: z.string(),
		totalTasks: z.number(),
		generatedAt: z.string()
	})
});

/**
 * Parse PRD content and generate tasks (Supabase version)
 * @param {string} prdContent - PRD content
 * @param {Object} options - Options
 * @returns {Promise<Object>} Generated tasks and metadata
 */
export async function parsePRDContent(prdContent, options = {}) {
	const {
		targetTaskCount = 10,
		researchMode = false,
		projectName = 'Generated Project'
	} = options;

	// Research-specific enhancements to the system prompt
	const researchPromptAddition = researchMode
		? `\nBefore breaking down the PRD into tasks, you will:
1. Research and analyze the latest technologies, libraries, frameworks, and best practices that would be appropriate for this project
2. Identify any potential technical challenges, security concerns, or scalability issues not explicitly mentioned in the PRD without discarding any explicit requirements or going overboard with complexity -- always aim to provide the most direct path to implementation, avoiding over-engineering or roundabout approaches
3. Consider current industry standards and evolving trends relevant to this project (this step aims to solve LLM hallucinations and out of date information due to training data cutoff dates)
4. Evaluate alternative implementation approaches and recommend the most efficient path
5. Include specific library versions, helpful APIs, and concrete implementation guidance based on your research
6. Always aim to provide the most direct path to implementation, avoiding over-engineering or roundabout approaches

Your task breakdown should incorporate this research, resulting in more detailed implementation guidance, more accurate dependency mapping, and more precise technology recommendations than would be possible from the PRD text alone, while maintaining all explicit requirements and best practices and all details and nuances of the PRD.`
		: '';

	// Base system prompt for PRD parsing
	const systemPrompt = `You are an AI assistant specialized in analyzing Product Requirements Documents (PRDs) and generating a structured, logically ordered, dependency-aware and sequenced list of development tasks in JSON format.${researchPromptAddition}

全てのタスクの内容（title, description, details, testStrategy）は日本語で記述してください。ただし、JSONのキー名とステータス値（pending等）は英語のままにしてください。

Analyze the provided PRD content and generate approximately ${targetTaskCount} top-level development tasks. If the complexity or the level of detail of the PRD is high, generate more tasks relative to the complexity of the PRD
Each task should represent a logical unit of work needed to implement the requirements and focus on the most direct and effective way to implement the requirements without unnecessary complexity or overengineering. Include pseudo-code, implementation details, and test strategy for each task. Find the most up to date information to implement each task.
Assign sequential IDs starting from 1. Infer title, description, details, and test strategy for each task based *only* on the PRD content.
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
1. Unless complexity warrants otherwise, create exactly ${targetTaskCount} tasks, numbered sequentially starting from 1
2. Each task should be atomic and focused on a single responsibility following the most up to date best practices and standards
3. Order tasks logically - consider dependencies and implementation sequence
4. Early tasks should focus on setup, core functionality first, then advanced features
5. Include clear validation/testing approach for each task
6. Set appropriate dependency IDs (a task can only depend on tasks with lower IDs)
7. Assign priority (high/medium/low) based on criticality and dependency order
8. Include detailed implementation guidance in the "details" field${researchMode ? ', with specific libraries and version recommendations based on your research' : ''}
9. If the PRD contains specific requirements for libraries, database schemas, frameworks, tech stacks, or any other implementation details, STRICTLY ADHERE to these requirements in your task breakdown and do not discard them under any circumstance
10. Focus on filling in any gaps left by the PRD or areas that aren't fully specified, while preserving all explicit requirements
11. Always aim to provide the most direct path to implementation, avoiding over-engineering or roundabout approaches${researchMode ? '\n12. For each task, include specific, actionable guidance based on current industry standards and best practices discovered through research' : ''}`;

	// Build user prompt with PRD content
	const userPrompt = `Here's the Product Requirements Document (PRD) to break down into approximately ${targetTaskCount} tasks:${researchMode ? '\n\nRemember to thoroughly research current best practices and technologies before task breakdown to provide specific, actionable implementation details.' : ''}\n\n${prdContent}\n\n

Return your response in this format:
{
  "tasks": [
    {
      "id": 1,
      "title": "プロジェクトリポジトリのセットアップ",
      "description": "...",
      ...
    },
    ...
  ],
  "metadata": {
    "projectName": "${projectName}",
    "totalTasks": ${targetTaskCount},
    "generatedAt": "YYYY-MM-DD"
  }
}`;

	try {
		console.log(
			'Calling generateObjectService with role:',
			researchMode ? 'research' : 'main'
		);

		// Get project root for config loading
		const projectRoot = process.cwd();

		// Call generateObjectService
		const aiServiceResponse = await generateObjectService({
			role: researchMode ? 'research' : 'main',
			schema: prdResponseSchema,
			objectName: 'tasks_data',
			systemPrompt: systemPrompt,
			prompt: userPrompt,
			commandName: 'parse-prd',
			outputType: 'api',
			projectRoot: projectRoot
		});

		console.log('AI service response:', aiServiceResponse);

		// The response structure from generateObjectService is different
		if (!aiServiceResponse.mainResult) {
			throw new Error('No result from AI service');
		}

		return {
			success: true,
			tasks: aiServiceResponse.mainResult.tasks,
			projectInfo: {
				name: aiServiceResponse.mainResult.metadata.projectName
			},
			telemetry: {
				model: aiServiceResponse.telemetryData?.modelUsed,
				tokens: aiServiceResponse.telemetryData?.totalTokens,
				cost: aiServiceResponse.telemetryData?.totalCost
			}
		};
	} catch (error) {
		console.error('Error parsing PRD:', error);
		return {
			success: false,
			error: error.message
		};
	}
}
