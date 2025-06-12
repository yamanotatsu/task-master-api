import { supabase } from './supabase.js';

/**
 * Get a project by ID with member information
 */
export async function getProjectById(projectId) {
	const { data, error } = await supabase
		.from('projects')
		.select(
			`
      *,
      project_members (
        member:members (*)
      )
    `
		)
		.eq('id', projectId)
		.single();

	if (error) throw error;

	// Transform the data to match API format
	if (data) {
		data.members = data.project_members?.map((pm) => pm.member) || [];
		delete data.project_members;
	}

	return data;
}

/**
 * Get all projects with computed progress
 */
export async function getAllProjects() {
	const { data: projects, error } = await supabase
		.from('projects')
		.select(
			`
      *,
      project_members (
        member:members (*)
      )
    `
		)
		.order('updated_at', { ascending: false });

	if (error) throw error;

	// For each project, calculate progress
	const projectsWithProgress = await Promise.all(
		projects.map(async (project) => {
			const { data: tasks } = await supabase
				.from('tasks')
				.select('status')
				.eq('project_id', project.id);

			const totalTasks = tasks?.length || 0;
			const completedTasks =
				tasks?.filter((t) => t.status === 'completed' || t.status === 'done')
					.length || 0;

			const progress =
				totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

			return {
				...project,
				totalTasks,
				completedTasks,
				progress,
				members: project.project_members?.map((pm) => pm.member) || []
			};
		})
	);

	return projectsWithProgress;
}

/**
 * Get tasks with full information including assignee
 */
export async function getTasksWithDetails(projectId = null, filters = {}) {
	let query = supabase.from('tasks').select(`
      *,
      assignee:profiles!tasks_assignee_id_fkey (
        id,
        full_name,
        email,
        avatar_url
      ),
      subtasks (
        *,
        assignee:profiles!subtasks_assignee_id_fkey (
          id,
          full_name,
          email
        )
      ),
      dependencies:task_dependencies!task_dependencies_task_id_fkey (
        depends_on_task_id
      )
    `);

	// Apply filters
	if (projectId) {
		query = query.eq('project_id', projectId);
	}

	if (filters.status) {
		query = query.eq('status', filters.status);
	}

	if (filters.assignee) {
		query = query.eq('assignee_id', filters.assignee);
	}

	const { data, error } = await query.order('id', { ascending: true });

	if (error) throw error;

	// Transform dependencies to match expected format
	return (
		data?.map((task) => ({
			...task,
			assigneeName: task.assignee?.name,
			dependencies: task.dependencies?.map((d) => d.depends_on_task_id) || [],
			// Convert snake_case to camelCase for frontend compatibility
			testStrategy: task.test_strategy,
			test_strategy: undefined
		})) || []
	);
}

/**
 * Get a single task with full details
 */
export async function getTaskById(taskId) {
	const { data, error } = await supabase
		.from('tasks')
		.select(
			`
      *,
      assignee:profiles!tasks_assignee_id_fkey (
        id,
        full_name,
        email,
        avatar_url
      ),
      subtasks (
        *,
        assignee:profiles!subtasks_assignee_id_fkey (
          id,
          full_name,
          email
        )
      ),
      dependencies:task_dependencies!task_dependencies_task_id_fkey (
        depends_on_task_id
      )
    `
		)
		.eq('id', taskId)
		.single();

	if (error) throw error;

	if (data) {
		data.assigneeName = data.assignee?.name;
		data.dependencies =
			data.dependencies?.map((d) => d.depends_on_task_id) || [];
		// Convert snake_case to camelCase for frontend compatibility
		data.testStrategy = data.test_strategy;
		delete data.test_strategy;
	}

	return data;
}

/**
 * Create a new task
 */
export async function createTask(taskData) {
	const { dependencies, subtasks, ...task } = taskData;

	// Convert camelCase to snake_case for database
	if (task.testStrategy !== undefined) {
		task.test_strategy = task.testStrategy;
		delete task.testStrategy;
	}

	// Insert the task
	const { data: newTask, error } = await supabase
		.from('tasks')
		.insert(task)
		.select()
		.single();

	if (error) throw error;

	// Add dependencies if any
	if (dependencies && dependencies.length > 0) {
		const depData = dependencies.map((depId) => ({
			task_id: newTask.id,
			depends_on_task_id: depId
		}));

		await supabase.from('task_dependencies').insert(depData);
	}

	// Add subtasks if any
	if (subtasks && subtasks.length > 0) {
		const subtaskData = subtasks.map((subtask) => ({
			...subtask,
			task_id: newTask.id
		}));

		await supabase.from('subtasks').insert(subtaskData);
	}

	return getTaskById(newTask.id);
}

/**
 * Update a task
 */
export async function updateTask(taskId, updates) {
	const { dependencies, subtasks, ...taskUpdates } = updates;

	// Convert camelCase to snake_case for database
	if (taskUpdates.testStrategy !== undefined) {
		taskUpdates.test_strategy = taskUpdates.testStrategy;
		delete taskUpdates.testStrategy;
	}

	// Update the task
	const { error } = await supabase
		.from('tasks')
		.update(taskUpdates)
		.eq('id', taskId);

	if (error) throw error;

	// Update dependencies if provided
	if (dependencies !== undefined) {
		// Remove existing dependencies
		await supabase.from('task_dependencies').delete().eq('task_id', taskId);

		// Add new dependencies
		if (dependencies.length > 0) {
			const depData = dependencies.map((depId) => ({
				task_id: taskId,
				depends_on_task_id: depId
			}));

			await supabase.from('task_dependencies').insert(depData);
		}
	}

	return getTaskById(taskId);
}

/**
 * Add a dependency to a task
 */
export async function addTaskDependency(taskId, dependencyId) {
	const { error } = await supabase.from('task_dependencies').insert({
		task_id: taskId,
		depends_on_task_id: dependencyId
	});

	if (error) throw error;
	return getTaskById(taskId);
}

/**
 * Remove a dependency from a task
 */
export async function removeTaskDependency(taskId, dependencyId) {
	const { error } = await supabase
		.from('task_dependencies')
		.delete()
		.eq('task_id', taskId)
		.eq('depends_on_task_id', dependencyId);

	if (error) throw error;
	return getTaskById(taskId);
}

/**
 * Add a subtask
 */
export async function addSubtask(taskId, subtaskData) {
	const { data, error } = await supabase
		.from('subtasks')
		.insert({
			...subtaskData,
			task_id: taskId
		})
		.select()
		.single();

	if (error) throw error;
	return getTaskById(taskId);
}

/**
 * Update a subtask
 */
export async function updateSubtask(subtaskId, updates) {
	const { error } = await supabase
		.from('subtasks')
		.update(updates)
		.eq('id', subtaskId);

	if (error) throw error;

	// Get the task ID to return full task data
	const { data: subtask } = await supabase
		.from('subtasks')
		.select('task_id')
		.eq('id', subtaskId)
		.single();

	return getTaskById(subtask.task_id);
}

/**
 * Delete a subtask
 */
export async function deleteSubtask(subtaskId) {
	// Get task ID before deletion
	const { data: subtask } = await supabase
		.from('subtasks')
		.select('task_id')
		.eq('id', subtaskId)
		.single();

	const { error } = await supabase
		.from('subtasks')
		.delete()
		.eq('id', subtaskId);

	if (error) throw error;
	return getTaskById(subtask.task_id);
}

/**
 * Clear all subtasks for a task
 */
export async function clearSubtasks(taskId) {
	const { error } = await supabase
		.from('subtasks')
		.delete()
		.eq('task_id', taskId);

	if (error) throw error;
	return getTaskById(taskId);
}

/**
 * Calculate task statistics for a project
 */
export async function getProjectStatistics(projectId) {
	const { data: tasks, error } = await supabase
		.from('tasks')
		.select('status, priority, deadline, created_at, updated_at')
		.eq('project_id', projectId);

	if (error) throw error;

	// Calculate statistics
	const tasksByStatus = {};
	const tasksByPriority = {};
	let totalCompletionTime = 0;
	let completedCount = 0;
	const upcomingDeadlines = [];

	const now = new Date();
	const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

	tasks?.forEach((task) => {
		// Count by status
		tasksByStatus[task.status] = (tasksByStatus[task.status] || 0) + 1;

		// Count by priority
		tasksByPriority[task.priority] = (tasksByPriority[task.priority] || 0) + 1;

		// Calculate average completion time
		if (task.status === 'completed' || task.status === 'done') {
			const created = new Date(task.created_at);
			const updated = new Date(task.updated_at);
			const completionDays = Math.ceil(
				(updated - created) / (1000 * 60 * 60 * 24)
			);
			totalCompletionTime += completionDays;
			completedCount++;
		}

		// Check upcoming deadlines
		if (
			task.deadline &&
			task.status !== 'completed' &&
			task.status !== 'done'
		) {
			const deadline = new Date(task.deadline);
			if (deadline >= now && deadline <= oneWeekFromNow) {
				upcomingDeadlines.push({
					taskId: task.id,
					title: task.title,
					deadline: task.deadline
				});
			}
		}
	});

	const averageCompletionTime =
		completedCount > 0 ? totalCompletionTime / completedCount : 0;

	return {
		tasksByStatus,
		tasksByPriority,
		averageCompletionTime,
		upcomingDeadlines: upcomingDeadlines.sort(
			(a, b) => new Date(a.deadline) - new Date(b.deadline)
		)
	};
}

// No need for module.exports with ES modules - all functions are already exported
