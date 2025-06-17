'use client';

import * as React from 'react';
import { Circle, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditableCell, PersonTag } from '@/components/ui/notion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

interface SubtaskRowProps {
	subtask: Subtask;
	onSubtaskUpdate: (subtaskId: string, updates: Partial<Subtask>) => void;
	users: Array<{ id: string; name: string; avatar?: string }>;
	taskId: string;
	projectId?: string;
	onSubtaskClick?: (subtaskId: string) => void;
}

export const SubtaskRow: React.FC<SubtaskRowProps> = ({
	subtask,
	onSubtaskUpdate,
	users,
	taskId,
	projectId,
	onSubtaskClick
}) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging
	} = useSortable({ id: subtask.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1
	};

	const isCompleted = subtask.status === 'completed';

	return (
		<tr
			ref={setNodeRef}
			style={style}
			className={cn(
				'border-b border-gray-100 hover:bg-gray-50 transition-colors',
				'bg-gray-50/50'
			)}
		>
			<td className="w-8 px-2">
				<div
					className="flex items-center justify-end"
					{...attributes}
					{...listeners}
				>
					<span className="text-gray-400 text-xs">•</span>
				</div>
			</td>
			<td className="px-2 py-2 pl-8">
				<div className="flex items-center gap-2">
					<button
						onClick={() =>
							onSubtaskUpdate(subtask.id, {
								status: isCompleted ? 'pending' : 'completed'
							})
						}
						className="text-gray-400 hover:text-gray-600 transition-colors"
					>
						{isCompleted ? (
							<CheckCircle2 className="h-4 w-4 text-green-500" />
						) : (
							<Circle className="h-4 w-4" />
						)}
					</button>
					<div className="group/title relative flex items-center gap-2 flex-1">
						<div className="flex-1 transition-transform hover:translate-y-[-1px] hover:shadow-sm rounded">
							<EditableCell
								value={subtask.title}
								onValueChange={(value) =>
									onSubtaskUpdate(subtask.id, { title: value })
								}
								placeholder="サブタスク名を入力"
								className={cn(isCompleted && 'line-through text-gray-400')}
							/>
						</div>
						{onSubtaskClick && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onSubtaskClick(subtask.id);
								}}
								className="opacity-0 group-hover/title:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
								title="詳細を開く"
							>
								<ArrowUpRight className="h-3 w-3 text-gray-400 hover:text-gray-600" />
							</button>
						)}
					</div>
				</div>
			</td>
			<td className="px-2 py-2 w-32">
				<div className="text-xs text-gray-500">
					{isCompleted ? '完了' : '未完了'}
				</div>
			</td>
			<td className="px-2 py-2 w-36">
				<PersonTag
					person={subtask.assignee}
					persons={users}
					onPersonChange={(personId) => {
						const assignee = users.find((u) => u.id === personId);
						onSubtaskUpdate(subtask.id, { assignee });
					}}
				/>
			</td>
			<td className="px-2 py-2 w-32">{/* サブタスクには期限なし */}</td>
			<td className="px-2 py-2 w-24">{/* サブタスクには優先度なし */}</td>
			<td className="px-2 py-2 w-12">{/* アクションメニューなし */}</td>
		</tr>
	);
};
