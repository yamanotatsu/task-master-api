import { parsePRDDirect } from '../../mcp-server/src/core/task-master-core.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateTasksFromPRD({
	prdContent,
	numTasks,
	useResearch,
	apiKeys
}) {
	const startTime = Date.now();

	// Create a temporary PRD file
	const tempDir = path.join(__dirname, '..', '..', 'temp');
	if (!fs.existsSync(tempDir)) {
		fs.mkdirSync(tempDir, { recursive: true });
	}

	const tempPrdPath = path.join(
		tempDir,
		`prd-${crypto.randomBytes(8).toString('hex')}.txt`
	);
	const tempOutputPath = path.join(
		tempDir,
		`tasks-${crypto.randomBytes(8).toString('hex')}.json`
	);

	try {
		// Write PRD content to temporary file
		fs.writeFileSync(tempPrdPath, prdContent, 'utf8');

		// Prepare arguments for parsePRDDirect
		const args = {
			input: path.relative(path.join(__dirname, '..', '..'), tempPrdPath),
			output: path.relative(path.join(__dirname, '..', '..'), tempOutputPath),
			numTasks: numTasks,
			force: true,
			append: false,
			research: useResearch,
			projectRoot: path.join(__dirname, '..', '..')
		};

		// Create logger for Direct Function
		const apiLogger = {
			log: (message) => console.log(`[API] ${message}`),
			error: (message) => console.error(`[API ERROR] ${message}`),
			warn: (message) => console.warn(`[API WARN] ${message}`),
			info: (message) => console.log(`[API INFO] ${message}`),
			success: (message) => console.log(`[API SUCCESS] ${message}`)
		};

		// Create context with session data
		const context = {
			session: {
				env: apiKeys || {},
				environment: 'api'
			}
		};

		// Call parsePRDDirect
		const result = await parsePRDDirect(args, apiLogger, context);

		if (!result.success) {
			throw new Error(result.error.message || 'Failed to parse PRD');
		}

		// Read the generated tasks from the output file
		const generatedData = JSON.parse(fs.readFileSync(tempOutputPath, 'utf8'));

		// Extract tasks and metadata
		const tasks = generatedData.tasks || [];
		const metadata = generatedData.metadata || {
			projectName: extractProjectName(prdContent),
			totalTasks: tasks.length,
			sourceFile: 'api-request',
			generatedAt: new Date().toISOString()
		};

		// Update metadata with actual values
		metadata.totalTasks = tasks.length;
		metadata.sourceLength = prdContent.length;

		// Use telemetry data from result if available
		const telemetryData = result.data?.telemetryData || {
			timestamp: new Date().toISOString(),
			userId: 'api-user',
			commandName: 'api_generate_tasks_from_prd',
			modelUsed: 'unknown',
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
			tasks,
			metadata,
			telemetryData
		};
	} catch (error) {
		throw new Error(`PRD_PARSE_ERROR: ${error.message}`);
	} finally {
		// Clean up temporary files
		try {
			if (fs.existsSync(tempPrdPath)) {
				fs.unlinkSync(tempPrdPath);
			}
			if (fs.existsSync(tempOutputPath)) {
				fs.unlinkSync(tempOutputPath);
			}
		} catch (cleanupError) {
			console.error('Error cleaning up temporary files:', cleanupError);
		}
	}
}

function extractProjectName(prdContent) {
	const lines = prdContent.split('\n');

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith('#') && !trimmed.startsWith('##')) {
			return trimmed.replace(/^#\s*/, '').trim();
		}
		if (
			trimmed.match(/^(Project|Product|App|Application|System)[\s:]+(.+)$/i)
		) {
			return trimmed
				.match(/^(?:Project|Product|App|Application|System)[\s:]+(.+)$/i)[1]
				.trim();
		}
	}

	const titleMatch = prdContent.match(/(?:title|name|project)[\s:]+([^\n]+)/i);
	if (titleMatch) {
		return titleMatch[1].trim();
	}

	return 'Generated Project';
}
