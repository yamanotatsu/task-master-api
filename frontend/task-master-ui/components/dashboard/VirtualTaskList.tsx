'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Task } from '@/lib/api';
import { TaskRow } from './TaskRow';

interface VirtualTaskListProps {
	tasks: Task[];
	projectId: string;
	onTaskClick: (taskId: number) => void;
	onTaskStatusChange: (taskId: number, status: Task['status']) => void;
	onTaskDelete: (taskId: number) => void;
	selectedTasks: number[];
	onTaskSelectionChange: (taskIds: number[]) => void;
}

export const VirtualTaskList: React.FC<VirtualTaskListProps> = ({
	tasks,
	projectId,
	onTaskClick,
	onTaskStatusChange,
	onTaskDelete,
	selectedTasks,
	onTaskSelectionChange
}) => {
	const parentRef = useRef<HTMLDivElement>(null);
	const [expandedTasks, setExpandedTasks] = React.useState<Set<number>>(
		new Set()
	);

	const rowVirtualizer = useVirtualizer({
		count: tasks.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 64, // Estimated row height
		overscan: 10
	});

	const toggleTaskExpansion = (taskId: number) => {
		setExpandedTasks((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(taskId)) {
				newSet.delete(taskId);
			} else {
				newSet.add(taskId);
			}
			return newSet;
		});
	};

	const handleTaskSelect = (taskId: number, checked: boolean) => {
		if (checked) {
			onTaskSelectionChange([...selectedTasks, taskId]);
		} else {
			onTaskSelectionChange(selectedTasks.filter((id) => id !== taskId));
		}
	};

	return (
		<div className="bg-white rounded-lg shadow-sm border overflow-hidden">
			<table className="w-full">
				<thead className="sticky top-0 z-10 bg-gray-50">
					<tr className="border-b">
						<th className="w-12 px-4 py-3">
							<input
								type="checkbox"
								checked={
									selectedTasks.length === tasks.length && tasks.length > 0
								}
								onChange={(e) => {
									if (e.target.checked) {
										onTaskSelectionChange(tasks.map((t) => t.id));
									} else {
										onTaskSelectionChange([]);
									}
								}}
							/>
						</th>
						<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
							タスク
						</th>
						<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
							ステータス
						</th>
						<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
							担当者
						</th>
						<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
							期限
						</th>
						<th className="w-12"></th>
					</tr>
				</thead>
			</table>

			<div
				ref={parentRef}
				className="overflow-auto"
				style={{ height: '600px' }}
			>
				<div
					style={{
						height: `${rowVirtualizer.getTotalSize()}px`,
						width: '100%',
						position: 'relative'
					}}
				>
					<table className="w-full">
						<tbody>
							{rowVirtualizer.getVirtualItems().map((virtualRow) => {
								const task = tasks[virtualRow.index];

								return (
									<tr
										key={task.id}
										style={{
											position: 'absolute',
											top: 0,
											left: 0,
											width: '100%',
											height: `${virtualRow.size}px`,
											transform: `translateY(${virtualRow.start}px)`
										}}
									>
										<TaskRow
											task={task}
											allTasks={tasks}
											projectId={projectId}
											isExpanded={expandedTasks.has(task.id)}
											onToggle={() => toggleTaskExpansion(task.id)}
											onTaskClick={onTaskClick}
											onTaskStatusChange={onTaskStatusChange}
											onTaskDelete={onTaskDelete}
											isSelected={selectedTasks.includes(task.id)}
											onTaskSelect={(checked) =>
												handleTaskSelect(task.id, checked)
											}
											depth={0}
											expandedTasks={expandedTasks}
											onToggleSubtask={toggleTaskExpansion}
											selectedTasks={selectedTasks}
											onSubtaskSelect={handleTaskSelect}
										/>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
