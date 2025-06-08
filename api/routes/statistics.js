import express from 'express';
import { supabase } from '../db/supabase.js';
import { getProjectStatistics } from '../db/helpers.js';
import { authMiddleware, requireProjectAccess } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// GET /api/v1/projects/:id/statistics - Get project statistics (project members only)
router.get('/projects/:id/statistics', authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    
    // Verify user has access to the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        organization_id,
        organization:organizations!inner(
          members:organization_members!inner(
            user_id
          )
        )
      `)
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
    
    const hasAccess = project.organization.members.some(m => m.user_id === userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHZ_PROJECT_ACCESS_DENIED',
          message: 'You do not have access to this project'
        }
      });
    }
    
    const statistics = await getProjectStatistics(projectId);
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching project statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_STATISTICS_ERROR',
        message: 'Failed to fetch project statistics',
        details: error.message
      }
    });
  }
});

// GET /api/v1/projects/:id/gantt-data - Get Gantt chart data (project members only)
router.get('/projects/:id/gantt-data', authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    
    // Verify user has access to the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        organization_id,
        organization:organizations!inner(
          members:organization_members!inner(
            user_id
          )
        )
      `)
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
    
    const hasAccess = project.organization.members.some(m => m.user_id === userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHZ_PROJECT_ACCESS_DENIED',
          message: 'You do not have access to this project'
        }
      });
    }
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        priority,
        deadline,
        created_at,
        dependencies:task_dependencies!task_dependencies_task_id_fkey (
          depends_on_task_id
        )
      `)
      .eq('project_id', req.params.id)
      .order('id', { ascending: true });
    
    if (error) throw error;
    
    // Transform data for Gantt chart
    const ganttData = tasks?.map(task => {
      // Calculate estimated duration based on task creation and deadline
      const startDate = new Date(task.created_at);
      const endDate = task.deadline ? new Date(task.deadline) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
      
      // Calculate progress based on status
      let progress = 0;
      if (task.status === 'completed' || task.status === 'done') {
        progress = 100;
      } else if (task.status === 'in-progress') {
        progress = 50;
      } else if (task.status === 'review') {
        progress = 75;
      }
      
      return {
        id: task.id,
        title: task.title,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        progress,
        dependencies: task.dependencies?.map(d => d.depends_on_task_id) || []
      };
    }) || [];
    
    res.json({
      success: true,
      data: {
        tasks: ganttData
      }
    });
  } catch (error) {
    console.error('Error fetching Gantt data:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_GANTT_DATA_ERROR',
        message: 'Failed to fetch Gantt chart data',
        details: error.message
      }
    });
  }
});

// GET /api/v1/projects/:id/dependency-graph - Get dependency graph data (project members only)
router.get('/projects/:id/dependency-graph', authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    
    // Verify user has access to the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        organization_id,
        organization:organizations!inner(
          members:organization_members!inner(
            user_id
          )
        )
      `)
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
    
    const hasAccess = project.organization.members.some(m => m.user_id === userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHZ_PROJECT_ACCESS_DENIED',
          message: 'You do not have access to this project'
        }
      });
    }
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        priority,
        dependencies:task_dependencies!task_dependencies_task_id_fkey (
          depends_on_task_id
        )
      `)
      .eq('project_id', req.params.id);
    
    if (error) throw error;
    
    // Create nodes for each task
    const nodes = tasks?.map((task, index) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      x: (index % 4) * 200 + 100, // Simple grid layout
      y: Math.floor(index / 4) * 150 + 100
    })) || [];
    
    // Create edges for dependencies
    const edges = [];
    tasks?.forEach(task => {
      task.dependencies?.forEach(dep => {
        edges.push({
          from: dep.depends_on_task_id,
          to: task.id,
          type: 'dependency'
        });
      });
    });
    
    res.json({
      success: true,
      data: {
        nodes,
        edges
      }
    });
  } catch (error) {
    console.error('Error fetching dependency graph:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_DEPENDENCY_GRAPH_ERROR',
        message: 'Failed to fetch dependency graph data',
        details: error.message
      }
    });
  }
});

// POST /api/v1/tasks/analyze-complexity - Analyze task complexity (authenticated)
router.post('/tasks/analyze-complexity', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.body;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TASK_ID',
          message: 'taskId is required'
        }
      });
    }
    
    const userId = req.user.id;
    
    // Get task details with access check
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        subtasks (id),
        dependencies:task_dependencies!task_dependencies_task_id_fkey (
          depends_on_task_id
        ),
        project:projects!inner(
          organization:organizations!inner(
            members:organization_members!inner(
              user_id
            )
          )
        )
      `)
      .eq('id', taskId)
      .single();
    
    if (error) throw error;
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found'
        }
      });
    }
    
    // Check if user has access to the task's project
    const hasAccess = task.project.organization.members.some(m => m.user_id === userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHZ_TASK_ACCESS_DENIED',
          message: 'You do not have access to this task'
        }
      });
    }
    
    // Calculate complexity score
    let complexityScore = 2.5; // Base score
    
    // Factor 1: Number of subtasks
    const subtaskCount = task.subtasks?.length || 0;
    if (subtaskCount > 5) complexityScore += 1;
    if (subtaskCount > 10) complexityScore += 1;
    
    // Factor 2: Number of dependencies
    const dependencyCount = task.dependencies?.length || 0;
    if (dependencyCount > 2) complexityScore += 0.5;
    if (dependencyCount > 5) complexityScore += 0.5;
    
    // Factor 3: Description length
    const descriptionLength = (task.description?.length || 0) + (task.details?.length || 0);
    if (descriptionLength > 500) complexityScore += 0.5;
    if (descriptionLength > 1000) complexityScore += 0.5;
    
    // Factor 4: Priority
    if (task.priority === 'high') complexityScore += 0.5;
    
    // Cap at 5
    complexityScore = Math.min(complexityScore, 5);
    
    // Calculate recommended subtasks
    let recommendedSubtasks = 3;
    if (complexityScore > 3) recommendedSubtasks = 5;
    if (complexityScore > 4) recommendedSubtasks = 8;
    
    // Estimate hours
    const estimatedHours = Math.round(complexityScore * 4);
    
    // Identify risk factors
    const riskFactors = [];
    if (dependencyCount > 3) riskFactors.push("多数の依存関係");
    if (subtaskCount === 0 && complexityScore > 3) riskFactors.push("未分解の複雑なタスク");
    if (task.priority === 'high' && dependencyCount > 0) riskFactors.push("高優先度かつ依存関係あり");
    
    // Generate suggestions
    const suggestions = [];
    if (subtaskCount === 0 && complexityScore > 2) {
      suggestions.push("このタスクをサブタスクに分解することを推奨します");
    }
    if (dependencyCount > 5) {
      suggestions.push("依存関係を見直して簡素化を検討してください");
    }
    if (complexityScore > 4) {
      suggestions.push("段階的な実装アプローチを採用することを推奨します");
    }
    
    res.json({
      success: true,
      data: {
        taskId,
        complexityScore: Math.round(complexityScore * 10) / 10,
        recommendedSubtasks,
        estimatedHours,
        riskFactors,
        suggestions
      }
    });
  } catch (error) {
    console.error('Error analyzing task complexity:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYZE_COMPLEXITY_ERROR',
        message: 'Failed to analyze task complexity',
        details: error.message
      }
    });
  }
});

// GET /api/v1/tasks/complexity-report - Get complexity report (authenticated)
router.get('/tasks/complexity-report', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.query;
    const userId = req.user.id;
    
    // If projectId is provided, verify access
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select(`
          organization_id,
          organization:organizations!inner(
            members:organization_members!inner(
              user_id
            )
          )
        `)
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
      
      const hasAccess = project.organization.members.some(m => m.user_id === userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTHZ_PROJECT_ACCESS_DENIED',
            message: 'You do not have access to this project'
          }
        });
      }
    }
    
    let query = supabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        priority,
        description,
        details,
        subtasks (id),
        dependencies:task_dependencies!task_dependencies_task_id_fkey (
          depends_on_task_id
        ),
        project:projects!inner(
          id,
          organization:organizations!inner(
            members:organization_members!inner(
              user_id
            )
          )
        )
      `);
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    } else {
      // If no projectId, filter by user's organizations
      query = query.eq('project.organization.members.user_id', userId);
    }
    
    const { data: tasks, error } = await query;
    
    if (error) throw error;
    
    // Calculate complexity for each task
    const report = tasks?.map(task => {
      let complexityScore = 2.5;
      
      const subtaskCount = task.subtasks?.length || 0;
      if (subtaskCount > 5) complexityScore += 1;
      if (subtaskCount > 10) complexityScore += 1;
      
      const dependencyCount = task.dependencies?.length || 0;
      if (dependencyCount > 2) complexityScore += 0.5;
      if (dependencyCount > 5) complexityScore += 0.5;
      
      const descriptionLength = (task.description?.length || 0) + (task.details?.length || 0);
      if (descriptionLength > 500) complexityScore += 0.5;
      if (descriptionLength > 1000) complexityScore += 0.5;
      
      if (task.priority === 'high') complexityScore += 0.5;
      
      complexityScore = Math.min(complexityScore, 5);
      
      return {
        taskId: task.id,
        title: task.title,
        status: task.status,
        complexityScore: Math.round(complexityScore * 10) / 10,
        factors: {
          subtaskCount,
          dependencyCount,
          descriptionLength,
          priority: task.priority
        }
      };
    }) || [];
    
    // Calculate summary statistics
    const avgComplexity = report.length > 0
      ? report.reduce((sum, t) => sum + t.complexityScore, 0) / report.length
      : 0;
    
    const complexityDistribution = {
      low: report.filter(t => t.complexityScore <= 2).length,
      medium: report.filter(t => t.complexityScore > 2 && t.complexityScore <= 3.5).length,
      high: report.filter(t => t.complexityScore > 3.5 && t.complexityScore <= 4.5).length,
      veryHigh: report.filter(t => t.complexityScore > 4.5).length
    };
    
    res.json({
      success: true,
      data: {
        tasks: report,
        summary: {
          totalTasks: report.length,
          averageComplexity: Math.round(avgComplexity * 10) / 10,
          complexityDistribution
        }
      }
    });
  } catch (error) {
    console.error('Error generating complexity report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'COMPLEXITY_REPORT_ERROR',
        message: 'Failed to generate complexity report',
        details: error.message
      }
    });
  }
});

export default router;