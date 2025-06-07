import { supabaseAuth } from '../db/supabase-auth.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication middleware for verifying JWT tokens from Authorization header
 * Implements role-based access control (RBAC) and attaches user info to request
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // Extract and validate Authorization header
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

    // Extract token
    const token = authHeader.substring(7);

    // Validate token format
    if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID_TOKEN_FORMAT',
          message: 'Invalid token format'
        }
      });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      logger.error('Token verification failed:', error);
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'Invalid or expired token'
        }
      });
    }

    // Get user profile information
    const { data: profile, error: profileError } = await supabaseAuth
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error('Failed to fetch user profile:', profileError);
    }

    // Attach user information to request object
    req.user = {
      id: user.id,
      email: user.email,
      profile: profile || null,
      metadata: user.user_metadata || {}
    };
    req.token = token;

    // Log successful authentication
    logger.info(`User authenticated: ${user.email} (${user.id})`);

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error occurred'
      }
    });
  }
};

/**
 * Role-based access control middleware
 * Checks if user has required role in the organization
 * 
 * @param {string} requiredRole - The role required to access the resource ('admin' or 'member')
 */
export const requireRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
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

      // Check user's membership in the organization
      const { data: membership, error } = await supabaseAuth
        .from('organization_members')
        .select(`
          role,
          joined_at,
          organization:organizations (
            id,
            name
          )
        `)
        .eq('organization_id', organizationId)
        .eq('profile_id', req.user.id)
        .single();

      if (error || !membership) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTHZ_NOT_ORGANIZATION_MEMBER',
            message: 'You are not a member of this organization'
          }
        });
      }

      // Check if user has required role
      if (requiredRole === 'admin' && membership.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTHZ_REQUIRES_ADMIN',
            message: 'Admin privileges required'
          }
        });
      }

      // Attach organization membership to request
      req.organizationMember = {
        role: membership.role,
        joined_at: membership.joined_at,
        organizationId,
        organization: membership.organization
      };

      next();
    } catch (error) {
      logger.error('Role check error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTHZ_ERROR',
          message: 'Authorization error occurred'
        }
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Attempts to authenticate user but doesn't fail if no token is provided
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      // Invalid token, continue without authentication
      req.user = null;
      return next();
    }

    // Get user profile if authenticated
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email,
      profile: profile || null,
      metadata: user.user_metadata || {}
    };
    req.token = token;

    next();
  } catch (error) {
    // Log error but continue without authentication
    logger.error('Optional auth error:', error);
    req.user = null;
    next();
  }
};

/**
 * Project access middleware
 * Verifies user has access to a specific project
 */
export const requireProjectAccess = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required'
        }
      });
    }

    // Get project details to check organization
    const { data: project, error: projectError } = await supabaseAuth
      .from('projects')
      .select('id, organization_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found'
        }
      });
    }

    // Check if user is member of the organization
    const { data: membership, error: memberError } = await supabaseAuth
      .from('organization_members')
      .select('role')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', req.user.id)
      .single();

    if (memberError || !membership) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHZ_PROJECT_ACCESS_DENIED',
          message: 'You do not have access to this project'
        }
      });
    }

    // Attach project and membership info to request
    req.project = project;
    req.organizationMember = {
      role: membership.role,
      organizationId: project.organization_id
    };

    next();
  } catch (error) {
    logger.error('Project access check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTHZ_ERROR',
        message: 'Authorization error occurred'
      }
    });
  }
};

/**
 * Rate limiting check
 * Should be used in conjunction with express-rate-limit
 */
export const checkRateLimit = () => {
  return async (req, res, next) => {
    // This is a placeholder for rate limit checking
    // Actual implementation would integrate with Redis or similar
    // for distributed rate limiting
    next();
  };
};