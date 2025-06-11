'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Task } from '@/lib/api';
import { TaskRow } from './TaskRow';

interface DraggableTaskItemProps {
	task: Task;
	allTasks: Task[];
	projectId: string;
	isExpanded: boolean;
	onToggle: () => void;
	onTaskClick: (taskId: number) => void;
	onTaskStatusChange: (taskId: number, status: Task['status']) => void;
	onTaskDelete: (taskId: number) => void;
	isSelected: boolean;
	onTaskSelect: (checked: boolean) => void;
	depth: number;
	expandedTasks: Set<number>;
	onToggleSubtask: (taskId: number) => void;
	selectedTasks: number[];
	onSubtaskSelect: (taskId: number, checked: boolean) => void;
}

export const DraggableTaskItem: React.FC<DraggableTaskItemProps> = (props) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging
	} = useSortable({ id: props.task.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1
	};

	return (
		<tr ref={setNodeRef} style={style}>
			<td className="px-2 py-3">
				<div
					{...attributes}
					{...listeners}
					className="cursor-move p-1 hover:bg-gray-200 rounded"
				>
					<GripVertical className="h-4 w-4 text-gray-400" />
				</div>
			</td>
			<TaskRow {...props} />
		</tr>
	);
};
