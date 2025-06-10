import express from 'express';
import { supabase } from '../db/supabase.js';
import {
	authMiddleware,
	requireRole,
	optionalAuth
} from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import {
	logOrganizationEvent,
	logSecurityEvent,
	AUDIT_EVENTS,
	RISK_LEVELS
} from '../services/auditLog.js';

const router = express.Router();

/**
 * POST /api/v1/organizations
 * Create a new organization (authenticated users)
 */
router.post('/', authMiddleware, async (req, res) => {
	try {
		const { name, description } = req.body;
		const userId = req.user.id;

		// Validate input
		if (!name || name.trim().length === 0) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Organization name is required',
					details: [{ field: 'name', message: 'Name cannot be empty' }]
				}
			});
		}

		if (name.trim().length > 100) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Organization name is too long',
					details: [
						{ field: 'name', message: 'Name must be 100 characters or less' }
					]
				}
			});
		}

		// Try direct approach if RPC fails
		let organization;
		let useDirectApproach = false;

		// First try the RPC function
		const { data, error } = await supabase.rpc(
			'create_organization_with_admin',
			{
				org_name: name.trim(),
				org_description: description?.trim() || null,
				admin_id: userId
			}
		);

		// Log the error for debugging
		if (error) {
			logger.error('RPC error details:', {
				message: error.message,
				details: error.details,
				hint: error.hint,
				code: error.code,
				userId: userId
			});

			// Fallback to direct insertion
			useDirectApproach = true;
		}

		if (useDirectApproach) {
			// Generate slug from name
			const slug = name
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '');

			// Try direct insertion with slug if required
			const { data: orgData, error: orgError } = await supabase
				.from('organizations')
				.insert({
					name: name.trim(),
					slug: slug, // Add slug in case it's required
					description: description?.trim() || null
				})
				.select()
				.single();

			if (orgError) {
				logger.error('Direct org creation failed:', orgError);

				// Try without slug
				const { data: orgData2, error: orgError2 } = await supabase
					.from('organizations')
					.insert({
						name: name.trim(),
						description: description?.trim() || null
					})
					.select()
					.single();

				if (orgError2) {
					logger.error(
						'Direct org creation without slug also failed:',
						orgError2
					);

					if (
						orgError2.message.includes('duplicate') ||
						orgError2.message.includes('already exists')
					) {
						return res.status(409).json({
							success: false,
							error: {
								code: 'ORG_NAME_EXISTS',
								message: 'An organization with this name already exists'
							}
						});
					}

					return res.status(500).json({
						success: false,
						error: {
							code: 'ORG_CREATE_FAILED',
							message: 'Failed to create organization'
						}
					});
				}

				organization = orgData2;
			} else {
				organization = orgData;
			}

			// Add user as admin
			const { error: memberError } = await supabase
				.from('organization_members')
				.insert({
					organization_id: organization.id,
					user_id: userId,
					role: 'admin'
				});

			if (memberError) {
				logger.error('Failed to add admin member:', memberError);

				// Try to clean up the organization
				await supabase.from('organizations').delete().eq('id', organization.id);

				return res.status(500).json({
					success: false,
					error: {
						code: 'ORG_CREATE_FAILED',
						message: 'Failed to create organization'
					}
				});
			}
		} else if (!data || !data[0]) {
			return res.status(500).json({
				success: false,
				error: {
					code: 'ORG_CREATE_FAILED',
					message: 'Failed to create organization'
				}
			});
		}

		// Get the created organization details if using RPC
		if (!useDirectApproach) {
			const { data: orgData, error: orgError } = await supabase
				.from('organizations')
				.select('*')
				.eq('id', data[0].organization_id)
				.single();

			if (orgError || !orgData) {
				logger.error('Failed to fetch created organization:', orgError);
				return res.status(500).json({
					success: false,
					error: {
						code: 'ORG_CREATE_FAILED',
						message: 'Organization created but failed to fetch details'
					}
				});
			}

			organization = orgData;
		}

		// Update user's current_organization_id
		const { error: profileUpdateError } = await supabase
			.from('profiles')
			.update({ current_organization_id: organization.id })
			.eq('id', userId);

		if (profileUpdateError) {
			logger.error(
				'Failed to update user profile with organization:',
				profileUpdateError
			);
			// Log but don't fail the request since organization was created successfully
		}

		// Log organization creation
		await logOrganizationEvent(AUDIT_EVENTS.ORG_CREATE, {
			description: `Organization created: ${organization.name}`,
			userId: userId,
			organizationId: organization.id,
			resourceId: organization.id,
			ipAddress: req.ip,
			userAgent: req.get('User-Agent'),
			newValues: {
				name: organization.name,
				description: organization.description
			},
			metadata: {
				creatorRole: 'admin',
				organizationSize: 1
			}
		});

		res.status(201).json({
			success: true,
			data: {
				organization: {
					id: organization.id,
					name: organization.name,
					description: organization.description,
					createdAt: organization.created_at
				},
				membership: {
					role: 'admin',
					joinedAt: new Date().toISOString()
				}
			}
		});
	} catch (error) {
		logger.error('Unexpected error creating organization:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'An unexpected error occurred while creating the organization'
			}
		});
	}
});

/**
 * GET /api/v1/organizations
 * List user's organizations with pagination
 */
router.get('/', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const page = parseInt(req.query.page) || 1;
		const limit = Math.min(parseInt(req.query.limit) || 20, 100);
		const offset = (page - 1) * limit;

		// Get total count of user's organizations
		const { count, error: countError } = await supabase
			.from('organization_members')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', userId);

		if (countError) {
			logger.error('Failed to count organizations:', countError);
			return res.status(500).json({
				success: false,
				error: {
					code: 'ORG_LIST_FAILED',
					message: 'Failed to retrieve organizations'
				}
			});
		}

		// Get user's organizations with additional info
		const { data: memberships, error: listError } = await supabase
			.from('organization_members')
			.select(
				`
        role,
        joined_at,
        organization:organizations (
          id,
          name,
          description,
          created_at,
          updated_at
        )
      `
			)
			.eq('user_id', userId)
			.order('joined_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (listError) {
			logger.error('Failed to list organizations:', listError);
			return res.status(500).json({
				success: false,
				error: {
					code: 'ORG_LIST_FAILED',
					message: 'Failed to retrieve organizations'
				}
			});
		}

		// Get member and project counts for each organization
		const organizationIds = memberships.map((m) => m.organization.id);

		// Get member counts
		const { data: memberCounts } = await supabase
			.from('organization_members')
			.select('organization_id')
			.in('organization_id', organizationIds);

		// Get project counts
		const { data: projectCounts } = await supabase
			.from('projects')
			.select('organization_id')
			.in('organization_id', organizationIds);

		// Create count maps
		const memberCountMap = {};
		const projectCountMap = {};

		memberCounts?.forEach((member) => {
			memberCountMap[member.organization_id] =
				(memberCountMap[member.organization_id] || 0) + 1;
		});

		projectCounts?.forEach((project) => {
			projectCountMap[project.organization_id] =
				(projectCountMap[project.organization_id] || 0) + 1;
		});

		// Format response
		const organizations = memberships.map((membership) => ({
			id: membership.organization.id,
			name: membership.organization.name,
			description: membership.organization.description,
			role: membership.role,
			memberCount: memberCountMap[membership.organization.id] || 0,
			projectCount: projectCountMap[membership.organization.id] || 0,
			joinedAt: membership.joined_at
		}));

		res.status(200).json({
			success: true,
			data: {
				organizations
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
		logger.error('Unexpected error listing organizations:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'An unexpected error occurred while retrieving organizations'
			}
		});
	}
});

/**
 * GET /api/v1/organizations/:organizationId
 * Get organization details (members only)
 */
router.get(
	'/:organizationId',
	authMiddleware,
	requireRole('member'),
	async (req, res) => {
		try {
			const { organizationId } = req.params;

			// Get organization details
			const { data: organization, error: orgError } = await supabase
				.from('organizations')
				.select('*')
				.eq('id', organizationId)
				.single();

			if (orgError || !organization) {
				return res.status(404).json({
					success: false,
					error: {
						code: 'ORG_NOT_FOUND',
						message: 'Organization not found'
					}
				});
			}

			// Get statistics
			const [
				{ count: memberCount },
				{ count: projectCount },
				{ count: activeTaskCount }
			] = await Promise.all([
				supabase
					.from('organization_members')
					.select('*', { count: 'exact', head: true })
					.eq('organization_id', organizationId),
				supabase
					.from('projects')
					.select('*', { count: 'exact', head: true })
					.eq('organization_id', organizationId),
				supabase
					.from('tasks')
					.select('*', { count: 'exact', head: true })
					.eq('organization_id', organizationId)
					.in('status', ['pending', 'in-progress', 'review'])
			]);

			res.status(200).json({
				success: true,
				data: {
					organization: {
						id: organization.id,
						name: organization.name,
						description: organization.description,
						createdAt: organization.created_at,
						updatedAt: organization.updated_at
					},
					membership: {
						role: req.organizationMember.role,
						joinedAt: req.organizationMember.joined_at
					},
					statistics: {
						memberCount: memberCount || 0,
						projectCount: projectCount || 0,
						activeTaskCount: activeTaskCount || 0
					}
				}
			});
		} catch (error) {
			logger.error('Unexpected error getting organization details:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message:
						'An unexpected error occurred while retrieving organization details'
				}
			});
		}
	}
);

/**
 * PUT /api/v1/organizations/:organizationId
 * Update organization (admins only)
 */
router.put(
	'/:organizationId',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId } = req.params;
			const { name, description } = req.body;

			// Validate input
			const updates = {};

			if (name !== undefined) {
				if (!name || name.trim().length === 0) {
					return res.status(400).json({
						success: false,
						error: {
							code: 'VALIDATION_ERROR',
							message: 'Organization name cannot be empty',
							details: [{ field: 'name', message: 'Name cannot be empty' }]
						}
					});
				}

				if (name.trim().length > 100) {
					return res.status(400).json({
						success: false,
						error: {
							code: 'VALIDATION_ERROR',
							message: 'Organization name is too long',
							details: [
								{
									field: 'name',
									message: 'Name must be 100 characters or less'
								}
							]
						}
					});
				}

				updates.name = name.trim();
			}

			if (description !== undefined) {
				updates.description = description?.trim() || null;
			}

			if (Object.keys(updates).length === 0) {
				return res.status(400).json({
					success: false,
					error: {
						code: 'VALIDATION_ERROR',
						message: 'No valid fields to update'
					}
				});
			}

			// Update organization
			updates.updated_at = new Date().toISOString();

			const { data: updatedOrg, error: updateError } = await supabase
				.from('organizations')
				.update(updates)
				.eq('id', organizationId)
				.select()
				.single();

			if (updateError) {
				logger.error('Failed to update organization:', updateError);

				if (
					updateError.message.includes('duplicate') ||
					updateError.message.includes('already exists')
				) {
					return res.status(409).json({
						success: false,
						error: {
							code: 'ORG_NAME_EXISTS',
							message: 'An organization with this name already exists'
						}
					});
				}

				return res.status(500).json({
					success: false,
					error: {
						code: 'ORG_UPDATE_FAILED',
						message: 'Failed to update organization'
					}
				});
			}

			res.status(200).json({
				success: true,
				data: {
					organization: {
						id: updatedOrg.id,
						name: updatedOrg.name,
						description: updatedOrg.description,
						createdAt: updatedOrg.created_at,
						updatedAt: updatedOrg.updated_at
					}
				}
			});
		} catch (error) {
			logger.error('Unexpected error updating organization:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message:
						'An unexpected error occurred while updating the organization'
				}
			});
		}
	}
);

/**
 * DELETE /api/v1/organizations/:organizationId
 * Delete organization (admins only)
 */
router.delete(
	'/:organizationId',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId } = req.params;

			// Check if organization has projects
			const { count: projectCount } = await supabase
				.from('projects')
				.select('*', { count: 'exact', head: true })
				.eq('organization_id', organizationId);

			if (projectCount > 0) {
				return res.status(409).json({
					success: false,
					error: {
						code: 'ORG_HAS_PROJECTS',
						message:
							'Cannot delete organization with existing projects. Please delete all projects first.'
					}
				});
			}

			// Check admin count
			const { data: admins, error: adminError } = await supabase
				.from('organization_members')
				.select('user_id')
				.eq('organization_id', organizationId)
				.eq('role', 'admin');

			if (adminError) {
				logger.error('Failed to check admin count:', adminError);
				return res.status(500).json({
					success: false,
					error: {
						code: 'ORG_DELETE_FAILED',
						message: 'Failed to verify organization state'
					}
				});
			}

			// Ensure user is the last admin
			if (admins.length > 1) {
				return res.status(409).json({
					success: false,
					error: {
						code: 'ORG_HAS_OTHER_ADMINS',
						message:
							'Cannot delete organization with other admins. Please remove other admins first.'
					}
				});
			}

			// Delete organization (cascade deletes members and invitations)
			const { error: deleteError } = await supabase
				.from('organizations')
				.delete()
				.eq('id', organizationId);

			if (deleteError) {
				logger.error('Failed to delete organization:', deleteError);
				return res.status(500).json({
					success: false,
					error: {
						code: 'ORG_DELETE_FAILED',
						message: 'Failed to delete organization'
					}
				});
			}

			res.status(200).json({
				success: true,
				data: {
					message: 'Organization has been permanently deleted'
				}
			});
		} catch (error) {
			logger.error('Unexpected error deleting organization:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message:
						'An unexpected error occurred while deleting the organization'
				}
			});
		}
	}
);

/**
 * POST /api/v1/organizations/:organizationId/invites
 * Invite new members (admins only)
 */
router.post(
	'/:organizationId/invites',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId } = req.params;
			const { email, role = 'member' } = req.body;
			const invitedBy = req.user.id;

			// Validate input
			if (!email || email.trim().length === 0) {
				return res.status(400).json({
					success: false,
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Email is required',
						details: [{ field: 'email', message: 'Email cannot be empty' }]
					}
				});
			}

			// Validate email format
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email.trim())) {
				return res.status(400).json({
					success: false,
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Invalid email format',
						details: [
							{
								field: 'email',
								message: 'Please provide a valid email address'
							}
						]
					}
				});
			}

			// Validate role
			if (!['admin', 'member'].includes(role)) {
				return res.status(400).json({
					success: false,
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Invalid role',
						details: [
							{
								field: 'role',
								message: 'Role must be either "admin" or "member"'
							}
						]
					}
				});
			}

			// Check if user is already a member
			const { data: existingMember } = await supabase
				.from('organization_members')
				.select('user_id')
				.eq('organization_id', organizationId)
				.eq(
					'user_id',
					(
						await supabase
							.from('profiles')
							.select('id')
							.eq('email', email.trim())
							.single()
					).data?.id
				);

			if (existingMember && existingMember.length > 0) {
				return res.status(409).json({
					success: false,
					error: {
						code: 'MEMBER_ALREADY_EXISTS',
						message: 'This user is already a member of the organization'
					}
				});
			}

			// Check for existing pending invitation
			const { data: existingInvitation } = await supabase
				.from('invitations')
				.select('id')
				.eq('organization_id', organizationId)
				.eq('email', email.trim())
				.is('accepted_at', null)
				.gte('expires_at', new Date().toISOString())
				.single();

			if (existingInvitation) {
				return res.status(409).json({
					success: false,
					error: {
						code: 'INVITATION_ALREADY_EXISTS',
						message: 'An invitation has already been sent to this email address'
					}
				});
			}

			// Generate secure token
			const crypto = await import('crypto');
			const token = crypto.randomBytes(32).toString('base64url');

			// Create invitation
			const { data: invitation, error: inviteError } = await supabase
				.from('invitations')
				.insert({
					organization_id: organizationId,
					email: email.trim(),
					role,
					invited_by: invitedBy,
					token,
					expires_at: new Date(
						Date.now() + 7 * 24 * 60 * 60 * 1000
					).toISOString() // 7 days from now
				})
				.select()
				.single();

			if (inviteError) {
				logger.error('Failed to create invitation:', inviteError);
				return res.status(500).json({
					success: false,
					error: {
						code: 'INVITATION_CREATE_FAILED',
						message: 'Failed to create invitation'
					}
				});
			}

			// Send invitation email
			try {
				const { sendInvitationEmail } = await import('../services/email.js');
				await sendInvitationEmail({
					to: email.trim(),
					organizationName:
						req.organizationMember.organization?.name || 'the organization',
					inviterName: req.user.profile?.full_name || req.user.email,
					role,
					inviteUrl: `${process.env.FRONTEND_URL}/invite/${token}`
				});
			} catch (emailError) {
				logger.error('Failed to send invitation email:', emailError);
				// Don't fail the request if email fails, invitation is still created
			}

			res.status(201).json({
				success: true,
				data: {
					invitation: {
						id: invitation.id,
						email: invitation.email,
						role: invitation.role,
						expiresAt: invitation.expires_at,
						inviteUrl: `${process.env.FRONTEND_URL}/invite/${token}`
					}
				}
			});
		} catch (error) {
			logger.error('Unexpected error creating invitation:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An unexpected error occurred while creating the invitation'
				}
			});
		}
	}
);

/**
 * GET /api/v1/organizations/:organizationId/invites
 * List pending invitations (admins only)
 */
router.get(
	'/:organizationId/invites',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId } = req.params;
			const page = parseInt(req.query.page) || 1;
			const limit = Math.min(parseInt(req.query.limit) || 20, 100);
			const offset = (page - 1) * limit;

			// Get total count of pending invitations
			const { count, error: countError } = await supabase
				.from('invitations')
				.select('*', { count: 'exact', head: true })
				.eq('organization_id', organizationId)
				.is('accepted_at', null)
				.gte('expires_at', new Date().toISOString());

			if (countError) {
				logger.error('Failed to count invitations:', countError);
				return res.status(500).json({
					success: false,
					error: {
						code: 'INVITATION_LIST_FAILED',
						message: 'Failed to retrieve invitations'
					}
				});
			}

			// Get pending invitations with inviter info
			const { data: invitations, error: listError } = await supabase
				.from('invitations')
				.select(
					`
        id,
        email,
        role,
        expires_at,
        created_at,
        inviter:profiles!invitations_invited_by_fkey (
          id,
          full_name,
          email
        )
      `
				)
				.eq('organization_id', organizationId)
				.is('accepted_at', null)
				.gte('expires_at', new Date().toISOString())
				.order('created_at', { ascending: false })
				.range(offset, offset + limit - 1);

			if (listError) {
				logger.error('Failed to list invitations:', listError);
				return res.status(500).json({
					success: false,
					error: {
						code: 'INVITATION_LIST_FAILED',
						message: 'Failed to retrieve invitations'
					}
				});
			}

			res.status(200).json({
				success: true,
				data: {
					invitations: invitations.map((inv) => ({
						id: inv.id,
						email: inv.email,
						role: inv.role,
						expiresAt: inv.expires_at,
						createdAt: inv.created_at,
						invitedBy: inv.inviter
							? {
									id: inv.inviter.id,
									name: inv.inviter.full_name,
									email: inv.inviter.email
								}
							: null
					}))
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
			logger.error('Unexpected error listing invitations:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An unexpected error occurred while retrieving invitations'
				}
			});
		}
	}
);

/**
 * DELETE /api/v1/organizations/:organizationId/invites/:inviteId
 * Cancel invitation (admins only)
 */
router.delete(
	'/:organizationId/invites/:inviteId',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId, inviteId } = req.params;

			// Verify invitation belongs to organization and is pending
			const { data: invitation, error: checkError } = await supabase
				.from('invitations')
				.select('id, email')
				.eq('id', inviteId)
				.eq('organization_id', organizationId)
				.is('accepted_at', null)
				.single();

			if (checkError || !invitation) {
				return res.status(404).json({
					success: false,
					error: {
						code: 'INVITATION_NOT_FOUND',
						message: 'Invitation not found or already accepted'
					}
				});
			}

			// Delete the invitation
			const { error: deleteError } = await supabase
				.from('invitations')
				.delete()
				.eq('id', inviteId);

			if (deleteError) {
				logger.error('Failed to delete invitation:', deleteError);
				return res.status(500).json({
					success: false,
					error: {
						code: 'INVITATION_DELETE_FAILED',
						message: 'Failed to cancel invitation'
					}
				});
			}

			res.status(200).json({
				success: true,
				data: {
					message: 'Invitation has been cancelled',
					email: invitation.email
				}
			});
		} catch (error) {
			logger.error('Unexpected error cancelling invitation:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message:
						'An unexpected error occurred while cancelling the invitation'
				}
			});
		}
	}
);

/**
 * POST /api/v1/organizations/:organizationId/invites/:inviteId/resend
 * Resend invitation email (admins only)
 */
router.post(
	'/:organizationId/invites/:inviteId/resend',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId, inviteId } = req.params;

			// Get invitation details
			const { data: invitation, error: inviteError } = await supabase
				.from('invitations')
				.select(
					`
					id,
					email,
					role,
					token,
					expires_at,
					accepted_at,
					inviter:invited_by (
						id,
						email,
						full_name
					),
					organization:organizations (
						id,
						name
					)
				`
				)
				.eq('id', inviteId)
				.eq('organization_id', organizationId)
				.single();

			if (inviteError || !invitation) {
				return res.status(404).json({
					success: false,
					error: {
						code: 'INVITATION_NOT_FOUND',
						message: 'Invitation not found'
					}
				});
			}

			// Check if already accepted
			if (invitation.accepted_at) {
				return res.status(409).json({
					success: false,
					error: {
						code: 'INVITATION_ALREADY_ACCEPTED',
						message: 'This invitation has already been accepted'
					}
				});
			}

			// Check if expired and generate new token if needed
			const isExpired = new Date(invitation.expires_at) < new Date();
			const newToken = isExpired
				? crypto.randomBytes(32).toString('hex')
				: invitation.token;
			const newExpiresAt = new Date();
			newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 7 days from now

			// Update invitation if expired
			if (isExpired) {
				const { error: updateError } = await supabase
					.from('invitations')
					.update({
						token: newToken,
						expires_at: newExpiresAt.toISOString(),
						updated_at: new Date().toISOString()
					})
					.eq('id', inviteId);

				if (updateError) {
					logger.error('Failed to update invitation:', updateError);
					return res.status(500).json({
						success: false,
						error: {
							code: 'INVITATION_UPDATE_FAILED',
							message: 'Failed to resend invitation'
						}
					});
				}
			}

			// Prepare email data
			const inviterName =
				invitation.inviter?.full_name ||
				invitation.inviter?.email ||
				'A team member';

			const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/invite/${newToken}`;

			// Send email
			try {
				await sendInvitationEmail({
					to: invitation.email,
					organizationName: invitation.organization.name,
					inviterName,
					inviteUrl,
					role: invitation.role,
					expiresAt: isExpired ? newExpiresAt : new Date(invitation.expires_at)
				});
			} catch (emailError) {
				logger.error('Failed to send invitation email:', emailError);
				// Don't fail the request if email fails
			}

			res.status(200).json({
				success: true,
				data: {
					message: 'Invitation has been resent',
					email: invitation.email,
					expiresAt: isExpired
						? newExpiresAt.toISOString()
						: invitation.expires_at
				}
			});
		} catch (error) {
			logger.error('Unexpected error resending invitation:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An unexpected error occurred while resending the invitation'
				}
			});
		}
	}
);

/**
 * POST /api/v1/organizations/:organizationId/invites/:token/accept
 * Accept invitation (public endpoint)
 */
router.post(
	'/:organizationId/invites/:token/accept',
	optionalAuth,
	async (req, res) => {
		try {
			const { organizationId, token } = req.params;

			// Verify invitation
			const { data: invitation, error: inviteError } = await supabase
				.from('invitations')
				.select(
					`
        id,
        email,
        role,
        expires_at,
        accepted_at,
        organization:organizations (
          id,
          name
        )
      `
				)
				.eq('token', token)
				.eq('organization_id', organizationId)
				.single();

			if (inviteError || !invitation) {
				return res.status(404).json({
					success: false,
					error: {
						code: 'INVITATION_NOT_FOUND',
						message: 'Invalid invitation token'
					}
				});
			}

			// Check if already accepted
			if (invitation.accepted_at) {
				return res.status(409).json({
					success: false,
					error: {
						code: 'INVITATION_ALREADY_ACCEPTED',
						message: 'This invitation has already been accepted'
					}
				});
			}

			// Check if expired
			if (new Date(invitation.expires_at) < new Date()) {
				return res.status(410).json({
					success: false,
					error: {
						code: 'INVITATION_EXPIRED',
						message: 'This invitation has expired'
					}
				});
			}

			// If user is not authenticated, redirect to signup
			if (!req.user) {
				return res.status(200).json({
					success: true,
					data: {
						requiresAuth: true,
						invitation: {
							email: invitation.email,
							organizationName: invitation.organization.name,
							role: invitation.role
						},
						redirectUrl: `/auth/signup?invite=${token}&email=${encodeURIComponent(invitation.email)}`
					}
				});
			}

			// Check if authenticated user's email matches invitation
			if (req.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
				return res.status(403).json({
					success: false,
					error: {
						code: 'EMAIL_MISMATCH',
						message: 'This invitation was sent to a different email address'
					}
				});
			}

			// Add user to organization
			const { error: memberError } = await supabase
				.from('organization_members')
				.insert({
					organization_id: organizationId,
					user_id: req.user.id,
					role: invitation.role
				});

			if (memberError) {
				// Check if user is already a member
				if (memberError.code === '23505') {
					return res.status(409).json({
						success: false,
						error: {
							code: 'ALREADY_MEMBER',
							message: 'You are already a member of this organization'
						}
					});
				}

				logger.error('Failed to add member:', memberError);
				return res.status(500).json({
					success: false,
					error: {
						code: 'MEMBER_ADD_FAILED',
						message: 'Failed to add member to organization'
					}
				});
			}

			// Mark invitation as accepted
			const { error: updateError } = await supabase
				.from('invitations')
				.update({ accepted_at: new Date().toISOString() })
				.eq('id', invitation.id);

			if (updateError) {
				logger.error('Failed to update invitation:', updateError);
				// Don't fail the request, member has been added
			}

			res.status(200).json({
				success: true,
				data: {
					message: 'Successfully joined the organization',
					organization: {
						id: invitation.organization.id,
						name: invitation.organization.name
					},
					membership: {
						role: invitation.role,
						joinedAt: new Date().toISOString()
					}
				}
			});
		} catch (error) {
			logger.error('Unexpected error accepting invitation:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An unexpected error occurred while accepting the invitation'
				}
			});
		}
	}
);

/**
 * GET /api/v1/organizations/:organizationId/members
 * List organization members (members can view)
 */
router.get(
	'/:organizationId/members',
	authMiddleware,
	requireRole('member'),
	async (req, res) => {
		try {
			const { organizationId } = req.params;
			const page = parseInt(req.query.page) || 1;
			const limit = Math.min(parseInt(req.query.limit) || 20, 100);
			const offset = (page - 1) * limit;
			const { role, search } = req.query;

			// Build query
			let query = supabase
				.from('organization_members')
				.select(
					`
        role,
        joined_at,
        profile:profiles!organization_members_user_id_fkey (
          id,
          full_name,
          avatar_url,
          email
        )
      `,
					{ count: 'exact' }
				)
				.eq('organization_id', organizationId);

			// Apply filters
			if (role && ['admin', 'member'].includes(role)) {
				query = query.eq('role', role);
			}

			if (search) {
				query = query.or(
					`full_name.ilike.%${search}%,email.ilike.%${search}%`,
					{ referencedTable: 'profiles' }
				);
			}

			// Get total count
			const { count } = await query;

			// Get paginated results
			const { data: members, error: listError } = await query
				.order('joined_at', { ascending: false })
				.range(offset, offset + limit - 1);

			if (listError) {
				logger.error('Failed to list members:', listError);
				return res.status(500).json({
					success: false,
					error: {
						code: 'MEMBER_LIST_FAILED',
						message: 'Failed to retrieve members'
					}
				});
			}

			// Get last activity for each member (simplified for now)
			const memberIds = members.map((m) => m.profile.id);
			const { data: lastActivities } = await supabase
				.from('audit_logs')
				.select('user_id, created_at')
				.in('user_id', memberIds)
				.order('created_at', { ascending: false });

			const activityMap = {};
			lastActivities?.forEach((activity) => {
				if (!activityMap[activity.user_id]) {
					activityMap[activity.user_id] = activity.created_at;
				}
			});

			res.status(200).json({
				success: true,
				data: {
					members: members.map((member) => ({
						id: member.profile.id,
						email: member.profile.email,
						name: member.profile.full_name,
						avatarUrl: member.profile.avatar_url,
						role: member.role,
						joinedAt: member.joined_at,
						lastActiveAt: activityMap[member.profile.id] || null,
						status: 'active'
					}))
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
			logger.error('Unexpected error listing members:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An unexpected error occurred while retrieving members'
				}
			});
		}
	}
);

/**
 * PUT /api/v1/organizations/:organizationId/members/:profileId
 * Update member role (admins only)
 */
router.put(
	'/:organizationId/members/:profileId',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId, profileId } = req.params;
			const { role } = req.body;

			// Validate role
			if (!role || !['admin', 'member'].includes(role)) {
				return res.status(400).json({
					success: false,
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Invalid role',
						details: [
							{
								field: 'role',
								message: 'Role must be either "admin" or "member"'
							}
						]
					}
				});
			}

			// Prevent self-demotion if last admin
			if (profileId === req.user.id && role !== 'admin') {
				const { count: adminCount } = await supabase
					.from('organization_members')
					.select('*', { count: 'exact', head: true })
					.eq('organization_id', organizationId)
					.eq('role', 'admin');

				if (adminCount === 1) {
					return res.status(409).json({
						success: false,
						error: {
							code: 'LAST_ADMIN',
							message: 'Cannot remove the last admin from the organization'
						}
					});
				}
			}

			// Update member role
			const { data: updatedMember, error: updateError } = await supabase
				.from('organization_members')
				.update({ role })
				.eq('organization_id', organizationId)
				.eq('user_id', profileId)
				.select(
					`
        role,
        profile:profiles!organization_members_user_id_fkey (
          id,
          full_name,
          email
        )
      `
				)
				.single();

			if (updateError) {
				if (updateError.code === 'PGRST116') {
					return res.status(404).json({
						success: false,
						error: {
							code: 'MEMBER_NOT_FOUND',
							message: 'Member not found in this organization'
						}
					});
				}

				logger.error('Failed to update member role:', updateError);
				return res.status(500).json({
					success: false,
					error: {
						code: 'MEMBER_UPDATE_FAILED',
						message: 'Failed to update member role'
					}
				});
			}

			res.status(200).json({
				success: true,
				data: {
					member: {
						id: updatedMember.profile.id,
						email: updatedMember.profile.email,
						fullName: updatedMember.profile.full_name,
						role: updatedMember.role,
						updatedAt: new Date().toISOString()
					}
				}
			});
		} catch (error) {
			logger.error('Unexpected error updating member role:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An unexpected error occurred while updating member role'
				}
			});
		}
	}
);

/**
 * DELETE /api/v1/organizations/:organizationId/members/:profileId
 * Remove member (admins only)
 */
router.delete(
	'/:organizationId/members/:profileId',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId, profileId } = req.params;

			// Prevent self-removal
			if (profileId === req.user.id) {
				return res.status(409).json({
					success: false,
					error: {
						code: 'CANNOT_REMOVE_SELF',
						message: 'You cannot remove yourself from the organization'
					}
				});
			}

			// Check if member exists
			const { data: member, error: checkError } = await supabase
				.from('organization_members')
				.select(
					`
        role,
        profile:profiles!organization_members_user_id_fkey (
          id,
          full_name,
          email
        )
      `
				)
				.eq('organization_id', organizationId)
				.eq('user_id', profileId)
				.single();

			if (checkError || !member) {
				return res.status(404).json({
					success: false,
					error: {
						code: 'MEMBER_NOT_FOUND',
						message: 'Member not found in this organization'
					}
				});
			}

			// Check if removing last admin
			if (member.role === 'admin') {
				const { count: adminCount } = await supabase
					.from('organization_members')
					.select('*', { count: 'exact', head: true })
					.eq('organization_id', organizationId)
					.eq('role', 'admin');

				if (adminCount === 1) {
					return res.status(409).json({
						success: false,
						error: {
							code: 'LAST_ADMIN',
							message: 'Cannot remove the last admin from the organization'
						}
					});
				}
			}

			// Remove member
			const { error: deleteError } = await supabase
				.from('organization_members')
				.delete()
				.eq('organization_id', organizationId)
				.eq('user_id', profileId);

			if (deleteError) {
				logger.error('Failed to remove member:', deleteError);
				return res.status(500).json({
					success: false,
					error: {
						code: 'MEMBER_REMOVE_FAILED',
						message: 'Failed to remove member from organization'
					}
				});
			}

			res.status(200).json({
				success: true,
				data: {
					message: 'Member has been removed from the organization',
					member: {
						id: member.profile.id,
						email: member.profile.email,
						fullName: member.profile.full_name
					}
				}
			});
		} catch (error) {
			logger.error('Unexpected error removing member:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An unexpected error occurred while removing member'
				}
			});
		}
	}
);

export default router;
