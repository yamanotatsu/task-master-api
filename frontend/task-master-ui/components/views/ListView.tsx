'use client';

import React from 'react';
import { Task } from '@/lib/api';
import { TaskTable } from '@/components/dashboard/TaskTable';

interface ListViewProps {
	tasks: Task[];
	projectId: string;
	onTaskClick: (taskId: number) => void;
	onTaskStatusChange: (taskId: number, status: Task['status']) => void;
	onTaskDelete: (taskId: number) => void;
	selectedTasks: number[];
	onTaskSelectionChange: (taskIds: number[]) => void;
}

export const ListView: React.FC<ListViewProps> = (props) => {
	return <TaskTable {...props} />;
};
