/**
 * Common test data for API tests
 */

export const mockTasks = [
	{
		id: 'task_001',
		title: 'Setup project structure',
		description:
			'Initial project setup with directory structure and configuration files',
		status: 'completed',
		priority: 'high',
		dependencies: [],
		subtasks: [
			{ id: 'sub_001_1', title: 'Create directory structure', completed: true },
			{ id: 'sub_001_2', title: 'Initialize package.json', completed: true }
		],
		reasoning: 'Foundation task that needs to be completed first',
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-02T00:00:00Z'
	},
	{
		id: 'task_002',
		title: 'Implement authentication',
		description: 'Add user authentication with JWT tokens',
		status: 'in-progress',
		priority: 'high',
		dependencies: ['task_001'],
		subtasks: [
			{ id: 'sub_002_1', title: 'Setup JWT middleware', completed: true },
			{ id: 'sub_002_2', title: 'Create login endpoint', completed: false },
			{ id: 'sub_002_3', title: 'Add user registration', completed: false }
		],
		reasoning:
			'Critical security feature required before other user-specific features',
		createdAt: '2024-01-02T00:00:00Z',
		updatedAt: '2024-01-03T00:00:00Z'
	},
	{
		id: 'task_003',
		title: 'Create database schema',
		description: 'Design and implement database schema for application data',
		status: 'pending',
		priority: 'medium',
		dependencies: ['task_001'],
		subtasks: [],
		reasoning: 'Data persistence layer needed for application functionality',
		createdAt: '2024-01-03T00:00:00Z',
		updatedAt: '2024-01-03T00:00:00Z'
	},
	{
		id: 'task_004',
		title: 'Implement user profile',
		description: 'User profile management functionality',
		status: 'blocked',
		priority: 'medium',
		dependencies: ['task_002', 'task_003'],
		subtasks: [],
		reasoning: 'Depends on authentication and database setup',
		createdAt: '2024-01-04T00:00:00Z',
		updatedAt: '2024-01-04T00:00:00Z'
	},
	{
		id: 'task_005',
		title: 'Add logging system',
		description: 'Centralized logging for debugging and monitoring',
		status: 'pending',
		priority: 'low',
		dependencies: [],
		subtasks: [],
		reasoning: 'Helpful for debugging but not critical for MVP',
		createdAt: '2024-01-05T00:00:00Z',
		updatedAt: '2024-01-05T00:00:00Z'
	}
];

export const mockProject = {
	name: 'test-project',
	path: '/projects/test-project',
	description: 'Test project for API testing',
	config: {
		aiProvider: 'anthropic',
		template: 'basic',
		modelPreference: 'claude-3-sonnet-20240229',
		useCache: true
	},
	metadata: {
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-05T00:00:00Z',
		taskCount: 5,
		completedTasks: 1
	}
};

export const mockPRD = `# Product Requirements Document

## Overview
Build a task management application with AI-powered task generation and dependency tracking.

## Features
1. User authentication and authorization
2. Task creation and management
3. AI-powered task generation from PRDs
4. Dependency tracking and visualization
5. Progress tracking and reporting

## Technical Requirements
- Node.js backend with Express
- RESTful API design
- JWT authentication
- PostgreSQL database
- AI integration for task generation

## Non-functional Requirements
- Response time < 200ms for API calls
- Support 1000+ concurrent users
- 99.9% uptime
- Comprehensive logging and monitoring`;

export const mockGeneratedTasks = [
	{
		title: 'Setup Node.js project',
		description:
			'Initialize Node.js project with Express and required dependencies',
		priority: 'high',
		reasoning: 'Foundation for the entire application'
	},
	{
		title: 'Design database schema',
		description: 'Create PostgreSQL schema for users, tasks, and dependencies',
		priority: 'high',
		reasoning: 'Core data model needed before implementing features'
	},
	{
		title: 'Implement JWT authentication',
		description: 'Setup JWT-based authentication system',
		priority: 'high',
		reasoning: 'Security layer required for user-specific features'
	}
];

export const mockSubtasks = [
	{ title: 'Install Express framework', reasoning: 'Core web framework' },
	{ title: 'Setup project structure', reasoning: 'Organized codebase' },
	{
		title: 'Configure environment variables',
		reasoning: 'Security and flexibility'
	},
	{
		title: 'Add middleware configuration',
		reasoning: 'Request processing pipeline'
	},
	{
		title: 'Create basic health check endpoint',
		reasoning: 'Monitoring capability'
	}
];

export const mockComplexityAnalysis = {
	score: 75,
	level: 'high',
	factors: {
		dependencies: 30,
		subtasks: 20,
		technical: 15,
		integration: 10
	},
	recommendations: [
		'Consider breaking down into smaller tasks',
		'Add more detailed acceptance criteria',
		'Identify potential technical risks early'
	]
};

export const mockComplexityReport = {
	summary: {
		totalTasks: 5,
		averageComplexity: 45,
		highComplexityTasks: 2,
		criticalPath: ['task_001', 'task_002', 'task_004']
	},
	distribution: {
		low: 2,
		medium: 1,
		high: 2,
		critical: 0
	},
	recommendations: [
		'Focus on high complexity tasks first',
		'Consider parallel development where possible',
		'Add buffer time for complex integrations'
	]
};

/**
 * Create a mock task with custom properties
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock task object
 */
export const createMockTask = (overrides = {}) => ({
	id: `task_${Date.now()}`,
	title: 'Default Task',
	description: 'Default task description',
	status: 'pending',
	priority: 'medium',
	dependencies: [],
	subtasks: [],
	reasoning: 'Default reasoning',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides
});

/**
 * Create multiple mock tasks
 * @param {number} count - Number of tasks to create
 * @param {Object} template - Template for task properties
 * @returns {Array} Array of mock tasks
 */
export const createMockTasks = (count, template = {}) => {
	return Array.from({ length: count }, (_, i) => ({
		id: `task_${String(i + 1).padStart(3, '0')}`,
		title: `Task ${i + 1}`,
		description: `Description for task ${i + 1}`,
		status: 'pending',
		priority: 'medium',
		dependencies: [],
		subtasks: [],
		reasoning: `Reasoning for task ${i + 1}`,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...template
	}));
};

/**
 * Create a mock error response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} Mock error response
 */
export const createMockError = (code, message, details = {}) => ({
	success: false,
	error: {
		code,
		message,
		details
	}
});

/**
 * Create a mock success response
 * @param {*} data - Response data
 * @param {Object} meta - Additional metadata
 * @returns {Object} Mock success response
 */
export const createMockSuccess = (data, meta = {}) => ({
	success: true,
	data,
	...meta
});

// Export common test scenarios
export const testScenarios = {
	emptyProject: {
		tasks: [],
		project: {
			...mockProject,
			metadata: { ...mockProject.metadata, taskCount: 0 }
		}
	},
	singleTask: {
		tasks: [mockTasks[0]],
		project: {
			...mockProject,
			metadata: { ...mockProject.metadata, taskCount: 1 }
		}
	},
	complexDependencies: {
		tasks: mockTasks,
		project: mockProject
	}
};

// Export validation schemas for testing
export const validationSchemas = {
	task: {
		required: ['title', 'description'],
		optional: ['priority', 'dependencies', 'reasoning'],
		status: ['pending', 'in-progress', 'completed', 'blocked'],
		priority: ['low', 'medium', 'high', 'critical']
	},
	subtask: {
		required: ['title'],
		optional: ['reasoning', 'completed']
	},
	project: {
		required: ['name'],
		optional: ['description', 'aiProvider', 'template']
	}
};
