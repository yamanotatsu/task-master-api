import { TaskStatus, Priority } from '../utils/common';
import { MemberRole } from '../domain/user';

// Form value types
export interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

export interface SignupFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  organizationName?: string;
  acceptTerms: boolean;
}

export interface TaskFormValues {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  dependencies?: number[];
  estimatedEffort?: string;
  dueDate?: string;
}

export interface SubtaskFormValues {
  title: string;
  description?: string;
  assigneeId?: string;
}

export interface ProjectFormValues {
  name: string;
  description?: string;
  deadline?: string;
  assignees?: string[];
  tags?: string[];
}

export interface OrganizationFormValues {
  name: string;
  description?: string;
  slug?: string;
}

export interface InviteMemberFormValues {
  email: string;
  role: MemberRole;
  message?: string;
}

export interface ProfileFormValues {
  fullName: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: string;
  timezone?: string;
}

// Form error types
export interface FormErrors<T> {
  [K in keyof T]?: string;
}

// Form state types
export interface FormState<T> {
  values: T;
  errors: FormErrors<T>;
  touched: { [K in keyof T]?: boolean };
  isSubmitting: boolean;
  isValid: boolean;
}