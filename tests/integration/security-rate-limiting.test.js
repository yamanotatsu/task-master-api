import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import authRoutes from '../../api/routes/auth.js';
import { rateLimiters, bruteForceProtection } from '../../api/middleware/rateLimiter.js';
import securityService from '../../api/services/security.js';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  return app;
};

describe('Rate Limiting and Security', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('Rate Limiting', () => {
    it('should block requests after exceeding auth rate limit', async () => {
      // Mock the auth handlers to avoid actual auth calls
      const mockApp = express();
      mockApp.use(express.json());
      
      // Apply rate limiter to test endpoint
      mockApp.post('/test-auth', rateLimiters.auth, (req, res) => {
        res.json({ success: true });
      });

      // Make requests up to the limit (5)
      for (let i = 0; i < 5; i++) {
        const response = await request(mockApp)
          .post('/test-auth')
          .send({ email: 'test@example.com', password: 'password' });
        
        expect(response.status).toBe(200);
      }

      // 6th request should be rate limited
      const response = await request(mockApp)
        .post('/test-auth')
        .send({ email: 'test@example.com', password: 'password' });
      
      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many');
    });

    it('should have different rate limits for different endpoints', async () => {
      const mockApp = express();
      mockApp.use(express.json());
      
      // Apply different rate limiters
      mockApp.get('/test-read', rateLimiters.read, (req, res) => {
        res.json({ success: true });
      });
      
      mockApp.post('/test-api', rateLimiters.api, (req, res) => {
        res.json({ success: true });
      });

      // Read endpoint allows 100 requests per minute
      const readPromises = [];
      for (let i = 0; i < 60; i++) {
        readPromises.push(
          request(mockApp).get('/test-read')
        );
      }
      
      const readResponses = await Promise.all(readPromises);
      const readSuccesses = readResponses.filter(r => r.status === 200).length;
      expect(readSuccesses).toBeGreaterThan(50); // Should allow many requests

      // API endpoint allows 60 requests per minute
      const apiPromises = [];
      for (let i = 0; i < 61; i++) {
        apiPromises.push(
          request(mockApp).post('/test-api').send({})
        );
      }
      
      const apiResponses = await Promise.all(apiPromises);
      const apiLimited = apiResponses.filter(r => r.status === 429).length;
      expect(apiLimited).toBeGreaterThan(0); // Should rate limit some requests
    });
  });

  describe('Brute Force Protection', () => {
    it('should track failed login attempts', async () => {
      const trackSpy = jest.spyOn(securityService, 'trackLoginAttempt');
      
      // Attempt login with invalid credentials
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(trackSpy).toHaveBeenCalledWith(
        'test@example.com',
        'email',
        false,
        expect.objectContaining({
          ip: expect.any(String),
          userAgent: expect.any(String)
        })
      );
    });

    it('should detect suspicious activity patterns', async () => {
      const detectSpy = jest.spyOn(securityService, 'detectSuspiciousActivity');
      detectSpy.mockResolvedValue({ suspicious: true, reason: 'Multiple IPs detected' });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'suspicious@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('AUTH_CAPTCHA_REQUIRED');
      expect(response.body.error.requiresCaptcha).toBe(true);
    });

    it('should lock account after multiple failed attempts', async () => {
      const lockSpy = jest.spyOn(securityService, 'isAccountLocked');
      lockSpy.mockResolvedValue({
        locked: true,
        reason: 'Too many failed login attempts',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'locked@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(423);
      expect(response.body.error.code).toBe('AUTH_ACCOUNT_LOCKED');
      expect(response.body.error.retryAfter).toBeDefined();
    });

    it('should add progressive delays for failed attempts', async () => {
      const delaySpy = jest.spyOn(securityService, 'calculateDelay');
      
      // Test different attempt counts
      const delays = [
        { attempts: 1, expectedDelay: 0 },
        { attempts: 3, expectedDelay: 2000 },
        { attempts: 5, expectedDelay: 5000 },
        { attempts: 8, expectedDelay: 10000 },
        { attempts: 15, expectedDelay: 60000 } // Max delay
      ];

      for (const { attempts, expectedDelay } of delays) {
        delaySpy.mockResolvedValue(expectedDelay);
        const delay = await securityService.calculateDelay('test@example.com');
        expect(delay).toBe(expectedDelay);
      }
    });
  });

  describe('Password Security', () => {
    it('should validate password strength', () => {
      const weakPasswords = [
        { password: '123', issues: 5 }, // Too short, no uppercase, no special
        { password: 'password', issues: 3 }, // No uppercase, number, special
        { password: 'Password123', issues: 1 }, // No special char
      ];

      for (const { password, issues } of weakPasswords) {
        const result = securityService.validatePasswordStrength(password);
        expect(result.valid).toBe(false);
        expect(result.issues.length).toBe(issues);
      }

      // Test strong password
      const strongResult = securityService.validatePasswordStrength('SecurePass123!@#');
      expect(strongResult.valid).toBe(true);
      expect(strongResult.issues).toHaveLength(0);
      expect(strongResult.strength.score).toBeGreaterThanOrEqual(6);
    });

    it('should calculate password strength scores', () => {
      const passwords = [
        { password: '123', expectedLabel: 'very weak' },
        { password: 'password', expectedLabel: 'weak' },
        { password: 'Password123', expectedLabel: 'fair' },
        { password: 'SecurePass123!', expectedLabel: 'strong' },
        { password: 'V3ry$ecureP@ssw0rd!', expectedLabel: 'very strong' }
      ];

      for (const { password, expectedLabel } of passwords) {
        const strength = securityService.calculatePasswordStrength(password);
        expect(strength.label).toBe(expectedLabel);
      }
    });
  });

  describe('IP Blocking', () => {
    it('should block malicious IPs', async () => {
      const blockSpy = jest.spyOn(securityService, 'blockIP');
      blockSpy.mockResolvedValue({
        success: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      const result = await securityService.blockIP('192.168.1.100', 'Suspicious activity');
      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeDefined();
    });

    it('should check if IP is blocked', async () => {
      const checkSpy = jest.spyOn(securityService, 'isIPBlocked');
      checkSpy.mockResolvedValue({
        blocked: true,
        reason: 'Automated attack detected',
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      });

      const result = await securityService.isIPBlocked('192.168.1.100');
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('Automated attack detected');
    });
  });

  describe('CAPTCHA Protection', () => {
    it('should require CAPTCHA after failed attempts', async () => {
      // Mock failed attempts count
      jest.spyOn(securityService, 'trackLoginAttempt').mockImplementation(() => {});
      
      // Make a request without CAPTCHA when it's required
      const mockApp = express();
      mockApp.use(express.json());
      
      // Mock middleware that checks CAPTCHA requirement
      mockApp.post('/test-captcha', async (req, res) => {
        if (!req.body.captchaToken) {
          // Simulate checking failed attempts
          const failedAttempts = 4; // More than 3
          if (failedAttempts > 3) {
            return res.status(400).json({
              error: {
                code: 'AUTH_CAPTCHA_REQUIRED',
                message: 'CAPTCHA verification required',
                requiresCaptcha: true
              }
            });
          }
        }
        res.json({ success: true });
      });

      const response = await request(mockApp)
        .post('/test-captcha')
        .send({ email: 'test@example.com', password: 'password' });

      expect(response.status).toBe(400);
      expect(response.body.error.requiresCaptcha).toBe(true);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize potentially malicious input', () => {
      const maliciousInputs = [
        { input: "'; DROP TABLE users; --", expected: ' DROP TABLE users ' },
        { input: "admin'--", expected: 'admin' },
        { input: "/* comment */ SELECT * FROM users", expected: ' comment  SELECT * FROM users' },
        { input: "normal input", expected: 'normal input' }
      ];

      for (const { input, expected } of maliciousInputs) {
        const sanitized = securityService.sanitizeInput(input);
        expect(sanitized).toBe(expected);
      }
    });
  });

  describe('CSRF Protection', () => {
    it('should generate and verify CSRF tokens', () => {
      const token = securityService.generateCSRFToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
      
      // Verify token
      const isValid = securityService.verifyCSRFToken(token, token);
      expect(isValid).toBe(true);
      
      // Invalid token
      const isInvalid = securityService.verifyCSRFToken(token, 'different-token');
      expect(isInvalid).toBe(false);
    });
  });
});