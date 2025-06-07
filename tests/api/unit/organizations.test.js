const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      admin: {
        getUserByEmail: jest.fn(),
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
  })),
}));

const app = require('../../../api/server');

describe('Organizations API Endpoints', () => {
  let mockSupabase;
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  
  beforeEach(() => {
    mockSupabase = createClient();
    jest.clearAllMocks();
    
    // Default auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('POST /api/v1/organizations', () => {
    it('should create organization for authenticated user', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          id: 'org-123',
          name: 'Test Organization',
          role: 'admin',
        },
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test Organization',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Organization');
      expect(response.body.data.role).toBe('admin');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_organization_with_admin', {
        org_name: 'Test Organization',
        admin_id: 'user-123',
      });
    });

    it('should validate organization name', async () => {
      const response = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: '', // Empty name
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Organization name');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/organizations')
        .send({
          name: 'Test Organization',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/organizations', () => {
    it('should return user organizations', async () => {
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [
          {
            organization_id: 'org-123',
            role: 'admin',
            organization: { id: 'org-123', name: 'Org 1' },
          },
          {
            organization_id: 'org-456',
            role: 'member',
            organization: { id: 'org-456', name: 'Org 2' },
          },
        ],
        error: null,
      });

      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].role).toBe('admin');
      expect(response.body.data[1].role).toBe('member');
    });

    it('should return empty array when no organizations', async () => {
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/v1/organizations/:orgId/members', () => {
    it('should return organization members', async () => {
      // Mock membership check
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      // Mock members query
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [
          {
            profile_id: 'user-123',
            role: 'admin',
            profile: { id: 'user-123', full_name: 'Admin User', email: 'admin@example.com' },
          },
          {
            profile_id: 'user-456',
            role: 'member',
            profile: { id: 'user-456', full_name: 'Member User', email: 'member@example.com' },
          },
        ],
        error: null,
      });

      const response = await request(app)
        .get('/api/v1/organizations/org-123/members')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].role).toBe('admin');
      expect(response.body.data[1].role).toBe('member');
    });

    it('should require organization membership', async () => {
      // Mock no membership
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      });

      const response = await request(app)
        .get('/api/v1/organizations/org-123/members')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Not a member');
    });
  });

  describe('POST /api/v1/organizations/:orgId/invites', () => {
    beforeEach(() => {
      // Mock admin check
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });
    });

    it('should add existing user to organization', async () => {
      mockSupabase.auth.admin.getUserByEmail.mockResolvedValueOnce({
        data: { user: { id: 'user-456', email: 'existing@example.com' } },
        error: null,
      });

      mockSupabase.from().insert().mockResolvedValueOnce({
        data: { organization_id: 'org-123', profile_id: 'user-456', role: 'member' },
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/organizations/org-123/invites')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'existing@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added to the organization');
    });

    it('should send invitation for new user', async () => {
      mockSupabase.auth.admin.getUserByEmail.mockResolvedValueOnce({
        data: { user: null },
        error: { code: 'user_not_found' },
      });

      // Mock invitation creation
      mockSupabase.from().insert().mockResolvedValueOnce({
        data: { id: 'invite-123' },
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/organizations/org-123/invites')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'newuser@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Invitation email has been sent');
    });

    it('should require admin role', async () => {
      // Override with member role
      mockSupabase.from().select().eq().eq().single.mockReset();
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { role: 'member' },
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/organizations/org-123/invites')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin access required');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/organizations/org-123/invites')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });
  });

  describe('PUT /api/v1/organizations/:orgId/members/:profileId', () => {
    beforeEach(() => {
      // Mock admin check
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });
    });

    it('should update member role', async () => {
      mockSupabase.from().update().eq().eq().mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      const response = await request(app)
        .put('/api/v1/organizations/org-123/members/user-456')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role: 'admin',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('admin');
    });

    it('should validate role value', async () => {
      const response = await request(app)
        .put('/api/v1/organizations/org-123/members/user-456')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role: 'invalid-role',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid role');
    });

    it('should prevent self-demotion', async () => {
      const response = await request(app)
        .put('/api/v1/organizations/org-123/members/user-123')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role: 'member',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot change your own role');
    });
  });

  describe('DELETE /api/v1/organizations/:orgId/members/:profileId', () => {
    beforeEach(() => {
      // Mock admin check
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });
    });

    it('should remove member from organization', async () => {
      mockSupabase.from().delete().eq().eq().mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .delete('/api/v1/organizations/org-123/members/user-456')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('removed successfully');
    });

    it('should prevent self-removal', async () => {
      const response = await request(app)
        .delete('/api/v1/organizations/org-123/members/user-123')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot remove yourself');
    });

    it('should require admin role', async () => {
      // Override with member role
      mockSupabase.from().select().eq().eq().single.mockReset();
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { role: 'member' },
        error: null,
      });

      const response = await request(app)
        .delete('/api/v1/organizations/org-123/members/user-456')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});