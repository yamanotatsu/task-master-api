'use client';

import * as React from 'react';
import {
	ChevronRight,
	ChevronDown,
	Plus,
	MoreHorizontal,
	ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	EditableCell,
	StatusSelect,
	PrioritySelect,
	PersonTag,
	DatePicker
} from '@/components/ui/notion';
import { SubtaskRow } from './SubtaskRow';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
	id: string;
	title: string;
	status: string;
	assignee?: {
		id: string;
		name: string;
		avatar?: string;
	};
	deadline?: string;
	priority: string;
}

interface Subtask {
	id: string;
	title: string;
	status: string;
	assignee?: {
		id: string;
		name: string;
		avatar?: string;
	};
}

interface TaskRowProps {
	task: Task;
	subtasks: Subtask[];
	isExpanded: boolean;
	onToggleExpand: () => void;
	onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
	onSubtaskUpdate: (subtaskId: string, updates: Partial<Subtask>) => void;
	onAddSubtask: (taskId: string) => void;
	onDeleteTask: (taskId: string) => void;
	onTaskClick: (taskId: string) => void;
	onSubtaskClick?: (taskId: string, subtaskId: string) => void;
	users: Array<{ id: string; name: string; avatar?: string }>;
	projectId?: string;
}

export const TaskRow: React.FC<TaskRowProps> = ({
	task,
	subtasks,
	isExpanded,
	onToggleExpand,
	onTaskUpdate,
	onSubtaskUpdate,
	onAddSubtask,
	onDeleteTask,
	onTaskClick,
	onSubtaskClick,
	users,
	projectId
}) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging
	} = useSortable({ id: task.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1
	};

	return (
		<>
			<tr
				ref={setNodeRef}
				style={style}
				className={cn(
					'border-b border-gray-100 hover:bg-gray-50 transition-colors',
					'group'
				)}
			>
				<td className="w-8 px-2">
					<div className="flex items-center">
						<div {...attributes} {...listeners}>
							<svg
								width="8"
								height="20"
								viewBox="0 0 8 20"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<circle cx="2" cy="6" r="1.5" fill="#E5E7EB" />
								<circle cx="6" cy="6" r="1.5" fill="#E5E7EB" />
								<circle cx="2" cy="14" r="1.5" fill="#E5E7EB" />
								<circle cx="6" cy="14" r="1.5" fill="#E5E7EB" />
							</svg>
						</div>
						<button
							onClick={(e) => {
								e.stopPropagation();
								onToggleExpand();
							}}
							className="p-1 hover:bg-gray-200 rounded transition-colors"
						>
							{isExpanded ? (
								<ChevronDown className="h-4 w-4" />
							) : (
								<ChevronRight className="h-4 w-4" />
							)}
						</button>
					</div>
				</td>
				<td className="px-2 py-2">
					<div className="group/title relative flex items-center gap-2">
						<div className="flex-1 transition-transform hover:translate-y-[-1px] hover:shadow-sm rounded">
							<EditableCell
								value={task.title}
								onValueChange={(value) =>
									onTaskUpdate(task.id, { title: value })
								}
								placeholder="タスク名を入力"
							/>
						</div>
						<button
							onClick={(e) => {
								e.stopPropagation();
								onTaskClick(task.id);
							}}
							className="opacity-0 group-hover/title:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
							title="詳細を開く"
						>
							<ArrowUpRight className="h-4 w-4 text-gray-400 hover:text-gray-600" />
						</button>
					</div>
				</td>
				<td className="px-2 py-2 w-32">
					<StatusSelect
						value={task.status}
						onValueChange={(value) => onTaskUpdate(task.id, { status: value })}
					/>
				</td>
				<td className="px-2 py-2 w-36">
					<PersonTag
						person={task.assignee}
						persons={users}
						onPersonChange={(personId) => {
							const assignee = users.find((u) => u.id === personId);
							onTaskUpdate(task.id, { assignee });
						}}
					/>
				</td>
				<td className="px-2 py-2 w-32">
					<DatePicker
						date={task.deadline ? new Date(task.deadline) : undefined}
						onDateChange={(date) =>
							onTaskUpdate(task.id, { deadline: date?.toISOString() })
						}
					/>
				</td>
				<td className="px-2 py-2 w-24">
					<PrioritySelect
						value={task.priority}
						onValueChange={(value) =>
							onTaskUpdate(task.id, { priority: value })
						}
					/>
				</td>
				<td className="px-2 py-2 w-12">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
							>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => onDeleteTask(task.id)}>
								削除
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</td>
			</tr>
			{isExpanded && (
				<>
					{subtasks.map((subtask) => (
						<SubtaskRow
							key={subtask.id}
							subtask={subtask}
							onSubtaskUpdate={onSubtaskUpdate}
							users={users}
							taskId={task.id}
							projectId={projectId}
							onSubtaskClick={(subtaskId) =>
								onSubtaskClick?.(task.id, subtaskId)
							}
						/>
					))}
					<tr className="border-b border-gray-100">
						<td colSpan={7} className="px-2 py-2">
							<button
								onClick={() => onAddSubtask(task.id)}
								className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-8"
							>
								<Plus className="h-4 w-4" />
								サブタスク追加
							</button>
						</td>
					</tr>
				</>
			)}
		</>
	);
};
