'use client';

import React from 'react';
import { Filter, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Task } from '@/lib/api';

export interface FilterOptions {
	status: Task['status'][];
	priority: Task['priority'][];
	assignee: string[];
	hasSubtasks: boolean | null;
	hasDependencies: boolean | null;
}

interface FilterDropdownProps {
	filters: FilterOptions;
	onFilterChange: (filters: FilterOptions) => void;
	members?: Array<{ id: string; name: string }>;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
	filters,
	onFilterChange,
	members = []
}) => {
	const statusOptions: Array<{ value: Task['status']; label: string }> = [
		{ value: 'not-started', label: '未着手' },
		{ value: 'pending', label: '保留中' },
		{ value: 'in-progress', label: '進行中' },
		{ value: 'review', label: 'レビュー中' },
		{ value: 'completed', label: '完了' },
		{ value: 'blocked', label: 'ブロック' },
		{ value: 'cancelled', label: 'キャンセル' }
	];

	const priorityOptions: Array<{ value: Task['priority']; label: string }> = [
		{ value: 'high', label: '高' },
		{ value: 'medium', label: '中' },
		{ value: 'low', label: '低' }
	];

	const toggleArrayFilter = <T extends string>(
		key: keyof FilterOptions,
		value: T
	) => {
		const currentValues = filters[key] as T[];
		const newValues = currentValues.includes(value)
			? currentValues.filter((v) => v !== value)
			: [...currentValues, value];

		onFilterChange({
			...filters,
			[key]: newValues
		});
	};

	const activeFilterCount =
		filters.status.length +
		filters.priority.length +
		filters.assignee.length +
		(filters.hasSubtasks !== null ? 1 : 0) +
		(filters.hasDependencies !== null ? 1 : 0);

	const clearFilters = () => {
		onFilterChange({
			status: [],
			priority: [],
			assignee: [],
			hasSubtasks: null,
			hasDependencies: null
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="relative">
					<Filter className="mr-2 h-4 w-4" />
					フィルタ
					{activeFilterCount > 0 && (
						<Badge
							variant="secondary"
							className="ml-2 h-5 px-1.5 min-w-[20px] text-xs"
						>
							{activeFilterCount}
						</Badge>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<div className="flex items-center justify-between px-2 py-1.5">
					<DropdownMenuLabel className="p-0">フィルタ条件</DropdownMenuLabel>
					{activeFilterCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							onClick={clearFilters}
							className="h-auto p-1 text-xs"
						>
							クリア
						</Button>
					)}
				</div>

				<DropdownMenuSeparator />

				{/* Status Filter */}
				<div className="px-2 py-1.5">
					<p className="text-xs font-medium text-gray-700 mb-2">ステータス</p>
					<div className="space-y-1">
						{statusOptions.map((option) => (
							<button
								key={option.value}
								onClick={() => toggleArrayFilter('status', option.value)}
								className="flex items-center justify-between w-full px-2 py-1 text-sm hover:bg-gray-100 rounded"
							>
								<span>{option.label}</span>
								{filters.status.includes(option.value) && (
									<Check className="h-4 w-4 text-blue-600" />
								)}
							</button>
						))}
					</div>
				</div>

				<DropdownMenuSeparator />

				{/* Priority Filter */}
				<div className="px-2 py-1.5">
					<p className="text-xs font-medium text-gray-700 mb-2">優先度</p>
					<div className="space-y-1">
						{priorityOptions.map((option) => (
							<button
								key={option.value}
								onClick={() => toggleArrayFilter('priority', option.value)}
								className="flex items-center justify-between w-full px-2 py-1 text-sm hover:bg-gray-100 rounded"
							>
								<span>{option.label}</span>
								{filters.priority.includes(option.value) && (
									<Check className="h-4 w-4 text-blue-600" />
								)}
							</button>
						))}
					</div>
				</div>

				<DropdownMenuSeparator />

				{/* Other Filters */}
				<div className="px-2 py-1.5">
					<p className="text-xs font-medium text-gray-700 mb-2">その他</p>
					<div className="space-y-1">
						<button
							onClick={() =>
								onFilterChange({
									...filters,
									hasSubtasks: filters.hasSubtasks === true ? null : true
								})
							}
							className="flex items-center justify-between w-full px-2 py-1 text-sm hover:bg-gray-100 rounded"
						>
							<span>サブタスクあり</span>
							{filters.hasSubtasks === true && (
								<Check className="h-4 w-4 text-blue-600" />
							)}
						</button>
						<button
							onClick={() =>
								onFilterChange({
									...filters,
									hasDependencies:
										filters.hasDependencies === true ? null : true
								})
							}
							className="flex items-center justify-between w-full px-2 py-1 text-sm hover:bg-gray-100 rounded"
						>
							<span>依存関係あり</span>
							{filters.hasDependencies === true && (
								<Check className="h-4 w-4 text-blue-600" />
							)}
						</button>
					</div>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
