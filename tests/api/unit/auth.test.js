const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      admin: {
        deleteUser: jest.fn(),
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
  })),
}));

const app = require('../../../api/server');

describe('Auth API Endpoints', () => {
  let mockSupabase;

  beforeEach(() => {
    mockSupabase = createClient();
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should create a new user with valid data', async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: null,
        },
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('check your email');
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123!',
        options: {
          data: { full_name: 'Test User' },
        },
      });
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          fullName: 'Test User',
          email: 'invalid-email',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('password');
    });

    it('should handle duplicate email error', async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: null,
        error: { message: 'User already registered' },
      });

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          fullName: 'Test User',
          email: 'existing@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already registered');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' },
          },
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
          },
        },
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.session.access_token).toBe('access-token');
    });

    it('should reject invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('DELETE /api/v1/auth/user', () => {
    it('should delete authenticated user account', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.auth.admin.deleteUser.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .delete('/api/v1/auth/user')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('user-123');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/v1/auth/user');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    it('should update user profile', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from().update().eq().mockResolvedValueOnce({
        data: { id: 'user-123', full_name: 'Updated Name' },
        error: null,
      });

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          fullName: 'Updated Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('should validate profile data', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          fullName: '', // Empty name
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Full name');
    });
  });
});