'use client';

import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Task } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';

interface TaskSearchModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSelect: (taskId: number) => void;
	tasks: Task[];
	excludeIds?: number[];
}

export const TaskSearchModal: React.FC<TaskSearchModalProps> = ({
	isOpen,
	onClose,
	onSelect,
	tasks,
	excludeIds = []
}) => {
	const [searchQuery, setSearchQuery] = useState('');

	const filteredTasks = useMemo(() => {
		const availableTasks = tasks.filter(
			(task) => !excludeIds.includes(task.id)
		);

		if (!searchQuery) return availableTasks;

		const query = searchQuery.toLowerCase();
		return availableTasks.filter(
			(task) =>
				task.title.toLowerCase().includes(query) ||
				task.id.toString().includes(query) ||
				task.description?.toLowerCase().includes(query)
		);
	}, [tasks, excludeIds, searchQuery]);

	const handleSelect = (taskId: number) => {
		onSelect(taskId);
		setSearchQuery('');
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>タスクを選択</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<Input
							placeholder="タスクを検索..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
							autoFocus
						/>
					</div>

					<div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-2">
						{filteredTasks.length === 0 ? (
							<p className="text-center text-gray-500 py-8">
								{searchQuery
									? '検索結果がありません'
									: '選択可能なタスクがありません'}
							</p>
						) : (
							filteredTasks.map((task) => (
								<button
									key={task.id}
									onClick={() => handleSelect(task.id)}
									className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors border"
								>
									<div className="flex items-center justify-between">
										<div className="flex-1">
											<div className="flex items-center space-x-2">
												<span className="font-medium">#{task.id}</span>
												<span className="text-gray-700">{task.title}</span>
											</div>
											{task.description && (
												<p className="text-sm text-gray-500 mt-1 line-clamp-1">
													{task.description}
												</p>
											)}
										</div>
										<div className="flex items-center space-x-2 ml-4">
											<StatusBadge status={task.status} />
											<Badge
												variant={
													task.priority === 'high'
														? 'destructive'
														: task.priority === 'medium'
															? 'default'
															: 'secondary'
												}
											>
												{task.priority === 'high'
													? '高'
													: task.priority === 'medium'
														? '中'
														: '低'}
											</Badge>
										</div>
									</div>
								</button>
							))
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
