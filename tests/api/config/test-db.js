import { createClient } from '@supabase/supabase-js';
import { jest } from '@jest/globals';

/**
 * Test database configuration and utilities
 */

// Test Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
const SUPABASE_SERVICE_ROLE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

// Create test Supabase clients
export const supabaseTest = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const supabaseAdmin = createClient(
	SUPABASE_URL,
	SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Setup test database before running tests
 */
export const setupTestDatabase = async () => {
	// Create test schema if needed
	await supabaseAdmin.rpc('create_test_schema', {});

	// Clean existing test data
	await cleanupTestData();

	// Seed base test data
	await seedTestData();
};

/**
 * Cleanup all test data
 */
export const cleanupTestData = async () => {
	try {
		// Delete in reverse order of dependencies
		await supabaseAdmin
			.from('organization_members')
			.delete()
			.neq('id', '00000000-0000-0000-0000-000000000000');
		await supabaseAdmin
			.from('invitations')
			.delete()
			.neq('id', '00000000-0000-0000-0000-000000000000');
		await supabaseAdmin
			.from('organizations')
			.delete()
			.neq('id', '00000000-0000-0000-0000-000000000000');
		await supabaseAdmin
			.from('profiles')
			.delete()
			.neq('id', '00000000-0000-0000-0000-000000000000');

		// Clean auth users (if possible in test environment)
		if (process.env.NODE_ENV === 'test') {
			await supabaseAdmin.auth.admin.listUsers().then(({ data: { users } }) => {
				return Promise.all(
					users
						.filter(
							(user) =>
								user.email?.includes('test') || user.email?.includes('example')
						)
						.map((user) => supabaseAdmin.auth.admin.deleteUser(user.id))
				);
			});
		}
	} catch (error) {
		console.warn('Cleanup warning:', error.message);
	}
};

/**
 * Seed initial test data
 */
export const seedTestData = async () => {
	// Create test organizations
	const { data: testOrg1, error: org1Error } = await supabaseAdmin
		.from('organizations')
		.insert({
			id: 'test-org-1',
			name: 'Test Organization 1',
			description: 'Primary test organization'
		})
		.select()
		.single();

	if (org1Error && !org1Error.message.includes('already exists')) {
		throw org1Error;
	}

	const { data: testOrg2, error: org2Error } = await supabaseAdmin
		.from('organizations')
		.insert({
			id: 'test-org-2',
			name: 'Test Organization 2',
			description: 'Secondary test organization'
		})
		.select()
		.single();

	if (org2Error && !org2Error.message.includes('already exists')) {
		throw org2Error;
	}
};

/**
 * Create a test user with authentication
 */
export const createTestUser = async (userData = {}) => {
	const defaultData = {
		email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
		password: 'TestPass123!',
		fullName: 'Test User',
		...userData
	};

	// Create auth user
	const { data: authData, error: authError } =
		await supabaseAdmin.auth.admin.createUser({
			email: defaultData.email,
			password: defaultData.password,
			email_confirm: true,
			user_metadata: {
				full_name: defaultData.fullName
			}
		});

	if (authError) {
		throw authError;
	}

	// Create profile
	const { data: profile, error: profileError } = await supabaseAdmin
		.from('profiles')
		.insert({
			id: authData.user.id,
			email: defaultData.email,
			full_name: defaultData.fullName,
			avatar_url: defaultData.avatarUrl || null
		})
		.select()
		.single();

	if (profileError) {
		throw profileError;
	}

	return {
		id: authData.user.id,
		email: defaultData.email,
		password: defaultData.password,
		fullName: defaultData.fullName,
		profile
	};
};

/**
 * Login a test user and return tokens
 */
export const loginTestUser = async (userCredentials) => {
	const { data, error } = await supabaseTest.auth.signInWithPassword({
		email: userCredentials.email,
		password: userCredentials.password
	});

	if (error) {
		throw error;
	}

	return {
		accessToken: data.session.access_token,
		refreshToken: data.session.refresh_token,
		user: data.user
	};
};

/**
 * Create test organization with admin user
 */
export const createTestOrganization = async (adminUser, orgData = {}) => {
	const defaultOrgData = {
		name: `Test Org ${Date.now()}`,
		description: 'Test organization',
		...orgData
	};

	const { data: organization, error: orgError } = await supabaseAdmin
		.from('organizations')
		.insert(defaultOrgData)
		.select()
		.single();

	if (orgError) {
		throw orgError;
	}

	// Add admin as organization member
	const { data: membership, error: memberError } = await supabaseAdmin
		.from('organization_members')
		.insert({
			organization_id: organization.id,
			profile_id: adminUser.id,
			role: 'admin'
		})
		.select()
		.single();

	if (memberError) {
		throw memberError;
	}

	return { organization, membership };
};

/**
 * Add user to organization
 */
export const addUserToOrganization = async (
	userId,
	organizationId,
	role = 'member'
) => {
	const { data, error } = await supabaseAdmin
		.from('organization_members')
		.insert({
			organization_id: organizationId,
			profile_id: userId,
			role
		})
		.select()
		.single();

	if (error) {
		throw error;
	}

	return data;
};

/**
 * Mock Supabase client for unit tests
 */
export const createMockSupabase = () => {
	const mockAuth = {
		signUp: jest.fn(),
		signInWithPassword: jest.fn(),
		signOut: jest.fn(),
		getUser: jest.fn(),
		refreshSession: jest.fn(),
		resetPasswordForEmail: jest.fn(),
		updateUser: jest.fn(),
		admin: {
			createUser: jest.fn(),
			deleteUser: jest.fn(),
			getUserByEmail: jest.fn(),
			listUsers: jest.fn()
		}
	};

	const mockFrom = jest.fn(() => ({
		select: jest.fn().mockReturnThis(),
		insert: jest.fn().mockReturnThis(),
		update: jest.fn().mockReturnThis(),
		delete: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		neq: jest.fn().mockReturnThis(),
		in: jest.fn().mockReturnThis(),
		gte: jest.fn().mockReturnThis(),
		lte: jest.fn().mockReturnThis(),
		like: jest.fn().mockReturnThis(),
		ilike: jest.fn().mockReturnThis(),
		is: jest.fn().mockReturnThis(),
		single: jest.fn(),
		maybeSingle: jest.fn(),
		limit: jest.fn().mockReturnThis(),
		order: jest.fn().mockReturnThis(),
		range: jest.fn().mockReturnThis()
	}));

	const mockRpc = jest.fn();

	return {
		auth: mockAuth,
		from: mockFrom,
		rpc: mockRpc
	};
};

/**
 * Test data generators
 */
export const generateUserData = (overrides = {}) => ({
	fullName: 'Test User',
	email: `test-${Date.now()}@example.com`,
	password: 'SecurePass123!',
	...overrides
});

export const generateOrganizationData = (overrides = {}) => ({
	name: `Test Organization ${Date.now()}`,
	description: 'Test organization description',
	...overrides
});

export const generateInvitationData = (overrides = {}) => ({
	email: `invite-${Date.now()}@example.com`,
	role: 'member',
	...overrides
});

/**
 * Test assertions helpers
 */
export const expectAuthenticatedUser = (user) => {
	expect(user).toMatchObject({
		id: expect.any(String),
		email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
		aud: expect.any(String),
		created_at: expect.any(String)
	});
};

export const expectValidTokens = (tokens) => {
	expect(tokens).toMatchObject({
		accessToken: expect.any(String),
		refreshToken: expect.any(String),
		expiresIn: expect.any(Number)
	});
};

export const expectValidProfile = (profile) => {
	expect(profile).toMatchObject({
		id: expect.any(String),
		email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
		full_name: expect.any(String),
		created_at: expect.any(String),
		updated_at: expect.any(String)
	});
};

export const expectValidOrganization = (organization) => {
	expect(organization).toMatchObject({
		id: expect.any(String),
		name: expect.any(String),
		created_at: expect.any(String),
		updated_at: expect.any(String)
	});
};

export const expectValidMembership = (membership) => {
	expect(membership).toMatchObject({
		organization_id: expect.any(String),
		profile_id: expect.any(String),
		role: expect.stringMatching(/^(admin|member)$/),
		joined_at: expect.any(String)
	});
};
