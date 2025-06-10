/**
 * Large datasets for performance and stress testing
 */

// Performance benchmarks
export const performanceBenchmarks = {
	small: { taskCount: 10, maxSubtasks: 5, expectedResponseTime: 50 },
	medium: { taskCount: 100, maxSubtasks: 20, expectedResponseTime: 200 },
	large: { taskCount: 1000, maxSubtasks: 100, expectedResponseTime: 1000 }
};

/**
 * Generate a large number of tasks with complex dependencies
 * @param {number} count - Number of tasks to generate
 * @returns {Array} Array of tasks
 */
export const generateLargeTasks = (count = 1000) => {
	const tasks = [];

	for (let i = 1; i <= count; i++) {
		const taskId = `task_${String(i).padStart(3, '0')}`;

		// Create dependencies - each task depends on 0-3 previous tasks
		const dependencies = [];
		if (i > 1) {
			const depCount = Math.min(Math.floor(Math.random() * 4), i - 1);
			for (let j = 0; j < depCount; j++) {
				const depId = Math.floor(Math.random() * (i - 1)) + 1;
				const depTaskId = `task_${String(depId).padStart(3, '0')}`;
				if (!dependencies.includes(depTaskId)) {
					dependencies.push(depTaskId);
				}
			}
		}

		// Create subtasks - 0-10 subtasks per task
		const subtaskCount = Math.floor(Math.random() * 11);
		const subtasks = [];
		for (let j = 1; j <= subtaskCount; j++) {
			subtasks.push({
				id: `sub_${i}_${j}`,
				title: `Subtask ${j} for Task ${i}`,
				completed: Math.random() > 0.5
			});
		}

		// Determine status based on dependencies and random factor
		let status = 'pending';
		if (dependencies.length === 0 || Math.random() > 0.7) {
			const statuses = ['pending', 'in-progress', 'completed'];
			status = statuses[Math.floor(Math.random() * statuses.length)];
		} else if (Math.random() > 0.9) {
			status = 'blocked';
		}

		// Random priority
		const priorities = ['low', 'medium', 'high', 'critical'];
		const priority = priorities[Math.floor(Math.random() * priorities.length)];

		tasks.push({
			id: taskId,
			title: `Task ${i}: ${generateTaskTitle(i)}`,
			description: `Detailed description for task ${i}. This task involves ${generateTaskDescription(i)}`,
			status,
			priority,
			dependencies,
			subtasks,
			reasoning: `This task is important because ${generateReasoning(i)}`,
			createdAt: new Date(
				Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
			).toISOString(),
			updatedAt: new Date(
				Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
			).toISOString()
		});
	}

	return tasks;
};

/**
 * Generate task title based on index
 */
function generateTaskTitle(index) {
	const titles = [
		'Implement feature',
		'Fix bug in',
		'Optimize performance of',
		'Add tests for',
		'Refactor',
		'Document',
		'Review',
		'Deploy',
		'Configure',
		'Update'
	];
	const components = [
		'authentication system',
		'database layer',
		'API endpoints',
		'user interface',
		'caching mechanism',
		'logging system',
		'error handling',
		'validation logic',
		'security features',
		'monitoring tools'
	];

	const titleIndex = index % titles.length;
	const componentIndex = index % components.length;

	return `${titles[titleIndex]} ${components[componentIndex]}`;
}

/**
 * Generate task description based on index
 */
function generateTaskDescription(index) {
	const actions = [
		'implementing comprehensive unit tests',
		'refactoring legacy code',
		'optimizing database queries',
		'improving error handling',
		'adding validation rules',
		'enhancing security measures',
		'updating documentation',
		'fixing performance issues',
		'adding new features',
		'resolving technical debt'
	];

	return actions[index % actions.length];
}

/**
 * Generate reasoning based on index
 */
function generateReasoning(index) {
	const reasons = [
		'it improves system reliability',
		'it enhances user experience',
		'it reduces technical debt',
		'it increases performance',
		'it strengthens security',
		'it enables new features',
		'it simplifies maintenance',
		'it meets compliance requirements',
		'it reduces operational costs',
		'it improves team productivity'
	];

	return reasons[index % reasons.length];
}

/**
 * Generate complex dependency graph
 * Creates a DAG (Directed Acyclic Graph) of tasks
 */
export const generateComplexDependencyGraph = (nodeCount = 100) => {
	const tasks = [];
	const layers = Math.ceil(nodeCount / 10); // Create layers of tasks
	let taskCounter = 1;

	for (let layer = 0; layer < layers; layer++) {
		const tasksInLayer = Math.min(10, nodeCount - tasks.length);

		for (let i = 0; i < tasksInLayer; i++) {
			const taskId = `task_${String(taskCounter).padStart(3, '0')}`;
			const dependencies = [];

			// Tasks in layer 0 have no dependencies
			if (layer > 0) {
				// Each task depends on 1-3 tasks from previous layers
				const depCount = Math.min(
					Math.floor(Math.random() * 3) + 1,
					taskCounter - 1
				);
				const startRange = Math.max(1, taskCounter - 20); // Look at last 20 tasks

				for (let j = 0; j < depCount; j++) {
					const depId =
						Math.floor(Math.random() * (taskCounter - startRange)) + startRange;
					const depTaskId = `task_${String(depId).padStart(3, '0')}`;
					if (!dependencies.includes(depTaskId) && depId < taskCounter) {
						dependencies.push(depTaskId);
					}
				}
			}

			tasks.push({
				id: taskId,
				title: `Layer ${layer} Task ${i + 1}`,
				description: `Task in dependency layer ${layer}`,
				status: layer === 0 ? 'completed' : 'pending',
				priority: layer < layers / 2 ? 'high' : 'medium',
				dependencies,
				subtasks: [],
				layer,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});

			taskCounter++;
		}
	}

	return tasks;
};

/**
 * Generate tasks with circular dependencies (for testing validation)
 */
export const generateCircularDependencies = () => {
	return [
		{
			id: 'task_001',
			title: 'Task A',
			description: 'First task in circular dependency',
			status: 'pending',
			priority: 'high',
			dependencies: ['task_003'], // Creates circle: A -> C -> B -> A
			subtasks: []
		},
		{
			id: 'task_002',
			title: 'Task B',
			description: 'Second task in circular dependency',
			status: 'pending',
			priority: 'high',
			dependencies: ['task_001'],
			subtasks: []
		},
		{
			id: 'task_003',
			title: 'Task C',
			description: 'Third task in circular dependency',
			status: 'pending',
			priority: 'high',
			dependencies: ['task_002'],
			subtasks: []
		}
	];
};

/**
 * Generate deeply nested subtasks
 */
export const generateDeepSubtasks = (depth = 5, breadth = 3) => {
	const generateSubtaskLevel = (parentId, level) => {
		if (level > depth) return [];

		const subtasks = [];
		for (let i = 1; i <= breadth; i++) {
			const subtaskId = `${parentId}_${i}`;
			subtasks.push({
				id: subtaskId,
				title: `Subtask ${subtaskId}`,
				completed: false,
				subtasks: generateSubtaskLevel(subtaskId, level + 1)
			});
		}
		return subtasks;
	};

	return {
		id: 'task_001',
		title: 'Task with deep subtasks',
		description: 'Testing deeply nested subtask structures',
		status: 'pending',
		priority: 'medium',
		dependencies: [],
		subtasks: generateSubtaskLevel('sub', 1)
	};
};

/**
 * Generate concurrent task operations dataset
 * Simulates multiple users working on the same project
 */
export const generateConcurrentOperations = (operationCount = 100) => {
	const operations = [];
	const taskIds = Array.from(
		{ length: 20 },
		(_, i) => `task_${String(i + 1).padStart(3, '0')}`
	);
	const operationTypes = [
		'create',
		'update',
		'delete',
		'status_change',
		'add_dependency',
		'remove_dependency'
	];

	for (let i = 0; i < operationCount; i++) {
		const operation = {
			id: `op_${i}`,
			type: operationTypes[Math.floor(Math.random() * operationTypes.length)],
			taskId: taskIds[Math.floor(Math.random() * taskIds.length)],
			timestamp: new Date(Date.now() - Math.random() * 60000).toISOString(), // Within last minute
			userId: `user_${Math.floor(Math.random() * 5) + 1}`,
			data: {}
		};

		// Add operation-specific data
		switch (operation.type) {
			case 'create':
				operation.data = {
					title: `New task ${i}`,
					description: 'Concurrently created task',
					priority: 'medium'
				};
				break;
			case 'update':
				operation.data = {
					title: `Updated task ${i}`,
					description: 'Concurrently updated description'
				};
				break;
			case 'status_change':
				operation.data = {
					status: ['pending', 'in-progress', 'completed'][
						Math.floor(Math.random() * 3)
					]
				};
				break;
			case 'add_dependency':
				operation.data = {
					dependencyId: taskIds[Math.floor(Math.random() * taskIds.length)]
				};
				break;
		}

		operations.push(operation);
	}

	return operations;
};

/**
 * Generate large PRD for stress testing
 */
export const generateLargePRD = (sectionCount = 50) => {
	let prd = `# Large Product Requirements Document\n\n`;
	prd += `## Executive Summary\n\n`;
	prd += `This is a comprehensive PRD for stress testing the task generation system. `;
	prd += `It contains ${sectionCount} major sections with detailed requirements.\n\n`;

	for (let i = 1; i <= sectionCount; i++) {
		prd += `## Section ${i}: ${generateSectionTitle(i)}\n\n`;
		prd += `### Overview\n`;
		prd += `This section covers ${generateSectionDescription(i)}.\n\n`;

		prd += `### Requirements\n`;
		for (let j = 1; j <= 5; j++) {
			prd += `${i}.${j}. ${generateRequirement(i, j)}\n`;
		}
		prd += `\n`;

		prd += `### Technical Considerations\n`;
		prd += `- Performance: ${generateTechnicalNote('performance', i)}\n`;
		prd += `- Security: ${generateTechnicalNote('security', i)}\n`;
		prd += `- Scalability: ${generateTechnicalNote('scalability', i)}\n\n`;
	}

	return prd;
};

function generateSectionTitle(index) {
	const titles = [
		'User Authentication and Authorization',
		'Data Management and Storage',
		'API Design and Implementation',
		'Frontend User Interface',
		'Performance Optimization',
		'Security and Compliance',
		'Integration Requirements',
		'Monitoring and Analytics',
		'Deployment and DevOps',
		'Testing and Quality Assurance'
	];
	return (
		titles[index % titles.length] +
		` Module ${Math.floor(index / titles.length) + 1}`
	);
}

function generateSectionDescription(index) {
	const descriptions = [
		'the implementation of core functionality',
		'critical system components and their interactions',
		'user-facing features and workflows',
		'backend services and data processing',
		'infrastructure and deployment requirements',
		'security measures and compliance standards',
		'third-party integrations and APIs',
		'monitoring, logging, and analytics systems',
		'testing strategies and quality metrics',
		'performance optimization techniques'
	];
	return descriptions[index % descriptions.length];
}

function generateRequirement(section, req) {
	const requirements = [
		'Implement comprehensive error handling',
		'Ensure data consistency across all operations',
		'Provide real-time updates to connected clients',
		'Support horizontal scaling for high availability',
		'Implement rate limiting and throttling',
		'Add comprehensive audit logging',
		'Support multiple authentication methods',
		'Optimize database queries for performance',
		'Implement caching strategies',
		'Ensure backward compatibility'
	];
	const reqIndex = (section * req) % requirements.length;
	return requirements[reqIndex] + ` for section ${section}`;
}

function generateTechnicalNote(type, index) {
	const notes = {
		performance: [
			'Must handle 10,000 requests per second',
			'Response time should be under 100ms',
			'Database queries optimized with indexes',
			'Implement connection pooling',
			'Use CDN for static assets'
		],
		security: [
			'Implement OAuth 2.0 authentication',
			'Use TLS 1.3 for all communications',
			'Regular security audits required',
			'Data encryption at rest and in transit',
			'GDPR compliance mandatory'
		],
		scalability: [
			'Microservices architecture recommended',
			'Support auto-scaling based on load',
			'Use message queues for async operations',
			'Implement database sharding',
			'Container-based deployment'
		]
	};

	const noteArray = notes[type];
	return noteArray[index % noteArray.length];
}
