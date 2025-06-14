import { Task, Subtask } from '../domain/task';
import { Project } from '../domain/project';
import { Member } from '../domain/user';

// Common component prop types
export interface WithClassName {
  className?: string;
}

export interface WithChildren {
  children?: React.ReactNode;
}

// Task-related component props
export interface TaskTableProps extends WithClassName {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskUpdate?: (taskId: number, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: number) => void;
  selectedTasks?: Set<number>;
  onTaskSelect?: (taskId: number, selected: boolean) => void;
  isLoading?: boolean;
}

export interface TaskRowProps extends WithClassName {
  task: Task;
  onClick?: () => void;
  onUpdate?: (updates: Partial<Task>) => void;
  onDelete?: () => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export interface SubtaskRowProps extends WithClassName {
  subtask: Subtask;
  onUpdate?: (updates: Partial<Subtask>) => void;
  onDelete?: () => void;
  isNested?: boolean;
}

// Project-related component props
export interface ProjectListProps extends WithClassName {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  onProjectUpdate?: (projectId: string, updates: Partial<Project>) => void;
  onProjectDelete?: (projectId: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export interface ProjectItemProps extends WithClassName {
  project: Project;
  onClick?: () => void;
  onUpdate?: (updates: Partial<Project>) => void;
  onDelete?: () => void;
}

// Member-related component props
export interface MemberListProps extends WithClassName {
  members: Member[];
  onMemberClick?: (member: Member) => void;
  onMemberUpdate?: (memberId: string, updates: Partial<Member>) => void;
  onMemberRemove?: (memberId: string) => void;
  isLoading?: boolean;
  canManageMembers?: boolean;
}

// Modal props
export interface ModalProps extends WithChildren {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Form field props
export interface FieldProps extends WithClassName {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

// Empty state props
export interface EmptyStateProps extends WithClassName, WithChildren {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}