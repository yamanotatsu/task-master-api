'use client';

import React, { useState } from 'react';
import { Plus, X, CheckCircle2, Circle, GripVertical } from 'lucide-react';
import { Subtask } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface SubtaskManagerProps {
	subtasks: Subtask[];
	onSubtaskAdd: (title: string) => void;
	onSubtaskUpdate: (
		subtaskId: number | string,
		updates: Partial<Subtask>
	) => void;
	onSubtaskRemove: (subtaskId: number | string) => void;
}

export const SubtaskManager: React.FC<SubtaskManagerProps> = ({
	subtasks,
	onSubtaskAdd,
	onSubtaskUpdate,
	onSubtaskRemove
}) => {
	const [isAddingSubtask, setIsAddingSubtask] = useState(false);
	const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
	const [editingSubtaskId, setEditingSubtaskId] = useState<
		number | string | null
	>(null);
	const [editingTitle, setEditingTitle] = useState('');

	const completedCount = subtasks.filter(
		(s) => s.completed || s.status === 'completed'
	).length;
	const progress =
		subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

	const handleAddSubtask = () => {
		if (newSubtaskTitle.trim()) {
			onSubtaskAdd(newSubtaskTitle.trim());
			setNewSubtaskTitle('');
			setIsAddingSubtask(false);
		}
	};

	const handleEditStart = (subtask: Subtask) => {
		setEditingSubtaskId(subtask.id);
		setEditingTitle(subtask.title);
	};

	const handleEditSave = (subtaskId: number | string) => {
		if (editingTitle.trim()) {
			onSubtaskUpdate(subtaskId, { title: editingTitle.trim() });
		}
		setEditingSubtaskId(null);
		setEditingTitle('');
	};

	const toggleSubtaskCompletion = (subtask: Subtask) => {
		const isCompleted =
			subtask.completed ||
			subtask.status === 'completed' ||
			subtask.status === 'done';
		onSubtaskUpdate(subtask.id, {
			completed: !isCompleted,
			status: !isCompleted ? 'done' : 'pending'
		});
	};

	// Sort subtasks: incomplete first, then completed
	const sortedSubtasks = [...subtasks].sort((a, b) => {
		const aCompleted =
			a.completed || a.status === 'completed' || a.status === 'done';
		const bCompleted =
			b.completed || b.status === 'completed' || b.status === 'done';
		if (aCompleted === bCompleted) return 0;
		return aCompleted ? 1 : -1;
	});

	return (
		<div className="space-y-3">
			{/* Progress Bar */}
			{subtasks.length > 0 && (
				<div className="mb-3">
					<div className="flex justify-between text-xs text-gray-600 mb-1">
						<span>
							{completedCount}/{subtasks.length} 完了
						</span>
						<span>{Math.round(progress)}%</span>
					</div>
					<Progress value={progress} className="h-2" />
				</div>
			)}

			{/* Subtask List */}
			<div className="space-y-1">
				{sortedSubtasks.map((subtask) => {
					const isCompleted =
						subtask.completed ||
						subtask.status === 'completed' ||
						subtask.status === 'done';
					const isEditing = editingSubtaskId === subtask.id;

					return (
						<div
							key={subtask.id}
							className="group flex items-center px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
						>
							<button
								onClick={() => toggleSubtaskCompletion(subtask)}
								className="mr-2"
							>
								{isCompleted ? (
									<CheckCircle2 className="h-4 w-4 text-green-500" />
								) : (
									<Circle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
								)}
							</button>

							{isEditing ? (
								<Input
									value={editingTitle}
									onChange={(e) => setEditingTitle(e.target.value)}
									onBlur={() => handleEditSave(subtask.id)}
									onKeyPress={(e) =>
										e.key === 'Enter' && handleEditSave(subtask.id)
									}
									className="flex-1 text-sm"
									autoFocus
								/>
							) : (
								<span
									className={`flex-1 text-sm cursor-pointer ${
										isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'
									}`}
									onClick={() => handleEditStart(subtask)}
								>
									{subtask.title}
								</span>
							)}

							<button
								onClick={() => onSubtaskRemove(subtask.id)}
								className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-gray-200 rounded transition-all"
							>
								<X className="h-3 w-3 text-gray-500" />
							</button>
						</div>
					);
				})}
			</div>

			{/* Add Subtask */}
			{isAddingSubtask ? (
				<div className="flex items-center space-x-2">
					<Input
						value={newSubtaskTitle}
						onChange={(e) => setNewSubtaskTitle(e.target.value)}
						onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
						placeholder="サブタスクのタイトル..."
						className="flex-1 text-sm"
						autoFocus
					/>
					<Button size="sm" onClick={handleAddSubtask}>
						追加
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onClick={() => {
							setIsAddingSubtask(false);
							setNewSubtaskTitle('');
						}}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			) : (
				<Button
					size="sm"
					variant="outline"
					onClick={() => setIsAddingSubtask(true)}
					className="w-full"
				>
					<Plus className="mr-2 h-4 w-4" />
					サブタスクを追加
				</Button>
			)}
		</div>
	);
};
