import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Authentication test helpers and utilities
 */

/**
 * Generate a valid JWT token for testing
 */
export const generateTestToken = (payload = {}, options = {}) => {
	const defaultPayload = {
		sub: 'test-user-id',
		email: 'test@example.com',
		aud: 'authenticated',
		role: 'authenticated',
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
		...payload
	};

	const secret = process.env.JWT_SECRET || 'test-secret';
	return jwt.sign(defaultPayload, secret, options);
};

/**
 * Generate an expired JWT token for testing
 */
export const generateExpiredToken = (payload = {}) => {
	return generateTestToken({
		...payload,
		iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
		exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
	});
};

/**
 * Generate an invalid JWT token for testing
 */
export const generateInvalidToken = () => {
	return 'invalid.jwt.token';
};

/**
 * Create authentication headers for requests
 */
export const createAuthHeaders = (token = null) => {
	if (!token) {
		token = generateTestToken();
	}

	return {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json'
	};
};

/**
 * Create test request with authentication
 */
export const createAuthenticatedRequest = (request, token = null) => {
	const headers = createAuthHeaders(token);
	return {
		...request,
		headers: {
			...request.headers,
			...headers
		}
	};
};

/**
 * Mock authentication middleware
 */
export const mockAuthMiddleware = (userOverrides = {}) => {
	return (req, res, next) => {
		const defaultUser = {
			id: 'test-user-id',
			email: 'test@example.com',
			profile: {
				id: 'test-user-id',
				full_name: 'Test User',
				email: 'test@example.com'
			},
			...userOverrides
		};

		req.user = defaultUser;
		next();
	};
};

/**
 * Mock role-based access control middleware
 */
export const mockRequireRole = (requiredRole, userRole = 'admin') => {
	return (req, res, next) => {
		if (requiredRole === 'admin' && userRole !== 'admin') {
			return res.status(403).json({
				success: false,
				error: {
					code: 'AUTHZ_REQUIRES_ADMIN',
					message: 'Admin privileges required'
				}
			});
		}

		req.organizationMember = { role: userRole };
		next();
	};
};

/**
 * Password validation test cases
 */
export const passwordTestCases = {
	valid: [
		'SecurePass123!',
		'MyP@ssw0rd2024',
		'C0mpl3x!Pass',
		'Str0ng#Password'
	],
	invalid: {
		tooShort: 'abc123',
		noUppercase: 'lowercase123!',
		noLowercase: 'UPPERCASE123!',
		noNumbers: 'NoNumbersHere!',
		noSpecialChars: 'NoSpecialChars123',
		common: 'password123',
		sequential: '12345678Ab!'
	}
};

/**
 * Email validation test cases
 */
export const emailTestCases = {
	valid: [
		'test@example.com',
		'user.name@domain.co.jp',
		'valid+email@subdomain.example.org',
		'test123@test-domain.com'
	],
	invalid: [
		'invalid-email',
		'@example.com',
		'user@',
		'user..name@example.com',
		'user@example',
		'user@.com',
		''
	]
};

/**
 * Rate limiting test helpers
 */
export const simulateRateLimitRequests = async (requestFn, count = 10) => {
	const requests = [];
	for (let i = 0; i < count; i++) {
		requests.push(requestFn());
	}
	return Promise.all(requests);
};

/**
 * Security payload test cases
 */
export const securityTestPayloads = {
	xss: [
		'<script>alert("XSS")</script>',
		'"><script>alert("XSS")</script>',
		'javascript:alert("XSS")',
		'<img src=x onerror=alert("XSS")>',
		'<svg onload=alert("XSS")>'
	],
	sqlInjection: [
		"'; DROP TABLE users; --",
		"' OR '1'='1",
		"' UNION SELECT password FROM users --",
		"admin'/*",
		"' OR 1=1#"
	],
	pathTraversal: [
		'../../../etc/passwd',
		'..\\..\\..\\windows\\system32\\config\\sam',
		'/etc/passwd',
		'....//....//....//etc/passwd'
	],
	noSqlInjection: [
		'{"$ne": null}',
		'{"$gt": ""}',
		'{"$where": "this.password.length > 0"}',
		'{"$regex": ".*"}'
	]
};

/**
 * Generate random test data
 */
export const generateRandomEmail = () => {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(7);
	return `test-${timestamp}-${random}@example.com`;
};

export const generateRandomPassword = () => {
	const chars =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
	let password = '';

	// Ensure at least one of each required character type
	password += 'A'; // uppercase
	password += 'a'; // lowercase
	password += '1'; // number
	password += '!'; // special char

	// Fill the rest randomly
	for (let i = 4; i < 12; i++) {
		password += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	// Shuffle the password
	return password
		.split('')
		.sort(() => Math.random() - 0.5)
		.join('');
};

export const generateRandomString = (length = 10) => {
	return crypto.randomBytes(length).toString('hex').substring(0, length);
};

/**
 * Time-based test helpers
 */
export const waitForMs = (ms) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const withTimeout = (promise, timeoutMs = 5000) => {
	return Promise.race([
		promise,
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error('Test timeout')), timeoutMs)
		)
	]);
};

/**
 * Test environment helpers
 */
export const isTestEnvironment = () => process.env.NODE_ENV === 'test';

export const skipIfNotTestEnv = (testFn) => {
	return isTestEnvironment() ? testFn : it.skip;
};

/**
 * Mock external services
 */
export const mockEmailService = () => ({
	sendWelcomeEmail: jest.fn().mockResolvedValue(true),
	sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
	sendInvitationEmail: jest.fn().mockResolvedValue(true),
	sendPasswordChangedEmail: jest.fn().mockResolvedValue(true)
});

export const mockRedisClient = () => ({
	get: jest.fn(),
	set: jest.fn(),
	del: jest.fn(),
	exists: jest.fn(),
	expire: jest.fn(),
	incr: jest.fn(),
	ttl: jest.fn()
});

/**
 * API response validation helpers
 */
export const expectSuccessResponse = (response, expectedStatus = 200) => {
	expect(response.status).toBe(expectedStatus);
	expect(response.body).toMatchObject({
		success: true,
		data: expect.any(Object)
	});
};

export const expectErrorResponse = (
	response,
	expectedCode,
	expectedStatus = 400
) => {
	expect(response.status).toBe(expectedStatus);
	expect(response.body).toMatchObject({
		success: false,
		error: expect.objectContaining({
			code: expectedCode,
			message: expect.any(String)
		})
	});
};

export const expectValidationErrorResponse = (response, fieldErrors = []) => {
	expectErrorResponse(response, 'VALIDATION_ERROR', 400);

	if (fieldErrors.length > 0) {
		expect(response.body.error.details).toEqual(
			expect.arrayContaining(
				fieldErrors.map((field) =>
					expect.objectContaining({
						field,
						message: expect.any(String)
					})
				)
			)
		);
	}
};

/**
 * Database transaction helpers for tests
 */
export const withTestTransaction = async (testFn) => {
	// This would implement a test transaction that rolls back after the test
	// For now, we'll use the cleanup functions
	try {
		await testFn();
	} finally {
		// Cleanup is handled by setupTestDatabase and cleanupTestData
	}
};

/**
 * Test data cleanup helpers
 */
export const cleanupTestUser = async (supabaseAdmin, userId) => {
	try {
		await supabaseAdmin
			.from('organization_members')
			.delete()
			.eq('profile_id', userId);
		await supabaseAdmin.from('profiles').delete().eq('id', userId);
		await supabaseAdmin.auth.admin.deleteUser(userId);
	} catch (error) {
		console.warn(`Failed to cleanup test user ${userId}:`, error.message);
	}
};

export const cleanupTestOrganization = async (
	supabaseAdmin,
	organizationId
) => {
	try {
		await supabaseAdmin
			.from('organization_members')
			.delete()
			.eq('organization_id', organizationId);
		await supabaseAdmin
			.from('invitations')
			.delete()
			.eq('organization_id', organizationId);
		await supabaseAdmin.from('organizations').delete().eq('id', organizationId);
	} catch (error) {
		console.warn(
			`Failed to cleanup test organization ${organizationId}:`,
			error.message
		);
	}
};
