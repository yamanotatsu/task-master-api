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
  createAuthHeaders,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationErrorResponse,
  generateRandomEmail,
  mockAuthMiddleware,
  mockRequireRole
} from './config/auth-helpers.js';
import { 
  mockUsers, 
  mockOrganizations,
  mockMemberships,
  mockInvitations,
  testScenarios,
  generateOrganizationData,
  generateInvitationData 
} from './config/mock-data.js';

// Mock the organization routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock authentication middleware
  const authMiddleware = (req, res, next) => {
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

    // Mock user for testing
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      profile: {
        id: 'test-user-id',
        full_name: 'Test User',
        email: 'test@example.com'
      }
    };
    next();
  };

  // Mock role-based access control middleware
  const requireRole = (requiredRole) => {
    return async (req, res, next) => {
      const { organizationId } = req.params;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ORGANIZATION_ID_REQUIRED',
            message: 'Organization ID is required'
          }
        });
      }

      // Mock membership check
      const { data: membership } = await supabaseTest
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('profile_id', req.user.id)
        .single();

      if (!membership) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTHZ_NOT_ORGANIZATION_MEMBER',
            message: 'You are not a member of this organization'
          }
        });
      }

      if (requiredRole === 'admin' && membership.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTHZ_REQUIRES_ADMIN',
            message: 'Admin privileges required'
          }
        });
      }

      req.organizationMember = membership;
      next();
    };
  };

  const orgRouter = express.Router();

  // Create organization
  orgRouter.post('/', authMiddleware, async (req, res) => {
    const { name, description } = req.body;

    const errors = [];
    if (!name) errors.push({ field: 'name', message: 'Organization name is required' });
    if (name && name.length > 100) errors.push({ field: 'name', message: 'Name must be less than 100 characters' });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors
        }
      });
    }

    try {
      const { data: organization, error: orgError } = await supabaseTest
        .from('organizations')
        .insert({ name, description })
        .select()
        .single();

      if (orgError) {
        throw orgError;
      }

      // Add user as admin
      const { data: membership, error: memberError } = await supabaseTest
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          profile_id: req.user.id,
          role: 'admin'
        })
        .select()
        .single();

      if (memberError) {
        throw memberError;
      }

      res.status(201).json({
        success: true,
        data: {
          organization,
          membership
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ORG_CREATE_FAILED',
          message: 'Failed to create organization'
        }
      });
    }
  });

  // Get user's organizations
  orgRouter.get('/', authMiddleware, async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    try {
      const { data: organizations, error } = await supabaseTest
        .from('organization_members')
        .select(`
          organization_id,
          role,
          joined_at,
          organizations (
            id,
            name,
            description,
            created_at,
            updated_at
          )
        `)
        .eq('profile_id', req.user.id)
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      const formattedOrgs = organizations.map(org => ({
        ...org.organizations,
        role: org.role,
        joinedAt: org.joined_at,
        memberCount: 2, // Mock count
        projectCount: 0  // Mock count
      }));

      res.status(200).json({
        success: true,
        data: {
          organizations: formattedOrgs
        },
        meta: {
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: formattedOrgs.length
          }
        }
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

  // Get organization details
  orgRouter.get('/:organizationId', authMiddleware, requireRole('member'), async (req, res) => {
    const { organizationId } = req.params;

    try {
      const { data: organization, error } = await supabaseTest
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error || !organization) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Organization not found'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: {
          organization,
          membership: req.organizationMember,
          statistics: {
            memberCount: 2,
            projectCount: 0,
            activeTaskCount: 0
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch organization'
        }
      });
    }
  });

  // Update organization
  orgRouter.put('/:organizationId', authMiddleware, requireRole('admin'), async (req, res) => {
    const { organizationId } = req.params;
    const { name, description } = req.body;

    const errors = [];
    if (!name) errors.push({ field: 'name', message: 'Organization name is required' });
    if (name && name.length > 100) errors.push({ field: 'name', message: 'Name must be less than 100 characters' });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors
        }
      });
    }

    try {
      const { data: organization, error } = await supabaseTest
        .from('organizations')
        .update({ name, description, updated_at: new Date().toISOString() })
        .eq('id', organizationId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.status(200).json({
        success: true,
        data: {
          organization
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ORG_UPDATE_FAILED',
          message: 'Failed to update organization'
        }
      });
    }
  });

  // Invite member
  orgRouter.post('/:organizationId/invites', authMiddleware, requireRole('admin'), async (req, res) => {
    const { organizationId } = req.params;
    const { email, role = 'member' } = req.body;

    const errors = [];
    if (!email) errors.push({ field: 'email', message: 'Email is required' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
    if (role && !['member', 'admin'].includes(role)) {
      errors.push({ field: 'role', message: 'Role must be member or admin' });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors
        }
      });
    }

    try {
      // Check if user already exists and is a member
      const { data: existingMember } = await supabaseTest
        .from('organization_members')
        .select('profile_id')
        .eq('organization_id', organizationId)
        .eq('profile_id', req.user.id) // This is simplified for testing
        .single();

      if (existingMember) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'MEMBER_ALREADY_EXISTS',
            message: 'User is already a member of this organization'
          }
        });
      }

      // Create invitation
      const inviteToken = `invite-token-${Date.now()}`;
      const { data: invitation, error } = await supabaseTest
        .from('invitations')
        .insert({
          organization_id: organizationId,
          email,
          role,
          invited_by: req.user.id,
          token: inviteToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.status(201).json({
        success: true,
        data: {
          invitation: {
            ...invitation,
            inviteUrl: `${process.env.APP_URL || 'http://localhost:3000'}/invite/${inviteToken}`
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INVITE_FAILED',
          message: 'Failed to send invitation'
        }
      });
    }
  });

  // Get organization members
  orgRouter.get('/:organizationId/members', authMiddleware, requireRole('member'), async (req, res) => {
    const { organizationId } = req.params;
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    try {
      let query = supabaseTest
        .from('organization_members')
        .select(`
          role,
          joined_at,
          profiles (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('organization_id', organizationId);

      if (role) {
        query = query.eq('role', role);
      }

      if (search) {
        query = query.or(`profiles.full_name.ilike.%${search}%,profiles.email.ilike.%${search}%`);
      }

      const { data: members, error } = await query
        .range(offset, offset + limit - 1)
        .order('joined_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedMembers = members.map(member => ({
        id: member.profiles.id,
        email: member.profiles.email,
        fullName: member.profiles.full_name,
        avatarUrl: member.profiles.avatar_url,
        role: member.role,
        joinedAt: member.joined_at,
        lastActiveAt: new Date().toISOString() // Mock data
      }));

      res.status(200).json({
        success: true,
        data: {
          members: formattedMembers
        },
        meta: {
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: formattedMembers.length
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch members'
        }
      });
    }
  });

  // Update member role
  orgRouter.put('/:organizationId/members/:profileId', authMiddleware, requireRole('admin'), async (req, res) => {
    const { organizationId, profileId } = req.params;
    const { role } = req.body;

    const errors = [];
    if (!role) errors.push({ field: 'role', message: 'Role is required' });
    if (role && !['member', 'admin'].includes(role)) {
      errors.push({ field: 'role', message: 'Role must be member or admin' });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors
        }
      });
    }

    try {
      const { data: member, error } = await supabaseTest
        .from('organization_members')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('organization_id', organizationId)
        .eq('profile_id', profileId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows updated
          return res.status(404).json({
            success: false,
            error: {
              code: 'MEMBER_NOT_FOUND',
              message: 'Member not found'
            }
          });
        }
        throw error;
      }

      res.status(200).json({
        success: true,
        data: {
          member: {
            id: profileId,
            role: member.role,
            updatedAt: member.updated_at
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'MEMBER_UPDATE_FAILED',
          message: 'Failed to update member role'
        }
      });
    }
  });

  // Remove member
  orgRouter.delete('/:organizationId/members/:profileId', authMiddleware, requireRole('admin'), async (req, res) => {
    const { organizationId, profileId } = req.params;

    // Prevent admin from removing themselves if they're the only admin
    if (profileId === req.user.id) {
      const { data: adminCount } = await supabaseTest
        .from('organization_members')
        .select('profile_id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('role', 'admin');

      if (adminCount && adminCount.length <= 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_REMOVE_LAST_ADMIN',
            message: 'Cannot remove the last admin from the organization'
          }
        });
      }
    }

    try {
      const { error } = await supabaseTest
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId)
        .eq('profile_id', profileId);

      if (error) {
        throw error;
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Member has been removed from the organization'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'MEMBER_REMOVAL_FAILED',
          message: 'Failed to remove member'
        }
      });
    }
  });

  app.use('/api/v1/organizations', orgRouter);

  // Error handling middleware
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

describe('Organization Management API Tests', () => {
  let app;
  let adminUser, memberUser, outsideUser;
  let adminTokens, memberTokens, outsideTokens;
  let testOrganization;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createTestApp();
  });

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test users
    adminUser = await createTestUser({
      email: 'admin@org-test.com',
      password: 'AdminPass123!',
      fullName: 'Organization Admin'
    });

    memberUser = await createTestUser({
      email: 'member@org-test.com',
      password: 'MemberPass123!',
      fullName: 'Organization Member'
    });

    outsideUser = await createTestUser({
      email: 'outside@org-test.com',
      password: 'OutsidePass123!',
      fullName: 'Outside User'
    });

    // Login users
    adminTokens = await loginTestUser(adminUser);
    memberTokens = await loginTestUser(memberUser);
    outsideTokens = await loginTestUser(outsideUser);

    // Create test organization
    const { organization } = await createTestOrganization(adminUser, {
      name: 'Test Organization',
      description: 'Organization for testing'
    });
    testOrganization = organization;

    // Add member user to organization
    await addUserToOrganization(memberUser.id, testOrganization.id, 'member');
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/v1/organizations', () => {
    describe('Success Cases', () => {
      it('should create organization with valid data', async () => {
        const orgData = {
          name: 'New Test Organization',
          description: 'A brand new organization'
        };

        const response = await request(app)
          .post('/api/v1/organizations')
          .set('Authorization', `Bearer ${outsideTokens.accessToken}`)
          .send(orgData)
          .expect(201);

        expectSuccessResponse(response, 201);
        expect(response.body.data.organization.name).toBe(orgData.name);
        expect(response.body.data.organization.description).toBe(orgData.description);
        expect(response.body.data.membership.role).toBe('admin');
      });

      it('should create organization without description', async () => {
        const orgData = {
          name: 'Organization Without Description'
        };

        const response = await request(app)
          .post('/api/v1/organizations')
          .set('Authorization', `Bearer ${outsideTokens.accessToken}`)
          .send(orgData)
          .expect(201);

        expectSuccessResponse(response, 201);
        expect(response.body.data.organization.name).toBe(orgData.name);
      });

      it('should handle Japanese organization names', async () => {
        const orgData = {
          name: '株式会社テスト',
          description: 'テスト用の組織です'
        };

        const response = await request(app)
          .post('/api/v1/organizations')
          .set('Authorization', `Bearer ${outsideTokens.accessToken}`)
          .send(orgData)
          .expect(201);

        expectSuccessResponse(response, 201);
        expect(response.body.data.organization.name).toBe(orgData.name);
      });
    });

    describe('Authentication Errors', () => {
      it('should reject creation without authentication', async () => {
        const response = await request(app)
          .post('/api/v1/organizations')
          .send({ name: 'Unauthorized Org' })
          .expect(401);

        expectErrorResponse(response, 'AUTH_TOKEN_MISSING', 401);
      });

      it('should reject creation with invalid token', async () => {
        const response = await request(app)
          .post('/api/v1/organizations')
          .set('Authorization', 'Bearer invalid-token')
          .send({ name: 'Invalid Token Org' })
          .expect(401);

        expectErrorResponse(response, 'AUTH_TOKEN_MISSING', 401);
      });
    });

    describe('Validation Errors', () => {
      it('should reject creation without name', async () => {
        const response = await request(app)
          .post('/api/v1/organizations')
          .set('Authorization', `Bearer ${outsideTokens.accessToken}`)
          .send({ description: 'No name organization' })
          .expect(400);

        expectValidationErrorResponse(response, ['name']);
      });

      it('should reject creation with name too long', async () => {
        const response = await request(app)
          .post('/api/v1/organizations')
          .set('Authorization', `Bearer ${outsideTokens.accessToken}`)
          .send({ name: 'a'.repeat(101) })
          .expect(400);

        expectValidationErrorResponse(response, ['name']);
      });

      it('should reject creation with empty name', async () => {
        const response = await request(app)
          .post('/api/v1/organizations')
          .set('Authorization', `Bearer ${outsideTokens.accessToken}`)
          .send({ name: '', description: 'Empty name' })
          .expect(400);

        expectValidationErrorResponse(response, ['name']);
      });
    });
  });

  describe('GET /api/v1/organizations', () => {
    describe('Success Cases', () => {
      it('should list user organizations', async () => {
        const response = await request(app)
          .get('/api/v1/organizations')
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.organizations).toBeInstanceOf(Array);
        expect(response.body.data.organizations.length).toBeGreaterThan(0);
        expect(response.body.meta.pagination).toBeDefined();
      });

      it('should handle pagination parameters', async () => {
        const response = await request(app)
          .get('/api/v1/organizations?page=1&limit=10')
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.meta.pagination.page).toBe(1);
        expect(response.body.meta.pagination.limit).toBe(10);
      });

      it('should return empty list for user with no organizations', async () => {
        const response = await request(app)
          .get('/api/v1/organizations')
          .set('Authorization', `Bearer ${outsideTokens.accessToken}`)
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.organizations).toEqual([]);
      });
    });

    describe('Authentication Errors', () => {
      it('should reject listing without authentication', async () => {
        const response = await request(app)
          .get('/api/v1/organizations')
          .expect(401);

        expectErrorResponse(response, 'AUTH_TOKEN_MISSING', 401);
      });
    });
  });

  describe('GET /api/v1/organizations/:organizationId', () => {
    describe('Success Cases', () => {
      it('should get organization details for admin', async () => {
        const response = await request(app)
          .get(`/api/v1/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.organization.id).toBe(testOrganization.id);
        expect(response.body.data.membership).toBeDefined();
        expect(response.body.data.statistics).toBeDefined();
      });

      it('should get organization details for member', async () => {
        const response = await request(app)
          .get(`/api/v1/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${memberTokens.accessToken}`)
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.organization.id).toBe(testOrganization.id);
      });
    });

    describe('Authorization Errors', () => {
      it('should reject access for non-members', async () => {
        const response = await request(app)
          .get(`/api/v1/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${outsideTokens.accessToken}`)
          .expect(403);

        expectErrorResponse(response, 'AUTHZ_NOT_ORGANIZATION_MEMBER', 403);
      });
    });

    describe('Not Found Errors', () => {
      it('should return 404 for non-existent organization', async () => {
        const response = await request(app)
          .get('/api/v1/organizations/non-existent-id')
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(404);

        expectErrorResponse(response, 'RESOURCE_NOT_FOUND', 404);
      });
    });
  });

  describe('PUT /api/v1/organizations/:organizationId', () => {
    describe('Success Cases', () => {
      it('should update organization as admin', async () => {
        const updateData = {
          name: 'Updated Organization Name',
          description: 'Updated description'
        };

        const response = await request(app)
          .put(`/api/v1/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send(updateData)
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.organization.name).toBe(updateData.name);
        expect(response.body.data.organization.description).toBe(updateData.description);
      });
    });

    describe('Authorization Errors', () => {
      it('should reject update by non-admin members', async () => {
        const response = await request(app)
          .put(`/api/v1/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${memberTokens.accessToken}`)
          .send({ name: 'Unauthorized Update' })
          .expect(403);

        expectErrorResponse(response, 'AUTHZ_REQUIRES_ADMIN', 403);
      });

      it('should reject update by non-members', async () => {
        const response = await request(app)
          .put(`/api/v1/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${outsideTokens.accessToken}`)
          .send({ name: 'Unauthorized Update' })
          .expect(403);

        expectErrorResponse(response, 'AUTHZ_NOT_ORGANIZATION_MEMBER', 403);
      });
    });

    describe('Validation Errors', () => {
      it('should reject update without name', async () => {
        const response = await request(app)
          .put(`/api/v1/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send({ description: 'No name update' })
          .expect(400);

        expectValidationErrorResponse(response, ['name']);
      });

      it('should reject update with name too long', async () => {
        const response = await request(app)
          .put(`/api/v1/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send({ name: 'a'.repeat(101) })
          .expect(400);

        expectValidationErrorResponse(response, ['name']);
      });
    });
  });

  describe('POST /api/v1/organizations/:organizationId/invites', () => {
    describe('Success Cases', () => {
      it('should send invitation as admin', async () => {
        const inviteData = {
          email: 'newmember@example.com',
          role: 'member'
        };

        const response = await request(app)
          .post(`/api/v1/organizations/${testOrganization.id}/invites`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send(inviteData)
          .expect(201);

        expectSuccessResponse(response, 201);
        expect(response.body.data.invitation.email).toBe(inviteData.email);
        expect(response.body.data.invitation.role).toBe(inviteData.role);
        expect(response.body.data.invitation.inviteUrl).toBeDefined();
      });

      it('should send admin invitation', async () => {
        const inviteData = {
          email: 'newadmin@example.com',
          role: 'admin'
        };

        const response = await request(app)
          .post(`/api/v1/organizations/${testOrganization.id}/invites`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send(inviteData)
          .expect(201);

        expectSuccessResponse(response, 201);
        expect(response.body.data.invitation.role).toBe('admin');
      });

      it('should default to member role when not specified', async () => {
        const inviteData = {
          email: 'defaultrole@example.com'
        };

        const response = await request(app)
          .post(`/api/v1/organizations/${testOrganization.id}/invites`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send(inviteData)
          .expect(201);

        expectSuccessResponse(response, 201);
        expect(response.body.data.invitation.role).toBe('member');
      });
    });

    describe('Authorization Errors', () => {
      it('should reject invitation by non-admin members', async () => {
        const response = await request(app)
          .post(`/api/v1/organizations/${testOrganization.id}/invites`)
          .set('Authorization', `Bearer ${memberTokens.accessToken}`)
          .send({ email: 'test@example.com' })
          .expect(403);

        expectErrorResponse(response, 'AUTHZ_REQUIRES_ADMIN', 403);
      });

      it('should reject invitation by non-members', async () => {
        const response = await request(app)
          .post(`/api/v1/organizations/${testOrganization.id}/invites`)
          .set('Authorization', `Bearer ${outsideTokens.accessToken}`)
          .send({ email: 'test@example.com' })
          .expect(403);

        expectErrorResponse(response, 'AUTHZ_NOT_ORGANIZATION_MEMBER', 403);
      });
    });

    describe('Validation Errors', () => {
      it('should reject invitation without email', async () => {
        const response = await request(app)
          .post(`/api/v1/organizations/${testOrganization.id}/invites`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send({ role: 'member' })
          .expect(400);

        expectValidationErrorResponse(response, ['email']);
      });

      it('should reject invitation with invalid email', async () => {
        const response = await request(app)
          .post(`/api/v1/organizations/${testOrganization.id}/invites`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send({ email: 'invalid-email', role: 'member' })
          .expect(400);

        expectValidationErrorResponse(response, ['email']);
      });

      it('should reject invitation with invalid role', async () => {
        const response = await request(app)
          .post(`/api/v1/organizations/${testOrganization.id}/invites`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send({ email: 'test@example.com', role: 'invalid' })
          .expect(400);

        expectValidationErrorResponse(response, ['role']);
      });
    });
  });

  describe('GET /api/v1/organizations/:organizationId/members', () => {
    describe('Success Cases', () => {
      it('should list organization members', async () => {
        const response = await request(app)
          .get(`/api/v1/organizations/${testOrganization.id}/members`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.members).toBeInstanceOf(Array);
        expect(response.body.meta.pagination).toBeDefined();
      });

      it('should filter members by role', async () => {
        const response = await request(app)
          .get(`/api/v1/organizations/${testOrganization.id}/members?role=admin`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(200);

        expectSuccessResponse(response, 200);
        // All returned members should have admin role
        response.body.data.members.forEach(member => {
          expect(member.role).toBe('admin');
        });
      });

      it('should search members by name or email', async () => {
        const response = await request(app)
          .get(`/api/v1/organizations/${testOrganization.id}/members?search=admin`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(200);

        expectSuccessResponse(response, 200);
      });

      it('should handle pagination', async () => {
        const response = await request(app)
          .get(`/api/v1/organizations/${testOrganization.id}/members?page=1&limit=5`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.meta.pagination.page).toBe(1);
        expect(response.body.meta.pagination.limit).toBe(5);
      });
    });

    describe('Authorization Errors', () => {
      it('should reject member listing by non-members', async () => {
        const response = await request(app)
          .get(`/api/v1/organizations/${testOrganization.id}/members`)
          .set('Authorization', `Bearer ${outsideTokens.accessToken}`)
          .expect(403);

        expectErrorResponse(response, 'AUTHZ_NOT_ORGANIZATION_MEMBER', 403);
      });
    });
  });

  describe('PUT /api/v1/organizations/:organizationId/members/:profileId', () => {
    describe('Success Cases', () => {
      it('should update member role as admin', async () => {
        const response = await request(app)
          .put(`/api/v1/organizations/${testOrganization.id}/members/${memberUser.id}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send({ role: 'admin' })
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.member.role).toBe('admin');
      });

      it('should demote admin to member', async () => {
        // First promote member to admin
        await request(app)
          .put(`/api/v1/organizations/${testOrganization.id}/members/${memberUser.id}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send({ role: 'admin' })
          .expect(200);

        // Then demote back to member
        const response = await request(app)
          .put(`/api/v1/organizations/${testOrganization.id}/members/${memberUser.id}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send({ role: 'member' })
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.member.role).toBe('member');
      });
    });

    describe('Authorization Errors', () => {
      it('should reject role update by non-admin members', async () => {
        const response = await request(app)
          .put(`/api/v1/organizations/${testOrganization.id}/members/${adminUser.id}`)
          .set('Authorization', `Bearer ${memberTokens.accessToken}`)
          .send({ role: 'member' })
          .expect(403);

        expectErrorResponse(response, 'AUTHZ_REQUIRES_ADMIN', 403);
      });

      it('should reject role update by non-members', async () => {
        const response = await request(app)
          .put(`/api/v1/organizations/${testOrganization.id}/members/${memberUser.id}`)
          .set('Authorization', `Bearer ${outsideTokens.accessToken}`)
          .send({ role: 'admin' })
          .expect(403);

        expectErrorResponse(response, 'AUTHZ_NOT_ORGANIZATION_MEMBER', 403);
      });
    });

    describe('Validation Errors', () => {
      it('should reject update without role', async () => {
        const response = await request(app)
          .put(`/api/v1/organizations/${testOrganization.id}/members/${memberUser.id}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send({})
          .expect(400);

        expectValidationErrorResponse(response, ['role']);
      });

      it('should reject update with invalid role', async () => {
        const response = await request(app)
          .put(`/api/v1/organizations/${testOrganization.id}/members/${memberUser.id}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send({ role: 'invalid' })
          .expect(400);

        expectValidationErrorResponse(response, ['role']);
      });
    });

    describe('Not Found Errors', () => {
      it('should return 404 for non-existent member', async () => {
        const response = await request(app)
          .put(`/api/v1/organizations/${testOrganization.id}/members/non-existent-id`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send({ role: 'admin' })
          .expect(404);

        expectErrorResponse(response, 'MEMBER_NOT_FOUND', 404);
      });
    });
  });

  describe('DELETE /api/v1/organizations/:organizationId/members/:profileId', () => {
    describe('Success Cases', () => {
      it('should remove member as admin', async () => {
        const response = await request(app)
          .delete(`/api/v1/organizations/${testOrganization.id}/members/${memberUser.id}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.message).toContain('removed from the organization');
      });
    });

    describe('Authorization Errors', () => {
      it('should reject member removal by non-admin members', async () => {
        const response = await request(app)
          .delete(`/api/v1/organizations/${testOrganization.id}/members/${adminUser.id}`)
          .set('Authorization', `Bearer ${memberTokens.accessToken}`)
          .expect(403);

        expectErrorResponse(response, 'AUTHZ_REQUIRES_ADMIN', 403);
      });

      it('should reject member removal by non-members', async () => {
        const response = await request(app)
          .delete(`/api/v1/organizations/${testOrganization.id}/members/${memberUser.id}`)
          .set('Authorization', `Bearer ${outsideTokens.accessToken}`)
          .expect(403);

        expectErrorResponse(response, 'AUTHZ_NOT_ORGANIZATION_MEMBER', 403);
      });
    });

    describe('Business Logic Errors', () => {
      it('should prevent removal of last admin', async () => {
        const response = await request(app)
          .delete(`/api/v1/organizations/${testOrganization.id}/members/${adminUser.id}`)
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(400);

        expectErrorResponse(response, 'CANNOT_REMOVE_LAST_ADMIN', 400);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid organization ID format', async () => {
      const response = await request(app)
        .get('/api/v1/organizations/invalid-uuid-format')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .expect(404);

      expectErrorResponse(response, 'RESOURCE_NOT_FOUND', 404);
    });

    it('should handle missing organization ID parameter', async () => {
      const response = await request(app)
        .get('/api/v1/organizations/')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .expect(200); // This should return the list endpoint

      expectSuccessResponse(response, 200);
    });

    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json"}')
        .expect(400);

      // Express will handle the JSON parsing error
    });
  });
});