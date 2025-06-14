'use client';

import React from 'react';
import { Project } from '@/lib/api';
import { ProjectItem } from './ProjectItem';

interface ProjectListProps {
	projects: Project[];
	onProjectClick: (projectId: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = React.memo(
	({ projects, onProjectClick }) => {
		return (
			<div className="space-y-1">
				{projects.map((project) => (
					<ProjectItem
						key={project.id}
						project={project}
						onProjectClick={onProjectClick}
					/>
				))}
			</div>
		);
	}
);

ProjectList.displayName = 'ProjectList';