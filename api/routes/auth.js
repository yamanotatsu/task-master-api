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
import {
  validateSignupInput,
  validateLoginInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  validateRefreshTokenInput,
  validateAccountDeletionInput
} from '../utils/validation.js';
import { authMiddleware } from '../middleware/auth.js';
import { 
  rateLimiters, 
  bruteForceProtection, 
  captchaProtection,
  trackFailedAttempt 
} from '../middleware/rateLimiter.js';
import securityService from '../services/security.js';
import { logAuthEvent, logSecurityEvent, AUDIT_EVENTS, RISK_LEVELS } from '../services/auditLog.js';

const router = express.Router();

/**
 * POST /api/v1/auth/signup
 * User registration with validation
 */
router.post('/signup', rateLimiters.auth, captchaProtection, async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    
    // Validate input
    const errors = validateSignupInput({ fullName, email, password });
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

    // Additional security checks
    const passwordValidation = securityService.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_PASSWORD_WEAK',
          message: 'Password does not meet security requirements',
          details: passwordValidation.issues
        }
      });
    }

    // Attempt to create user with Supabase Auth
    const { user, session, error } = await createUser({
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim()
    });

    if (error) {
      console.error('Signup error:', error);
      
      // Handle specific error cases
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'AUTH_EMAIL_EXISTS',
            message: 'This email is already registered'
          }
        });
      }
      
      if (error.message.includes('invalid email')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_EMAIL_INVALID',
            message: 'Please enter a valid email address'
          }
        });
      }
      
      if (error.message.includes('password')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_PASSWORD_WEAK',
            message: 'Password does not meet security requirements'
          }
        });
      }
      
      // Generic error for other cases
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during registration'
        }
      });
    }

    // Log successful signup
    await logAuthEvent(AUDIT_EVENTS.AUTH_SIGNUP, {
      description: `User registration successful: ${user.email}`,
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        email: user.email,
        emailConfirmed: user.email_confirmed_at ? true : false
      }
    });

    res.status(201).json({
      success: true,
      data: {
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email
        }
      }
    });

  } catch (error) {
    console.error('Unexpected signup error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during registration'
      }
    });
  }
});

/**
 * POST /api/v1/auth/login
 * User login with tokens
 */
router.post('/login', rateLimiters.auth, bruteForceProtection, captchaProtection, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    const errors = validateLoginInput({ email, password });
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

    const normalizedEmail = email.trim().toLowerCase();
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Check if account is locked
    const lockStatus = await securityService.isAccountLocked(normalizedEmail, 'email');
    if (lockStatus.locked) {
      return res.status(423).json({
        success: false,
        error: {
          code: 'AUTH_ACCOUNT_LOCKED',
          message: lockStatus.reason,
          retryAfter: lockStatus.expiresAt
        }
      });
    }

    // Check for suspicious activity
    const suspiciousCheck = await securityService.detectSuspiciousActivity(normalizedEmail, {
      ip: clientIP,
      userAgent
    });
    if (suspiciousCheck.suspicious) {
      // Log but don't block immediately - just require CAPTCHA
      return res.status(400).json({
        success: false,
        error: {
          code: 'AUTH_CAPTCHA_REQUIRED',
          message: 'Additional verification required',
          requiresCaptcha: true
        }
      });
    }

    // Attempt to sign in with Supabase Auth
    const { user, session, error } = await signInUser({
      email: normalizedEmail,
      password
    });

    if (error) {
      console.error('Login error:', error);
      
      // Track failed attempt
      await securityService.trackLoginAttempt(normalizedEmail, 'email', false, {
        ip: clientIP,
        userAgent,
        error: error.message
      });
      
      // Log failed login attempt
      await logAuthEvent(AUDIT_EVENTS.AUTH_LOGIN_FAILED, {
        description: `Login failed for ${normalizedEmail}: ${error.message}`,
        ipAddress: clientIP,
        userAgent: req.get('User-Agent'),
        riskLevel: RISK_LEVELS.MEDIUM,
        metadata: {
          email: normalizedEmail,
          errorType: error.message,
          attemptSource: 'password_login'
        }
      });
      
      // Handle specific error cases
      if (error.message.includes('Invalid login credentials') || 
          error.message.includes('invalid') ||
          error.message.includes('incorrect')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }
      
      if (error.message.includes('email not confirmed') ||
          error.message.includes('not verified')) {
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
    
    // Log successful login
    await logAuthEvent(AUDIT_EVENTS.AUTH_LOGIN_SUCCESS, {
      description: `User login successful: ${user.email}`,
      userId: user.id,
      sessionId: session.access_token?.substring(0, 20) + '...',
      ipAddress: clientIP,
      userAgent: req.get('User-Agent'),
      metadata: {
        email: user.email,
        sessionDuration: session.expires_in
      }
    });

    // Get user profile information
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
          fullName: profile?.full_name || user.user_metadata?.full_name || null
        },
        tokens: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresIn: session.expires_in || 3600
        }
      }
    });

  } catch (error) {
    console.error('Unexpected login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during login'
      }
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * User logout
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Sign out the user
    const { error } = await signOutUser();
    
    if (error) {
      console.error('Logout error:', error);
      // Don't fail on logout errors, just log them
    }

    // Log successful logout
    await logAuthEvent(AUDIT_EVENTS.AUTH_LOGOUT, {
      description: `User logout: ${req.user?.email || 'unknown'}`,
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        logoutType: 'manual'
      }
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    });

  } catch (error) {
    console.error('Unexpected logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during logout'
      }
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Token refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Validate input
    const errors = validateRefreshTokenInput({ refreshToken });
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

    // Refresh the session
    const { session, error } = await refreshSession(refreshToken);

    if (error) {
      console.error('Token refresh error:', error);
      
      if (error.message.includes('expired') || 
          error.message.includes('invalid') ||
          error.message.includes('not found')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid or expired refresh token'
          }
        });
      }
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during token refresh'
        }
      });
    }

    // Log token refresh
    await logAuthEvent(AUDIT_EVENTS.AUTH_TOKEN_REFRESH, {
      description: 'Token refresh successful',
      userId: session.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        sessionDuration: session.expires_in
      }
    });

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
    console.error('Unexpected token refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during token refresh'
      }
    });
  }
});

/**
 * POST /api/v1/auth/forgot-password
 * Password reset request
 */
router.post('/forgot-password', rateLimiters.passwordReset, captchaProtection, async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate input
    const errors = validateForgotPasswordInput({ email });
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

    // Request password reset
    const { error } = await resetPasswordRequest(email.trim().toLowerCase());

    if (error) {
      console.error('Password reset request error:', error);
      // Don't reveal whether the email exists or not for security
    }

    // Log password reset request (regardless of success to prevent enumeration)
    await logAuthEvent(AUDIT_EVENTS.AUTH_PASSWORD_RESET_REQUEST, {
      description: `Password reset requested for ${email.trim().toLowerCase()}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      riskLevel: RISK_LEVELS.MEDIUM,
      metadata: {
        email: email.trim().toLowerCase(),
        requestSuccess: !error
      }
    });

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      data: {
        message: 'If an account exists with this email, a password reset link has been sent.'
      }
    });

  } catch (error) {
    console.error('Unexpected password reset request error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
});

/**
 * POST /api/v1/auth/reset-password
 * Password reset execution
 */
router.post('/reset-password', rateLimiters.passwordReset, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Validate input
    const errors = validateResetPasswordInput({ token, newPassword });
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

    // Validate new password strength
    const passwordValidation = securityService.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_PASSWORD_WEAK',
          message: 'New password does not meet security requirements',
          details: passwordValidation.issues
        }
      });
    }

    // Verify and use the reset token to update password
    const { user, session, error } = await verifyOtp({
      token_hash: token,
      type: 'recovery'
    });

    if (error) {
      console.error('Password reset verification error:', error);
      
      if (error.message.includes('expired') || 
          error.message.includes('invalid') ||
          error.message.includes('not found')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid or expired reset token'
          }
        });
      }
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during password reset'
        }
      });
    }

    // Update the password
    const { user: updatedUser, error: updateError } = await updatePassword(newPassword);

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating the password'
        }
      });
    }

    // Log successful password reset
    await logAuthEvent(AUDIT_EVENTS.AUTH_PASSWORD_RESET_SUCCESS, {
      description: `Password reset completed for user: ${user.email}`,
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      riskLevel: RISK_LEVELS.HIGH,
      metadata: {
        email: user.email,
        resetMethod: 'email_token'
      }
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Password has been reset successfully'
      }
    });

  } catch (error) {
    console.error('Unexpected password reset error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during password reset'
      }
    });
  }
});

/**
 * DELETE /api/v1/auth/user
 * Account deletion
 */
router.delete('/user', authMiddleware, async (req, res) => {
  try {
    const { password, confirmDeletion } = req.body;
    
    // Validate input
    const errors = validateAccountDeletionInput({ password, confirmDeletion });
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

    // Verify current password by attempting to sign in
    const { error: verifyError } = await signInUser({
      email: req.user.email,
      password
    });

    if (verifyError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Current password is incorrect'
        }
      });
    }

    // Delete the user account using service key
    const { error: deleteError } = await supabase.auth.admin.deleteUser(req.user.id);

    if (deleteError) {
      console.error('Account deletion error:', deleteError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting the account'
        }
      });
    }

    // Log account deletion
    await logSecurityEvent(AUDIT_EVENTS.SECURITY_SENSITIVE_ACCESS, {
      description: `Account deletion completed for user: ${req.user.email}`,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      riskLevel: RISK_LEVELS.CRITICAL,
      metadata: {
        email: req.user.email,
        deletionMethod: 'self_service',
        confirmationProvided: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Account has been permanently deleted'
      }
    });

  } catch (error) {
    console.error('Unexpected account deletion error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during account deletion'
      }
    });
  }
});

export default router;