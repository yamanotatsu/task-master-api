import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { 
  setupTestDatabase, 
  cleanupTestData, 
  createTestUser, 
  loginTestUser,
  supabaseTest, 
  supabaseAdmin 
} from './config/test-db.js';
import { 
  generateTestToken, 
  generateExpiredToken, 
  generateInvalidToken,
  createAuthHeaders,
  passwordTestCases,
  emailTestCases,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationErrorResponse,
  generateRandomEmail,
  generateRandomPassword
} from './config/auth-helpers.js';
import { 
  mockUsers, 
  mockAuthResponses, 
  mockErrorResponses,
  mockSuccessResponses,
  testScenarios,
  createSupabaseMock 
} from './config/mock-data.js';

// Mock the authentication routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock authentication routes
  const authRouter = express.Router();

  // Signup endpoint
  authRouter.post('/signup', async (req, res) => {
    const { fullName, email, password } = req.body;

    // Validation
    const errors = [];
    if (!fullName) errors.push({ field: 'fullName', message: 'Full name is required' });
    if (!email) errors.push({ field: 'email', message: 'Email is required' });
    if (!password) errors.push({ field: 'password', message: 'Password is required' });
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
    
    if (password && password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
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
          message: 'Registration successful. Please check your email to verify your account.',
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

  // Login endpoint
  authRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        }
      });
    }

    try {
      const { data, error } = await supabaseTest.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'AUTH_INVALID_CREDENTIALS',
              message: 'Invalid email or password'
            }
          });
        }
        if (error.message.includes('Email not confirmed')) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'AUTH_EMAIL_NOT_VERIFIED',
              message: 'Please verify your email address before logging in'
            }
          });
        }
        throw error;
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

  // Logout endpoint
  authRouter.post('/logout', async (req, res) => {
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

    try {
      const { error } = await supabaseTest.auth.signOut();
      
      if (error) {
        throw error;
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Logged out successfully'
        }
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

  // Token refresh endpoint
  authRouter.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required'
        }
      });
    }

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

  // Password reset request endpoint
  authRouter.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email is required'
        }
      });
    }

    try {
      const { error } = await supabaseTest.auth.resetPasswordForEmail(email);
      
      if (error) {
        throw error;
      }

      // Always return success for security reasons
      res.status(200).json({
        success: true,
        data: {
          message: 'If an account exists with this email, a password reset link has been sent.'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during password reset request'
        }
      });
    }
  });

  // Password reset execution endpoint
  authRouter.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token and new password are required'
        }
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters'
        }
      });
    }

    try {
      // In real implementation, this would verify the token and update the password
      res.status(200).json({
        success: true,
        data: {
          message: 'Password has been reset successfully'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during password reset'
        }
      });
    }
  });

  // Account deletion endpoint
  authRouter.delete('/user', async (req, res) => {
    const authHeader = req.headers.authorization;
    const { password, confirmDeletion } = req.body;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_MISSING',
          message: 'Authentication required'
        }
      });
    }

    if (!password || confirmDeletion !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password and confirmation required'
        }
      });
    }

    try {
      // In real implementation, this would verify password and delete the account
      res.status(200).json({
        success: true,
        data: {
          message: 'Account has been permanently deleted'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during account deletion'
        }
      });
    }
  });

  app.use('/api/v1/auth', authRouter);

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

describe('Authentication API Tests', () => {
  let app;
  let testUser;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createTestApp();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/v1/auth/signup', () => {
    describe('Success Cases', () => {
      it('should create a new user with valid data', async () => {
        const userData = testScenarios.signupFlow.validUser;

        const response = await request(app)
          .post('/api/v1/auth/signup')
          .send(userData)
          .expect(201);

        expectSuccessResponse(response, 201);
        expect(response.body.data.user.email).toBe(userData.email);
        expect(response.body.data.message).toContain('Registration successful');
      });

      it('should handle Japanese characters in full name', async () => {
        const userData = {
          fullName: '山田 太郎',
          email: generateRandomEmail(),
          password: 'SecurePass123!'
        };

        const response = await request(app)
          .post('/api/v1/auth/signup')
          .send(userData)
          .expect(201);

        expectSuccessResponse(response, 201);
        expect(response.body.data.user.email).toBe(userData.email);
      });
    });

    describe('Validation Errors', () => {
      it('should reject signup with missing fields', async () => {
        const response = await request(app)
          .post('/api/v1/auth/signup')
          .send({})
          .expect(400);

        expectValidationErrorResponse(response, ['fullName', 'email', 'password']);
      });

      it('should reject invalid email formats', async () => {
        for (const invalidEmail of emailTestCases.invalid) {
          const response = await request(app)
            .post('/api/v1/auth/signup')
            .send({
              fullName: 'Test User',
              email: invalidEmail,
              password: 'SecurePass123!'
            })
            .expect(400);

          expectValidationErrorResponse(response, ['email']);
        }
      });

      it('should reject weak passwords', async () => {
        const response = await request(app)
          .post('/api/v1/auth/signup')
          .send({
            fullName: 'Test User',
            email: generateRandomEmail(),
            password: 'weak'
          })
          .expect(400);

        expectValidationErrorResponse(response, ['password']);
      });

      it('should reject full name that is too long', async () => {
        const response = await request(app)
          .post('/api/v1/auth/signup')
          .send({
            fullName: 'a'.repeat(101),
            email: generateRandomEmail(),
            password: 'SecurePass123!'
          })
          .expect(400);

        expectValidationErrorResponse(response);
      });
    });

    describe('Business Logic Errors', () => {
      it('should reject duplicate email registration', async () => {
        const userData = testScenarios.signupFlow.validUser;
        
        // First signup should succeed
        await request(app)
          .post('/api/v1/auth/signup')
          .send(userData)
          .expect(201);

        // Second signup with same email should fail
        const response = await request(app)
          .post('/api/v1/auth/signup')
          .send(userData)
          .expect(409);

        expectErrorResponse(response, 'AUTH_EMAIL_EXISTS', 409);
      });
    });

    describe('Edge Cases', () => {
      it('should handle concurrent signup requests with same email', async () => {
        const userData = testScenarios.signupFlow.validUser;
        
        const requests = Array(3).fill().map(() =>
          request(app)
            .post('/api/v1/auth/signup')
            .send(userData)
        );

        const responses = await Promise.all(requests);
        
        // Only one should succeed
        const successCount = responses.filter(r => r.status === 201).length;
        const conflictCount = responses.filter(r => r.status === 409).length;
        
        expect(successCount).toBe(1);
        expect(conflictCount).toBe(2);
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      testUser = await createTestUser({
        email: 'login-test@example.com',
        password: 'LoginPass123!',
        fullName: 'Login Test User'
      });
    });

    describe('Success Cases', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password
          })
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.user.email).toBe(testUser.email);
        expect(response.body.data.tokens).toBeDefined();
        expect(response.body.data.tokens.accessToken).toBeDefined();
        expect(response.body.data.tokens.refreshToken).toBeDefined();
        expect(response.body.data.tokens.expiresIn).toBeGreaterThan(0);
      });
    });

    describe('Authentication Errors', () => {
      it('should reject login with invalid credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: 'WrongPassword'
          })
          .expect(401);

        expectErrorResponse(response, 'AUTH_INVALID_CREDENTIALS', 401);
      });

      it('should reject login with non-existent email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'SomePassword123!'
          })
          .expect(401);

        expectErrorResponse(response, 'AUTH_INVALID_CREDENTIALS', 401);
      });

      it('should reject login with missing credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({})
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });

      it('should reject login with empty email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: '',
            password: 'SomePassword123!'
          })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });

      it('should reject login with empty password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: ''
          })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let userTokens;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'logout-test@example.com',
        password: 'LogoutPass123!',
        fullName: 'Logout Test User'
      });
      userTokens = await loginTestUser(testUser);
    });

    describe('Success Cases', () => {
      it('should logout authenticated user', async () => {
        const response = await request(app)
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${userTokens.accessToken}`)
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.message).toContain('Logged out successfully');
      });
    });

    describe('Authentication Errors', () => {
      it('should reject logout without token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/logout')
          .expect(401);

        expectErrorResponse(response, 'AUTH_TOKEN_MISSING', 401);
      });

      it('should reject logout with invalid token format', async () => {
        const response = await request(app)
          .post('/api/v1/auth/logout')
          .set('Authorization', 'InvalidTokenFormat')
          .expect(401);

        expectErrorResponse(response, 'AUTH_TOKEN_MISSING', 401);
      });

      it('should reject logout with expired token', async () => {
        const expiredToken = generateExpiredToken();
        
        const response = await request(app)
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);

        expectErrorResponse(response, 'AUTH_TOKEN_MISSING', 401);
      });
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let userTokens;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'refresh-test@example.com',
        password: 'RefreshPass123!',
        fullName: 'Refresh Test User'
      });
      userTokens = await loginTestUser(testUser);
    });

    describe('Success Cases', () => {
      it('should refresh tokens with valid refresh token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: userTokens.refreshToken })
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.tokens.accessToken).toBeDefined();
        expect(response.body.data.tokens.refreshToken).toBeDefined();
        expect(response.body.data.tokens.expiresIn).toBeGreaterThan(0);
      });
    });

    describe('Token Errors', () => {
      it('should reject refresh with missing token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({})
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });

      it('should reject refresh with invalid token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: 'invalid-refresh-token' })
          .expect(401);

        expectErrorResponse(response, 'AUTH_TOKEN_INVALID', 401);
      });

      it('should reject refresh with expired token', async () => {
        const expiredToken = generateExpiredToken();
        
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: expiredToken })
          .expect(401);

        expectErrorResponse(response, 'AUTH_TOKEN_INVALID', 401);
      });
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    describe('Success Cases', () => {
      it('should send password reset for valid email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({ email: 'test@example.com' })
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.message).toContain('password reset link has been sent');
      });

      it('should return success for non-existent email (security)', async () => {
        const response = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({ email: 'nonexistent@example.com' })
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.message).toContain('password reset link has been sent');
      });
    });

    describe('Validation Errors', () => {
      it('should reject request without email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({})
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });

      it('should reject request with empty email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({ email: '' })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    describe('Success Cases', () => {
      it('should reset password with valid token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/reset-password')
          .send({
            token: 'valid-reset-token',
            newPassword: 'NewSecurePass123!'
          })
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.message).toContain('reset successfully');
      });
    });

    describe('Validation Errors', () => {
      it('should reject reset without token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/reset-password')
          .send({ newPassword: 'NewSecurePass123!' })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });

      it('should reject reset without password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/reset-password')
          .send({ token: 'valid-reset-token' })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });

      it('should reject reset with weak password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/reset-password')
          .send({
            token: 'valid-reset-token',
            newPassword: 'weak'
          })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });
    });
  });

  describe('DELETE /api/v1/auth/user', () => {
    let userTokens;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'delete-test@example.com',
        password: 'DeletePass123!',
        fullName: 'Delete Test User'
      });
      userTokens = await loginTestUser(testUser);
    });

    describe('Success Cases', () => {
      it('should delete account with proper confirmation', async () => {
        const response = await request(app)
          .delete('/api/v1/auth/user')
          .set('Authorization', `Bearer ${userTokens.accessToken}`)
          .send({
            password: testUser.password,
            confirmDeletion: 'DELETE MY ACCOUNT'
          })
          .expect(200);

        expectSuccessResponse(response, 200);
        expect(response.body.data.message).toContain('permanently deleted');
      });
    });

    describe('Authentication Errors', () => {
      it('should reject deletion without authentication', async () => {
        const response = await request(app)
          .delete('/api/v1/auth/user')
          .send({
            password: testUser.password,
            confirmDeletion: 'DELETE MY ACCOUNT'
          })
          .expect(401);

        expectErrorResponse(response, 'AUTH_TOKEN_MISSING', 401);
      });
    });

    describe('Validation Errors', () => {
      it('should reject deletion without password', async () => {
        const response = await request(app)
          .delete('/api/v1/auth/user')
          .set('Authorization', `Bearer ${userTokens.accessToken}`)
          .send({ confirmDeletion: 'DELETE MY ACCOUNT' })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });

      it('should reject deletion without confirmation', async () => {
        const response = await request(app)
          .delete('/api/v1/auth/user')
          .set('Authorization', `Bearer ${userTokens.accessToken}`)
          .send({ password: testUser.password })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });

      it('should reject deletion with wrong confirmation text', async () => {
        const response = await request(app)
          .delete('/api/v1/auth/user')
          .set('Authorization', `Bearer ${userTokens.accessToken}`)
          .send({
            password: testUser.password,
            confirmDeletion: 'wrong confirmation'
          })
          .expect(400);

        expectErrorResponse(response, 'VALIDATION_ERROR', 400);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json"}')
        .expect(400);

      // Express will handle the JSON parsing error
    });

    it('should handle oversized request bodies', async () => {
      const largePayload = {
        fullName: 'a'.repeat(10000),
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(largePayload);

      // Should either reject or truncate the large payload
      expect([400, 413, 500]).toContain(response.status);
    });
  });

  describe('Response Format Consistency', () => {
    it('should maintain consistent success response format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(testScenarios.signupFlow.validUser)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Object)
      });
    });

    it('should maintain consistent error response format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: expect.any(String),
          message: expect.any(String)
        })
      });
    });
  });
});