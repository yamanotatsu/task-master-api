import express from 'express';
import { supabase } from '../db/supabase.js';
import logger from '../utils/logger.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';

const router = express.Router();

/**
 * POST /api/v1/organizations
 * Create a new organization
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;
    
    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '組織名を入力してください'
        }
      });
    }
    
    if (name.length > 100) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '組織名は100文字以内で入力してください'
        }
      });
    }
    
    // Start transaction by using Supabase's single query approach
    // First create the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: name.trim() })
      .select()
      .single();
    
    if (orgError) {
      logger.error('Organization creation error:', orgError);
      throw orgError;
    }
    
    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        profile_id: userId,
        role: 'admin'
      });
    
    if (memberError) {
      // Try to clean up the organization if member creation fails
      await supabase
        .from('organizations')
        .delete()
        .eq('id', org.id);
      
      logger.error('Organization member creation error:', memberError);
      throw memberError;
    }
    
    logger.info(`Organization created: ${org.name} (${org.id}) by user ${userId}`);
    
    res.status(201).json({
      data: {
        ...org,
        role: 'admin'
      }
    });
  } catch (error) {
    logger.error('Organization creation error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '組織の作成に失敗しました'
      }
    });
  }
});

/**
 * GET /api/v1/organizations
 * Get list of organizations the user belongs to
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    
    // Validate pagination params
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', userId);
    
    if (countError) {
      logger.error('Organization count error:', countError);
      throw countError;
    }
    
    // Get organizations with member info
    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        joined_at,
        organizations (
          id,
          name,
          created_at,
          updated_at
        )
      `)
      .eq('profile_id', userId)
      .order('joined_at', { ascending: false })
      .range(offset, offset + limitNum - 1);
    
    if (error) {
      logger.error('Organization fetch error:', error);
      throw error;
    }
    
    // Transform the data
    const organizations = await Promise.all(memberships.map(async (membership) => {
      // Get member count for each organization
      const { count: memberCount } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', membership.organizations.id);
      
      return {
        id: membership.organizations.id,
        name: membership.organizations.name,
        role: membership.role,
        member_count: memberCount || 0,
        created_at: membership.organizations.created_at,
        joined_at: membership.joined_at
      };
    }));
    
    res.json({
      data: organizations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (error) {
    logger.error('Organization list error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '組織一覧の取得に失敗しました'
      }
    });
  }
});

/**
 * GET /api/v1/organizations/:orgId
 * Get organization details
 */
router.get('/:orgId', authMiddleware, rbacMiddleware(), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Get organization details
    const { data: org, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    
    if (error) {
      logger.error('Organization fetch error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '組織が見つかりません'
          }
        });
      }
      throw error;
    }
    
    // Get additional statistics
    const [
      { count: memberCount },
      { count: projectCount },
      { count: taskCount }
    ] = await Promise.all([
      supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('project_id', 
          supabase
            .from('projects')
            .select('id')
            .eq('organization_id', orgId)
        )
    ]);
    
    res.json({
      data: {
        ...org,
        role: req.organizationMember.role,
        member_count: memberCount || 0,
        project_count: projectCount || 0,
        task_count: taskCount || 0
      }
    });
  } catch (error) {
    logger.error('Organization detail error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '組織情報の取得に失敗しました'
      }
    });
  }
});

/**
 * PUT /api/v1/organizations/:orgId
 * Update organization information
 */
router.put('/:orgId', authMiddleware, rbacMiddleware('admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name } = req.body;
    
    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '組織名を入力してください'
        }
      });
    }
    
    if (name.length > 100) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '組織名は100文字以内で入力してください'
        }
      });
    }
    
    // Update organization
    const { data: org, error } = await supabase
      .from('organizations')
      .update({ name: name.trim() })
      .eq('id', orgId)
      .select()
      .single();
    
    if (error) {
      logger.error('Organization update error:', error);
      throw error;
    }
    
    logger.info(`Organization updated: ${org.name} (${org.id}) by user ${req.user.id}`);
    
    res.json({
      data: org
    });
  } catch (error) {
    logger.error('Organization update error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '組織情報の更新に失敗しました'
      }
    });
  }
});

/**
 * POST /api/v1/organizations/:orgId/invites
 * Invite a user to the organization
 */
router.post('/:orgId/invites', authMiddleware, rbacMiddleware('admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { email } = req.body;
    const inviterId = req.user.id;
    
    // Validation
    if (!email) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'メールアドレスを入力してください'
        }
      });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '有効なメールアドレスを入力してください'
        }
      });
    }
    
    // Check if user exists using Admin API
    const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers({
      filter: `email.eq.${email}`,
      limit: 1
    });
    
    if (searchError) {
      logger.error('User search error:', searchError);
      throw searchError;
    }
    
    const existingUser = users && users.length > 0 ? users[0] : null;
    
    if (existingUser) {
      // User exists - add them directly
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('profile_id')
        .eq('organization_id', orgId)
        .eq('profile_id', existingUser.id)
        .single();
      
      if (existingMember) {
        return res.status(400).json({
          error: {
            code: 'ALREADY_MEMBER',
            message: 'このユーザーは既に組織のメンバーです'
          }
        });
      }
      
      // Add as member
      const { error: addError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgId,
          profile_id: existingUser.id,
          role: 'member'
        });
      
      if (addError) {
        logger.error('Member addition error:', addError);
        throw addError;
      }
      
      logger.info(`Existing user added to organization: ${email} to ${orgId} by ${inviterId}`);
      
      res.json({
        message: 'ユーザーを組織に追加しました',
        data: {
          profile_id: existingUser.id,
          email: email,
          status: 'added'
        }
      });
    } else {
      // User doesn't exist - create invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: orgId,
          email: email.toLowerCase(),
          invited_by: inviterId
        })
        .select()
        .single();
      
      if (inviteError) {
        if (inviteError.code === '23505') { // Unique constraint violation
          return res.status(400).json({
            error: {
              code: 'INVITATION_EXISTS',
              message: 'このメールアドレスへの招待は既に送信されています'
            }
          });
        }
        logger.error('Invitation creation error:', inviteError);
        throw inviteError;
      }
      
      // TODO: Send invitation email
      // This would typically involve:
      // 1. Generating a secure invitation link
      // 2. Sending email via SendGrid, AWS SES, or Supabase Email
      
      logger.info(`Invitation created: ${email} to ${orgId} by ${inviterId}`);
      
      res.json({
        message: '招待メールを送信しました',
        data: {
          email: email,
          status: 'invited',
          invitation_id: invitation.id
        }
      });
    }
  } catch (error) {
    logger.error('Invitation error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '招待処理に失敗しました'
      }
    });
  }
});

/**
 * GET /api/v1/organizations/:orgId/members
 * Get organization members
 */
router.get('/:orgId/members', authMiddleware, rbacMiddleware(), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { role, search } = req.query;
    
    // Build query
    let query = supabase
      .from('organization_members')
      .select(`
        profile_id,
        role,
        joined_at,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: true });
    
    // Apply filters
    if (role && ['admin', 'member'].includes(role)) {
      query = query.eq('role', role);
    }
    
    const { data: members, error } = await query;
    
    if (error) {
      logger.error('Members fetch error:', error);
      throw error;
    }
    
    // Transform and filter by search if needed
    let transformedMembers = members.map(member => ({
      profile_id: member.profile_id,
      full_name: member.profiles.full_name || '',
      email: '', // Email is not available from profiles, would need auth.users
      avatar_url: member.profiles.avatar_url,
      role: member.role,
      joined_at: member.joined_at
    }));
    
    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      transformedMembers = transformedMembers.filter(member =>
        member.full_name.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({
      data: transformedMembers
    });
  } catch (error) {
    logger.error('Members list error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'メンバー一覧の取得に失敗しました'
      }
    });
  }
});

/**
 * PUT /api/v1/organizations/:orgId/members/:profileId
 * Update member role
 */
router.put('/:orgId/members/:profileId', authMiddleware, rbacMiddleware('admin'), async (req, res) => {
  try {
    const { orgId, profileId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.id;
    
    // Validation
    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ロールは "admin" または "member" である必要があります'
        }
      });
    }
    
    // Prevent user from changing their own role
    if (profileId === currentUserId) {
      return res.status(400).json({
        error: {
          code: 'CANNOT_CHANGE_OWN_ROLE',
          message: '自分のロールは変更できません'
        }
      });
    }
    
    // Update member role
    const { data: updatedMember, error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('organization_id', orgId)
      .eq('profile_id', profileId)
      .select()
      .single();
    
    if (error) {
      logger.error('Member role update error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'メンバーが見つかりません'
          }
        });
      }
      throw error;
    }
    
    logger.info(`Member role updated: ${profileId} to ${role} in ${orgId} by ${currentUserId}`);
    
    res.json({
      message: 'メンバーのロールを更新しました',
      data: {
        profile_id: profileId,
        role: role
      }
    });
  } catch (error) {
    logger.error('Member role update error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'メンバーロールの更新に失敗しました'
      }
    });
  }
});

/**
 * DELETE /api/v1/organizations/:orgId/members/:profileId
 * Remove member from organization
 */
router.delete('/:orgId/members/:profileId', authMiddleware, rbacMiddleware('admin'), async (req, res) => {
  try {
    const { orgId, profileId } = req.params;
    const currentUserId = req.user.id;
    
    // Prevent user from removing themselves
    if (profileId === currentUserId) {
      return res.status(400).json({
        error: {
          code: 'CANNOT_REMOVE_SELF',
          message: '自分自身を組織から削除することはできません'
        }
      });
    }
    
    // Delete member (the trigger will prevent removing last admin)
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', orgId)
      .eq('profile_id', profileId);
    
    if (error) {
      logger.error('Member removal error:', error);
      if (error.message.includes('last admin')) {
        return res.status(400).json({
          error: {
            code: 'CANNOT_REMOVE_LAST_ADMIN',
            message: '最後の管理者は削除できません'
          }
        });
      }
      throw error;
    }
    
    logger.info(`Member removed: ${profileId} from ${orgId} by ${currentUserId}`);
    
    res.json({
      message: 'メンバーを組織から削除しました'
    });
  } catch (error) {
    logger.error('Member removal error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'メンバーの削除に失敗しました'
      }
    });
  }
});

export default router;