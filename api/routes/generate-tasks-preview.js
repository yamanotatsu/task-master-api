import express from 'express';
import { parsePRDContent } from '../services/prd-parser.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// POST /api/v1/generate-tasks-preview - Generate task candidates without saving to DB
router.post('/', authMiddleware, async (req, res) => {
	try {
		const {
			prd_content,
			target_task_count = 10,
			use_research_mode = false,
			projectName,
			conversation_history = []
		} = req.body;

		if (!prd_content) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'MISSING_PRD_CONTENT',
					message: 'prd_content is required'
				}
			});
		}

		// Combine PRD with conversation history for enhanced context
		let enhancedPRDContent = prd_content;
		if (conversation_history && conversation_history.length > 0) {
			const conversationText = conversation_history
				.map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
				.join('\n\n');
			enhancedPRDContent = `${prd_content}\n\n--- 対話による追加情報 ---\n\n${conversationText}`;
		}

		// Generate tasks from PRD without saving to database
		const startTime = Date.now();
		const result = await parsePRDContent(enhancedPRDContent, {
			targetTaskCount: target_task_count,
			researchMode: use_research_mode,
			projectName: projectName || 'Generated Project'
		});

		if (!result.success) {
			return res.status(500).json({
				success: false,
				error: {
					code: 'GENERATION_FAILED',
					message: result.error || 'Failed to generate tasks from PRD'
				}
			});
		}

		// Transform tasks to include temporary IDs for frontend
		const tasksWithTempIds = result.tasks.map((task, index) => ({
			tempId: `temp_${Date.now()}_${index}`,
			title: task.title,
			description: task.description,
			details: task.details,
			test_strategy: task.testStrategy,
			priority: task.priority || 'medium',
			order: index + 1,
			dependencies: [] // Dependencies will be handled in the project detail view
		}));

		const processingTime = Date.now() - startTime;

		res.json({
			success: true,
			data: {
				tasks: tasksWithTempIds,
				metadata: {
					projectName: projectName || 'Generated Project',
					totalTasks: tasksWithTempIds.length,
					generatedAt: new Date().toISOString()
				},
				telemetryData: {
					modelUsed: result.telemetry?.model || 'unknown',
					totalTokens: result.telemetry?.tokens || 0,
					totalCost: result.telemetry?.cost || 0,
					processingTime
				}
			}
		});
	} catch (error) {
		logger.error('Error generating task preview:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'GENERATE_PREVIEW_ERROR',
				message: 'Failed to generate task preview',
				details: error.message
			}
		});
	}
});

export default router;
