import { useState, useCallback } from 'react';
import { Task } from '@/lib/api';
import { toast } from 'sonner';

interface DragState {
	draggedTaskId: number | null;
	draggedOverTaskId: number | null;
	dropPosition: 'before' | 'after' | null;
}

export const useDragAndDrop = (
	tasks: Task[],
	onTasksReorder: (tasks: Task[]) => void
) => {
	const [dragState, setDragState] = useState<DragState>({
		draggedTaskId: null,
		draggedOverTaskId: null,
		dropPosition: null
	});

	const handleDragStart = useCallback((taskId: number) => {
		setDragState((prev) => ({
			...prev,
			draggedTaskId: taskId
		}));
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent, taskId: number) => {
		e.preventDefault();

		const rect = (e.target as HTMLElement).getBoundingClientRect();
		const y = e.clientY - rect.top;
		const height = rect.height;
		const position = y < height / 2 ? 'before' : 'after';

		setDragState((prev) => ({
			...prev,
			draggedOverTaskId: taskId,
			dropPosition: position
		}));
	}, []);

	const handleDragEnd = useCallback(() => {
		setDragState({
			draggedTaskId: null,
			draggedOverTaskId: null,
			dropPosition: null
		});
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();

			const { draggedTaskId, draggedOverTaskId, dropPosition } = dragState;

			if (!draggedTaskId || !draggedOverTaskId || !dropPosition) {
				return;
			}

			if (draggedTaskId === draggedOverTaskId) {
				handleDragEnd();
				return;
			}

			const draggedIndex = tasks.findIndex((t) => t.id === draggedTaskId);
			const targetIndex = tasks.findIndex((t) => t.id === draggedOverTaskId);

			if (draggedIndex === -1 || targetIndex === -1) {
				handleDragEnd();
				return;
			}

			const newTasks = [...tasks];
			const [draggedTask] = newTasks.splice(draggedIndex, 1);

			// Adjust target index based on drop position and relative positions
			let insertIndex = targetIndex;
			if (dropPosition === 'after') {
				insertIndex =
					draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
			} else {
				insertIndex =
					draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
			}

			newTasks.splice(insertIndex, 0, draggedTask);

			// Check for dependency issues
			const hasDependencyIssue = checkDependencyOrder(draggedTask, newTasks);
			if (hasDependencyIssue) {
				toast.warning(
					'依存関係の順序に問題があります。タスクの依存関係を確認してください。'
				);
			}

			onTasksReorder(newTasks);
			handleDragEnd();
		},
		[dragState, tasks, onTasksReorder, handleDragEnd]
	);

	return {
		draggedTaskId: dragState.draggedTaskId,
		draggedOverTaskId: dragState.draggedOverTaskId,
		dropPosition: dragState.dropPosition,
		handleDragStart,
		handleDragOver,
		handleDragEnd,
		handleDrop
	};
};

function checkDependencyOrder(task: Task, tasks: Task[]): boolean {
	const taskIndex = tasks.findIndex((t) => t.id === task.id);

	for (const depId of task.dependencies) {
		const depIndex = tasks.findIndex((t) => t.id === depId);
		if (depIndex > taskIndex) {
			return true;
		}
	}

	return false;
}
