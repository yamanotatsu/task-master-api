/**
 * Simple task update service for API
 * Provides direct task updates without AI
 */

import fs from 'fs';
import path from 'path';

/**
 * Update task properties directly without AI
 */
export function updateTaskSimple(tasksJsonPath, taskId, updates) {
  try {
    // Read tasks
    const data = JSON.parse(fs.readFileSync(tasksJsonPath, 'utf8'));
    
    // Find task
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task with ID ${taskId} not found`
        }
      };
    }
    
    // Apply updates
    const allowedFields = ['title', 'description', 'priority', 'details', 'testStrategy'];
    let updated = false;
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        task[field] = updates[field];
        updated = true;
      }
    }
    
    if (!updated) {
      return {
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: 'No valid fields to update'
        }
      };
    }
    
    // Save tasks
    fs.writeFileSync(tasksJsonPath, JSON.stringify(data, null, 2));
    
    return {
      success: true,
      task,
      message: `Task #${taskId} updated successfully`
    };
    
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error.message
      }
    };
  }
}

/**
 * Update task status
 */
export function updateTaskStatus(tasksJsonPath, taskId, status) {
  try {
    // Read tasks
    const data = JSON.parse(fs.readFileSync(tasksJsonPath, 'utf8'));
    
    // Find task
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) {
      return {
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task with ID ${taskId} not found`
        }
      };
    }
    
    // Validate status
    const validStatuses = ['pending', 'in-progress', 'completed', 'blocked'];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`
        }
      };
    }
    
    // Update status
    task.status = status;
    
    // Save tasks
    fs.writeFileSync(tasksJsonPath, JSON.stringify(data, null, 2));
    
    return {
      success: true,
      task,
      message: `Task #${taskId} status updated to ${status}`
    };
    
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error.message
      }
    };
  }
}