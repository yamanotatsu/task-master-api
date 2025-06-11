import { z } from 'zod';
import {
	addSubtaskDirect,
	updateSubtaskByIdDirect,
	removeSubtaskDirect
} from '../../mcp-server/src/core/task-master-core.js';
import { logger } from '../utils/logger.js';
import {
	prepareDirectFunctionArgs,
	ensureProjectDirectory
} from '../utils/direct-function-helpers.js';

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

// POST /api/v1/tasks/:id/subtasks - Add subtask to task
export async function addSubtaskHandler(req, res) {
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

		const projectRoot = ensureProjectDirectory();
		const args = prepareDirectFunctionArgs('addSubtask', {
			parentTaskId: taskId,
			title: validation.data.title,
			description: validation.data.description
		});
		const result = await addSubtaskDirect(args, logger, { session: {} });

		if (!result.success) {
			const statusCode =
				result.error?.message?.includes('not found') ||
				result.error?.code === 'TASK_NOT_FOUND'
					? 404
					: 400;
			return res.status(statusCode).json({
				success: false,
				error: {
					code: statusCode === 404 ? 'TASK_NOT_FOUND' : 'ADD_SUBTASK_ERROR',
					message: result.error
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
export async function updateSubtaskHandler(req, res) {
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

		const projectRoot = ensureProjectDirectory();
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

			if (
				result.error?.message?.includes('Task not found') ||
				result.error?.code === 'TASK_NOT_FOUND'
			) {
				statusCode = 404;
				errorCode = 'TASK_NOT_FOUND';
			} else if (
				result.error?.message?.includes('Subtask not found') ||
				result.error?.code === 'SUBTASK_NOT_FOUND'
			) {
				statusCode = 404;
				errorCode = 'SUBTASK_NOT_FOUND';
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
export async function removeSubtaskHandler(req, res) {
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

		const projectRoot = ensureProjectDirectory();
		const args = prepareDirectFunctionArgs('removeSubtask', {
			parentTaskId: taskId,
			subtaskId
		});
		const result = await removeSubtaskDirect(args, logger, { session: {} });

		if (!result.success) {
			let statusCode = 400;
			let errorCode = 'REMOVE_SUBTASK_ERROR';

			if (
				result.error?.message?.includes('Task not found') ||
				result.error?.code === 'TASK_NOT_FOUND'
			) {
				statusCode = 404;
				errorCode = 'TASK_NOT_FOUND';
			} else if (
				result.error?.message?.includes('Subtask not found') ||
				result.error?.code === 'SUBTASK_NOT_FOUND'
			) {
				statusCode = 404;
				errorCode = 'SUBTASK_NOT_FOUND';
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
