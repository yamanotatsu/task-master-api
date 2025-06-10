'use client';

import React, { useState } from 'react';
import { Link, Plus, X, AlertCircle, ArrowRight } from 'lucide-react';
import { Task } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskSearchModal } from '@/components/modals/TaskSearchModal';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface DependencyManagerProps {
	task: Task;
	allTasks: Task[];
	onDependencyAdd: (dependencyId: number) => void;
	onDependencyRemove: (dependencyId: number) => void;
}

export const DependencyManager: React.FC<DependencyManagerProps> = ({
	task,
	allTasks,
	onDependencyAdd,
	onDependencyRemove
}) => {
	const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
	const [isValidating, setIsValidating] = useState(false);

	// Get tasks that this task depends on
	const blockedByTasks = task.dependencies
		.map((depId) => allTasks.find((t) => t.id === depId))
		.filter(Boolean) as Task[];

	// Get tasks that depend on this task
	const blockingTasks = allTasks.filter((t) =>
		t.dependencies.includes(task.id)
	);

	const handleAddDependency = (selectedTaskId: number) => {
		// Check for circular dependency
		if (selectedTaskId === task.id) {
			toast.error('タスクは自分自身に依存できません');
			return;
		}

		// Check if already exists
		if (task.dependencies.includes(selectedTaskId)) {
			toast.error('この依存関係は既に存在します');
			return;
		}

		// Check for circular dependency (deeper check)
		const selectedTask = allTasks.find((t) => t.id === selectedTaskId);
		if (
			selectedTask &&
			wouldCreateCircularDependency(task, selectedTask, allTasks)
		) {
			toast.error('循環依存が発生するため、この依存関係は追加できません');
			return;
		}

		onDependencyAdd(selectedTaskId);
		setIsSearchModalOpen(false);
	};

	const handleValidateDependencies = async () => {
		setIsValidating(true);
		try {
			const result = await api.validateDependencies(false);
			if (result.isValid) {
				toast.success('依存関係に問題はありません');
			} else {
				toast.warning(`${result.issues.length}件の問題が見つかりました`);
			}
		} catch (error) {
			toast.error('依存関係の検証に失敗しました');
		} finally {
			setIsValidating(false);
		}
	};

	return (
		<div className="space-y-4">
			{/* Blocked By (Dependencies) */}
			<div>
				<div className="flex items-center justify-between mb-2">
					<h4 className="text-sm font-medium text-gray-700 flex items-center">
						<AlertCircle className="h-4 w-4 mr-1 text-orange-500" />
						ブロックされているタスク
					</h4>
					<Button
						size="sm"
						variant="outline"
						onClick={() => setIsSearchModalOpen(true)}
					>
						<Plus className="h-3 w-3 mr-1" />
						追加
					</Button>
				</div>

				{blockedByTasks.length === 0 ? (
					<p className="text-sm text-gray-500">依存関係はありません</p>
				) : (
					<div className="space-y-2">
						{blockedByTasks.map((depTask) => (
							<div
								key={depTask.id}
								className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded-lg"
							>
								<div className="flex items-center space-x-2">
									<Link className="h-4 w-4 text-orange-600" />
									<span className="text-sm font-medium">#{depTask.id}</span>
									<span className="text-sm text-gray-600">{depTask.title}</span>
									<Badge
										variant={
											depTask.status === 'completed' ? 'success' : 'secondary'
										}
									>
										{depTask.status}
									</Badge>
								</div>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => onDependencyRemove(depTask.id)}
								>
									<X className="h-3 w-3" />
								</Button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Blocking (Tasks that depend on this) */}
			<div>
				<h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
					<ArrowRight className="h-4 w-4 mr-1 text-blue-500" />
					ブロックしているタスク
				</h4>

				{blockingTasks.length === 0 ? (
					<p className="text-sm text-gray-500">
						このタスクに依存するタスクはありません
					</p>
				) : (
					<div className="space-y-2">
						{blockingTasks.map((blockingTask) => (
							<div
								key={blockingTask.id}
								className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded-lg"
							>
								<Link className="h-4 w-4 text-blue-600" />
								<span className="text-sm font-medium">#{blockingTask.id}</span>
								<span className="text-sm text-gray-600">
									{blockingTask.title}
								</span>
								<Badge variant="secondary">{blockingTask.status}</Badge>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Validate Dependencies */}
			{(blockedByTasks.length > 0 || blockingTasks.length > 0) && (
				<div className="pt-2">
					<Button
						size="sm"
						variant="outline"
						onClick={handleValidateDependencies}
						disabled={isValidating}
						className="w-full"
					>
						{isValidating ? '検証中...' : '依存関係を検証'}
					</Button>
				</div>
			)}

			{/* Task Search Modal */}
			<TaskSearchModal
				isOpen={isSearchModalOpen}
				onClose={() => setIsSearchModalOpen(false)}
				onSelect={handleAddDependency}
				tasks={allTasks.filter((t) => t.id !== task.id)}
				excludeIds={task.dependencies}
			/>
		</div>
	);
};

// Helper function to check for circular dependencies
function wouldCreateCircularDependency(
	task: Task,
	newDependency: Task,
	allTasks: Task[]
): boolean {
	const visited = new Set<number>();

	function hasCycle(currentId: number, targetId: number): boolean {
		if (currentId === targetId) return true;
		if (visited.has(currentId)) return false;

		visited.add(currentId);

		const currentTask = allTasks.find((t) => t.id === currentId);
		if (!currentTask) return false;

		for (const depId of currentTask.dependencies) {
			if (hasCycle(depId, targetId)) return true;
		}

		return false;
	}

	return hasCycle(newDependency.id, task.id);
}
