'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Task } from '@/lib/api';
import { api } from '@/lib/api';
import { TaskDetailHeader } from './TaskDetailHeader';
import { TaskDetailContent } from './TaskDetailContent';
import { TaskDetailSidebar } from './TaskDetailSidebar';
import { toast } from 'sonner';

interface TaskDetailPanelProps {
	taskId: number | null;
	projectId: string;
	isOpen: boolean;
	onClose: () => void;
	onTaskUpdate?: (task: Task) => void;
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
	taskId,
	projectId,
	isOpen,
	onClose,
	onTaskUpdate
}) => {
	const [task, setTask] = useState<Task | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (taskId && isOpen) {
			loadTaskDetails();
		} else {
			setTask(null);
		}
	}, [taskId, isOpen]);

	const loadTaskDetails = async () => {
		if (!taskId) return;

		setLoading(true);
		try {
			const taskData = await api.getTask(taskId);
			setTask(taskData);
		} catch (error) {
			console.error('Failed to load task details:', error);
			toast.error('タスクの詳細を読み込めませんでした');
		} finally {
			setLoading(false);
		}
	};

	const handleTaskUpdate = async (updates: Partial<Task>) => {
		if (!task) return;

		try {
			const updated = await api.updateTask(task.id, updates);
			setTask(updated);
			onTaskUpdate?.(updated);
			toast.success('タスクを更新しました');
		} catch (error) {
			console.error('Failed to update task:', error);
			toast.error('タスクの更新に失敗しました');
		}
	};

	const handleSubtaskAdd = async (title: string) => {
		if (!task) return;

		try {
			const updated = await api.addSubtask(task.id, { title });
			setTask(updated);
			onTaskUpdate?.(updated);
		} catch (error) {
			console.error('Failed to add subtask:', error);
			toast.error('サブタスクの追加に失敗しました');
		}
	};

	const handleSubtaskUpdate = async (
		subtaskId: number | string,
		updates: any
	) => {
		if (!task) return;

		try {
			const updated = await api.updateSubtask(
				task.id,
				Number(subtaskId),
				updates
			);
			setTask(updated);
			onTaskUpdate?.(updated);
		} catch (error) {
			console.error('Failed to update subtask:', error);
			toast.error('サブタスクの更新に失敗しました');
		}
	};

	const handleSubtaskRemove = async (subtaskId: number | string) => {
		if (!task) return;

		try {
			const updated = await api.removeSubtask(task.id, Number(subtaskId));
			setTask(updated);
			onTaskUpdate?.(updated);
		} catch (error) {
			console.error('Failed to remove subtask:', error);
			toast.error('サブタスクの削除に失敗しました');
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Overlay */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
						className="fixed inset-0 bg-black/30 z-40"
						onClick={onClose}
					/>

					{/* Panel */}
					<motion.div
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ duration: 0.3, ease: 'easeOut' }}
						className="fixed right-0 top-0 h-screen w-[640px] bg-white shadow-xl z-50 flex flex-col"
					>
						<TaskDetailHeader
							task={task}
							loading={loading}
							onClose={onClose}
							onTaskUpdate={handleTaskUpdate}
						/>

						{task && (
							<div className="flex-1 flex overflow-hidden">
								<TaskDetailContent
									task={task}
									projectId={projectId}
									onTaskUpdate={handleTaskUpdate}
									onSubtaskAdd={handleSubtaskAdd}
									onSubtaskUpdate={handleSubtaskUpdate}
									onSubtaskRemove={handleSubtaskRemove}
								/>

								<TaskDetailSidebar
									task={task}
									projectId={projectId}
									onTaskUpdate={handleTaskUpdate}
								/>
							</div>
						)}
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
};
