import { TaskId, Priority } from '../utils/common';
import { MemberRole } from '../domain/user';

// Task generation requests
export interface PRDGenerateRequest {
  prd_content: string;
  target_task_count?: number;
  use_research_mode?: boolean;
}

export interface ExpandTaskRequest {
  numSubtasks?: number;
  useResearch?: boolean;
}

// Task management requests
export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: Priority;
  dependencies?: TaskId[];
  assigneeId?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: string;
  priority?: Priority;
  assigneeId?: string;
  dependencies?: TaskId[];
}

export interface BatchUpdateTasksRequest {
  taskIds: TaskId[];
  updates: UpdateTaskRequest;
}

// Project requests
export interface CreateProjectRequest {
  name: string;
  description?: string;
  path?: string;
  organizationId: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  deadline?: string;
  tags?: string[];
}

// Organization requests
export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  slug?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: MemberRole;
}

// Auth requests
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  organizationName?: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}