import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// デバッグモードの設定（開発環境でのみ有効）
const DEBUG_MODE = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true';

// ログ出力のヘルパー関数
const debugLog = (...args: any[]) => {
	if (DEBUG_MODE) {
		console.log('🐛 DEBUG:', ...args);
	}
};

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
	organizationId?: string;
}

export interface Task {
	id: string;
	title: string;
	description?: string;
	status:
		| 'pending'
		| 'in-progress'
		| 'done'
		| 'review'
		| 'deferred'
		| 'cancelled';
	priority: 'high' | 'medium' | 'low';
	dependencies: string[];
	subtasks: Subtask[];
	estimatedEffort?: string;
	actualEffort?: string;
	testStrategy?: string;
	details?: string;
	assignee?: string;
	deadline?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface Subtask {
	id: string;
	taskId?: string;
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
	role: 'admin' | 'developer' | 'viewer' | 'member';
	status: 'active' | 'inactive';
	avatar?: string;
	joinedAt?: string;
	lastActiveAt?: string;
}

export interface AuthTokens {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
}

export interface LoginResponse {
	user: {
		id: string;
		email: string;
		fullName: string;
	};
	tokens: AuthTokens;
}

export interface Organization {
	id: string;
	name: string;
	description?: string;
	role?: 'admin' | 'member';
	memberCount?: number;
	projectCount?: number;
	joinedAt?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface Invitation {
	id: string;
	email: string;
	role: 'admin' | 'member';
	expiresAt: string;
	inviteUrl?: string;
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
	// セッションキャッシュ（30分間有効）
	private sessionCache: { token: string | null; timestamp: number } | null = null;
	private readonly SESSION_CACHE_DURATION = 30 * 60 * 1000; // 30分

	// Skip auth in development if env var is set
	private skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true';

	/**
	 * 認証トークンを取得（キャッシュ付き）
	 */
	private async getAuthToken(): Promise<string | null> {
		// 開発環境で認証をスキップする設定の場合
		if (this.skipAuth) {
			debugLog('Auth skipped (NEXT_PUBLIC_SKIP_AUTH=true)');
			return null;
		}

		// キャッシュをチェック
		if (this.sessionCache &&
			Date.now() - this.sessionCache.timestamp < this.SESSION_CACHE_DURATION) {
			debugLog('Using cached auth token');
			return this.sessionCache.token;
		}

		try {
			if (!supabase) {
				console.warn('Supabase client not initialized');
				return null;
			}

			// Supabaseのデフォルトタイムアウトに任せる（Promise.raceを削除）
			const { data: { session }, error } = await supabase.auth.getSession();

			if (error) {
				console.error('Failed to get session:', error.message);
				return null;
			}

			const token = session?.access_token || null;

			// キャッシュを更新
			this.sessionCache = {
				token,
				timestamp: Date.now()
			};

			debugLog('Auth token retrieved:', token ? 'exists' : 'none');
			return token;
		} catch (error) {
			console.error('Auth error:', error);
			return null;
		}
	}

	/**
	 * APIリクエストの共通処理
	 */
	private async fetchAPI<T>(
		endpoint: string,
		options?: RequestInit
	): Promise<T> {
		const url = `${API_BASE_URL}${endpoint}`;

		debugLog(`API call: ${options?.method || 'GET'} ${endpoint}`);

		const token = await this.getAuthToken();

		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		// 既存のヘッダーをマージ
		if (options?.headers) {
			if (options.headers instanceof Headers) {
				options.headers.forEach((value, key) => {
					headers[key] = value;
				});
			} else if (Array.isArray(options.headers)) {
				options.headers.forEach(([key, value]) => {
					headers[key] = value;
				});
			} else {
				Object.assign(headers, options.headers);
			}
		}

		// 認証トークンを追加
		if (token) {
			headers['Authorization'] = `Bearer ${token}`;
		}

		try {
			const response = await fetch(url, {
				...options,
				headers
			});

			const data = await response.json();

			// 401エラーの場合、トークンをリフレッシュして再試行
			if (response.status === 401 && supabase) {
				debugLog('401 Unauthorized - attempting token refresh');

				// キャッシュをクリア
				this.sessionCache = null;

				const { error } = await supabase.auth.refreshSession();
				if (!error) {
					// 新しいトークンで再試行
					const newToken = await this.getAuthToken();
					if (newToken) {
						headers['Authorization'] = `Bearer ${newToken}`;
						const retryResponse = await fetch(url, {
							...options,
							headers
						});
						const retryData = await retryResponse.json();

						if (!retryResponse.ok || retryData.success === false) {
							throw new Error(
								retryData.error?.message ||
								`API Error: ${retryResponse.statusText}`
							);
						}
						return retryData.data || retryData;
					}
				}
			}

			// エラーレスポンスの処理
			if (!response.ok || data.success === false) {
				const errorMessage = data.error?.message || `API Error: ${response.statusText}`;
				debugLog('API Error:', errorMessage);
				throw new Error(errorMessage);
			}

			// 成功レスポンス
			return data.data || data;
		} catch (error) {
			// ネットワークエラーなどの処理
			if (error instanceof Error) {
				console.error(`API Error (${endpoint}):`, error.message);
				throw error;
			}
			throw new Error('Unknown API error');
		}
	}

	/**
	 * セッションキャッシュをクリア（ログアウト時などに使用）
	 */
	clearSessionCache(): void {
		this.sessionCache = null;
		debugLog('Session cache cleared');
	}

	// Task endpoints
	async getTasks(filter?: {
		projectId?: string;
		status?: string;
		assignee?: string;
	}): Promise<TasksResponse> {
		const params = new URLSearchParams();
		if (filter?.projectId) params.append('projectId', filter.projectId);
		if (filter?.status) params.append('status', filter.status);
		if (filter?.assignee) params.append('assignee', filter.assignee);
		const queryString = params.toString() ? `?${params.toString()}` : '';
		return this.fetchAPI<TasksResponse>(`/api/v1/tasks${queryString}`);
	}

	async getTask(id: string): Promise<Task> {
		return this.fetchAPI<Task>(`/api/v1/tasks/${id}`);
	}

	async createTask(task: Partial<Task> & { projectId: string }): Promise<any> {
		return this.fetchAPI('/api/v1/tasks', {
			method: 'POST',
			body: JSON.stringify(task)
		});
	}

	async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
		return this.fetchAPI<Task>(`/api/v1/tasks/${id}`, {
			method: 'PUT',
			body: JSON.stringify(updates)
		});
	}

	async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
		return this.fetchAPI<Task>(`/api/v1/tasks/${id}/status`, {
			method: 'PATCH',
			body: JSON.stringify({ status })
		});
	}

	async deleteTask(id: string): Promise<{ message: string }> {
		return this.fetchAPI<{ message: string }>(`/api/v1/tasks/${id}`, {
			method: 'DELETE'
		});
	}

	// Task expansion
	async expandTask(id: number, options?: ExpandTaskRequest): Promise<Task> {
		return this.fetchAPI<Task>(`/api/v1/tasks/${id}/expand`, {
			method: 'POST',
			body: JSON.stringify(options || {})
		});
	}

	async expandAllTasks(
		options?: ExpandTaskRequest
	): Promise<{ expanded: number }> {
		return this.fetchAPI<{ expanded: number }>('/api/v1/tasks/expand-all', {
			method: 'POST',
			body: JSON.stringify(options || {})
		});
	}

	async clearSubtasks(id: number): Promise<Task> {
		return this.fetchAPI<Task>(`/api/v1/tasks/${id}/subtasks`, {
			method: 'DELETE'
		});
	}

	// Subtask management
	async addSubtask(taskId: string, subtask: Partial<Subtask>): Promise<Task> {
		return this.fetchAPI<Task>(`/api/v1/tasks/${taskId}/subtasks`, {
			method: 'POST',
			body: JSON.stringify(subtask)
		});
	}

	async updateSubtask(
		taskId: string,
		subtaskId: string,
		updates: Partial<Subtask>
	): Promise<Task> {
		return this.fetchAPI<Task>(
			`/api/v1/tasks/${taskId}/subtasks/${subtaskId}`,
			{
				method: 'PUT',
				body: JSON.stringify(updates)
			}
		);
	}

	async removeSubtask(taskId: number, subtaskId: number): Promise<Task> {
		return this.fetchAPI<Task>(
			`/api/v1/tasks/${taskId}/subtasks/${subtaskId}`,
			{
				method: 'DELETE'
			}
		);
	}

	// Dependency management
	async addDependency(taskId: number, dependencyId: number): Promise<Task> {
		return this.fetchAPI<Task>(`/api/v1/tasks/${taskId}/dependencies`, {
			method: 'POST',
			body: JSON.stringify({ dependencyId })
		});
	}

	async removeDependency(taskId: number, dependencyId: number): Promise<Task> {
		return this.fetchAPI<Task>(
			`/api/v1/tasks/${taskId}/dependencies/${dependencyId}`,
			{
				method: 'DELETE'
			}
		);
	}

	async validateDependencies(autoFix?: boolean): Promise<any> {
		return this.fetchAPI('/api/v1/tasks/validate-dependencies', {
			method: 'POST',
			body: JSON.stringify({ autoFix })
		});
	}

	async fixDependencies(): Promise<any> {
		return this.fetchAPI('/api/v1/tasks/fix-dependencies', {
			method: 'POST'
		});
	}

	// Analysis endpoints
	async getNextTask(): Promise<NextTaskResponse> {
		return this.fetchAPI<NextTaskResponse>('/api/v1/tasks/next');
	}

	async analyzeTaskComplexity(taskId: number): Promise<ComplexityAnalysis> {
		return this.fetchAPI<ComplexityAnalysis>(
			'/api/v1/tasks/analyze-complexity',
			{
				method: 'POST',
				body: JSON.stringify({ taskId })
			}
		);
	}

	async getComplexityReport(): Promise<any> {
		return this.fetchAPI('/api/v1/tasks/complexity-report');
	}

	// PRD generation
	async generateTasksFromPRD(
		request: PRDGenerateRequest & { projectId: string }
	): Promise<any> {
		return this.fetchAPI('/api/v1/generate-tasks-from-prd', {
			method: 'POST',
			body: JSON.stringify(request)
		});
	}

	// Project management
	async initializeProject(config: {
		projectPath: string;
		projectName: string;
	}): Promise<any> {
		return this.fetchAPI('/api/v1/projects/initialize', {
			method: 'POST',
			body: JSON.stringify(config)
		});
	}

	async createProject(projectData: {
		name: string;
		projectPath: string;
		prdContent?: string;
		deadline?: string;
		organizationId?: string;
	}): Promise<{ projectId: string; sessionId: string }> {
		return this.fetchAPI('/api/v1/projects', {
			method: 'POST',
			body: JSON.stringify(projectData)
		});
	}

	async getProjects(): Promise<Project[]> {
		const response = await this.fetchAPI<{ projects: any[] }>(
			'/api/v1/projects'
		);
		// Transform the API response to match frontend expectations
		return response.projects.map((project) => ({
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
			body: JSON.stringify(updates)
		});
	}

	async deleteProject(id: string): Promise<void> {
		await this.fetchAPI(`/api/v1/projects/${id}`, {
			method: 'DELETE'
		});
	}

	// AI dialogue for project creation
	async sendAIDialogue(
		sessionId: string,
		message: string,
		mode: 'interactive' | 'guided'
	): Promise<{
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
			body: JSON.stringify({ sessionId, message, mode })
		});
	}

	// Generate final PRD
	async generateFinalPRD(
		projectId: string,
		sessionId: string
	): Promise<{
		prd: string;
		format: string;
	}> {
		return this.fetchAPI(`/api/v1/projects/${projectId}/prd/finalize`, {
			method: 'POST',
			body: JSON.stringify({ sessionId })
		});
	}

	// Member management
	async getMembers(): Promise<Member[]> {
		const response = await this.fetchAPI<{ members: Member[] }>(
			'/api/v1/members'
		);
		return response.members;
	}

	async createMember(member: Omit<Member, 'id'>): Promise<Member> {
		return this.fetchAPI<Member>('/api/v1/members', {
			method: 'POST',
			body: JSON.stringify(member)
		});
	}

	async updateMember(id: string, updates: Partial<Member>): Promise<Member> {
		return this.fetchAPI<Member>(`/api/v1/members/${id}`, {
			method: 'PUT',
			body: JSON.stringify(updates)
		});
	}

	async deleteMember(id: string): Promise<void> {
		await this.fetchAPI(`/api/v1/members/${id}`, {
			method: 'DELETE'
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
		return this.fetchAPI<{ filesGenerated: number }>(
			'/api/v1/projects/generate-task-files',
			{
				method: 'POST'
			}
		);
	}

	// User profile endpoints
	async getUserProfile(): Promise<Member> {
		const response = await this.fetchAPI<{ profile: Member }>(
			'/api/v1/users/profile'
		);
		return response.profile;
	}

	async updateUserProfile(updates: Partial<Member>): Promise<Member> {
		const response = await this.fetchAPI<{ profile: Member }>(
			'/api/v1/users/profile',
			{
				method: 'PUT',
				body: JSON.stringify(updates)
			}
		);
		return response.profile;
	}

	// Organization endpoints
	async createOrganization(data: {
		name: string;
		description?: string;
	}): Promise<{
		organization: Organization;
		membership: { role: string; joinedAt: string };
	}> {
		return this.fetchAPI('/api/v1/organizations', {
			method: 'POST',
			body: JSON.stringify(data)
		});
	}

	async getOrganizations(params?: { page?: number; limit?: number }): Promise<{
		organizations: Organization[];
		pagination?: { page: number; limit: number; total: number };
	}> {
		const queryParams = new URLSearchParams();
		if (params?.page) queryParams.append('page', params.page.toString());
		if (params?.limit) queryParams.append('limit', params.limit.toString());
		const queryString = queryParams.toString()
			? `?${queryParams.toString()}`
			: '';

		return this.fetchAPI(`/api/v1/organizations${queryString}`);
	}

	async getOrganization(id: string): Promise<{
		organization: Organization;
		membership: { role: string; joinedAt: string };
		statistics: {
			memberCount: number;
			projectCount: number;
			activeTaskCount: number;
		};
	}> {
		return this.fetchAPI(`/api/v1/organizations/${id}`);
	}

	async updateOrganization(
		id: string,
		updates: Partial<Organization>
	): Promise<Organization> {
		return this.fetchAPI<Organization>(`/api/v1/organizations/${id}`, {
			method: 'PUT',
			body: JSON.stringify(updates)
		});
	}

	async deleteOrganization(id: string): Promise<void> {
		await this.fetchAPI(`/api/v1/organizations/${id}`, {
			method: 'DELETE'
		});
	}

	// Organization member endpoints
	async inviteMember(
		organizationId: string,
		email: string,
		role: 'admin' | 'member' = 'member'
	): Promise<{
		invitation?: Invitation;
		member?: Member;
		message?: string;
	}> {
		return this.fetchAPI(`/api/v1/organizations/${organizationId}/invites`, {
			method: 'POST',
			body: JSON.stringify({ email, role })
		});
	}

	async getOrganizationMembers(
		organizationId: string,
		params?: { role?: string; search?: string; page?: number; limit?: number }
	): Promise<{
		members: Member[];
		pagination?: { page: number; limit: number; total: number };
	}> {
		const queryParams = new URLSearchParams();
		if (params?.role) queryParams.append('role', params.role);
		if (params?.search) queryParams.append('search', params.search);
		if (params?.page) queryParams.append('page', params.page.toString());
		if (params?.limit) queryParams.append('limit', params.limit.toString());
		const queryString = queryParams.toString()
			? `?${queryParams.toString()}`
			: '';

		return this.fetchAPI(
			`/api/v1/organizations/${organizationId}/members${queryString}`
		);
	}

	async updateMemberRole(
		organizationId: string,
		profileId: string,
		role: 'admin' | 'member'
	): Promise<Member> {
		const response = await this.fetchAPI<{ member: Member }>(
			`/api/v1/organizations/${organizationId}/members/${profileId}`,
			{
				method: 'PUT',
				body: JSON.stringify({ role })
			}
		);
		return response.member;
	}

	async removeOrganizationMember(
		organizationId: string,
		profileId: string
	): Promise<void> {
		await this.fetchAPI(
			`/api/v1/organizations/${organizationId}/members/${profileId}`,
			{
				method: 'DELETE'
			}
		);
	}

	// Invitation endpoints
	async validateInvitation(token: string): Promise<{
		id: string;
		organizationName: string;
		inviterName: string;
		inviterEmail: string;
		email: string;
		role: string;
		expiresAt: string;
		status: 'pending' | 'accepted' | 'expired';
	}> {
		return this.fetchAPI(`/api/v1/invitations/${token}/validate`);
	}

	async acceptInvitation(
		organizationId: string,
		token: string
	): Promise<{
		organization: Organization;
		membership: { role: string; joinedAt: string };
	}> {
		return this.fetchAPI(
			`/api/v1/organizations/${organizationId}/invites/${token}/accept`,
			{
				method: 'POST'
			}
		);
	}

	async declineInvitation(token: string): Promise<void> {
		await this.fetchAPI(`/api/v1/invitations/${token}/decline`, {
			method: 'POST'
		});
	}

	// Additional organization helper methods - wrapped versions for ApiResponse format
	async getOrganizationsWrapped(): Promise<ApiResponse<Organization[]>> {
		const response = await this.getOrganizations();
		return { success: true, data: response.organizations };
	}

	async getOrganizationWrapped(
		organizationId: string
	): Promise<ApiResponse<Organization>> {
		const response = await this.getOrganization(organizationId);

		// Merge statistics into organization object
		const orgWithStats = {
			...response.organization,
			role: response.membership.role as 'admin' | 'member',
			memberCount: response.statistics.memberCount,
			projectCount: response.statistics.projectCount
		};

		return { success: true, data: orgWithStats };
	}

	async getOrganizationMembersWrapped(
		organizationId: string
	): Promise<ApiResponse<Member[]>> {
		const response = await this.getOrganizationMembers(organizationId);
		return { success: true, data: response.members };
	}

	async inviteMemberWrapped(
		organizationId: string,
		data: { email: string; role: 'admin' | 'member' }
	): Promise<ApiResponse<Invitation>> {
		const response = await this.fetchAPI<{ invitation: Invitation }>(
			`/api/v1/organizations/${organizationId}/invites`,
			{
				method: 'POST',
				body: JSON.stringify(data)
			}
		);
		return { success: true, data: response.invitation };
	}

	async getOrganizationInvitations(
		organizationId: string
	): Promise<ApiResponse<Invitation[]>> {
		const response = await this.fetchAPI<{ invitations: Invitation[] }>(
			`/api/v1/organizations/${organizationId}/invites`
		);
		return { success: true, data: response.invitations };
	}

	async cancelInvitation(
		organizationId: string,
		invitationId: string
	): Promise<void> {
		await this.fetchAPI(
			`/api/v1/organizations/${organizationId}/invites/${invitationId}`,
			{
				method: 'DELETE'
			}
		);
	}

	async resendInvitation(
		organizationId: string,
		invitationId: string
	): Promise<void> {
		await this.fetchAPI(
			`/api/v1/organizations/${organizationId}/invites/${invitationId}/resend`,
			{
				method: 'POST'
			}
		);
	}

	async updateOrganizationMember(
		organizationId: string,
		memberId: string,
		data: { role: 'admin' | 'member' }
	): Promise<ApiResponse<Member>> {
		const response = await this.updateMemberRole(
			organizationId,
			memberId,
			data.role
		);
		return { success: true, data: response };
	}

	// Token refresh
	async refreshToken(refreshToken: string): Promise<AuthTokens> {
		const response = await this.fetchAPI<{ tokens: AuthTokens }>(
			'/api/v1/auth/refresh',
			{
				method: 'POST',
				body: JSON.stringify({ refreshToken })
			}
		);
		return response.tokens;
	}

	// Task preview and batch creation endpoints
	async generateTasksPreview(data: {
		prd_content: string;
		target_task_count?: number;
		use_research_mode?: boolean;
		projectName?: string;
		conversation_history?: Array<{
			role: 'user' | 'ai';
			content: string;
		}>;
	}): Promise<{
		tasks: Array<{
			tempId: string;
			title: string;
			description: string;
			details: string;
			test_strategy: string;
			priority: 'high' | 'medium' | 'low';
			order: number;
			dependencies: string[];
		}>;
		metadata: {
			projectName: string;
			totalTasks: number;
			generatedAt: string;
		};
		telemetryData: {
			modelUsed: string;
			totalTokens: number;
			totalCost: number;
			processingTime: number;
		};
	}> {
		return this.fetchAPI('/api/v1/generate-tasks-preview', {
			method: 'POST',
			body: JSON.stringify(data)
		});
	}

	async createProjectWithTasks(data: {
		projectName: string;
		projectPath?: string;
		projectDescription?: string;
		prdContent?: string;
		deadline?: string;
		tasks: Array<{
			tempId?: string;
			title: string;
			description: string;
			details: string;
			test_strategy: string;
			priority: 'high' | 'medium' | 'low';
			order: number;
		}>;
	}): Promise<{
		project: {
			id: number;
			name: string;
			description?: string;
			deadline?: string;
			status: string;
		};
		tasks: Array<{
			id: number;
			tempId?: string;
			title: string;
			description: string;
			details: string;
			test_strategy: string;
			priority: string;
			status: string;
			order: number;
		}>;
		metadata: {
			totalTasksCreated: number;
			createdAt: string;
		};
	}> {
		// Generate project_path if not provided
		const projectPath = data.projectPath || data.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

		return this.fetchAPI('/api/v1/tasks/batch-create', {
			method: 'POST',
			body: JSON.stringify({
				...data,
				projectPath
			})
		});
	}
}

export const api = new ApiClient();