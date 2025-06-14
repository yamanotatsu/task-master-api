/**
 * API/DB conversion layer
 * Handles transformations between database schema (snake_case) and frontend types (camelCase)
 */

import { 
  Task, 
  Subtask, 
  Project, 
  Organization, 
  Member, 
  User 
} from '@/types/domain';
import { 
  toCamelCase, 
  toSnakeCase,
  convertApiStatusToDomain,
  convertDomainStatusToApi 
} from '@/types/utils/conversions';

// ============= Task Conversions =============

export interface DBTask {
  id: number;
  project_id?: string;
  title: string;
  description?: string;
  details?: string;
  test_strategy?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'done' | 'blocked' | 'review' | 'deferred' | 'cancelled' | 'not-started';
  assignee_id?: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  organization_id?: string;
  dependencies?: number[];
  subtasks?: DBSubtask[];
}

export interface DBSubtask {
  id: number;
  task_id: number;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  assignee_id?: string;
  created_at: string;
  updated_at: string;
}

export function dbTaskToDomain(dbTask: DBTask): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description,
    status: convertApiStatusToDomain(dbTask.status) as Task['status'],
    priority: dbTask.priority,
    dependencies: dbTask.dependencies || [],
    subtasks: (dbTask.subtasks || []).map(dbSubtaskToDomain),
    estimatedEffort: undefined, // Not in DB
    actualEffort: undefined, // Not in DB
    testStrategy: dbTask.test_strategy,
    details: dbTask.details,
    assigneeId: dbTask.assignee_id,
    assignee: undefined, // Will be populated separately if needed
    projectId: dbTask.project_id,
    createdAt: dbTask.created_at,
    updatedAt: dbTask.updated_at,
    dueDate: dbTask.deadline
  };
}

export function domainTaskToDb(task: Partial<Task>): Partial<DBTask> {
  const dbTask: Partial<DBTask> = {};
  
  if (task.id !== undefined) dbTask.id = task.id;
  if (task.title !== undefined) dbTask.title = task.title;
  if (task.description !== undefined) dbTask.description = task.description;
  if (task.status !== undefined) dbTask.status = convertDomainStatusToApi(task.status) as DBTask['status'];
  if (task.priority !== undefined) dbTask.priority = task.priority;
  if (task.dependencies !== undefined) dbTask.dependencies = task.dependencies;
  if (task.testStrategy !== undefined) dbTask.test_strategy = task.testStrategy;
  if (task.details !== undefined) dbTask.details = task.details;
  if (task.assigneeId !== undefined) dbTask.assignee_id = task.assigneeId;
  if (task.projectId !== undefined) dbTask.project_id = task.projectId;
  if (task.dueDate !== undefined) dbTask.deadline = task.dueDate;
  
  return dbTask;
}

export function dbSubtaskToDomain(dbSubtask: DBSubtask): Subtask {
  return {
    id: String(dbSubtask.id), // Convert to string as per domain type
    taskId: dbSubtask.task_id,
    title: dbSubtask.title,
    description: dbSubtask.description,
    status: dbSubtask.status === 'completed' ? 'done' : 'todo',
    completed: dbSubtask.status === 'completed',
    assigneeId: dbSubtask.assignee_id,
    createdAt: dbSubtask.created_at,
    updatedAt: dbSubtask.updated_at
  };
}

export function domainSubtaskToDb(subtask: Partial<Subtask>): Partial<DBSubtask> {
  const dbSubtask: Partial<DBSubtask> = {};
  
  if (subtask.id !== undefined) dbSubtask.id = Number(subtask.id);
  if (subtask.taskId !== undefined) dbSubtask.task_id = subtask.taskId;
  if (subtask.title !== undefined) dbSubtask.title = subtask.title;
  if (subtask.description !== undefined) dbSubtask.description = subtask.description;
  if (subtask.status !== undefined) {
    dbSubtask.status = subtask.status === 'done' ? 'completed' : 'pending';
  } else if (subtask.completed !== undefined) {
    dbSubtask.status = subtask.completed ? 'completed' : 'pending';
  }
  if (subtask.assigneeId !== undefined) dbSubtask.assignee_id = subtask.assigneeId;
  
  return dbSubtask;
}

// ============= Project Conversions =============

export interface DBProject {
  id: string;
  name: string;
  project_path: string;
  description?: string;
  prd_content?: string;
  deadline?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  organization_id?: string;
  created_by?: string;
}

export function dbProjectToDomain(dbProject: DBProject): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    path: dbProject.project_path, // Convert project_path to path
    description: dbProject.description,
    organizationId: dbProject.organization_id,
    deadline: dbProject.deadline,
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at,
    // These fields need to be calculated/populated separately
    totalTasks: 0,
    completedTasks: 0,
    progress: 0,
    assignees: []
  };
}

export function domainProjectToDb(project: Partial<Project>): Partial<DBProject> {
  const dbProject: Partial<DBProject> = {};
  
  if (project.id !== undefined) dbProject.id = project.id;
  if (project.name !== undefined) dbProject.name = project.name;
  if (project.path !== undefined) dbProject.project_path = project.path;
  if (project.description !== undefined) dbProject.description = project.description;
  if (project.organizationId !== undefined) dbProject.organization_id = project.organizationId;
  if (project.deadline !== undefined) dbProject.deadline = project.deadline;
  
  return dbProject;
}

// ============= Organization Conversions =============

export interface DBOrganization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  settings?: any;
  created_at: string;
  updated_at: string;
}

export function dbOrganizationToDomain(dbOrg: DBOrganization): Organization {
  return {
    id: dbOrg.id,
    name: dbOrg.name,
    slug: dbOrg.slug,
    description: dbOrg.description,
    settings: dbOrg.settings,
    createdAt: dbOrg.created_at,
    updatedAt: dbOrg.updated_at
  };
}

export function domainOrganizationToDb(org: Partial<Organization>): Partial<DBOrganization> {
  const dbOrg: Partial<DBOrganization> = {};
  
  if (org.id !== undefined) dbOrg.id = org.id;
  if (org.name !== undefined) dbOrg.name = org.name;
  if (org.slug !== undefined) dbOrg.slug = org.slug;
  if (org.description !== undefined) dbOrg.description = org.description;
  if (org.settings !== undefined) dbOrg.settings = org.settings;
  
  return dbOrg;
}

// ============= User/Profile Conversions =============

export interface DBProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  preferences?: any;
  last_sign_in_at?: string;
  created_at: string;
  updated_at: string;
  current_organization_id?: string;
}

export function dbProfileToUser(dbProfile: DBProfile): User {
  return {
    id: dbProfile.id,
    email: dbProfile.email,
    fullName: dbProfile.full_name || '',
    avatar: dbProfile.avatar_url,
    createdAt: dbProfile.created_at,
    updatedAt: dbProfile.updated_at
  };
}

export function userToDbProfile(user: Partial<User>): Partial<DBProfile> {
  const dbProfile: Partial<DBProfile> = {};
  
  if (user.id !== undefined) dbProfile.id = user.id;
  if (user.email !== undefined) dbProfile.email = user.email;
  if (user.fullName !== undefined) dbProfile.full_name = user.fullName;
  if (user.avatar !== undefined) dbProfile.avatar_url = user.avatar;
  
  return dbProfile;
}

// ============= Member Conversions =============

export interface DBOrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'member';
  status: 'active' | 'inactive' | 'pending';
  invited_by?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
  // Joined user data
  user?: DBProfile;
}

export function dbMemberToDomain(dbMember: DBOrganizationMember): Member {
  return {
    id: dbMember.user_id,
    name: dbMember.user?.full_name || '',
    email: dbMember.user?.email || '',
    role: dbMember.role === 'admin' ? 'admin' : 'member',
    status: dbMember.status,
    avatar: dbMember.user?.avatar_url,
    joinedAt: dbMember.joined_at,
    organizationId: dbMember.organization_id,
    createdAt: dbMember.created_at,
    updatedAt: dbMember.updated_at
  };
}

// ============= Generic Conversion Helpers =============

/**
 * Convert any DB response to domain model using automatic case conversion
 */
export function dbToDomain<T>(dbData: any): T {
  return toCamelCase(dbData) as T;
}

/**
 * Convert any domain model to DB format using automatic case conversion
 */
export function domainToDb<T>(domainData: any): T {
  return toSnakeCase(domainData) as T;
}