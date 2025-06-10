export interface ProjectIcon {
	type: 'emoji' | 'icon';
	value: string;
}

export interface ProjectView {
	id: string;
	type: 'list' | 'board' | 'gantt' | 'calendar';
	name: string;
	isDefault: boolean;
}

export interface ProjectSettings {
	icon: ProjectIcon;
	defaultView: ProjectView['type'];
	theme?: string;
}

export interface ExtendedProject {
	id: string;
	name: string;
	path: string;
	createdAt: string;
	updatedAt?: string;
	totalTasks: number;
	completedTasks: number;
	progress: number;
	assignees: Array<{ id: string; name: string; avatar?: string }>;
	deadline?: string;
	settings?: ProjectSettings;
	lastViewedAt?: string;
}
