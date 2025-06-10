import { useState, useCallback } from 'react';

export const useTaskSelection = () => {
	const [selectedTasks, setSelectedTasks] = useState<number[]>([]);

	const selectTask = useCallback((taskId: number) => {
		setSelectedTasks((prev) => [...prev, taskId]);
	}, []);

	const deselectTask = useCallback((taskId: number) => {
		setSelectedTasks((prev) => prev.filter((id) => id !== taskId));
	}, []);

	const toggleTaskSelection = useCallback((taskId: number) => {
		setSelectedTasks((prev) =>
			prev.includes(taskId)
				? prev.filter((id) => id !== taskId)
				: [...prev, taskId]
		);
	}, []);

	const selectAllTasks = useCallback((taskIds: number[]) => {
		setSelectedTasks(taskIds);
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedTasks([]);
	}, []);

	const isTaskSelected = useCallback(
		(taskId: number) => {
			return selectedTasks.includes(taskId);
		},
		[selectedTasks]
	);

	return {
		selectedTasks,
		selectTask,
		deselectTask,
		toggleTaskSelection,
		selectAllTasks,
		clearSelection,
		isTaskSelected,
		setSelectedTasks
	};
};
