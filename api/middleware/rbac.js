import { supabase } from '../db/supabase.js';
import logger from '../utils/logger.js';

/**
 * Role-Based Access Control (RBAC) middleware
 * Checks if the authenticated user has the required role in the organization
 * 
 * @param {string} requiredRole - The role required to access the resource ('admin' or 'member')
 * @returns {Function} Express middleware function
 */
export const rbacMiddleware = (requiredRole = 'member') => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated first
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: '認証が必要です'
          }
        });
      }
      
      // Extract organization ID from request params
      const orgId = req.params.orgId || req.params.organizationId;
      
      if (!orgId) {
        return res.status(400).json({
          error: {
            code: 'ORGANIZATION_ID_REQUIRED',
            message: '組織IDが必要です'
          }
        });
      }
      
      // Check user's role in the organization
      const { data: member, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('profile_id', req.user.id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          logger.warn(`Access denied: User ${req.user.id} is not a member of organization ${orgId}`);
          return res.status(403).json({
            error: {
              code: 'AUTH_INSUFFICIENT_PERMISSIONS',
              message: 'この組織のメンバーではありません'
            }
          });
        }
        
        logger.error('RBAC query error:', error);
        throw error;
      }
      
      if (!member) {
        return res.status(403).json({
          error: {
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            message: 'この操作を行う権限がありません'
          }
        });
      }
      
      // Check if user has the required role
      if (requiredRole === 'admin' && member.role !== 'admin') {
        logger.warn(`Access denied: User ${req.user.id} requires admin role in organization ${orgId}`);
        return res.status(403).json({
          error: {
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            message: '管理者権限が必要です'
          }
        });
      }
      
      // Attach organization member info to request
      req.organizationMember = {
        organization_id: orgId,
        role: member.role
      };
      
      logger.info(`Access granted: User ${req.user.id} with role ${member.role} in organization ${orgId}`);
      next();
    } catch (error) {
      logger.error('RBAC middleware error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '権限確認でエラーが発生しました'
        }
      });
    }
  };
};

/**
 * Check if user belongs to any organization
 * Useful for checking if user needs to create their first organization
 */
export const requireAnyOrganization = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '認証が必要です'
        }
      });
    }
    
    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('profile_id', req.user.id)
      .limit(1);
    
    if (error) {
      logger.error('Organization check error:', error);
      throw error;
    }
    
    if (!memberships || memberships.length === 0) {
      return res.status(403).json({
        error: {
          code: 'NO_ORGANIZATION',
          message: '組織に所属していません。最初に組織を作成してください。'
        }
      });
    }
    
    // Attach first organization info if no specific org is requested
    req.userOrganizations = memberships;
    next();
  } catch (error) {
    logger.error('Organization check middleware error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '組織確認でエラーが発生しました'
      }
    });
  }
};

/**
 * Middleware to attach organization context for project-based routes
 * Looks up the organization from the project ID
 */
export const projectOrganizationMiddleware = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '認証が必要です'
        }
      });
    }
    
    const projectId = req.params.projectId || req.params.id;
    
    if (!projectId) {
      return res.status(400).json({
        error: {
          code: 'PROJECT_ID_REQUIRED',
          message: 'プロジェクトIDが必要です'
        }
      });
    }
    
    // Get project's organization
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'プロジェクトが見つかりません'
        }
      });
    }
    
    // Check user's membership in the organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', project.organization_id)
      .eq('profile_id', req.user.id)
      .single();
    
    if (memberError || !member) {
      return res.status(403).json({
        error: {
          code: 'AUTH_INSUFFICIENT_PERMISSIONS',
          message: 'このプロジェクトへのアクセス権限がありません'
        }
      });
    }
    
    // Attach organization context
    req.organizationMember = {
      organization_id: project.organization_id,
      role: member.role
    };
    
    next();
  } catch (error) {
    logger.error('Project organization middleware error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'プロジェクト権限確認でエラーが発生しました'
      }
    });
  }
};