const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  dependencies: number[];
  subtasks: Subtask[];
  estimatedEffort?: string;
  actualEffort?: string;
  testingStrategy?: string;
  details?: string;
  assignee?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subtask {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  assignee?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

export interface TasksResponse {
  tasks: Task[];
  totalTasks: number;
  filteredBy?: string;
}

export interface ComplexityAnalysis {
  taskId: number;
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

export interface PRDGenerateRequest {
  prd_content: string;
  target_task_count?: number;
  use_research_mode?: boolean;
}

export interface ExpandTaskRequest {
  numSubtasks?: number;
  useResearch?: boolean;
}

class ApiClient {
  private async fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok || (data.success === false)) {
      throw new Error(data.error?.message || `API Error: ${response.statusText}`);
    }

    // API returns data wrapped in { success: true, data: {...} }
    return data.data || data;
  }

  // Task endpoints
  async getTasks(filter?: string): Promise<TasksResponse> {
    const params = filter ? `?filter=${filter}` : '';
    return this.fetchAPI<TasksResponse>(`/api/v1/tasks${params}`);
  }

  async getTask(id: number): Promise<Task> {
    return this.fetchAPI<Task>(`/api/v1/tasks/${id}`);
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    return this.fetchAPI<Task>('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    return this.fetchAPI<Task>(`/api/v1/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async updateTaskStatus(id: number, status: Task['status']): Promise<Task> {
    return this.fetchAPI<Task>(`/api/v1/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteTask(id: number): Promise<{ message: string }> {
    return this.fetchAPI<{ message: string }>(`/api/v1/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Task expansion
  async expandTask(id: number, options?: ExpandTaskRequest): Promise<Task> {
    return this.fetchAPI<Task>(`/api/v1/tasks/${id}/expand`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  async expandAllTasks(options?: ExpandTaskRequest): Promise<{ expanded: number }> {
    return this.fetchAPI<{ expanded: number }>('/api/v1/tasks/expand-all', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  async clearSubtasks(id: number): Promise<Task> {
    return this.fetchAPI<Task>(`/api/v1/tasks/${id}/subtasks`, {
      method: 'DELETE',
    });
  }

  // Subtask management
  async addSubtask(taskId: number, subtask: Partial<Subtask>): Promise<Task> {
    return this.fetchAPI<Task>(`/api/v1/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify(subtask),
    });
  }

  async updateSubtask(taskId: number, subtaskId: number, updates: Partial<Subtask>): Promise<Task> {
    return this.fetchAPI<Task>(`/api/v1/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async removeSubtask(taskId: number, subtaskId: number): Promise<Task> {
    return this.fetchAPI<Task>(`/api/v1/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'DELETE',
    });
  }

  // Dependency management
  async addDependency(taskId: number, dependencyId: number): Promise<Task> {
    return this.fetchAPI<Task>(`/api/v1/tasks/${taskId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ dependencyId }),
    });
  }

  async removeDependency(taskId: number, dependencyId: number): Promise<Task> {
    return this.fetchAPI<Task>(`/api/v1/tasks/${taskId}/dependencies/${dependencyId}`, {
      method: 'DELETE',
    });
  }

  async validateDependencies(autoFix?: boolean): Promise<any> {
    return this.fetchAPI('/api/v1/tasks/validate-dependencies', {
      method: 'POST',
      body: JSON.stringify({ autoFix }),
    });
  }

  async fixDependencies(): Promise<any> {
    return this.fetchAPI('/api/v1/tasks/fix-dependencies', {
      method: 'POST',
    });
  }

  // Analysis endpoints
  async getNextTask(): Promise<NextTaskResponse> {
    return this.fetchAPI<NextTaskResponse>('/api/v1/tasks/next');
  }

  async analyzeTaskComplexity(taskId: number): Promise<ComplexityAnalysis> {
    return this.fetchAPI<ComplexityAnalysis>('/api/v1/tasks/analyze-complexity', {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    });
  }

  async getComplexityReport(): Promise<any> {
    return this.fetchAPI('/api/v1/tasks/complexity-report');
  }

  // PRD generation
  async generateTasksFromPRD(request: PRDGenerateRequest): Promise<Task[]> {
    return this.fetchAPI<Task[]>('/api/v1/generate-tasks-from-prd', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Project management
  async initializeProject(config: any): Promise<any> {
    return this.fetchAPI('/api/v1/projects/initialize', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async generateTaskFiles(): Promise<{ filesGenerated: number }> {
    return this.fetchAPI<{ filesGenerated: number }>('/api/v1/projects/generate-task-files', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();