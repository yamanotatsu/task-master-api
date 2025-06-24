'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Circle } from 'lucide-react';
import { Task } from '@/lib/api';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface TaskDetailHeaderProps {
	task: Task | null;
	loading: boolean;
	onClose: () => void;
	onTaskUpdate: (updates: Partial<Task>) => void;
}

export const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
	task,
	loading,
	onClose,
	onTaskUpdate
}) => {
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [title, setTitle] = useState('');

	const handleTitleEdit = () => {
		if (task) {
			setTitle(task.title);
			setIsEditingTitle(true);
		}
	};

	const handleTitleSave = () => {
		if (task && title.trim() && title !== task.title) {
			onTaskUpdate({ title: title.trim() });
		}
		setIsEditingTitle(false);
	};

	const statusOptions: Array<{ value: Task['status']; label: string }> = [
		{ value: 'pending', label: '未着手' },
		{ value: 'in-progress', label: '進行中' },
		{ value: 'review', label: 'レビュー中' },
		{ value: 'done', label: '完了' },
		{ value: 'deferred', label: '延期' },
		{ value: 'cancelled', label: 'キャンセル' }
	];

	const isCompleted = task?.status === 'done';

	return (
		<div className="border-b px-6 py-4">
			<div className="flex items-start justify-between">
				<div className="flex-1 pr-4">
					{loading ? (
						<Skeleton className="h-8 w-3/4 mb-2" />
					) : task ? (
						<>
							{isEditingTitle ? (
								<Input
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									onBlur={handleTitleSave}
									onKeyPress={(e) => e.key === 'Enter' && handleTitleSave()}
									className="text-xl font-semibold mb-2"
									autoFocus
								/>
							) : (
								<h2
									className="text-xl font-semibold mb-2 cursor-pointer hover:text-blue-600"
									onClick={handleTitleEdit}
								>
									{task.title}
								</h2>
							)}

							<div className="flex items-center space-x-4">
								<button
									onClick={() =>
										onTaskUpdate({
											status: isCompleted ? 'in-progress' : 'done'
										})
									}
									className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
								>
									{isCompleted ? (
										<CheckCircle2 className="h-4 w-4 text-green-500" />
									) : (
										<Circle className="h-4 w-4" />
									)}
									<span>{isCompleted ? '完了済み' : '未完了'}</span>
								</button>

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<button>
											<StatusBadge status={task.status} />
										</button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										{statusOptions.map((option) => (
											<DropdownMenuItem
												key={option.value}
												onClick={() => onTaskUpdate({ status: option.value })}
											>
												<StatusBadge status={option.value} />
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>

								<span className="text-sm text-gray-500">#{task.id}</span>
							</div>
						</>
					) : null}
				</div>

				<Button
					variant="ghost"
					size="sm"
					onClick={onClose}
					className="hover:bg-gray-100"
				>
					<X className="h-5 w-5" />
				</Button>
			</div>
		</div>
	);
};
