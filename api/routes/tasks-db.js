import express from 'express';
import {
	getTasksWithDetails,
	getTaskById,
	createTask,
	updateTask,
	addTaskDependency,
	removeTaskDependency,
	addSubtask,
	updateSubtask,
	deleteSubtask,
	clearSubtasks
} from '../db/helpers.js';
import { supabase } from '../db/supabase.js';
import aiServicesUnified from '../../scripts/modules/ai-services-unified.js';
import { authMiddleware, requireProjectAccess } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// GET /api/v1/tasks - Get all tasks with filters (authenticated)
router.get('/', authMiddleware, async (req, res) => {
	try {
		const { projectId, status, assignee, organizationId } = req.query;
		const userId = req.user.id;

		// If projectId is provided, verify access
		if (projectId) {
			const { data: project, error: projectError } = await supabase
				.from('projects')
				.select(
					`
          organization_id,
          organization:organizations!inner(
            members:organization_members!inner(
              user_id
            )
          )
        `
				)
				.eq('id', projectId)
				.single();

			if (projectError || !project) {
				return res.status(404).json({
					success: false,
					error: {
						code: 'PROJECT_NOT_FOUND',
						message: 'Project not found'
					}
				});
			}

			// Check if user has access to the project's organization
			const hasAccess = project.organization.members.some(
				(m) => m.user_id === userId
			);
			if (!hasAccess) {
				return res.status(403).json({
					success: false,
					error: {
						code: 'AUTHZ_PROJECT_ACCESS_DENIED',
						message: 'You do not have access to this project'
					}
				});
			}
		}

		// Build query based on user's organizations
		let query = supabase.from('tasks').select(`
        *,
        project:projects!inner(
          id,
          name,
          organization_id,
          organization:organizations!inner(
            id,
            name,
            members:organization_members!inner(
              user_id
            )
          )
        ),
        assignee:profiles(id, full_name, email),
        dependencies:task_dependencies(dependency_id),
        subtasks:subtasks(*)
      `);

		// Filter by user's organizations
		query = query.eq('project.organization.members.user_id', userId);

		// Apply additional filters
		if (projectId) {
			query = query.eq('project_id', projectId);
		}
		if (organizationId) {
			query = query.eq('project.organization_id', organizationId);
		}
		if (status) {
			query = query.eq('status', status);
		}
		if (assignee) {
			query = query.eq('assignee_id', assignee);
		}

		const { data: tasks, error } = await query.order('created_at', {
			ascending: false
		});

		if (error) throw error;

		const filteredBy = {};
		if (projectId) filteredBy.projectId = projectId;
		if (status) filteredBy.status = status;
		if (assignee) filteredBy.assignee = assignee;

		res.json({
			success: true,
			data: {
				tasks,
				totalTasks: tasks.length,
				filteredBy: Object.keys(filteredBy).length > 0 ? filteredBy : 'all'
			}
		});
	} catch (error) {
		console.error('Error fetching tasks:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'FETCH_TASKS_ERROR',
				message: 'Failed to fetch tasks',
				details: error.message
			}
		});
	}
});

// GET /api/v1/tasks/:id - Get task by ID (with access control)
router.get('/:id', authMiddleware, async (req, res) => {
	try {
		const taskId = req.params.id;
		const userId = req.user.id;

		// Get task with project and organization info
		const { data: task, error: taskError } = await supabase
			.from('tasks')
			.select(
				`
        *,
        project:projects!inner(
          id,
          name,
          organization_id,
          organization:organizations!inner(
            id,
            name,
            members:organization_members!inner(
              user_id
            )
          )
        ),
        assignee:profiles(id, full_name, email),
        dependencies:task_dependencies(dependency_id),
        subtasks:subtasks(*)
      `
			)
			.eq('id', taskId)
			.single();

		if (taskError || !task) {
			return res.status(404).json({
				success: false,
				error: {
					code: 'TASK_NOT_FOUND',
					message: 'Task not found'
				}
			});
		}

		// Check if user has access to the task's project
		const hasAccess = task.project.organization.members.some(
			(m) => m.user_id === userId
		);
		if (!hasAccess) {
			return res.status(403).json({
				success: false,
				error: {
					code: 'AUTHZ_TASK_ACCESS_DENIED',
					message: 'You do not have access to this task'
				}
			});
		}

		// Clean up response
		delete task.project.organization.members;

		if (!task) {
			return res.status(404).json({
				success: false,
				error: {
					code: 'TASK_NOT_FOUND',
					message: 'Task not found'
				}
			});
		}

		res.json({
			success: true,
			data: task
		});
	} catch (error) {
		console.error('Error fetching task:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'FETCH_TASK_ERROR',
				message: 'Failed to fetch task',
				details: error.message
			}
		});
	}
});

// POST /api/v1/tasks - Create new task (project members only)
router.post('/', authMiddleware, async (req, res) => {
	try {
		const {
			prompt,
			title,
			description,
			priority = 'medium',
			dependencies = [],
			assignee,
			deadline,
			projectId
		} = req.body;
		const userId = req.user.id;

		if (!projectId) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'MISSING_PROJECT_ID',
					message: 'projectId is required'
				}
			});
		}

		// Verify user has access to the project
		const { data: project, error: projectError } = await supabase
			.from('projects')
			.select(
				`
        organization_id,
        organization:organizations!inner(
          members:organization_members!inner(
            user_id
          )
        )
      `
			)
			.eq('id', projectId)
			.single();

		if (projectError || !project) {
			return res.status(404).json({
				success: false,
				error: {
					code: 'PROJECT_NOT_FOUND',
					message: 'Project not found'
				}
			});
		}

		const hasAccess = project.organization.members.some(
			(m) => m.user_id === userId
		);
		if (!hasAccess) {
			return res.status(403).json({
				success: false,
				error: {
					code: 'AUTHZ_PROJECT_ACCESS_DENIED',
					message: 'You do not have access to this project'
				}
			});
		}

		let taskData = {
			project_id: projectId,
			priority,
			dependencies,
			assignee_id: assignee,
			deadline,
			status: 'pending',
			organization_id: project.organization_id,
			created_by: userId
		};

		// AI-generated task
		if (prompt) {
			try {
				const aiResponse = await aiServicesUnified.generateTaskFromPrompt(
					prompt,
					{
						priority,
						dependencies
					}
				);

				if (!aiResponse.success) {
					throw new Error(aiResponse.error || 'AI generation failed');
				}

				taskData = {
					...taskData,
					title: aiResponse.title,
					description: aiResponse.description,
					details: aiResponse.details,
					test_strategy: aiResponse.testStrategy
				};
			} catch (error) {
				console.error('AI generation error:', error);
				return res.status(500).json({
					success: false,
					error: {
						code: 'AI_GENERATION_ERROR',
						message: 'Failed to generate task with AI',
						details: error.message
					}
				});
			}
		}
		// Manual task creation
		else if (title && description) {
			taskData = {
				...taskData,
				title,
				description,
				details: req.body.details,
				test_strategy: req.body.testStrategy
			};
		} else {
			return res.status(400).json({
				success: false,
				error: {
					code: 'INVALID_REQUEST',
					message: 'Either prompt or (title and description) are required'
				}
			});
		}

		const task = await createTask(taskData);

		res.status(201).json({
			success: true,
			data: {
				taskId: task.id,
				message: `Successfully added new task #${task.id}`,
				telemetryData: prompt
					? {
							modelUsed: aiServicesUnified.getLastModelUsed(),
							totalTokens: aiServicesUnified.getLastTokenCount(),
							totalCost: aiServicesUnified.getLastCost(),
							processingTime: aiServicesUnified.getLastProcessingTime()
						}
					: null
			},
			message: 'Task created successfully'
		});
	} catch (error) {
		console.error('Error creating task:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'CREATE_TASK_ERROR',
				message: 'Failed to create task',
				details: error.message
			}
		});
	}
});

// PUT /api/v1/tasks/:id - Update task (project members only)
router.put('/:id', authMiddleware, async (req, res) => {
	try {
		const {
			prompt,
			research,
			title,
			description,
			priority,
			details,
			testStrategy,
			assignee,
			deadline
		} = req.body;

		let updates = {};

		const taskId = req.params.id;
		const userId = req.user.id;

		// Verify user has access to the task
		const { data: taskAccess, error: accessError } = await supabase
			.from('tasks')
			.select(
				`
        project:projects!inner(
          organization:organizations!inner(
            members:organization_members!inner(
              user_id
            )
          )
        )
      `
			)
			.eq('id', taskId)
			.single();

		if (accessError || !taskAccess) {
			return res.status(404).json({
				success: false,
				error: {
					code: 'TASK_NOT_FOUND',
					message: 'Task not found'
				}
			});
		}

		const hasAccess = taskAccess.project.organization.members.some(
			(m) => m.user_id === userId
		);
		if (!hasAccess) {
			return res.status(403).json({
				success: false,
				error: {
					code: 'AUTHZ_TASK_ACCESS_DENIED',
					message: 'You do not have access to this task'
				}
			});
		}

		// AI-based update
		if (prompt) {
			try {
				const currentTask = await getTaskById(taskId);
				if (!currentTask) {
					return res.status(404).json({
						success: false,
						error: {
							code: 'TASK_NOT_FOUND',
							message: 'Task not found'
						}
					});
				}

				const aiResponse = await aiServicesUnified.updateTaskWithPrompt(
					currentTask,
					prompt,
					{ research }
				);

				if (!aiResponse.success) {
					throw new Error(aiResponse.error || 'AI update failed');
				}

				updates = {
					title: aiResponse.title || currentTask.title,
					description: aiResponse.description || currentTask.description,
					details: aiResponse.details || currentTask.details,
					test_strategy: aiResponse.testStrategy || currentTask.test_strategy
				};
			} catch (error) {
				console.error('AI update error:', error);
				return res.status(500).json({
					success: false,
					error: {
						code: 'AI_UPDATE_ERROR',
						message: 'Failed to update task with AI',
						details: error.message
					}
				});
			}
		}
		// Manual update
		else {
			if (title !== undefined) updates.title = title;
			if (description !== undefined) updates.description = description;
			if (priority !== undefined) updates.priority = priority;
			if (details !== undefined) updates.details = details;
			if (testStrategy !== undefined) updates.test_strategy = testStrategy;
			if (assignee !== undefined) updates.assignee_id = assignee;
			if (deadline !== undefined) updates.deadline = deadline;
		}

		if (Object.keys(updates).length === 0) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'NO_UPDATES',
					message: 'No valid fields to update'
				}
			});
		}

		const updatedTask = await updateTask(req.params.id, updates);

		res.json({
			success: true,
			data: {
				message: prompt
					? `Successfully updated task with ID ${req.params.id} based on the prompt`
					: `Successfully updated task ${req.params.id}`,
				taskId: updatedTask.id,
				updated: true,
				updatedTask,
				telemetryData: prompt
					? {
							totalCost: aiServicesUnified.getLastCost(),
							processingTime: aiServicesUnified.getLastProcessingTime()
						}
					: null
			}
		});
	} catch (error) {
		console.error('Error updating task:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'UPDATE_TASK_ERROR',
				message: 'Failed to update task',
				details: error.message
			}
		});
	}
});

// PATCH /api/v1/tasks/:id/status - Update task status (project members only)
router.patch('/:id/status', authMiddleware, async (req, res) => {
	try {
		const { status } = req.body;
		const taskId = req.params.id;
		const userId = req.user.id;

		// Verify user has access to the task
		const { data: taskAccess, error: accessError } = await supabase
			.from('tasks')
			.select(
				`
        project:projects!inner(
          organization:organizations!inner(
            members:organization_members!inner(
              user_id
            )
          )
        )
      `
			)
			.eq('id', taskId)
			.single();

		if (accessError || !taskAccess) {
			return res.status(404).json({
				success: false,
				error: {
					code: 'TASK_NOT_FOUND',
					message: 'Task not found'
				}
			});
		}

		const hasAccess = taskAccess.project.organization.members.some(
			(m) => m.user_id === userId
		);
		if (!hasAccess) {
			return res.status(403).json({
				success: false,
				error: {
					code: 'AUTHZ_TASK_ACCESS_DENIED',
					message: 'You do not have access to this task'
				}
			});
		}

		if (!status) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'MISSING_STATUS',
					message: 'Status is required'
				}
			});
		}

		const validStatuses = [
			'pending',
			'in-progress',
			'completed',
			'done',
			'blocked',
			'review',
			'deferred',
			'cancelled',
			'not-started'
		];
		if (!validStatuses.includes(status)) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'INVALID_STATUS',
					message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
				}
			});
		}

		await updateTask(req.params.id, { status });

		res.json({
			success: true,
			data: {
				message: `Successfully updated task ${req.params.id} status to "${status}"`,
				taskId: req.params.id,
				status
			},
			message: `Task ${req.params.id} status updated to ${status}`
		});
	} catch (error) {
		console.error('Error updating task status:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'UPDATE_STATUS_ERROR',
				message: 'Failed to update task status',
				details: error.message
			}
		});
	}
});

// DELETE /api/v1/tasks/:id - Delete task (project members only)
router.delete('/:id', authMiddleware, async (req, res) => {
	try {
		const taskId = req.params.id;
		const userId = req.user.id;

		// Verify user has access to the task
		const { data: taskAccess, error: accessError } = await supabase
			.from('tasks')
			.select(
				`
        project:projects!inner(
          organization:organizations!inner(
            members:organization_members!inner(
              user_id
            )
          )
        )
      `
			)
			.eq('id', taskId)
			.single();

		if (accessError || !taskAccess) {
			return res.status(404).json({
				success: false,
				error: {
					code: 'TASK_NOT_FOUND',
					message: 'Task not found'
				}
			});
		}

		const hasAccess = taskAccess.project.organization.members.some(
			(m) => m.user_id === userId
		);
		if (!hasAccess) {
			return res.status(403).json({
				success: false,
				error: {
					code: 'AUTHZ_TASK_ACCESS_DENIED',
					message: 'You do not have access to this task'
				}
			});
		}

		const { error } = await supabase.from('tasks').delete().eq('id', taskId);

		if (error) throw error;

		res.json({
			success: true,
			data: {
				message: `Task ${req.params.id} deleted successfully`
			}
		});
	} catch (error) {
		console.error('Error deleting task:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'DELETE_TASK_ERROR',
				message: 'Failed to delete task',
				details: error.message
			}
		});
	}
});

// POST /api/v1/tasks/:id/subtasks - Add subtask (project members only)
router.post(
	'/:id/subtasks',
	authMiddleware,
	requireProjectAccess,
	async (req, res) => {
		try {
			const { title, description } = req.body;

			if (!title) {
				return res.status(400).json({
					success: false,
					error: {
						code: 'MISSING_TITLE',
						message: 'Title is required'
					}
				});
			}

			await addSubtask(req.params.id, { title, description });

			res.json({
				success: true,
				data: {}
			});
		} catch (error) {
			console.error('Error adding subtask:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'ADD_SUBTASK_ERROR',
					message: 'Failed to add subtask',
					details: error.message
				}
			});
		}
	}
);

// PUT /api/v1/tasks/:taskId/subtasks/:subtaskId - Update subtask (project members only)
router.put('/:taskId/subtasks/:subtaskId', authMiddleware, async (req, res) => {
	try {
		const { title, description, status, assignee } = req.body;

		const updates = {};
		if (title !== undefined) updates.title = title;
		if (description !== undefined) updates.description = description;
		if (status !== undefined) updates.status = status;
		if (assignee !== undefined) updates.assignee_id = assignee;

		const updatedTask = await updateSubtask(req.params.subtaskId, updates);

		res.json({
			success: true,
			data: updatedTask
		});
	} catch (error) {
		console.error('Error updating subtask:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'UPDATE_SUBTASK_ERROR',
				message: 'Failed to update subtask',
				details: error.message
			}
		});
	}
});

// DELETE /api/v1/tasks/:taskId/subtasks/:subtaskId - Delete subtask (project members only)
router.delete(
	'/:taskId/subtasks/:subtaskId',
	authMiddleware,
	async (req, res) => {
		try {
			const updatedTask = await deleteSubtask(req.params.subtaskId);

			res.json({
				success: true,
				data: updatedTask
			});
		} catch (error) {
			console.error('Error deleting subtask:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'DELETE_SUBTASK_ERROR',
					message: 'Failed to delete subtask',
					details: error.message
				}
			});
		}
	}
);

// DELETE /api/v1/tasks/:id/subtasks - Clear all subtasks (project members only)
router.delete(
	'/:id/subtasks',
	authMiddleware,
	requireProjectAccess,
	async (req, res) => {
		try {
			const updatedTask = await clearSubtasks(req.params.id);

			res.json({
				success: true,
				data: updatedTask
			});
		} catch (error) {
			console.error('Error clearing subtasks:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'CLEAR_SUBTASKS_ERROR',
					message: 'Failed to clear subtasks',
					details: error.message
				}
			});
		}
	}
);

// POST /api/v1/tasks/:id/dependencies - Add dependency (project members only)
router.post(
	'/:id/dependencies',
	authMiddleware,
	requireProjectAccess,
	async (req, res) => {
		try {
			const { dependencyId } = req.body;

			if (!dependencyId) {
				return res.status(400).json({
					success: false,
					error: {
						code: 'MISSING_DEPENDENCY_ID',
						message: 'dependencyId is required'
					}
				});
			}

			const updatedTask = await addTaskDependency(req.params.id, dependencyId);

			res.json({
				success: true,
				data: updatedTask
			});
		} catch (error) {
			console.error('Error adding dependency:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'ADD_DEPENDENCY_ERROR',
					message: 'Failed to add dependency',
					details: error.message
				}
			});
		}
	}
);

// DELETE /api/v1/tasks/:id/dependencies/:dependencyId - Remove dependency (project members only)
router.delete(
	'/:id/dependencies/:dependencyId',
	authMiddleware,
	requireProjectAccess,
	async (req, res) => {
		try {
			const updatedTask = await removeTaskDependency(
				req.params.id,
				req.params.dependencyId
			);

			res.json({
				success: true,
				data: updatedTask
			});
		} catch (error) {
			console.error('Error removing dependency:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'REMOVE_DEPENDENCY_ERROR',
					message: 'Failed to remove dependency',
					details: error.message
				}
			});
		}
	}
);

// POST /api/v1/tasks/:id/expand - Expand task into subtasks (project members only)
router.post('/:id/expand', authMiddleware, async (req, res) => {
	try {
		const { force = false, targetSubtasks = 5 } = req.body;

		const task = await getTaskById(req.params.id);
		if (!task) {
			return res.status(404).json({
				success: false,
				error: {
					code: 'TASK_NOT_FOUND',
					message: 'Task not found'
				}
			});
		}

		// Check if task already has subtasks
		if (task.subtasks.length > 0 && !force) {
			return res.json({
				success: true,
				data: {
					subtasksGenerated: 0
				}
			});
		}

		// Generate subtasks with AI
		try {
			const subtasks = await aiServicesUnified.expandTaskToSubtasks(task, {
				targetCount: targetSubtasks
			});

			if (!subtasks.success) {
				throw new Error(subtasks.error || 'AI expansion failed');
			}

			// Clear existing subtasks if force is true
			if (force && task.subtasks.length > 0) {
				await clearSubtasks(task.id);
			}

			// Add new subtasks
			for (const subtask of subtasks.subtasks) {
				await addSubtask(task.id, {
					title: subtask.title,
					description: subtask.description
				});
			}

			return res.json({
				success: true,
				data: {
					subtasksGenerated: subtasks.subtasks.length
				}
			});
		} catch (error) {
			console.error('AI expansion error:', error);
			return res.status(500).json({
				success: false,
				error: {
					code: 'AI_EXPANSION_ERROR',
					message: 'Failed to expand task with AI',
					details: error.message
				}
			});
		}
	} catch (error) {
		console.error('Error expanding task:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'EXPAND_TASK_ERROR',
				message: 'Failed to expand task',
				details: error.message
			}
		});
	}
});

// POST /api/v1/tasks/batch-update - Batch update tasks (authenticated)
router.post('/batch-update', authMiddleware, async (req, res) => {
	try {
		const { taskIds, update } = req.body;

		if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'INVALID_TASK_IDS',
					message: 'taskIds must be a non-empty array'
				}
			});
		}

		if (!update || typeof update !== 'object') {
			return res.status(400).json({
				success: false,
				error: {
					code: 'INVALID_UPDATE',
					message: 'update must be an object'
				}
			});
		}

		// Build update object
		const updates = {};
		if (update.status !== undefined) updates.status = update.status;
		if (update.assignee !== undefined) updates.assignee_id = update.assignee;
		if (update.priority !== undefined) updates.priority = update.priority;

		if (Object.keys(updates).length === 0) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'NO_UPDATES',
					message: 'No valid fields to update'
				}
			});
		}

		// Verify user has access to all tasks
		const { data: tasks, error: accessError } = await supabase
			.from('tasks')
			.select(
				`
        id,
        project:projects!inner(
          organization:organizations!inner(
            members:organization_members!inner(
              user_id
            )
          )
        )
      `
			)
			.in('id', taskIds);

		if (accessError) throw accessError;

		// Check access for each task
		const inaccessibleTasks = tasks.filter(
			(task) =>
				!task.project.organization.members.some(
					(m) => m.user_id === req.user.id
				)
		);

		if (inaccessibleTasks.length > 0) {
			return res.status(403).json({
				success: false,
				error: {
					code: 'AUTHZ_TASK_ACCESS_DENIED',
					message: `You do not have access to ${inaccessibleTasks.length} of the specified tasks`
				}
			});
		}

		// Update all tasks
		const { error } = await supabase
			.from('tasks')
			.update(updates)
			.in('id', taskIds);

		if (error) throw error;

		res.json({
			success: true,
			data: {
				message: `Successfully updated ${taskIds.length} tasks`,
				taskIds,
				updates
			}
		});
	} catch (error) {
		console.error('Error in batch update:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'BATCH_UPDATE_ERROR',
				message: 'Failed to batch update tasks',
				details: error.message
			}
		});
	}
});

export default router;
