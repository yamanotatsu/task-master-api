import express from 'express';
import { supabase } from '../db/supabase.js';

const router = express.Router();

// GET /api/v1/members - Get all members
router.get('/', async (req, res) => {
  try {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: {
        members
      }
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_MEMBERS_ERROR',
        message: 'Failed to fetch members',
        details: error.message
      }
    });
  }
});

// GET /api/v1/members/:id - Get member by ID
router.get('/:id', async (req, res) => {
  try {
    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    
    if (!member) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found'
        }
      });
    }
    
    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_MEMBER_ERROR',
        message: 'Failed to fetch member',
        details: error.message
      }
    });
  }
});

// POST /api/v1/members - Create new member
router.post('/', async (req, res) => {
  try {
    const { name, email, role = 'developer' } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Name and email are required'
        }
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format'
        }
      });
    }
    
    // Validate role
    const validRoles = ['admin', 'developer', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: 'Invalid role. Must be one of: admin, developer, viewer'
        }
      });
    }
    
    const { data: member, error } = await supabase
      .from('members')
      .insert({
        name,
        email,
        role,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'A member with this email already exists'
          }
        });
      }
      throw error;
    }
    
    res.status(201).json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_MEMBER_ERROR',
        message: 'Failed to create member',
        details: error.message
      }
    });
  }
});

// PUT /api/v1/members/:id - Update member
router.put('/:id', async (req, res) => {
  try {
    const { name, email, role, status, avatar_url } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Invalid email format'
          }
        });
      }
      updates.email = email;
    }
    if (role !== undefined) {
      // Validate role
      const validRoles = ['admin', 'developer', 'viewer'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: 'Invalid role. Must be one of: admin, developer, viewer'
          }
        });
      }
      updates.role = role;
    }
    if (status !== undefined) {
      // Validate status
      const validStatuses = ['active', 'inactive'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Invalid status. Must be one of: active, inactive'
          }
        });
      }
      updates.status = status;
    }
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: 'No valid fields to update'
        }
      });
    }
    
    const { data: member, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'A member with this email already exists'
          }
        });
      }
      throw error;
    }
    
    if (!member) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found'
        }
      });
    }
    
    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_MEMBER_ERROR',
        message: 'Failed to update member',
        details: error.message
      }
    });
  }
});

// DELETE /api/v1/members/:id - Delete member
router.delete('/:id', async (req, res) => {
  try {
    // First check if member has any assigned tasks
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('id')
      .eq('assignee_id', req.params.id)
      .limit(1);
    
    if (taskError) throw taskError;
    
    if (tasks && tasks.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MEMBER_HAS_TASKS',
          message: 'Cannot delete member with assigned tasks'
        }
      });
    }
    
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: {
        message: 'Member deleted successfully'
      }
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_MEMBER_ERROR',
        message: 'Failed to delete member',
        details: error.message
      }
    });
  }
});

export default router;