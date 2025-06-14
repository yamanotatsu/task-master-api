import { Timestamps, TaskId, SubtaskId, UserId, TaskStatus, SubtaskStatus, Priority } from '../utils/common';

export interface Task extends Timestamps {
  id: TaskId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dependencies: TaskId[];
  subtasks: Subtask[];
  estimatedEffort?: string;
  actualEffort?: string;
  testStrategy?: string;
  details?: string;
  assigneeId?: UserId;
  assignee?: string; // For backward compatibility
  projectId?: string;
  parentTaskId?: TaskId;
  tags?: string[];
  dueDate?: string;
}

export interface Subtask {
  id: SubtaskId;
  taskId?: TaskId;
  title: string;
  description?: string;
  status: SubtaskStatus;
  completed?: boolean; // For backward compatibility
  assigneeId?: UserId;
  assignee?: string; // For backward compatibility
  createdAt?: string;
  updatedAt?: string;
}

// Task-related types for generation and expansion
export interface TaskCandidate {
  title: string;
  description: string;
  dependencies: TaskId[];
  subtasks?: string[];
  test_strategy?: string; // Note: snake_case from API
  priority?: Priority;
  estimatedEffort?: string;
}

export interface TaskExpansion {
  taskId: TaskId;
  subtasks: Subtask[];
  testStrategy?: string;
  updatedDescription?: string;
}