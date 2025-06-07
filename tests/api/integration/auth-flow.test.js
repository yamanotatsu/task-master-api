const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');

// Mock Supabase
jest.mock('@supabase/supabase-js');

const app = require('../../../api/server');

describe('Authentication Flow Integration', () => {
  let mockSupabase;
  let testUser;
  let authToken;
  let organizationId;

  beforeAll(() => {
    mockSupabase = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        getUser: jest.fn(),
        admin: {
          getUserByEmail: jest.fn(),
          deleteUser: jest.fn(),
        },
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
      rpc: jest.fn(),
    };

    createClient.mockReturnValue(mockSupabase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete User Journey', () => {
    it('should complete signup → login → organization setup → member management flow', async () => {
      // Step 1: Sign up
      testUser = {
        id: 'user-123',
        email: 'integration@example.com',
        user_metadata: { full_name: 'Integration Test User' },
      };

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: testUser, session: null },
        error: null,
      });

      const signupResponse = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          fullName: 'Integration Test User',
          email: 'integration@example.com',
          password: 'IntegrationTest123!',
        });

      expect(signupResponse.status).toBe(201);
      expect(signupResponse.body.success).toBe(true);

      // Step 2: Login
      const session = {
        access_token: 'integration-access-token',
        refresh_token: 'integration-refresh-token',
        expires_in: 3600,
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: testUser, session },
        error: null,
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'integration@example.com',
          password: 'IntegrationTest123!',
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data.session.access_token).toBe('integration-access-token');
      authToken = loginResponse.body.data.session.access_token;

      // Mock auth for subsequent requests
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testUser },
        error: null,
      });

      // Step 3: Check organizations (should be empty)
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const orgsResponse = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(orgsResponse.status).toBe(200);
      expect(orgsResponse.body.data).toEqual([]);

      // Step 4: Create organization
      organizationId = 'org-123';
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          id: organizationId,
          name: 'Integration Test Org',
          role: 'admin',
        },
        error: null,
      });

      const createOrgResponse = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Integration Test Org',
        });

      expect(createOrgResponse.status).toBe(201);
      expect(createOrgResponse.body.data.name).toBe('Integration Test Org');
      expect(createOrgResponse.body.data.role).toBe('admin');

      // Step 5: Verify organization membership
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [{
          organization_id: organizationId,
          role: 'admin',
          organization: { id: organizationId, name: 'Integration Test Org' },
        }],
        error: null,
      });

      const verifyOrgResponse = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(verifyOrgResponse.status).toBe(200);
      expect(verifyOrgResponse.body.data).toHaveLength(1);
      expect(verifyOrgResponse.body.data[0].role).toBe('admin');

      // Step 6: Get organization members
      // Mock membership check
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      // Mock members list
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [{
          profile_id: testUser.id,
          role: 'admin',
          profile: {
            id: testUser.id,
            full_name: 'Integration Test User',
            email: 'integration@example.com',
          },
        }],
        error: null,
      });

      const membersResponse = await request(app)
        .get(`/api/v1/organizations/${organizationId}/members`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(membersResponse.status).toBe(200);
      expect(membersResponse.body.data).toHaveLength(1);
      expect(membersResponse.body.data[0].email).toBe('integration@example.com');

      // Step 7: Invite a new member
      const newMemberEmail = 'newmember@example.com';
      
      // Mock admin check
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      // Mock user lookup (existing user)
      mockSupabase.auth.admin.getUserByEmail.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-456',
            email: newMemberEmail,
          },
        },
        error: null,
      });

      // Mock member addition
      mockSupabase.from().insert().mockResolvedValueOnce({
        data: {
          organization_id: organizationId,
          profile_id: 'user-456',
          role: 'member',
        },
        error: null,
      });

      const inviteResponse = await request(app)
        .post(`/api/v1/organizations/${organizationId}/invites`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: newMemberEmail,
        });

      expect(inviteResponse.status).toBe(200);
      expect(inviteResponse.body.message).toContain('added to the organization');

      // Step 8: Update member role
      // Mock admin check
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      // Mock role update
      mockSupabase.from().update().eq().eq().mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      const updateRoleResponse = await request(app)
        .put(`/api/v1/organizations/${organizationId}/members/user-456`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'admin',
        });

      expect(updateRoleResponse.status).toBe(200);
      expect(updateRoleResponse.body.data.role).toBe('admin');

      // Step 9: Remove member
      // Mock admin check
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      // Mock member removal
      mockSupabase.from().delete().eq().eq().mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const removeResponse = await request(app)
        .delete(`/api/v1/organizations/${organizationId}/members/user-456`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(removeResponse.status).toBe(200);
      expect(removeResponse.body.message).toContain('removed successfully');

      // Step 10: Update profile
      mockSupabase.from().update().eq().mockResolvedValueOnce({
        data: {
          id: testUser.id,
          full_name: 'Updated Integration User',
        },
        error: null,
      });

      const updateProfileResponse = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fullName: 'Updated Integration User',
        });

      expect(updateProfileResponse.status).toBe(200);
      expect(updateProfileResponse.body.data.fullName).toBe('Updated Integration User');

      // Step 11: Logout
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null,
      });

      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.message).toContain('Logged out successfully');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle authentication failures gracefully', async () => {
      // Attempt to access protected endpoint without token
      const noAuthResponse = await request(app)
        .get('/api/v1/organizations');

      expect(noAuthResponse.status).toBe(401);
      expect(noAuthResponse.body.code).toBe('AUTH_REQUIRED');

      // Attempt with invalid token
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const invalidTokenResponse = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', 'Bearer invalid-token');

      expect(invalidTokenResponse.status).toBe(401);
      expect(invalidTokenResponse.body.error).toContain('Invalid');
    });

    it('should enforce organization access control', async () => {
      // Setup mock user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testUser },
        error: null,
      });

      // Mock user is not a member of the organization
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const response = await request(app)
        .get('/api/v1/organizations/other-org-id/members')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Not a member');
    });

    it('should enforce role-based access control', async () => {
      // Setup mock user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testUser },
        error: null,
      });

      // Mock user as member (not admin)
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { role: 'member' },
        error: null,
      });

      // Attempt to invite member (admin-only action)
      const response = await request(app)
        .post(`/api/v1/organizations/${organizationId}/invites`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'unauthorized@example.com',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin access required');
    });
  });
});