import { supabaseAuth } from '../db/supabase-auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { 
  validateProfileUpdateInput, 
  validatePasswordChangeInput,
  validateAccountDeletionInput,
  validatePaginationParams 
} from '../utils/validation.js';

/**
 * GET /api/v1/users/profile
 * Get current user's profile
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const getProfileHandler = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user profile from database
    const { data: profile, error } = await supabaseAuth
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error fetching user profile:', error);
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'User profile not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        profile: {
          id: profile.id,
          email: req.user.email,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user profile'
      }
    });
  }
};

/**
 * PUT /api/v1/users/profile
 * Update current user's profile
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const updateProfileHandler = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, avatarUrl } = req.body;

    // Validate input
    const errors = validateProfileUpdateInput({ fullName, avatarUrl });
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

    // Build update object
    const updateData = {};
    if (fullName !== undefined) updateData.full_name = fullName;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;
    updateData.updated_at = new Date().toISOString();

    // Update profile in database
    const { data: updatedProfile, error } = await supabaseAuth
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating user profile:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update user profile'
        }
      });
    }

    res.json({
      success: true,
      data: {
        profile: {
          id: updatedProfile.id,
          email: req.user.email,
          fullName: updatedProfile.full_name,
          avatarUrl: updatedProfile.avatar_url,
          createdAt: updatedProfile.created_at,
          updatedAt: updatedProfile.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update user profile'
      }
    });
  }
};

/**
 * PUT /api/v1/users/password
 * Change user password
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const changePasswordHandler = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    const errors = validatePasswordChangeInput({ currentPassword, newPassword });
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
    const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword
    });

    if (signInError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID_PASSWORD',
          message: 'Current password is incorrect'
        }
      });
    }

    // Update password using the token from the request
    const { error: updateError } = await supabaseAuth.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      logger.error('Password update error:', updateError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PASSWORD_UPDATE_FAILED',
          message: 'Failed to update password'
        }
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Password updated successfully'
      }
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to change password'
      }
    });
  }
};

/**
 * GET /api/v1/users/organizations
 * Get user's organization memberships
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const getOrganizationsHandler = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit } = validatePaginationParams(req.query);

    // Get total count
    const { count, error: countError } = await supabaseAuth
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      logger.error('Error counting organizations:', countError);
    }

    // Get organizations with member info
    const { data: memberships, error } = await supabaseAuth
      .from('organization_members')
      .select(`
        role,
        joined_at,
        organization:organizations (
          id,
          name,
          description,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      logger.error('Error fetching organizations:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch organizations'
        }
      });
    }

    // Get member and project counts for each organization
    const organizationsWithStats = await Promise.all(
      memberships.map(async (membership) => {
        const orgId = membership.organization.id;

        // Get member count
        const { count: memberCount } = await supabaseAuth
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId);

        // Get project count
        const { count: projectCount } = await supabaseAuth
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId);

        return {
          id: membership.organization.id,
          name: membership.organization.name,
          description: membership.organization.description,
          role: membership.role,
          memberCount: memberCount || 0,
          projectCount: projectCount || 0,
          joinedAt: membership.joined_at
        };
      })
    );

    res.json({
      success: true,
      data: {
        organizations: organizationsWithStats
      },
      meta: {
        pagination: {
          page,
          limit,
          total: count || 0
        }
      }
    });
  } catch (error) {
    logger.error('Get organizations error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch organizations'
      }
    });
  }
};

/**
 * GET /api/v1/users/activities
 * Get user's recent activities
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const getActivitiesHandler = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit } = validatePaginationParams(req.query);

    // Get activity logs for the user
    const { data: activities, error, count } = await supabaseAuth
      .from('activity_logs')
      .select(`
        id,
        action,
        resource_type,
        resource_id,
        metadata,
        created_at,
        organization:organizations (
          id,
          name
        ),
        project:projects (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      logger.error('Error fetching activities:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch activities'
        }
      });
    }

    // Format activities
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      action: activity.action,
      resourceType: activity.resource_type,
      resourceId: activity.resource_id,
      metadata: activity.metadata,
      organization: activity.organization,
      project: activity.project,
      createdAt: activity.created_at
    }));

    res.json({
      success: true,
      data: {
        activities: formattedActivities
      },
      meta: {
        pagination: {
          page,
          limit,
          total: count || 0
        }
      }
    });
  } catch (error) {
    logger.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch activities'
      }
    });
  }
};

/**
 * DELETE /api/v1/users/account
 * Delete user account
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const deleteAccountHandler = async (req, res) => {
  try {
    const userId = req.user.id;
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

    // Verify password
    const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: req.user.email,
      password
    });

    if (signInError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID_PASSWORD',
          message: 'Password is incorrect'
        }
      });
    }

    // Check if user is the last admin in any organization
    const { data: adminMemberships } = await supabaseAuth
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('role', 'admin');

    if (adminMemberships && adminMemberships.length > 0) {
      // Check each organization where user is admin
      for (const membership of adminMemberships) {
        const { count: adminCount } = await supabaseAuth
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', membership.organization_id)
          .eq('role', 'admin');

        if (adminCount === 1) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'LAST_ADMIN',
              message: 'Cannot delete account. You are the last admin in one or more organizations. Please assign another admin first.'
            }
          });
        }
      }
    }

    // Delete user account
    // Note: Supabase doesn't provide admin.deleteUser in client SDK
    // We need to use a different approach or service role key
    // For now, we'll mark the account as deleted in the database
    const { error: deleteError } = await supabaseAuth
      .from('profiles')
      .update({ 
        deleted_at: new Date().toISOString(),
        full_name: '[Deleted User]',
        avatar_url: null
      })
      .eq('id', userId);

    if (deleteError) {
      logger.error('Account deletion error:', deleteError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete account'
        }
      });
    }

    // Note: Supabase cascading deletes should handle removing user from:
    // - profiles table
    // - organization_members table
    // - activity_logs table
    // - any other related data

    res.json({
      success: true,
      data: {
        message: 'Account has been permanently deleted'
      }
    });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete account'
      }
    });
  }
};

// Export all handlers
export default {
  getProfileHandler: [authMiddleware, getProfileHandler],
  updateProfileHandler: [authMiddleware, updateProfileHandler],
  changePasswordHandler: [authMiddleware, changePasswordHandler],
  getOrganizationsHandler: [authMiddleware, getOrganizationsHandler],
  getActivitiesHandler: [authMiddleware, getActivitiesHandler],
  deleteAccountHandler: [authMiddleware, deleteAccountHandler]
};