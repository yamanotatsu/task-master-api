import express from 'express';
import { createTask } from '../db/helpers.js';
import { supabase } from '../db/supabase.js';
import { parsePRDContent } from '../services/prd-parser.js';

const router = express.Router();

// POST /api/v1/generate-tasks-from-prd
router.post('/', async (req, res) => {
  try {
    const { 
      prd_content, 
      target_task_count = 10, 
      use_research_mode = false,
      projectId 
    } = req.body;

    if (!prd_content) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PRD_CONTENT',
          message: 'prd_content is required'
        }
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PROJECT_ID',
          message: 'projectId is required'
        }
      });
    }

    // Generate tasks from PRD using new Supabase-based service
    const startTime = Date.now();
    const result = await parsePRDContent(prd_content, {
      targetTaskCount: target_task_count,
      researchMode: use_research_mode,
      projectName: req.body.projectName || 'Generated Project'
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: result.error || 'Failed to generate tasks from PRD'
        }
      });
    }

    // Save generated tasks to database
    const savedTasks = [];
    for (const task of result.tasks) {
      const taskData = {
        project_id: projectId,
        title: task.title,
        description: task.description,
        details: task.details,
        test_strategy: task.testStrategy,
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        dependencies: task.dependencies || []
      };

      try {
        const savedTask = await createTask(taskData);
        savedTasks.push({
          id: savedTask.id,
          title: savedTask.title,
          description: savedTask.description,
          details: savedTask.details,
          testStrategy: savedTask.test_strategy,
          priority: savedTask.priority,
          dependencies: savedTask.dependencies,
          status: savedTask.status,
          subtasks: savedTask.subtasks || []
        });
      } catch (error) {
        console.error('Error saving task:', error);
        // Continue with other tasks even if one fails
      }
    }

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        tasks: savedTasks,
        metadata: {
          projectName: result.projectInfo?.name || 'Generated Project',
          totalTasks: savedTasks.length,
          generatedAt: new Date().toISOString()
        },
        telemetryData: {
          modelUsed: result.telemetry?.model || 'unknown',
          totalTokens: result.telemetry?.tokens || 0,
          totalCost: result.telemetry?.cost || 0,
          processingTime
        }
      }
    });
  } catch (error) {
    console.error('Error generating tasks from PRD:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GENERATE_TASKS_ERROR',
        message: 'Failed to generate tasks from PRD',
        details: error.message
      }
    });
  }
});

export default router;