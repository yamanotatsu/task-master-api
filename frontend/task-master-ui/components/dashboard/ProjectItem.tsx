'use client';

import React from 'react';
import { ArrowUpRight, FolderOpen, Calendar, Users } from 'lucide-react';
import { Project } from '@/lib/api';
import { Card } from '@/components/ui/card';

interface ProjectItemProps {
	project: Project;
	onProjectClick: (projectId: string) => void;
}

export const ProjectItem: React.FC<ProjectItemProps> = React.memo(
	({ project, onProjectClick }) => {
		const [isHovered, setIsHovered] = React.useState(false);

		// Mock data for demonstration
		const taskCount = Math.floor(Math.random() * 20) + 5;
		const completedCount = Math.floor(Math.random() * taskCount);
		const progress = Math.round((completedCount / taskCount) * 100);

		return (
			<Card
				className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-gray-200 dark:border-gray-700"
				onClick={() => onProjectClick(project.id)}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<div className="p-6">
					<div className="flex items-start justify-between mb-4">
						<div className="flex items-center space-x-3">
							<div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
								<FolderOpen className="h-5 w-5 text-primary" />
							</div>
							<div>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
									{project.name}
								</h3>
								{project.description && (
									<p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
										{project.description}
									</p>
								)}
							</div>
						</div>
						<ArrowUpRight
							className={`h-5 w-5 text-gray-400 transition-all duration-200 ${
								isHovered
									? 'opacity-100 translate-x-0 translate-y-0'
									: 'opacity-0 translate-x-2 -translate-y-2'
							}`}
						/>
					</div>

					<div className="space-y-4">
						<div>
							<div className="flex items-center justify-between text-sm mb-2">
								<span className="text-gray-600 dark:text-gray-400">進捗率</span>
								<span className="font-medium text-gray-900 dark:text-white">{progress}%</span>
							</div>
							<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
								<div
									className="bg-gradient-to-r from-primary to-primary-dark h-full rounded-full transition-all duration-500"
									style={{ width: `${progress}%` }}
								/>
							</div>
						</div>

						<div className="flex items-center justify-between text-sm">
							<div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
								<div className="flex items-center space-x-1">
									<Calendar className="h-4 w-4" />
									<span>{new Date(project.created_at).toLocaleDateString('ja-JP')}</span>
								</div>
							</div>
							<div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
								<span className="font-medium">{completedCount}</span>
								<span>/</span>
								<span>{taskCount} タスク</span>
							</div>
						</div>
					</div>
				</div>

				{/* Hover gradient effect */}
				<div
					className={`absolute inset-0 bg-gradient-to-r from-primary/5 to-primary-dark/5 transition-opacity duration-300 ${
						isHovered ? 'opacity-100' : 'opacity-0'
					}`}
				/>
			</Card>
		);
	}
);

ProjectItem.displayName = 'ProjectItem';
