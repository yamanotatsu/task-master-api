const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface Project {
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
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'not-started' | 'done' | 'review' | 'deferred' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  dependencies: number[];
  subtasks: Subtask[];
  estimatedEffort?: string;
  actualEffort?: string;
  testStrategy?: string;
  details?: string;
  assignee?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subtask {
  id: number | string;
  title: string;
  description?: string;
  completed?: boolean;
  status?: 'pending' | 'completed';
  assignee?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
  status: 'active' | 'inactive';
  avatar?: string;
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
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Get the token from localStorage where Supabase stores it
    const supabaseAuth = localStorage.getItem('sb-auth-token');
    if (supabaseAuth) {
      try {
        const authData = JSON.parse(supabaseAuth);
        return authData?.access_token || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private async fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();
    
    if (!response.ok || (data.success === false)) {
      throw new Error(data.error?.message || `API Error: ${response.statusText}`);
    }

    // API returns data wrapped in { success: true, data: {...} }
    return data.data || data;
  }

  // Task endpoints
  async getTasks(filter?: { projectId?: string; status?: string; assignee?: string }): Promise<TasksResponse> {
    const params = new URLSearchParams();
    if (filter?.projectId) params.append('projectId', filter.projectId);
    if (filter?.status) params.append('status', filter.status);
    if (filter?.assignee) params.append('assignee', filter.assignee);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.fetchAPI<TasksResponse>(`/api/v1/tasks${queryString}`);
  }

  async getTask(id: number): Promise<Task> {
    return this.fetchAPI<Task>(`/api/v1/tasks/${id}`);
  }

  async createTask(task: Partial<Task> & { projectId: string }): Promise<any> {
    return this.fetchAPI('/api/v1/tasks', {
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
  async generateTasksFromPRD(request: PRDGenerateRequest & { projectId: string }): Promise<any> {
    return this.fetchAPI('/api/v1/generate-tasks-from-prd', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Project management
  async initializeProject(config: { projectPath: string; projectName: string }): Promise<any> {
    return this.fetchAPI('/api/v1/projects/initialize', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async createProject(projectData: {
    name: string;
    projectPath: string;
    prdContent?: string;
    deadline?: string;
  }): Promise<{ projectId: string; sessionId: string }> {
    return this.fetchAPI('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async getProjects(): Promise<Project[]> {
    const response = await this.fetchAPI<{ projects: any[] }>('/api/v1/projects');
    // Transform the API response to match frontend expectations
    return response.projects.map(project => ({
      ...project,
      path: project.project_path || project.path,
      createdAt: project.created_at || project.createdAt,
      updatedAt: project.updated_at || project.updatedAt,
      assignees: project.members || project.assignees || []
    }));
  }

  async getProject(id: string): Promise<Project> {
    const project = await this.fetchAPI<any>(`/api/v1/projects/${id}`);
    // Transform the API response to match frontend expectations
    return {
      ...project,
      path: project.project_path || project.path,
      createdAt: project.created_at || project.createdAt,
      updatedAt: project.updated_at || project.updatedAt,
      assignees: project.members || project.assignees || []
    };
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    return this.fetchAPI<Project>(`/api/v1/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.fetchAPI(`/api/v1/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // AI dialogue for project creation
  async sendAIDialogue(sessionId: string, message: string, mode: 'interactive' | 'guided'): Promise<{
    aiResponse: string;
    prdQualityScore: number;
    missingRequirements: string[];
    sectionScores?: {
      [key: string]: {
        score: number;
        missing: string[];
      };
    };
  }> {
    return this.fetchAPI('/api/v1/projects/ai-dialogue', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message, mode }),
    });
  }
  
  // Generate final PRD
  async generateFinalPRD(projectId: string, sessionId: string): Promise<{
    prd: string;
    format: string;
  }> {
    return this.fetchAPI(`/api/v1/projects/${projectId}/prd/finalize`, {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  // Member management
  async getMembers(): Promise<Member[]> {
    const response = await this.fetchAPI<{ members: Member[] }>('/api/v1/members');
    return response.members;
  }

  async createMember(member: Omit<Member, 'id'>): Promise<Member> {
    return this.fetchAPI<Member>('/api/v1/members', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  }

  async updateMember(id: string, updates: Partial<Member>): Promise<Member> {
    return this.fetchAPI<Member>(`/api/v1/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteMember(id: string): Promise<void> {
    await this.fetchAPI(`/api/v1/members/${id}`, {
      method: 'DELETE',
    });
  }

  // Project statistics
  async getProjectStatistics(projectId: string): Promise<any> {
    return this.fetchAPI(`/api/v1/projects/${projectId}/statistics`);
  }

  async getGanttData(projectId: string): Promise<any> {
    return this.fetchAPI(`/api/v1/projects/${projectId}/gantt-data`);
  }

  async getDependencyGraph(projectId: string): Promise<any> {
    return this.fetchAPI(`/api/v1/projects/${projectId}/dependency-graph`);
  }

  // Generate task files (legacy support)
  async generateTaskFiles(): Promise<{ filesGenerated: number }> {
    return this.fetchAPI<{ filesGenerated: number }>('/api/v1/projects/generate-task-files', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();