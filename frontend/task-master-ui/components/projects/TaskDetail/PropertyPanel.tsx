'use client';

import * as React from 'react';
import { PropertyItem } from './PropertyItem';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare } from 'lucide-react';

interface PropertyPanelProps {
	task: {
		id: string;
		status: string;
		assignee?: {
			id: string;
			name: string;
			avatar?: string;
		};
		deadline?: string;
		priority: string;
		projectId: string;
		projectName?: string;
	};
	users: Array<{ id: string; name: string; avatar?: string }>;
	onPropertyChange: (key: string, value: any) => void;
	onAddSubtask?: () => void;
	disabled?: boolean;
	isSubtask?: boolean;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
	task,
	users,
	onPropertyChange,
	onAddSubtask,
	disabled,
	isSubtask = false
}) => {
	const properties = [
		{
			icon: '👤',
			label: '担当者',
			key: 'assignee',
			type: 'person' as const,
			value: task.assignee
		},
		{
			icon: '🏷️',
			label: 'ステータス',
			key: 'status',
			type: 'status' as const,
			value: task.status
		},
		// deadlineがundefinedの場合（サブタスクの場合）は表示しない
		...(task.deadline !== undefined
			? [
					{
						icon: '📅',
						label: '期限',
						key: 'deadline',
						type: 'date' as const,
						value: task.deadline
					}
				]
			: []),
		// priorityがundefinedの場合（サブタスクの場合）は表示しない
		...(task.priority !== undefined
			? [
					{
						icon: '🏳️',
						label: '優先度',
						key: 'priority',
						type: 'priority' as const,
						value: task.priority
					}
				]
			: []),
		{
			icon: '🔗',
			label: 'プロジェクト',
			key: 'project',
			type: 'text' as const,
			value: task.projectName || 'プロジェクト',
			disabled: true
		}
	];

	return (
		<div className="w-[260px] bg-gray-50 p-4 rounded-lg">
			<div className="space-y-3">
				{properties.map((property) => {
					const { key, ...propertyProps } = property;
					return (
						<PropertyItem
							key={key}
							{...propertyProps}
							users={property.type === 'person' ? users : undefined}
							onChange={(value) => onPropertyChange(key, value)}
							disabled={disabled || property.disabled}
							isSubtask={isSubtask}
						/>
					);
				})}
			</div>

			<div className="border-t border-gray-200 my-4" />

			<div className="space-y-3">
				<div className="text-sm font-medium text-gray-700">リレーション</div>
				{onAddSubtask && (
					<Button
						variant="ghost"
						size="sm"
						className="w-full justify-start"
						onClick={onAddSubtask}
						disabled={disabled}
					>
						<Plus className="h-4 w-4 mr-2" />
						サブタスクを追加
					</Button>
				)}
			</div>

			<div className="border-t border-gray-200 my-4" />

			<div className="space-y-3">
				<div className="text-sm font-medium text-gray-700">コメント</div>
				<Button
					variant="ghost"
					size="sm"
					className="w-full justify-start"
					disabled
				>
					<MessageSquare className="h-4 w-4 mr-2" />
					コメントを追加...
				</Button>
			</div>
		</div>
	);
};
