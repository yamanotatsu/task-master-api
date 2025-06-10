/**
 * update-task-by-id.js
 * Direct function implementation for updating a single task by ID with new information
 */

import { updateTaskById } from '../../../../scripts/modules/task-manager.js';
import {
	enableSilentMode,
	disableSilentMode,
	isSilentMode
} from '../../../../scripts/modules/utils.js';
import { createLogWrapper } from '../../tools/utils.js';

/**
 * Direct function wrapper for updateTaskById with error handling.
 *
 * @param {Object} args - Command arguments containing id, prompt, useResearch, tasksJsonPath, and projectRoot.
 * @param {string} args.tasksJsonPath - Explicit path to the tasks.json file.
 * @param {string} args.id - Task ID (or subtask ID like "1.2").
 * @param {string} args.prompt - New information/context prompt.
 * @param {boolean} [args.research] - Whether to use research role.
 * @param {string} [args.projectRoot] - Project root path.
 * @param {Object} log - Logger object.
 * @param {Object} context - Context object containing session data.
 * @returns {Promise<Object>} - Result object with success status and data/error information.
 */
export async function updateTaskByIdDirect(args, log, context = {}) {
	const { session } = context;
	// Destructure expected args, including projectRoot
	const { tasksJsonPath, id, prompt, research, projectRoot } = args;

	const logWrapper = createLogWrapper(log);

	try {
		logWrapper.info(
			`Updating task by ID via direct function. ID: ${id}, ProjectRoot: ${projectRoot}`
		);

		// Check if tasksJsonPath was provided
		if (!tasksJsonPath) {
			const errorMessage = 'tasksJsonPath is required but was not provided.';
			logWrapper.error(errorMessage);
			return {
				success: false,
				error: { code: 'MISSING_ARGUMENT', message: errorMessage },
				fromCache: false
			};
		}

		// Check required parameters
		if (!id) {
			const errorMessage =
				'No task ID specified. Please provide a task ID to update.';
			logWrapper.error(errorMessage);
			return {
				success: false,
				error: { code: 'MISSING_TASK_ID', message: errorMessage },
				fromCache: false
			};
		}

		// Check if this is manual update (has specific field updates) or AI-driven (has prompt)
		const isManualUpdate =
			!prompt &&
			(args.title ||
				args.description ||
				args.priority ||
				args.details ||
				args.testStrategy);

		if (!prompt && !isManualUpdate) {
			const errorMessage =
				'No prompt or field updates specified. Please provide either a prompt for AI update or specific fields to update.';
			logWrapper.error(errorMessage);
			return {
				success: false,
				error: { code: 'MISSING_UPDATE_DATA', message: errorMessage },
				fromCache: false
			};
		}

		// Parse taskId - handle both string and number values
		let taskId;
		if (typeof id === 'string') {
			// Handle subtask IDs (e.g., "5.2")
			if (id.includes('.')) {
				taskId = id; // Keep as string for subtask IDs
			} else {
				// Parse as integer for main task IDs
				taskId = parseInt(id, 10);
				if (isNaN(taskId)) {
					const errorMessage = `Invalid task ID: ${id}. Task ID must be a positive integer or subtask ID (e.g., "5.2").`;
					logWrapper.error(errorMessage);
					return {
						success: false,
						error: { code: 'INVALID_TASK_ID', message: errorMessage },
						fromCache: false
					};
				}
			}
		} else {
			taskId = id;
		}

		// Use the provided path
		const tasksPath = tasksJsonPath;

		if (isManualUpdate) {
			// Handle manual update by directly modifying task fields
			logWrapper.info(`Manually updating task ${taskId} with field updates`);

			try {
				const { readJSON, writeJSON } = await import(
					'../../../../scripts/modules/utils.js'
				);

				// Read current tasks
				const data = readJSON(tasksPath);
				if (!data || !data.tasks) {
					throw new Error(`No valid tasks found in ${tasksPath}`);
				}

				// Find the task to update
				const taskIndex = data.tasks.findIndex((task) => task.id === taskId);
				if (taskIndex === -1) {
					return {
						success: false,
						error: {
							code: 'TASK_NOT_FOUND',
							message: `Task ${taskId} not found`
						},
						fromCache: false
					};
				}

				const task = data.tasks[taskIndex];

				// Update only the provided fields
				if (args.title !== undefined) task.title = args.title;
				if (args.description !== undefined) task.description = args.description;
				if (args.priority !== undefined) task.priority = args.priority;
				if (args.details !== undefined) task.details = args.details;
				if (args.testStrategy !== undefined)
					task.testStrategy = args.testStrategy;

				// Save the updated tasks
				writeJSON(tasksPath, data);

				logWrapper.info(`Successfully updated task ${taskId} manually`);

				return {
					success: true,
					data: {
						message: `Successfully updated task ${taskId}`,
						taskId: taskId,
						tasksPath: tasksPath,
						updated: true,
						updatedTask: task
					},
					fromCache: false
				};
			} catch (error) {
				logWrapper.error(`Error in manual update: ${error.message}`);
				return {
					success: false,
					error: {
						code: 'MANUAL_UPDATE_ERROR',
						message: error.message || 'Unknown error in manual update'
					},
					fromCache: false
				};
			}
		} else {
			// AI-driven update
			const useResearch = research === true;

			logWrapper.info(
				`Updating task with ID ${taskId} with prompt "${prompt}" and research: ${useResearch}`
			);

			const wasSilent = isSilentMode();
			if (!wasSilent) {
				enableSilentMode();
			}

			try {
				// Execute core updateTaskById function with proper parameters
				const coreResult = await updateTaskById(
					tasksPath,
					taskId,
					prompt,
					useResearch,
					{
						mcpLog: logWrapper,
						session,
						projectRoot,
						commandName: 'update-task',
						outputType: 'mcp'
					},
					'json'
				);

				// Check if the core function returned null or an object without success
				if (!coreResult || coreResult.updatedTask === null) {
					// Core function logs the reason, just return success with info
					const message = `Task ${taskId} was not updated (likely already completed).`;
					logWrapper.info(message);
					return {
						success: true,
						data: {
							message: message,
							taskId: taskId,
							updated: false,
							telemetryData: coreResult?.telemetryData
						},
						fromCache: false
					};
				}

				// Task was updated successfully
				const successMessage = `Successfully updated task with ID ${taskId} based on the prompt`;
				logWrapper.success(successMessage);
				return {
					success: true,
					data: {
						message: successMessage,
						taskId: taskId,
						tasksPath: tasksPath,
						useResearch: useResearch,
						updated: true,
						updatedTask: coreResult.updatedTask,
						telemetryData: coreResult.telemetryData
					},
					fromCache: false
				};
			} catch (error) {
				logWrapper.error(`Error updating task by ID: ${error.message}`);
				return {
					success: false,
					error: {
						code: 'UPDATE_TASK_CORE_ERROR',
						message: error.message || 'Unknown error updating task'
					},
					fromCache: false
				};
			} finally {
				if (!wasSilent && isSilentMode()) {
					disableSilentMode();
				}
			}
		}
	} catch (error) {
		logWrapper.error(`Setup error in updateTaskByIdDirect: ${error.message}`);
		if (isSilentMode()) disableSilentMode();
		return {
			success: false,
			error: {
				code: 'DIRECT_FUNCTION_SETUP_ERROR',
				message: error.message || 'Unknown setup error'
			},
			fromCache: false
		};
	}
}
