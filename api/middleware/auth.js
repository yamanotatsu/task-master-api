import { supabase } from '../db/supabase.js';
import logger from '../utils/logger.js';

/**
 * Authentication middleware for Express.js
 * Validates JWT tokens and attaches user information to the request
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: '認証トークンが必要です'
        }
      });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: '認証トークンが無効です'
        }
      });
    }
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      logger.error('Token verification error:', error);
      
      // Check if token is expired
      if (error.message.includes('expired')) {
        return res.status(401).json({
          error: {
            code: 'AUTH_EXPIRED_TOKEN',
            message: '認証トークンの有効期限が切れています'
          }
        });
      }
      
      return res.status(401).json({
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: '無効な認証トークンです'
        }
      });
    }
    
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: 'ユーザーが見つかりません'
        }
      });
    }
    
    // Check if email is verified
    if (!user.email_confirmed_at) {
      return res.status(401).json({
        error: {
          code: 'AUTH_EMAIL_NOT_VERIFIED',
          message: 'メールアドレスが確認されていません'
        }
      });
    }
    
    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      email_verified: !!user.email_confirmed_at,
      created_at: user.created_at
    };
    
    // Log successful authentication (for audit purposes)
    logger.info(`Authenticated user: ${user.email} (${user.id})`);
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '認証処理でエラーが発生しました'
      }
    });
  }
};

/**
 * Optional authentication middleware
 * Allows requests to proceed even without authentication
 * but attaches user info if token is provided
 */
export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, proceed without user
      req.user = null;
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    // Try to verify token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      // Invalid token, proceed without user
      req.user = null;
      return next();
    }
    
    // Attach user if valid
    req.user = {
      id: user.id,
      email: user.email,
      email_verified: !!user.email_confirmed_at,
      created_at: user.created_at
    };
    
    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    // On error, proceed without user
    req.user = null;
    next();
  }
};