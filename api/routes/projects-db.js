import express from 'express';
import { supabase } from '../db/supabase.js';
import { getProjectById, getAllProjects } from '../db/helpers.js';
import { 
  getProjectByIdWithOrgCheck, 
  getAllProjectsForUser,
  createProjectWithOrg,
  updateProjectWithOrgCheck,
  deleteProjectWithOrgCheck
} from '../db/org-helpers.js';
import { generatePRDDialogueResponse, generateFinalPRD } from '../services/prd-dialogue.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/v1/projects - Get all projects
router.get('/', async (req, res) => {
  try {
    // If user is authenticated, get their projects
    if (req.user && req.user.id) {
      const projects = await getAllProjectsForUser(req.user.id);
      
      res.json({
        success: true,
        data: {
          projects
        }
      });
    } else {
      // Fallback for backward compatibility (will be removed)
      logger.warn('Unauthenticated project access - using legacy mode');
      const projects = await getAllProjects();
      
      res.json({
        success: true,
        data: {
          projects
        }
      });
    }
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_PROJECTS_ERROR',
        message: 'Failed to fetch projects',
        details: error.message
      }
    });
  }
});

// GET /api/v1/projects/:id - Get project by ID
router.get('/:id', async (req, res) => {
  try {
    let project;
    
    // If user is authenticated, check organization access
    if (req.user && req.user.id) {
      project = await getProjectByIdWithOrgCheck(req.params.id, req.user.id);
    } else {
      // Fallback for backward compatibility
      logger.warn('Unauthenticated project access - using legacy mode');
      project = await getProjectById(req.params.id);
    }
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found'
        }
      });
    }
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_PROJECT_ERROR',
        message: 'Failed to fetch project',
        details: error.message
      }
    });
  }
});

// POST /api/v1/projects - Create new project
router.post('/', async (req, res) => {
  try {
    const { name, projectPath, prdContent, deadline, organizationId } = req.body;
    
    if (!name || !projectPath) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Name and projectPath are required'
        }
      });
    }
    
    let project;
    
    // If user is authenticated, require organization
    if (req.user && req.user.id) {
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ORGANIZATION_REQUIRED',
            message: 'Organization ID is required for authenticated users'
          }
        });
      }
      
      // Create project with organization
      project = await createProjectWithOrg({
        name,
        project_path: projectPath,
        prd_content: prdContent,
        deadline,
        status: 'active'
      }, organizationId, req.user.id);
    } else {
      // Legacy mode for backward compatibility
      logger.warn('Creating project without organization - legacy mode');
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name,
          project_path: projectPath,
          prd_content: prdContent,
          deadline,
          status: 'active'
        })
        .select()
        .single();
      
      if (error) throw error;
      project = data;
    }
    
    // Create AI dialogue session
    const { data: session, error: sessionError } = await supabase
      .from('ai_dialogue_sessions')
      .insert({
        project_id: project.id,
        session_data: {},
        prd_quality_score: 0
      })
      .select()
      .single();
    
    if (sessionError) throw sessionError;
    
    // Skip creating project directory for database-only version
    // Legacy file system support is no longer needed
    
    res.json({
      success: true,
      data: {
        projectId: project.id,
        sessionId: session.id
      }
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_PROJECT_ERROR',
        message: 'Failed to create project',
        details: error.message
      }
    });
  }
});

// PUT /api/v1/projects/:id - Update project
router.put('/:id', async (req, res) => {
  try {
    const { name, deadline, description } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (deadline !== undefined) updates.deadline = deadline;
    if (description !== undefined) updates.description = description;
    
    let data;
    
    // If user is authenticated, check organization access
    if (req.user && req.user.id) {
      data = await updateProjectWithOrgCheck(req.params.id, updates, req.user.id);
    } else {
      // Legacy mode
      logger.warn('Updating project without auth check - legacy mode');
      const result = await supabase
        .from('projects')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single();
      
      if (result.error) throw result.error;
      data = result.data;
    }
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found'
        }
      });
    }
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_PROJECT_ERROR',
        message: 'Failed to update project',
        details: error.message
      }
    });
  }
});

// DELETE /api/v1/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  try {
    // If user is authenticated, check admin access
    if (req.user && req.user.id) {
      await deleteProjectWithOrgCheck(req.params.id, req.user.id);
    } else {
      // Legacy mode
      logger.warn('Deleting project without auth check - legacy mode');
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', req.params.id);
      
      if (error) throw error;
    }
    
    res.json({
      success: true,
      data: {
        message: 'Project deleted successfully'
      }
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    
    if (error.message && error.message.includes('Only organization admins')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: error.message
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_PROJECT_ERROR',
        message: 'Failed to delete project',
        details: error.message
      }
    });
  }
});

// POST /api/v1/projects/ai-dialogue - AI dialogue for project creation
router.post('/ai-dialogue', async (req, res) => {
  try {
    const { sessionId, message, mode } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'sessionId and message are required'
        }
      });
    }
    
    // Store user message
    await supabase
      .from('ai_dialogue_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message
      });
    
    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('ai_dialogue_sessions')
      .select('*, project:projects(*)')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) throw sessionError;
    
    // Get initial PRD from session
    const { data: initialPRDData } = await supabase
      .from('projects')
      .select('prd_content')
      .eq('id', session.project.id)
      .single();
    
    // Get conversation history
    const { data: messageHistory } = await supabase
      .from('ai_dialogue_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    // Generate AI response using the dialogue service
    const dialogueResult = await generatePRDDialogueResponse({
      message,
      mode,
      sessionData: session,
      messages: messageHistory || [],
      initialPRD: initialPRDData?.prd_content || ''
    });
    
    const { aiResponse, prdQualityScore, missingRequirements, sectionScores } = dialogueResult;
    
    // Store AI response
    await supabase
      .from('ai_dialogue_messages')
      .insert({
        session_id: sessionId,
        role: 'ai',
        content: aiResponse
      });
    
    // Update session with quality score
    await supabase
      .from('ai_dialogue_sessions')
      .update({
        prd_quality_score: prdQualityScore,
        session_data: { missingRequirements, sectionScores }
      })
      .eq('id', sessionId);
    
    res.json({
      success: true,
      data: {
        aiResponse,
        prdQualityScore,
        missingRequirements,
        sectionScores
      }
    });
  } catch (error) {
    console.error('Error in AI dialogue:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AI_DIALOGUE_ERROR',
        message: 'Failed to process AI dialogue',
        details: error.message
      }
    });
  }
});

// POST /api/v1/projects/:projectId/prd/finalize - Generate final PRD in markdown format
router.post('/:projectId/prd/finalize', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: 'sessionId is required'
        }
      });
    }
    
    // Get project initial PRD
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('prd_content')
      .eq('id', projectId)
      .single();
    
    if (projectError) throw projectError;
    
    // Get all messages from the session
    const { data: messages, error: messagesError } = await supabase
      .from('ai_dialogue_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (messagesError) throw messagesError;
    
    // Generate final PRD
    const finalPRD = await generateFinalPRD(
      project.prd_content || '',
      messages || []
    );
    
    // Update project with final PRD
    await supabase
      .from('projects')
      .update({ 
        prd_content: finalPRD,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);
    
    res.json({
      success: true,
      data: {
        prd: finalPRD,
        format: 'markdown'
      }
    });
  } catch (error) {
    console.error('Error generating final PRD:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GENERATE_PRD_ERROR',
        message: 'Failed to generate final PRD',
        details: error.message
      }
    });
  }
});

// POST /api/v1/projects/initialize - Initialize project (legacy support)
router.post('/initialize', async (req, res) => {
  try {
    const { projectPath, projectName } = req.body;
    
    if (!projectPath || !projectName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'projectPath and projectName are required'
        }
      });
    }
    
    // Create project in database
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        project_path: projectPath,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Skip creating project directory for database-only version
    // Legacy file system support is no longer needed
    
    res.json({
      success: true,
      data: {
        projectId: project.id
      }
    });
  } catch (error) {
    console.error('Error initializing project:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INITIALIZE_PROJECT_ERROR',
        message: 'Failed to initialize project',
        details: error.message
      }
    });
  }
});

export default router;