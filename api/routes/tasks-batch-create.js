import express from 'express';
import { createTask } from '../db/helpers.js';
import { supabase } from '../db/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// POST /api/v1/tasks/batch-create - Create project and tasks in batch
router.post('/', authMiddleware, async (req, res) => {
	const client = supabase;

	try {
		const { projectName, projectDescription, prdContent, deadline, tasks } =
			req.body;

		const userId = req.user.id;

		// Validate required fields
		if (!projectName || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'INVALID_REQUEST',
					message: 'projectName and tasks array are required'
				}
			});
		}

		// Get user's organization
		const { data: orgMember, error: orgError } = await client
			.from('organization_members')
			.select('organization_id')
			.eq('user_id', userId)
			.single();

		if (orgError || !orgMember) {
			return res.status(403).json({
				success: false,
				error: {
					code: 'NO_ORGANIZATION',
					message: 'User is not part of any organization'
				}
			});
		}

		const organizationId = orgMember.organization_id;

		// Start transaction-like operation
		let projectId = null;
		let createdTasks = [];
		let rollbackNeeded = false;

		try {
			// 1. Create project
			const { data: project, error: projectError } = await client
				.from('projects')
				.insert({
					name: projectName,
					description: projectDescription || '',
					prd_content: prdContent || '',
					deadline: deadline || null,
					status: 'active',
					organization_id: organizationId,
					created_by: userId
				})
				.select()
				.single();

			if (projectError) {
				throw new Error(`Failed to create project: ${projectError.message}`);
			}

			projectId = project.id;

			// 2. Create tasks
			for (const [index, task] of tasks.entries()) {
				const taskData = {
					project_id: projectId,
					title: task.title,
					description: task.description || '',
					details: task.details || '',
					test_strategy: task.test_strategy || '',
					priority: task.priority || 'medium',
					status: 'pending',
					organization_id: organizationId,
					created_by: userId,
					order_index: task.order || index + 1
				};

				try {
					const savedTask = await createTask(taskData);
					createdTasks.push({
						id: savedTask.id,
						tempId: task.tempId,
						title: savedTask.title,
						description: savedTask.description,
						details: savedTask.details,
						test_strategy: savedTask.test_strategy,
						priority: savedTask.priority,
						status: savedTask.status,
						order: task.order || index + 1
					});
				} catch (taskError) {
					logger.error(`Failed to create task: ${task.title}`, taskError);
					rollbackNeeded = true;
					throw new Error(
						`Failed to create task "${task.title}": ${taskError.message}`
					);
				}
			}

			// Success response
			res.json({
				success: true,
				data: {
					project: {
						id: projectId,
						name: projectName,
						description: projectDescription,
						deadline: deadline,
						status: 'active'
					},
					tasks: createdTasks,
					metadata: {
						totalTasksCreated: createdTasks.length,
						createdAt: new Date().toISOString()
					}
				}
			});
		} catch (error) {
			// Rollback: Delete project and all associated tasks
			if (projectId) {
				logger.info(
					`Rolling back: Deleting project ${projectId} and associated tasks`
				);

				// Delete tasks first (due to foreign key constraint)
				if (createdTasks.length > 0) {
					const taskIds = createdTasks.map((t) => t.id);
					await client.from('tasks').delete().in('id', taskIds);
				}

				// Delete project
				await client.from('projects').delete().eq('id', projectId);
			}

			throw error;
		}
	} catch (error) {
		logger.error('Error in batch create:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'BATCH_CREATE_ERROR',
				message: 'Failed to create project and tasks',
				details: error.message
			}
		});
	}
});

export default router;
