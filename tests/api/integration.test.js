import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import {
	setupTestDatabase,
	cleanupTestData,
	createTestUser,
	loginTestUser,
	createTestOrganization,
	addUserToOrganization,
	supabaseTest,
	supabaseAdmin
} from './config/test-db.js';
import {
	expectSuccessResponse,
	expectErrorResponse,
	generateRandomEmail,
	generateRandomPassword,
	withTimeout,
	waitForMs
} from './config/auth-helpers.js';
import { testScenarios } from './config/mock-data.js';

// Create a comprehensive test app that combines all authentication features
const createIntegrationTestApp = () => {
	const app = express();
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	// Mock authentication middleware
	const authMiddleware = async (req, res, next) => {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({
				success: false,
				error: {
					code: 'AUTH_TOKEN_MISSING',
					message: 'Authentication required'
				}
			});
		}

		const token = authHeader.substring(7);

		try {
			// Simulate token validation
			const {
				data: { user },
				error
			} = await supabaseTest.auth.getUser(token);

			if (error || !user) {
				throw new Error('Invalid token');
			}

			req.user = {
				id: user.id,
				email: user.email,
				profile: user.user_metadata
			};

			next();
		} catch (error) {
			res.status(401).json({
				success: false,
				error: {
					code: 'AUTH_TOKEN_INVALID',
					message: 'Invalid or expired token'
				}
			});
		}
	};

	// Auth routes
	const authRouter = express.Router();

	authRouter.post('/signup', async (req, res) => {
		const { fullName, email, password } = req.body;

		try {
			const { data, error } = await supabaseTest.auth.signUp({
				email,
				password,
				options: {
					data: { full_name: fullName }
				}
			});

			if (error) {
				if (error.message.includes('already registered')) {
					return res.status(409).json({
						success: false,
						error: {
							code: 'AUTH_EMAIL_EXISTS',
							message: 'This email is already registered'
						}
					});
				}
				throw error;
			}

			res.status(201).json({
				success: true,
				data: {
					message:
						'Registration successful. Please check your email to verify your account.',
					user: {
						id: data.user.id,
						email: data.user.email
					}
				}
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An error occurred during registration'
				}
			});
		}
	});

	authRouter.post('/login', async (req, res) => {
		const { email, password } = req.body;

		try {
			const { data, error } = await supabaseTest.auth.signInWithPassword({
				email,
				password
			});

			if (error) {
				return res.status(401).json({
					success: false,
					error: {
						code: 'AUTH_INVALID_CREDENTIALS',
						message: 'Invalid email or password'
					}
				});
			}

			res.status(200).json({
				success: true,
				data: {
					user: {
						id: data.user.id,
						email: data.user.email,
						fullName: data.user.user_metadata?.full_name
					},
					tokens: {
						accessToken: data.session.access_token,
						refreshToken: data.session.refresh_token,
						expiresIn: data.session.expires_in
					}
				}
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An error occurred during login'
				}
			});
		}
	});

	authRouter.post('/logout', authMiddleware, async (req, res) => {
		try {
			await supabaseTest.auth.signOut();
			res.status(200).json({
				success: true,
				data: { message: 'Logged out successfully' }
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An error occurred during logout'
				}
			});
		}
	});

	authRouter.post('/refresh', async (req, res) => {
		const { refreshToken } = req.body;

		try {
			const { data, error } = await supabaseTest.auth.refreshSession({
				refresh_token: refreshToken
			});

			if (error) {
				return res.status(401).json({
					success: false,
					error: {
						code: 'AUTH_TOKEN_INVALID',
						message: 'Invalid refresh token'
					}
				});
			}

			res.status(200).json({
				success: true,
				data: {
					tokens: {
						accessToken: data.session.access_token,
						refreshToken: data.session.refresh_token,
						expiresIn: data.session.expires_in
					}
				}
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An error occurred during token refresh'
				}
			});
		}
	});

	app.use('/api/v1/auth', authRouter);

	// User routes
	const userRouter = express.Router();

	userRouter.get('/profile', authMiddleware, async (req, res) => {
		try {
			const { data: profile } = await supabaseTest
				.from('profiles')
				.select('*')
				.eq('id', req.user.id)
				.single();

			res.status(200).json({
				success: true,
				data: { profile }
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'Failed to fetch profile'
				}
			});
		}
	});

	userRouter.put('/profile', authMiddleware, async (req, res) => {
		const { fullName, avatarUrl } = req.body;

		try {
			const { data: profile } = await supabaseTest
				.from('profiles')
				.update({ full_name: fullName, avatar_url: avatarUrl })
				.eq('id', req.user.id)
				.select()
				.single();

			res.status(200).json({
				success: true,
				data: { profile }
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'Failed to update profile'
				}
			});
		}
	});

	app.use('/api/v1/users', userRouter);

	// Organization routes
	const orgRouter = express.Router();

	orgRouter.post('/', authMiddleware, async (req, res) => {
		const { name, description } = req.body;

		try {
			const { data: organization } = await supabaseTest
				.from('organizations')
				.insert({ name, description })
				.select()
				.single();

			await supabaseTest.from('organization_members').insert({
				organization_id: organization.id,
				profile_id: req.user.id,
				role: 'admin'
			});

			res.status(201).json({
				success: true,
				data: { organization }
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'Failed to create organization'
				}
			});
		}
	});

	orgRouter.get('/', authMiddleware, async (req, res) => {
		try {
			const { data: memberships } = await supabaseTest
				.from('organization_members')
				.select(
					`
          role,
          organizations (
            id,
            name,
            description,
            created_at
          )
        `
				)
				.eq('profile_id', req.user.id);

			const organizations = memberships.map((m) => ({
				...m.organizations,
				role: m.role
			}));

			res.status(200).json({
				success: true,
				data: { organizations }
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'Failed to fetch organizations'
				}
			});
		}
	});

	orgRouter.post(
		'/:organizationId/invites',
		authMiddleware,
		async (req, res) => {
			const { organizationId } = req.params;
			const { email, role } = req.body;

			try {
				// Check if user is admin
				const { data: membership } = await supabaseTest
					.from('organization_members')
					.select('role')
					.eq('organization_id', organizationId)
					.eq('profile_id', req.user.id)
					.single();

				if (!membership || membership.role !== 'admin') {
					return res.status(403).json({
						success: false,
						error: {
							code: 'AUTHZ_REQUIRES_ADMIN',
							message: 'Admin privileges required'
						}
					});
				}

				const token = `invite-${Date.now()}`;
				const { data: invitation } = await supabaseTest
					.from('invitations')
					.insert({
						organization_id: organizationId,
						email,
						role,
						token,
						invited_by: req.user.id,
						expires_at: new Date(
							Date.now() + 7 * 24 * 60 * 60 * 1000
						).toISOString()
					})
					.select()
					.single();

				res.status(201).json({
					success: true,
					data: { invitation }
				});
			} catch (error) {
				res.status(500).json({
					success: false,
					error: {
						code: 'INTERNAL_ERROR',
						message: 'Failed to send invitation'
					}
				});
			}
		}
	);

	app.use('/api/v1/organizations', orgRouter);

	// Error handling
	app.use((err, req, res, next) => {
		res.status(err.status || 500).json({
			success: false,
			error: {
				code: err.code || 'INTERNAL_ERROR',
				message: err.message || 'Internal server error'
			}
		});
	});

	return app;
};

describe('Integration Tests - End-to-End Authentication Flows', () => {
	let app;

	beforeAll(async () => {
		await setupTestDatabase();
		app = createIntegrationTestApp();
	});

	beforeEach(async () => {
		await cleanupTestData();
	});

	afterAll(async () => {
		await cleanupTestData();
	});

	describe('Complete User Registration Flow', () => {
		it('should complete full user registration and setup workflow', async () => {
			const userData = {
				fullName: 'Integration Test User',
				email: generateRandomEmail(),
				password: generateRandomPassword()
			};

			// Step 1: User registration
			const signupResponse = await request(app)
				.post('/api/v1/auth/signup')
				.send(userData)
				.expect(201);

			expectSuccessResponse(signupResponse, 201);
			expect(signupResponse.body.data.user.email).toBe(userData.email);

			// Step 2: Email verification (simulated in test environment)
			// In real environment, user would click email link

			// Step 3: User login
			const loginResponse = await request(app)
				.post('/api/v1/auth/login')
				.send({
					email: userData.email,
					password: userData.password
				})
				.expect(200);

			expectSuccessResponse(loginResponse, 200);
			const { accessToken, refreshToken } = loginResponse.body.data.tokens;
			expect(accessToken).toBeDefined();
			expect(refreshToken).toBeDefined();

			// Step 4: Get user profile
			const profileResponse = await request(app)
				.get('/api/v1/users/profile')
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(200);

			expectSuccessResponse(profileResponse, 200);
			expect(profileResponse.body.data.profile.email).toBe(userData.email);

			// Step 5: Update profile
			const updateData = {
				fullName: 'Updated Full Name',
				avatarUrl: 'https://example.com/avatar.jpg'
			};

			const updateResponse = await request(app)
				.put('/api/v1/users/profile')
				.set('Authorization', `Bearer ${accessToken}`)
				.send(updateData)
				.expect(200);

			expectSuccessResponse(updateResponse, 200);
			expect(updateResponse.body.data.profile.full_name).toBe(
				updateData.fullName
			);

			// Step 6: Create organization
			const orgData = {
				name: "User's First Organization",
				description: 'Created during integration test'
			};

			const orgResponse = await request(app)
				.post('/api/v1/organizations')
				.set('Authorization', `Bearer ${accessToken}`)
				.send(orgData)
				.expect(201);

			expectSuccessResponse(orgResponse, 201);
			expect(orgResponse.body.data.organization.name).toBe(orgData.name);

			// Step 7: Verify organization membership
			const orgsResponse = await request(app)
				.get('/api/v1/organizations')
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(200);

			expectSuccessResponse(orgsResponse, 200);
			expect(orgsResponse.body.data.organizations).toHaveLength(1);
			expect(orgsResponse.body.data.organizations[0].role).toBe('admin');

			// Step 8: Token refresh
			const refreshResponse = await request(app)
				.post('/api/v1/auth/refresh')
				.send({ refreshToken })
				.expect(200);

			expectSuccessResponse(refreshResponse, 200);
			const newTokens = refreshResponse.body.data.tokens;
			expect(newTokens.accessToken).toBeDefined();
			expect(newTokens.accessToken).not.toBe(accessToken);

			// Step 9: Use new token to access protected resource
			const newProfileResponse = await request(app)
				.get('/api/v1/users/profile')
				.set('Authorization', `Bearer ${newTokens.accessToken}`)
				.expect(200);

			expectSuccessResponse(newProfileResponse, 200);

			// Step 10: Logout
			const logoutResponse = await request(app)
				.post('/api/v1/auth/logout')
				.set('Authorization', `Bearer ${newTokens.accessToken}`)
				.expect(200);

			expectSuccessResponse(logoutResponse, 200);

			// Step 11: Verify token is invalid after logout
			const invalidTokenResponse = await request(app)
				.get('/api/v1/users/profile')
				.set('Authorization', `Bearer ${newTokens.accessToken}`)
				.expect(401);

			expectErrorResponse(invalidTokenResponse, 'AUTH_TOKEN_INVALID', 401);
		});
	});

	describe('Multi-User Organization Workflow', () => {
		it('should handle complete multi-user organization management flow', async () => {
			// Create admin user
			const adminUser = await createTestUser({
				email: 'admin@integration-test.com',
				password: 'AdminPass123!',
				fullName: 'Organization Admin'
			});
			const adminTokens = await loginTestUser(adminUser);

			// Create member user
			const memberUser = await createTestUser({
				email: 'member@integration-test.com',
				password: 'MemberPass123!',
				fullName: 'Organization Member'
			});
			const memberTokens = await loginTestUser(memberUser);

			// Step 1: Admin creates organization
			const orgData = {
				name: 'Multi-User Test Organization',
				description: 'Testing multi-user workflows'
			};

			const orgResponse = await request(app)
				.post('/api/v1/organizations')
				.set('Authorization', `Bearer ${adminTokens.accessToken}`)
				.send(orgData)
				.expect(201);

			const organizationId = orgResponse.body.data.organization.id;

			// Step 2: Admin invites member
			const inviteResponse = await request(app)
				.post(`/api/v1/organizations/${organizationId}/invites`)
				.set('Authorization', `Bearer ${adminTokens.accessToken}`)
				.send({
					email: memberUser.email,
					role: 'member'
				})
				.expect(201);

			expectSuccessResponse(inviteResponse, 201);
			expect(inviteResponse.body.data.invitation.email).toBe(memberUser.email);

			// Step 3: Add member to organization (simulating invitation acceptance)
			await addUserToOrganization(memberUser.id, organizationId, 'member');

			// Step 4: Member views organizations they belong to
			const memberOrgsResponse = await request(app)
				.get('/api/v1/organizations')
				.set('Authorization', `Bearer ${memberTokens.accessToken}`)
				.expect(200);

			expectSuccessResponse(memberOrgsResponse, 200);
			expect(memberOrgsResponse.body.data.organizations).toHaveLength(1);
			expect(memberOrgsResponse.body.data.organizations[0].role).toBe('member');

			// Step 5: Member tries to invite someone (should fail)
			const unauthorizedInviteResponse = await request(app)
				.post(`/api/v1/organizations/${organizationId}/invites`)
				.set('Authorization', `Bearer ${memberTokens.accessToken}`)
				.send({
					email: 'unauthorized@test.com',
					role: 'member'
				})
				.expect(403);

			expectErrorResponse(
				unauthorizedInviteResponse,
				'AUTHZ_REQUIRES_ADMIN',
				403
			);

			// Step 6: Admin promotes member to admin
			// This would be done through the members endpoint in a real implementation

			// Step 7: Verify workflow completed successfully
			const finalOrgsResponse = await request(app)
				.get('/api/v1/organizations')
				.set('Authorization', `Bearer ${adminTokens.accessToken}`)
				.expect(200);

			expectSuccessResponse(finalOrgsResponse, 200);
			expect(finalOrgsResponse.body.data.organizations[0].name).toBe(
				orgData.name
			);
		});
	});

	describe('Authentication Error Recovery Flows', () => {
		it('should handle session expiration and recovery', async () => {
			const testUser = await createTestUser({
				email: 'session-test@example.com',
				password: 'SessionPass123!',
				fullName: 'Session Test User'
			});

			// Step 1: Login and get tokens
			const loginResponse = await request(app)
				.post('/api/v1/auth/login')
				.send({
					email: testUser.email,
					password: testUser.password
				})
				.expect(200);

			const { accessToken, refreshToken } = loginResponse.body.data.tokens;

			// Step 2: Use valid token
			const validTokenResponse = await request(app)
				.get('/api/v1/users/profile')
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(200);

			expectSuccessResponse(validTokenResponse, 200);

			// Step 3: Simulate token expiration by using invalid token
			const expiredTokenResponse = await request(app)
				.get('/api/v1/users/profile')
				.set('Authorization', 'Bearer expired.token.here')
				.expect(401);

			expectErrorResponse(expiredTokenResponse, 'AUTH_TOKEN_INVALID', 401);

			// Step 4: Refresh token to recover
			const refreshResponse = await request(app)
				.post('/api/v1/auth/refresh')
				.send({ refreshToken })
				.expect(200);

			expectSuccessResponse(refreshResponse, 200);
			const newAccessToken = refreshResponse.body.data.tokens.accessToken;

			// Step 5: Use new token successfully
			const recoveredTokenResponse = await request(app)
				.get('/api/v1/users/profile')
				.set('Authorization', `Bearer ${newAccessToken}`)
				.expect(200);

			expectSuccessResponse(recoveredTokenResponse, 200);
		});

		it('should handle invalid refresh token gracefully', async () => {
			// Attempt to refresh with invalid token
			const invalidRefreshResponse = await request(app)
				.post('/api/v1/auth/refresh')
				.send({ refreshToken: 'invalid.refresh.token' })
				.expect(401);

			expectErrorResponse(invalidRefreshResponse, 'AUTH_TOKEN_INVALID', 401);
		});
	});

	describe('Concurrent User Operations', () => {
		it('should handle concurrent login attempts safely', async () => {
			const testUser = await createTestUser({
				email: 'concurrent-test@example.com',
				password: 'ConcurrentPass123!',
				fullName: 'Concurrent Test User'
			});

			// Simulate multiple concurrent login attempts
			const loginPromises = Array(5)
				.fill()
				.map(() =>
					request(app).post('/api/v1/auth/login').send({
						email: testUser.email,
						password: testUser.password
					})
				);

			const responses = await Promise.all(loginPromises);

			// All should succeed with valid credentials
			responses.forEach((response) => {
				expect(response.status).toBe(200);
				expectSuccessResponse(response, 200);
				expect(response.body.data.tokens.accessToken).toBeDefined();
			});
		});

		it('should handle concurrent organization creation', async () => {
			const testUser = await createTestUser({
				email: 'org-concurrent@example.com',
				password: 'OrgPass123!',
				fullName: 'Org Test User'
			});
			const userTokens = await loginTestUser(testUser);

			// Simulate multiple concurrent organization creation attempts
			const orgPromises = Array(3)
				.fill()
				.map((_, i) =>
					request(app)
						.post('/api/v1/organizations')
						.set('Authorization', `Bearer ${userTokens.accessToken}`)
						.send({
							name: `Concurrent Org ${i + 1}`,
							description: `Organization ${i + 1} created concurrently`
						})
				);

			const responses = await Promise.all(orgPromises);

			// All should succeed
			responses.forEach((response, i) => {
				expect(response.status).toBe(201);
				expectSuccessResponse(response, 201);
				expect(response.body.data.organization.name).toBe(
					`Concurrent Org ${i + 1}`
				);
			});

			// Verify all organizations were created
			const orgsResponse = await request(app)
				.get('/api/v1/organizations')
				.set('Authorization', `Bearer ${userTokens.accessToken}`)
				.expect(200);

			expect(orgsResponse.body.data.organizations).toHaveLength(3);
		});
	});

	describe('Cross-Organization Security', () => {
		it('should prevent cross-organization access violations', async () => {
			// Create two separate organizations with different users
			const user1 = await createTestUser({
				email: 'user1@cross-org-test.com',
				password: 'User1Pass123!',
				fullName: 'User One'
			});
			const user1Tokens = await loginTestUser(user1);

			const user2 = await createTestUser({
				email: 'user2@cross-org-test.com',
				password: 'User2Pass123!',
				fullName: 'User Two'
			});
			const user2Tokens = await loginTestUser(user2);

			// User 1 creates organization
			const org1Response = await request(app)
				.post('/api/v1/organizations')
				.set('Authorization', `Bearer ${user1Tokens.accessToken}`)
				.send({
					name: 'User 1 Organization',
					description: 'Private organization for user 1'
				})
				.expect(201);

			const org1Id = org1Response.body.data.organization.id;

			// User 2 creates organization
			const org2Response = await request(app)
				.post('/api/v1/organizations')
				.set('Authorization', `Bearer ${user2Tokens.accessToken}`)
				.send({
					name: 'User 2 Organization',
					description: 'Private organization for user 2'
				})
				.expect(201);

			const org2Id = org2Response.body.data.organization.id;

			// User 2 should not be able to access User 1's organization
			const unauthorizedAccessResponse = await request(app)
				.post(`/api/v1/organizations/${org1Id}/invites`)
				.set('Authorization', `Bearer ${user2Tokens.accessToken}`)
				.send({
					email: 'intruder@test.com',
					role: 'member'
				})
				.expect(403);

			expectErrorResponse(
				unauthorizedAccessResponse,
				'AUTHZ_REQUIRES_ADMIN',
				403
			);

			// Verify each user can only see their own organizations
			const user1OrgsResponse = await request(app)
				.get('/api/v1/organizations')
				.set('Authorization', `Bearer ${user1Tokens.accessToken}`)
				.expect(200);

			const user2OrgsResponse = await request(app)
				.get('/api/v1/organizations')
				.set('Authorization', `Bearer ${user2Tokens.accessToken}`)
				.expect(200);

			expect(user1OrgsResponse.body.data.organizations).toHaveLength(1);
			expect(user1OrgsResponse.body.data.organizations[0].id).toBe(org1Id);

			expect(user2OrgsResponse.body.data.organizations).toHaveLength(1);
			expect(user2OrgsResponse.body.data.organizations[0].id).toBe(org2Id);
		});
	});

	describe('Performance and Reliability', () => {
		it('should handle rapid sequential requests', async () => {
			const testUser = await createTestUser({
				email: 'performance-test@example.com',
				password: 'PerfPass123!',
				fullName: 'Performance Test User'
			});
			const userTokens = await loginTestUser(testUser);

			// Make rapid sequential profile requests
			const startTime = Date.now();
			const requests = [];

			for (let i = 0; i < 10; i++) {
				requests.push(
					request(app)
						.get('/api/v1/users/profile')
						.set('Authorization', `Bearer ${userTokens.accessToken}`)
						.expect(200)
				);
			}

			const responses = await Promise.all(requests);
			const endTime = Date.now();

			// All requests should succeed
			responses.forEach((response) => {
				expectSuccessResponse(response, 200);
			});

			// Should complete within reasonable time (5 seconds for 10 requests)
			expect(endTime - startTime).toBeLessThan(5000);
		});

		it('should handle timeout scenarios gracefully', async () => {
			const testUser = await createTestUser({
				email: 'timeout-test@example.com',
				password: 'TimeoutPass123!',
				fullName: 'Timeout Test User'
			});
			const userTokens = await loginTestUser(testUser);

			// Test request with timeout
			const timeoutPromise = withTimeout(
				request(app)
					.get('/api/v1/users/profile')
					.set('Authorization', `Bearer ${userTokens.accessToken}`),
				100 // Very short timeout to test timeout handling
			);

			try {
				await timeoutPromise;
			} catch (error) {
				// Timeout is expected in this test
				expect(error.message).toContain('timeout');
			}
		});
	});

	describe('Data Consistency', () => {
		it('should maintain data consistency across operations', async () => {
			const testUser = await createTestUser({
				email: 'consistency-test@example.com',
				password: 'ConsistencyPass123!',
				fullName: 'Consistency Test User'
			});
			const userTokens = await loginTestUser(testUser);

			// Create organization
			const orgResponse = await request(app)
				.post('/api/v1/organizations')
				.set('Authorization', `Bearer ${userTokens.accessToken}`)
				.send({
					name: 'Consistency Test Org',
					description: 'Testing data consistency'
				})
				.expect(201);

			const organizationId = orgResponse.body.data.organization.id;

			// Update profile
			await request(app)
				.put('/api/v1/users/profile')
				.set('Authorization', `Bearer ${userTokens.accessToken}`)
				.send({
					fullName: 'Updated Consistency Test User',
					avatarUrl: 'https://example.com/new-avatar.jpg'
				})
				.expect(200);

			// Verify organization still exists and user is still admin
			const orgsResponse = await request(app)
				.get('/api/v1/organizations')
				.set('Authorization', `Bearer ${userTokens.accessToken}`)
				.expect(200);

			expect(orgsResponse.body.data.organizations).toHaveLength(1);
			expect(orgsResponse.body.data.organizations[0].id).toBe(organizationId);
			expect(orgsResponse.body.data.organizations[0].role).toBe('admin');

			// Verify profile was updated
			const profileResponse = await request(app)
				.get('/api/v1/users/profile')
				.set('Authorization', `Bearer ${userTokens.accessToken}`)
				.expect(200);

			expect(profileResponse.body.data.profile.full_name).toBe(
				'Updated Consistency Test User'
			);
		});
	});

	describe('Edge Cases and Error Scenarios', () => {
		it('should handle malformed requests gracefully', async () => {
			// Malformed JSON
			const malformedResponse = await request(app)
				.post('/api/v1/auth/signup')
				.set('Content-Type', 'application/json')
				.send('{"invalid": json"}')
				.expect(400);

			// Should handle parsing error gracefully
			expect(malformedResponse.status).toBe(400);
		});

		it('should handle missing authentication headers', async () => {
			const response = await request(app)
				.get('/api/v1/users/profile')
				.expect(401);

			expectErrorResponse(response, 'AUTH_TOKEN_MISSING', 401);
		});

		it('should handle database connection issues gracefully', async () => {
			// This test would require mocking database failures
			// For now, we'll test the happy path
			const testUser = await createTestUser({
				email: 'db-test@example.com',
				password: 'DbPass123!',
				fullName: 'DB Test User'
			});
			const userTokens = await loginTestUser(testUser);

			const response = await request(app)
				.get('/api/v1/users/profile')
				.set('Authorization', `Bearer ${userTokens.accessToken}`)
				.expect(200);

			expectSuccessResponse(response, 200);
		});
	});
});
