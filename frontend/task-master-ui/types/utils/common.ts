// Common utility types used across the application

// ID types
export type TaskId = number;
export type SubtaskId = string;
export type ProjectId = string; // UUID
export type UserId = string; // UUID
export type OrganizationId = string; // UUID

// Date types
export type ISODateString = string;

// Status types
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled';
export type SubtaskStatus = 'todo' | 'in_progress' | 'done';

// Priority types
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// Common response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Timestamps
export interface Timestamps {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}