/**
 * Example of enhanced auth routes with improved validation and sanitization
 * This demonstrates how to integrate the new validation system
 */

import express from 'express';
import { supabase } from '../db/supabase.js';
import {
  supabaseAuth,
  createUser,
  signInUser,
  signOutUser,
  refreshSession,
  resetPasswordRequest,
  updatePassword,
  verifyOtp
} from '../db/supabase-auth.js';
import { createValidationMiddleware } from '../schemas/index.js';
import { authMiddleware } from '../middleware/auth.js';
import sanitizerMiddleware, { createFieldSanitizer, sanitizedRateLimit } from '../middleware/sanitizer.js';
import { 
  rateLimiters, 
  bruteForceProtection, 
  captchaProtection,
  trackFailedAttempt 
} from '../middleware/rateLimiter.js';
import securityService from '../services/security.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply global sanitization middleware to all auth routes
router.use(sanitizerMiddleware({
  maxRequestSize: 1 * 1024 * 1024, // 1MB for auth requests
  strictMode: true
}));

// Apply rate limiting for heavily sanitized requests
router.use(sanitizedRateLimit({
  maxSanitizedRequests: 10, // Lower limit for potentially malicious requests
  windowMs: 15 * 60 * 1000
}));

/**
 * POST /api/v1/auth/signup
 * User registration with enhanced validation
 */
router.post('/signup', 
  rateLimiters.auth,
  captchaProtection,
  createValidationMiddleware('auth', 'signup'),
  async (req, res) => {
    try {
      // Input is already validated and sanitized by middleware
      const { fullName, email, password, organizationName } = req.body;
      
      // Log sanitization metadata
      if (req.sanitized && req.sanitized.bodyModified) {
        logger.info('Signup request was sanitized', {
          email: email.substring(0, 3) + '***',
          ip: req.ip,
          modifications: req.sanitized
        });
      }
      
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .single();

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'AUTH_USER_EXISTS',
            message: 'An account with this email already exists'
          }
        });
      }

      // Create user account
      const { user, error } = await createUser({
        email: normalizedEmail,
        password,
        fullName,
        organizationName
      });

      if (error) {
        logger.error('Signup error:', { error: error.message, email: normalizedEmail });
        
        // Handle specific Supabase errors
        if (error.message.includes('already registered')) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'AUTH_USER_EXISTS',
              message: 'An account with this email already exists'
            }
          });
        }
        
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create account. Please try again.'
          }
        });
      }

      // Send verification email (handled by Supabase)
      
      res.status(201).json({
        success: true,
        data: {
          message: 'Account created successfully. Please check your email to verify your account.',
          user: {
            id: user.id,
            email: user.email
          }
        }
      });

    } catch (error) {
      logger.error('Unexpected signup error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during signup'
        }
      });
    }
  }
);

/**
 * POST /api/v1/auth/login
 * User login with enhanced validation
 */
router.post('/login',
  bruteForceProtection,
  createValidationMiddleware('auth', 'login'),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase().trim();
      
      // Get request metadata for security tracking
      const clientIP = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Sign in user
      const { user, session, error } = await signInUser({
        email: normalizedEmail,
        password
      });

      if (error) {
        logger.error('Login error:', { 
          error: error.message, 
          email: normalizedEmail,
          ip: clientIP 
        });
        
        // Track failed attempt
        await securityService.trackLoginAttempt(normalizedEmail, 'email', false, {
          ip: clientIP,
          userAgent,
          error: error.message
        });
        
        // Handle specific error cases
        if (error.message.includes('Invalid login credentials')) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'AUTH_INVALID_CREDENTIALS',
              message: 'Invalid email or password'
            }
          });
        }
        
        if (error.message.includes('email not confirmed')) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'AUTH_EMAIL_NOT_VERIFIED',
              message: 'Please verify your email address before logging in'
            }
          });
        }
        
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred during login'
          }
        });
      }

      // Track successful login
      await securityService.trackLoginAttempt(normalizedEmail, 'email', true, {
        ip: clientIP,
        userAgent,
        userId: user.id
      });

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: profile?.full_name || null,
            avatarUrl: profile?.avatar_url || null
          },
          tokens: {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresIn: session.expires_in || 3600
          }
        }
      });

    } catch (error) {
      logger.error('Unexpected login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during login'
        }
      });
    }
  }
);

/**
 * POST /api/v1/auth/forgot-password
 * Request password reset with enhanced validation
 */
router.post('/forgot-password',
  rateLimiters.passwordReset,
  createValidationMiddleware('auth', 'forgotPassword'),
  async (req, res) => {
    try {
      const { email } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Always return success to prevent email enumeration
      await resetPasswordRequest(normalizedEmail);

      res.status(200).json({
        success: true,
        data: {
          message: 'If an account exists with this email, you will receive password reset instructions.'
        }
      });

    } catch (error) {
      logger.error('Password reset request error:', error);
      // Still return success to prevent enumeration
      res.status(200).json({
        success: true,
        data: {
          message: 'If an account exists with this email, you will receive password reset instructions.'
        }
      });
    }
  }
);

/**
 * POST /api/v1/auth/reset-password
 * Reset password with token and enhanced validation
 */
router.post('/reset-password',
  rateLimiters.auth,
  createValidationMiddleware('auth', 'resetPassword'),
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      // Update password using the token
      const { error } = await updatePassword(token, newPassword);

      if (error) {
        logger.error('Password reset error:', { error: error.message });
        
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'AUTH_INVALID_TOKEN',
              message: 'Invalid or expired reset token'
            }
          });
        }

        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to reset password'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Password reset successfully. You can now login with your new password.'
        }
      });

    } catch (error) {
      logger.error('Unexpected password reset error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during password reset'
        }
      });
    }
  }
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token with enhanced validation
 */
router.post('/refresh',
  rateLimiters.auth,
  createValidationMiddleware('auth', 'refreshToken'),
  async (req, res) => {
    try {
      const { refreshToken } = req.body;

      const { session, error } = await refreshSession(refreshToken);

      if (error) {
        logger.error('Token refresh error:', { error: error.message });
        
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: {
          tokens: {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresIn: session.expires_in || 3600
          }
        }
      });

    } catch (error) {
      logger.error('Unexpected token refresh error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during token refresh'
        }
      });
    }
  }
);

/**
 * POST /api/v1/auth/change-password
 * Change password for authenticated user with enhanced validation
 */
router.post('/change-password',
  authMiddleware,
  createValidationMiddleware('auth', 'changePassword'),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Verify current password first
      const { error: verifyError } = await signInUser({
        email: req.user.email,
        password: currentPassword
      });

      if (verifyError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_INVALID_CURRENT_PASSWORD',
            message: 'Current password is incorrect'
          }
        });
      }

      // Update to new password
      const { error: updateError } = await supabaseAuth.updateUser({
        password: newPassword
      });

      if (updateError) {
        logger.error('Password change error:', { 
          error: updateError.message,
          userId 
        });
        
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to change password'
          }
        });
      }

      // Log security event
      await securityService.logSecurityEvent(userId, 'password_changed', {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Password changed successfully'
        }
      });

    } catch (error) {
      logger.error('Unexpected password change error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during password change'
        }
      });
    }
  }
);

/**
 * DELETE /api/v1/auth/account
 * Delete user account with enhanced validation
 */
router.delete('/account',
  authMiddleware,
  createValidationMiddleware('auth', 'deleteAccount'),
  async (req, res) => {
    try {
      const { password, confirmDeletion } = req.body;
      const userId = req.user.id;

      // Verify password
      const { error: verifyError } = await signInUser({
        email: req.user.email,
        password
      });

      if (verifyError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_INVALID_PASSWORD',
            message: 'Password is incorrect'
          }
        });
      }

      // Delete user account (this should cascade to all related data)
      const { error: deleteError } = await supabaseAuth.admin.deleteUser(userId);

      if (deleteError) {
        logger.error('Account deletion error:', { 
          error: deleteError.message,
          userId 
        });
        
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete account'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Account deleted successfully'
        }
      });

    } catch (error) {
      logger.error('Unexpected account deletion error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during account deletion'
        }
      });
    }
  }
);

export default router;