import { Task, Subtask, TaskCandidate } from '../domain/task';
import { Project } from '../domain/project';
import { Organization, OrganizationMember, Invitation } from '../domain/organization';
import { User, Member } from '../domain/user';
import { TaskId, ApiResponse as BaseApiResponse } from '../utils/common';

// Re-export base API response with a different name to avoid confusion
export type { BaseApiResponse as ApiResponse };

// Authentication responses
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  tokens: AuthTokens;
  organization?: Organization;
}

// Task-related responses
export interface TasksResponse {
  tasks: Task[];
  total: number;
  page?: number;
  pageSize?: number;
  filteredBy?: string;
}

export interface ComplexityAnalysis {
  taskId: TaskId;
  complexity: {
    score: number;
    level: 'low' | 'medium' | 'high' | 'very-high';
    factors: {
      subtaskCount: number;
      dependencyCount: number;
      descriptionLength: number;
      hasTechnicalTerms: boolean;
      estimatedEffort: string | null;
    };
    recommendations: string[];
  };
}

export interface NextTaskResponse {
  task: Task | null;
  reasoning: string;
}

export interface TaskGenerationResponse {
  tasks: TaskCandidate[];
  metadata: {
    total_generated: number;
    model_used: string;
    generation_time_ms: number;
  };
}

export interface TaskExpansionResponse {
  taskId: TaskId;
  subtasks: Subtask[];
  test_strategy?: string;
  updated_description?: string;
}

// Project responses
export interface ProjectsResponse {
  projects: Project[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface ProjectStatisticsResponse {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  progress: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  tasksByAssignee: Array<{
    assigneeId: string;
    assigneeName: string;
    taskCount: number;
  }>;
}

// Organization responses
export interface OrganizationMembersResponse {
  members: OrganizationMember[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface InvitationsResponse {
  invitations: Invitation[];
  total: number;
  page?: number;
  pageSize?: number;
}

// User responses
export interface ProfileResponse {
  profile: User;
  organizations: Organization[];
  preferences?: Record<string, any>;
}