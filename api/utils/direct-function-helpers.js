import path from 'path';
import fs from 'fs';

/**
 * Helper to get the project root path
 */
export function getProjectRoot() {
	return (
		process.env.TASK_PROJECT_ROOT ||
		path.join(process.cwd(), 'projects', 'default')
	);
}

/**
 * Helper to get the tasks.json path
 */
export function getTasksJsonPath() {
	return path.join(getProjectRoot(), 'tasks.json');
}

/**
 * Helper to ensure project directory exists
 */
export function ensureProjectDirectory() {
	const projectRoot = getProjectRoot();
	if (!fs.existsSync(projectRoot)) {
		fs.mkdirSync(projectRoot, { recursive: true });
	}

	const tasksPath = getTasksJsonPath();
	if (!fs.existsSync(tasksPath)) {
		fs.writeFileSync(
			tasksPath,
			JSON.stringify(
				{
					tasks: [],
					lastTaskId: 0
				},
				null,
				2
			)
		);
	}

	return projectRoot;
}

/**
 * Prepare arguments for direct functions
 * Maps common API parameters to the expected direct function parameters
 */
export function prepareDirectFunctionArgs(functionName, apiArgs = {}) {
	const projectRoot = getProjectRoot();
	const tasksJsonPath = getTasksJsonPath();

	// Common mappings
	const commonArgs = {
		tasksJsonPath,
		projectRoot
	};

	// Function-specific argument mappings
	switch (functionName) {
		case 'listTasks':
			return {
				tasksJsonPath,
				status: apiArgs.filter || 'all',
				withSubtasks: apiArgs.withSubtasks || false
			};

		case 'showTask':
			return {
				tasksJsonPath,
				id: apiArgs.taskId,
				format: apiArgs.format || 'json',
				projectRoot
			};

		case 'addTask':
			// Handle both AI-driven and manual task creation
			if (apiArgs.prompt) {
				return {
					tasksJsonPath,
					prompt: apiArgs.prompt,
					research: apiArgs.research || false,
					dependencies: apiArgs.dependencies || [],
					priority: apiArgs.priority || 'medium',
					projectRoot
				};
			}
			return {
				tasksJsonPath,
				title: apiArgs.title,
				description: apiArgs.description,
				priority: apiArgs.priority || 'medium',
				dependencies: apiArgs.dependencies || [],
				details: apiArgs.details,
				testStrategy: apiArgs.testStrategy,
				projectRoot
			};

		case 'updateTaskById':
			// If prompt is provided, it's an AI-driven update
			if (apiArgs.prompt) {
				return {
					tasksJsonPath,
					id: apiArgs.taskId,
					prompt: apiArgs.prompt,
					research: apiArgs.research || false,
					projectRoot
				};
			}
			// Otherwise, it's a manual update with specific fields
			return {
				tasksJsonPath,
				id: apiArgs.taskId,
				title: apiArgs.updates?.title || apiArgs.title,
				description: apiArgs.updates?.description || apiArgs.description,
				priority: apiArgs.updates?.priority || apiArgs.priority,
				details: apiArgs.updates?.details || apiArgs.details,
				testStrategy: apiArgs.updates?.testStrategy || apiArgs.testStrategy,
				projectRoot
			};

		case 'removeTask':
			return {
				tasksJsonPath,
				id: apiArgs.taskId,
				projectRoot
			};

		case 'setTaskStatus':
			return {
				tasksJsonPath,
				id: apiArgs.taskId,
				status: apiArgs.status,
				projectRoot
			};

		case 'expandTask':
			return {
				tasksJsonPath,
				id: apiArgs.id || apiArgs.taskId, // expandTask expects 'id'
				num: apiArgs.numSubtasks || apiArgs.num || 5, // expandTask expects 'num'
				research: apiArgs.research || apiArgs.useResearch || false, // expandTask expects 'research'
				prompt: apiArgs.prompt,
				force: apiArgs.force,
				projectRoot
			};

		case 'clearSubtasks':
			return {
				tasksJsonPath,
				taskId: apiArgs.taskId
			};

		case 'addSubtask':
			return {
				tasksJsonPath,
				id: apiArgs.parentTaskId, // addSubtask expects 'id' not 'parentTaskId'
				title: apiArgs.title,
				description: apiArgs.description
			};

		case 'updateSubtaskById':
			return {
				tasksJsonPath,
				parentTaskId: apiArgs.parentTaskId,
				subtaskId: apiArgs.subtaskId,
				title: apiArgs.title,
				description: apiArgs.description
			};

		case 'removeSubtask':
			return {
				tasksJsonPath,
				parentTaskId: apiArgs.parentTaskId,
				subtaskId: apiArgs.subtaskId
			};

		case 'addDependency':
			return {
				tasksJsonPath,
				id: apiArgs.taskId, // addDependency expects 'id' not 'taskId'
				dependsOn: apiArgs.dependencyId // expects 'dependsOn' not 'dependencyId'
			};

		case 'removeDependency':
			return {
				tasksJsonPath,
				taskId: apiArgs.taskId,
				dependencyId: apiArgs.dependencyId
			};

		case 'validateDependencies':
			return {
				tasksJsonPath,
				autoFix: apiArgs.autoFix || false
			};

		case 'fixDependencies':
			return {
				tasksJsonPath
			};

		case 'nextTask':
			return {
				tasksJsonPath
			};

		case 'analyzeTaskComplexity':
			return {
				tasksJsonPath,
				outputPath:
					apiArgs.outputPath ||
					path.join(
						projectRoot,
						`task-complexity-${apiArgs.taskId || 'report'}-${Date.now()}.json`
					),
				threshold: apiArgs.threshold,
				research: apiArgs.research || false,
				projectRoot,
				// If a single taskId is provided, convert it to the 'id' parameter expected by the core function
				id: apiArgs.taskId ? String(apiArgs.taskId) : undefined,
				ids: apiArgs.ids,
				from: apiArgs.from,
				to: apiArgs.to,
				session: apiArgs.session
			};

		case 'complexityReport':
			return {
				tasksJsonPath
			};

		case 'generateTaskFiles':
			return {
				tasksJsonPath,
				projectRoot
			};

		case 'expandAllTasks':
			return {
				tasksJsonPath,
				session: apiArgs.session
			};

		case 'initializeProject':
			return {
				...apiArgs,
				projectRoot: apiArgs.projectPath || projectRoot
			};

		default:
			return { ...commonArgs, ...apiArgs };
	}
}
