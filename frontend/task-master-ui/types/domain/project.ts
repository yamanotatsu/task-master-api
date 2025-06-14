import { Timestamps, ProjectId, UserId } from '../utils/common';

export interface Project extends Timestamps {
  id: ProjectId;
  name: string;
  path: string;
  description?: string;
  organizationId?: string;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  assignees: ProjectAssignee[];
  deadline?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  visibility?: 'organization' | 'private' | 'public';
  tags?: string[];
}

export interface ProjectAssignee {
  id: UserId;
  name: string;
  email?: string;
  avatar?: string;
}

// Extended project types from /types/project.ts
export type ProjectIcon = 
  | 'folder'
  | 'code'
  | 'database'
  | 'cloud'
  | 'mobile'
  | 'web'
  | 'api'
  | 'security'
  | 'analytics'
  | 'design';

export type ProjectView = 'list' | 'board' | 'calendar' | 'gantt';

export interface ProjectSettings {
  defaultView: ProjectView;
  showCompletedTasks: boolean;
  groupBy: 'status' | 'priority' | 'assignee' | 'none';
  sortBy: 'priority' | 'dueDate' | 'created' | 'updated' | 'title';
  sortOrder: 'asc' | 'desc';
}

export interface ExtendedProject extends Project {
  icon?: ProjectIcon;
  settings?: ProjectSettings;
}