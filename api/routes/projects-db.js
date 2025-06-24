import express from 'express';
import { supabase } from '../db/supabase.js';
import { getProjectById, getAllProjects } from '../db/helpers.js';
import {
	generatePRDDialogueResponse,
	generatePRDDialogueResponseStream,
	generateFinalPRD
} from '../services/prd-dialogue.js';
import { authMiddleware, requireProjectAccess } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Debug log
console.log('Projects DB router loaded');

// GET /api/v1/projects - Get all projects for user's organizations
router.get('/', authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id;
		const { organizationId } = req.query;

		// Get user's organizations
		const { data: userOrgs, error: orgError } = await supabase
			.from('organization_members')
			.select('organization_id')
			.eq('user_id', userId);

		if (orgError) throw orgError;

		const orgIds = userOrgs.map((o) => o.organization_id);

		// Filter projects by organization
		let query = supabase
			.from('projects')
			.select(
				`
        *,
        organization:organizations (id, name),
        task_count:tasks(count)
      `
			)
			.in('organization_id', orgIds)
			.order('created_at', { ascending: false });

		if (organizationId) {
			// Verify user has access to this organization
			if (!orgIds.includes(organizationId)) {
				return res.status(403).json({
					success: false,
					error: {
						code: 'AUTHZ_PROJECT_ACCESS_DENIED',
						message: 'You do not have access to this organization'
					}
				});
			}
			query = query.eq('organization_id', organizationId);
		}

		const { data: projects, error } = await query;

		if (error) throw error;

		res.json({
			success: true,
			data: {
				projects
			}
		});
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

// GET /api/v1/projects/:id - Get project by ID (with access control)
router.get('/:id', authMiddleware, async (req, res) => {
	try {
		const projectId = req.params.id;
		const userId = req.user.id;

		// First get the project with organization info
		const { data: project, error: projectError } = await supabase
			.from('projects')
			.select(
				`
        *,
        organization:organizations(
          id,
          name
        ),
        tasks:tasks(count)
      `
			)
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

		// Check if user has access to the project's organization
		const { data: memberCheck, error: memberError } = await supabase
			.from('organization_members')
			.select('user_id')
			.eq('organization_id', project.organization_id)
			.eq('user_id', userId)
			.single();

		if (memberError || !memberCheck) {
			return res.status(403).json({
				success: false,
				error: {
					code: 'AUTHZ_PROJECT_ACCESS_DENIED',
					message: 'You do not have access to this project'
				}
			});
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

// POST /api/v1/projects - Create new project (authenticated users)
router.post('/', authMiddleware, async (req, res) => {
	try {
		const { name, projectPath, prdContent, deadline, organizationId } =
			req.body;
		const userId = req.user.id;

		if (!name || !projectPath || !organizationId) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'MISSING_REQUIRED_FIELDS',
					message: 'Name, projectPath, and organizationId are required'
				}
			});
		}

		// Verify user is a member of the organization
		const { data: membership, error: memberError } = await supabase
			.from('organization_members')
			.select('role')
			.eq('organization_id', organizationId)
			.eq('user_id', userId)
			.single();

		if (memberError || !membership) {
			return res.status(403).json({
				success: false,
				error: {
					code: 'AUTHZ_NOT_ORGANIZATION_MEMBER',
					message: 'You are not a member of this organization'
				}
			});
		}

		// Create project in database with organization
		const { data: project, error } = await supabase
			.from('projects')
			.insert({
				name,
				project_path: projectPath,
				prd_content: prdContent,
				deadline,
				status: 'active',
				organization_id: organizationId,
				created_by: userId
			})
			.select()
			.single();

		if (error) throw error;

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

// PUT /api/v1/projects/:id - Update project (project members only)
router.put('/:id', authMiddleware, requireProjectAccess, async (req, res) => {
	try {
		const { name, deadline, description } = req.body;

		const updates = {};
		if (name !== undefined) updates.name = name;
		if (deadline !== undefined) updates.deadline = deadline;
		if (description !== undefined) updates.description = description;

		const { data, error } = await supabase
			.from('projects')
			.update(updates)
			.eq('id', req.params.id)
			.select()
			.single();

		if (error) throw error;

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

// DELETE /api/v1/projects/:id - Delete project (organization admins only)
router.delete(
	'/:id',
	authMiddleware,
	requireProjectAccess,
	async (req, res) => {
		try {
			// Check if user is organization admin
			if (req.organizationMember.role !== 'admin') {
				return res.status(403).json({
					success: false,
					error: {
						code: 'AUTHZ_REQUIRES_ADMIN',
						message: 'Only organization admins can delete projects'
					}
				});
			}

			const { error } = await supabase
				.from('projects')
				.delete()
				.eq('id', req.params.id);

			if (error) throw error;

			res.json({
				success: true,
				data: {
					message: 'Project deleted successfully'
				}
			});
		} catch (error) {
			console.error('Error deleting project:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'DELETE_PROJECT_ERROR',
					message: 'Failed to delete project',
					details: error.message
				}
			});
		}
	}
);

// POST /api/v1/projects/ai-dialogue - AI dialogue for project creation (authenticated)
router.post('/ai-dialogue', authMiddleware, async (req, res) => {
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
		await supabase.from('ai_dialogue_messages').insert({
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

		const { aiResponse, prdQualityScore, missingRequirements, sectionScores } =
			dialogueResult;

		// Store AI response
		await supabase.from('ai_dialogue_messages').insert({
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

// POST /api/v1/projects/ai-dialogue/stream - Stream AI dialogue response
console.log('Registering /ai-dialogue/stream endpoint');
router.post('/ai-dialogue/stream', authMiddleware, async (req, res) => {
	console.log('AI dialogue stream endpoint hit');
	try {
		const { sessionId, message } = req.body;

		if (!sessionId || !message) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'MISSING_REQUIRED_FIELDS',
					message: 'sessionId and message are required'
				}
			});
		}

		// Set SSE headers
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');

		// CORS headers for SSE
		res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
		res.setHeader('Access-Control-Allow-Credentials', 'true');

		// Store user message
		await supabase.from('ai_dialogue_messages').insert({
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

		// Generate AI response with streaming
		let fullResponse = '';
		const stream = await generatePRDDialogueResponseStream({
			message,
			sessionData: session,
			messages: messageHistory || [],
			initialPRD: initialPRDData?.prd_content || ''
		});

		for await (const chunk of stream) {
			if (chunk.type === 'content') {
				fullResponse += chunk.content;
				res.write(
					`data: ${JSON.stringify({ type: 'content', content: chunk.content })}\n\n`
				);
			}
		}

		// Store complete AI response
		await supabase.from('ai_dialogue_messages').insert({
			session_id: sessionId,
			role: 'ai',
			content: fullResponse
		});

		// Send completion event
		res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
		res.end();
	} catch (error) {
		console.error('AI dialogue stream error:', error);
		if (!res.headersSent) {
			res.write(
				`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
			);
		}
		res.end();
	}
});

// POST /api/v1/projects/:projectId/prd/finalize - Generate final PRD (project members)
router.post(
	'/:projectId/prd/finalize',
	authMiddleware,
	requireProjectAccess,
	async (req, res) => {
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
	}
);

// POST /api/v1/projects/initialize - Initialize project (legacy support - authenticated)
router.post('/initialize', authMiddleware, async (req, res) => {
	try {
		const { projectPath, projectName, organizationId } = req.body;
		const userId = req.user.id;

		if (!projectPath || !projectName || !organizationId) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'MISSING_REQUIRED_FIELDS',
					message: 'projectPath, projectName, and organizationId are required'
				}
			});
		}

		// Verify user is a member of the organization
		const { data: membership, error: memberError } = await supabase
			.from('organization_members')
			.select('role')
			.eq('organization_id', organizationId)
			.eq('user_id', userId)
			.single();

		if (memberError || !membership) {
			return res.status(403).json({
				success: false,
				error: {
					code: 'AUTHZ_NOT_ORGANIZATION_MEMBER',
					message: 'You are not a member of this organization'
				}
			});
		}

		// Create project in database with organization
		const { data: project, error } = await supabase
			.from('projects')
			.insert({
				name: projectName,
				project_path: projectPath,
				status: 'active',
				organization_id: organizationId,
				created_by: userId
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
