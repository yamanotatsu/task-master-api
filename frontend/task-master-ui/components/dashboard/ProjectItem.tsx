'use client';

import React, { useState } from 'react';
import {
	ChevronRight,
	ChevronDown,
	MoreHorizontal,
	Calendar,
	Users,
	CheckCircle
} from 'lucide-react';
import { Project, Task } from '@/lib/api';
import { api } from '@/lib/api';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface ProjectItemProps {
	project: Project;
	isExpanded: boolean;
	onToggle: () => void;
	onProjectClick: (projectId: string) => void;
}

export const ProjectItem: React.FC<ProjectItemProps> = React.memo(
	({ project, isExpanded, onToggle, onProjectClick }) => {
		const [tasks, setTasks] = useState<Task[]>([]);
		const [isLoadingTasks, setIsLoadingTasks] = useState(false);
		const [showMenu, setShowMenu] = useState(false);

		const handleToggle = async () => {
			onToggle();

			if (!isExpanded && tasks.length === 0) {
				setIsLoadingTasks(true);
				try {
					const response = await api.getTasks({ projectId: project.id });
					setTasks(response.tasks);
				} catch (error) {
					console.error('Failed to load tasks:', error);
				} finally {
					setIsLoadingTasks(false);
				}
			}
		};

		const progressPercentage = Math.round(project.progress);
		const projectIcon = '📁'; // デフォルトアイコン

		return (
			<div>
				<div
					className="group hover:bg-gray-50 transition-colors"
					onMouseEnter={() => setShowMenu(true)}
					onMouseLeave={() => setShowMenu(false)}
				>
					<div className="flex items-center px-4 py-3">
						<button
							onClick={handleToggle}
							className="p-1 hover:bg-gray-200 rounded transition-colors mr-2"
						>
							{isExpanded ? (
								<ChevronDown className="h-4 w-4 text-gray-500" />
							) : (
								<ChevronRight className="h-4 w-4 text-gray-500" />
							)}
						</button>

						<div
							className="flex items-center flex-1 cursor-pointer"
							onClick={() => onProjectClick(project.id)}
						>
							<span className="text-xl mr-3">{projectIcon}</span>

							<div className="flex-1">
								<div className="flex items-center">
									<span className="font-medium text-gray-900">
										{project.name}
									</span>
									<span className="ml-3 text-sm text-gray-500">
										{project.completedTasks}/{project.totalTasks} タスク
									</span>
								</div>

								<div className="flex items-center mt-1 space-x-4 text-xs text-gray-500">
									<div className="flex items-center">
										<Calendar className="h-3 w-3 mr-1" />
										{new Date(project.createdAt).toLocaleDateString('ja-JP')}
									</div>

									{project.deadline && (
										<div
											className={`flex items-center ${
												new Date(project.deadline) < new Date()
													? 'text-red-500'
													: ''
											}`}
										>
											<Calendar className="h-3 w-3 mr-1" />
											期限:{' '}
											{new Date(project.deadline).toLocaleDateString('ja-JP')}
										</div>
									)}

									<div className="flex items-center">
										<div className="flex -space-x-1 mr-1">
											{project.assignees.slice(0, 3).map((assignee) => (
												<div
													key={assignee.id}
													className="w-5 h-5 rounded-full bg-gray-300 border border-white flex items-center justify-center"
													title={assignee.name}
												>
													<span className="text-[10px] font-medium">
														{assignee.name.charAt(0)}
													</span>
												</div>
											))}
										</div>
										{project.assignees.length > 3 && (
											<span className="text-gray-500">
												+{project.assignees.length - 3}
											</span>
										)}
									</div>

									<div className="flex items-center">
										<div className="w-24 bg-gray-200 rounded-full h-1.5 mr-2">
											<div
												className="bg-green-500 h-1.5 rounded-full transition-all"
												style={{ width: `${progressPercentage}%` }}
											/>
										</div>
										<span>{progressPercentage}%</span>
									</div>
								</div>
							</div>
						</div>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									className={`p-1 hover:bg-gray-200 rounded transition-all ${
										showMenu ? 'opacity-100' : 'opacity-0'
									}`}
									onClick={(e) => e.stopPropagation()}
								>
									<MoreHorizontal className="h-4 w-4 text-gray-500" />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => onProjectClick(project.id)}>
									プロジェクトを開く
								</DropdownMenuItem>
								<DropdownMenuItem>名前を変更</DropdownMenuItem>
								<DropdownMenuItem>設定</DropdownMenuItem>
								<DropdownMenuItem className="text-red-600">
									削除
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				{isExpanded && (
					<div className="pl-12 pr-4 pb-2">
						{isLoadingTasks ? (
							<div className="py-2 text-sm text-gray-500">
								タスクを読み込み中...
							</div>
						) : tasks.length === 0 ? (
							<div className="py-2 text-sm text-gray-500">
								タスクがありません
							</div>
						) : (
							<div className="space-y-1">
								{tasks.slice(0, 5).map((task) => (
									<div
										key={task.id}
										className="flex items-center py-1.5 px-3 hover:bg-gray-50 rounded cursor-pointer text-sm"
										onClick={() => onProjectClick(project.id)}
									>
										<CheckCircle
											className={`h-4 w-4 mr-2 ${
												task.status === 'completed' || task.status === 'done'
													? 'text-green-500'
													: 'text-gray-300'
											}`}
										/>
										<span
											className={`flex-1 ${
												task.status === 'completed' || task.status === 'done'
													? 'text-gray-500 line-through'
													: 'text-gray-700'
											}`}
										>
											{task.title}
										</span>
										<span
											className={`text-xs px-2 py-0.5 rounded-full ${
												task.priority === 'high'
													? 'bg-red-100 text-red-700'
													: task.priority === 'medium'
														? 'bg-yellow-100 text-yellow-700'
														: 'bg-gray-100 text-gray-700'
											}`}
										>
											{task.priority === 'high'
												? '高'
												: task.priority === 'medium'
													? '中'
													: '低'}
										</span>
									</div>
								))}
								{tasks.length > 5 && (
									<div
										className="py-1.5 px-3 text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
										onClick={() => onProjectClick(project.id)}
									>
										他 {tasks.length - 5} 件のタスクを表示...
									</div>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		);
	}
);

ProjectItem.displayName = 'ProjectItem';
