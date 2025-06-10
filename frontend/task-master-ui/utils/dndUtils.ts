import { Task } from '@/lib/api';

export const canDropTask = (
	draggedTask: Task,
	targetTask: Task,
	position: 'before' | 'after'
): boolean => {
	// Can't drop a task on itself
	if (draggedTask.id === targetTask.id) return false;

	// Can't drop a parent task into its own subtask
	if (isSubtaskOf(targetTask, draggedTask)) return false;

	return true;
};

export const isSubtaskOf = (
	potentialSubtask: Task,
	potentialParent: Task
): boolean => {
	// This is a simplified check - in a real app, you'd check the actual parent-child relationship
	return potentialParent.subtasks.some((st) => st.id === potentialSubtask.id);
};

export const reorderTasks = (
	tasks: Task[],
	sourceIndex: number,
	destinationIndex: number
): Task[] => {
	const result = Array.from(tasks);
	const [removed] = result.splice(sourceIndex, 1);
	result.splice(destinationIndex, 0, removed);
	return result;
};

export const moveTaskBetweenProjects = (
	sourceTasks: Task[],
	destinationTasks: Task[],
	sourceIndex: number,
	destinationIndex: number
): { source: Task[]; destination: Task[] } => {
	const sourceClone = Array.from(sourceTasks);
	const destClone = Array.from(destinationTasks);

	const [removed] = sourceClone.splice(sourceIndex, 1);
	destClone.splice(destinationIndex, 0, removed);

	return {
		source: sourceClone,
		destination: destClone
	};
};

export const getDragPreview = (task: Task): string => {
	const subtaskCount = task.subtasks?.length || 0;
	const dependencyCount = task.dependencies?.length || 0;

	let preview = task.title;

	if (subtaskCount > 0) {
		preview += ` (${subtaskCount} サブタスク)`;
	}

	if (dependencyCount > 0) {
		preview += ` [${dependencyCount} 依存]`;
	}

	return preview;
};

export const validateDrop = (
	draggedTask: Task,
	tasks: Task[],
	newIndex: number
): { valid: boolean; warning?: string } => {
	// Check if the new position would violate dependencies
	const taskDependencies = draggedTask.dependencies;

	for (const depId of taskDependencies) {
		const depIndex = tasks.findIndex((t) => t.id === depId);
		if (depIndex > newIndex) {
			return {
				valid: true,
				warning: '依存関係の順序に注意してください'
			};
		}
	}

	return { valid: true };
};
