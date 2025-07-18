'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';

export const GanttView: React.FC = () => {
	return (
		<div className="bg-white rounded-lg shadow-sm border p-8">
			<div className="flex items-center justify-center h-96 text-gray-500">
				<div className="text-center">
					<BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
					<p className="text-lg font-medium">ガントチャート</p>
					<p className="text-sm mt-2">
						タスクのスケジュールを時系列で表示します
					</p>
					<p className="text-xs text-gray-400 mt-4">（開発中）</p>
				</div>
			</div>
		</div>
	);
};
