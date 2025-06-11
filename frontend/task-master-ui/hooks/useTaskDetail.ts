import { useState, useCallback } from 'react';

export const useTaskDetail = () => {
	const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
	const [isOpen, setIsOpen] = useState(false);

	const openTaskDetail = useCallback((taskId: number) => {
		setSelectedTaskId(taskId);
		setIsOpen(true);
	}, []);

	const closeTaskDetail = useCallback(() => {
		setIsOpen(false);
		// Delay clearing task ID to allow animation to complete
		setTimeout(() => {
			setSelectedTaskId(null);
		}, 300);
	}, []);

	return {
		selectedTaskId,
		isOpen,
		openTaskDetail,
		closeTaskDetail
	};
};
