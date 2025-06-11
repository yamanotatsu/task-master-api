'use client';

import React from 'react';
import { List, Layout, Calendar, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewType = 'list' | 'board' | 'gantt' | 'calendar';

interface ViewTabsProps {
	activeView: ViewType;
	onViewChange: (view: ViewType) => void;
}

const viewOptions: Array<{
	value: ViewType;
	label: string;
	icon: React.FC<{ className?: string }>;
	available: boolean;
}> = [
	{ value: 'list', label: 'リスト', icon: List, available: true },
	{ value: 'board', label: 'ボード', icon: Layout, available: false },
	{ value: 'gantt', label: 'ガント', icon: BarChart3, available: false },
	{ value: 'calendar', label: 'カレンダー', icon: Calendar, available: false }
];

export const ViewTabs: React.FC<ViewTabsProps> = ({
	activeView,
	onViewChange
}) => {
	return (
		<div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
			{viewOptions.map(({ value, label, icon: Icon, available }) => (
				<button
					key={value}
					onClick={() => available && onViewChange(value)}
					disabled={!available}
					className={cn(
						'flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
						activeView === value && available
							? 'bg-white text-gray-900 shadow-sm'
							: available
								? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
								: 'text-gray-400 cursor-not-allowed'
					)}
				>
					<Icon className="h-4 w-4" />
					<span>{label}</span>
					{!available && (
						<span className="ml-1 text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
							開発中
						</span>
					)}
				</button>
			))}
		</div>
	);
};
