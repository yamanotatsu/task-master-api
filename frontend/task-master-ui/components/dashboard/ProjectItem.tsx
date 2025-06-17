'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Project } from '@/lib/api';

interface ProjectItemProps {
	project: Project;
	onProjectClick: (projectId: string) => void;
}

export const ProjectItem: React.FC<ProjectItemProps> = React.memo(
	({ project, onProjectClick }) => {
		const [isHovered, setIsHovered] = React.useState(false);

		return (
			<div
				className="group py-3 px-4 -mx-4 rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
				onClick={() => onProjectClick(project.id)}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<div className="flex items-center justify-between">
					<h3 className="text-base font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
						{project.name}
					</h3>
					<ArrowUpRight
						className={`h-4 w-4 text-gray-400 transition-all ${
							isHovered
								? 'opacity-100 translate-x-0'
								: 'opacity-0 -translate-x-2'
						}`}
					/>
				</div>
			</div>
		);
	}
);

ProjectItem.displayName = 'ProjectItem';
