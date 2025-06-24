'use client';

import React from 'react';
import { Subtask, Task } from '@/lib/api';
import { CheckCircle2, Circle } from 'lucide-react';

interface SubtaskRowProps {
	subtask: Subtask;
	parentTask: Task;
	projectId: string;
	onSubtaskClick: (subtaskId: number | string) => void;
	onSubtaskStatusChange: (
		subtaskId: number | string,
		completed: boolean
	) => void;
	depth: number;
}

export const SubtaskRow: React.FC<SubtaskRowProps> = React.memo(
	({
		subtask,
		parentTask,
		projectId,
		onSubtaskClick,
		onSubtaskStatusChange,
		depth
	}) => {
		const isCompleted = subtask.completed || subtask.status === 'completed' || subtask.status === 'done';

		return (
			<tr className="group hover:bg-gray-50 transition-colors border-b">
				<td className="px-4 py-2"></td>

				<td className="px-4 py-2">
					<div
						className="flex items-center"
						style={{ paddingLeft: `${depth * 24}px` }}
					>
						<button
							onClick={() => onSubtaskStatusChange(subtask.id, !isCompleted)}
							className="p-1 hover:bg-gray-200 rounded mr-2"
						>
							{isCompleted ? (
								<CheckCircle2 className="h-4 w-4 text-green-500" />
							) : (
								<Circle className="h-4 w-4 text-gray-400" />
							)}
						</button>

						<span
							className={`text-sm cursor-pointer hover:text-blue-600 ${
								isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'
							}`}
							onClick={() => onSubtaskClick(subtask.id)}
						>
							{subtask.title}
						</span>
					</div>
				</td>

				<td className="px-4 py-2">
					<span
						className={`text-xs px-2 py-1 rounded-full ${
							isCompleted
								? 'bg-green-100 text-green-700'
								: 'bg-gray-100 text-gray-700'
						}`}
					>
						{isCompleted ? '完了' : '未完了'}
					</span>
				</td>

				<td className="px-4 py-2">
					{subtask.assignee && (
						<div className="flex items-center">
							<div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
								<span className="text-[10px] font-medium">
									{subtask.assignee.charAt(0).toUpperCase()}
								</span>
							</div>
						</div>
					)}
				</td>

				<td className="px-4 py-2"></td>
				<td className="px-4 py-2"></td>
			</tr>
		);
	}
);

SubtaskRow.displayName = 'SubtaskRow';
