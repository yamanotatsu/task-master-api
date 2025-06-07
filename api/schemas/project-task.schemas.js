/**
 * Project and Task validation schemas
 * Defines validation rules for project and task-related endpoints
 */

export const projectTaskSchemas = {
  // Create project schema
  createProject: {
    body: {
      name: {
        type: 'alphanumeric',
        required: true,
        sanitizer: 'html',
        options: {
          allowSpaces: true,
          allowDashes: true,
          minLength: 3,
          maxLength: 100
        },
        message: 'Project name must be 3-100 characters'
      },
      description: {
        type: 'text',
        required: false,
        sanitizer: 'html',
        options: {
          maxLength: 1000
        },
        message: 'Description must not exceed 1000 characters'
      },
      organizationId: {
        type: 'uuid',
        required: true,
        message: 'Valid organization ID is required'
      },
      status: {
        type: 'enum',
        required: false,
        options: {
          values: ['planning', 'active', 'on_hold', 'completed', 'cancelled']
        },
        message: 'Invalid project status'
      },
      priority: {
        type: 'enum',
        required: false,
        options: {
          values: ['low', 'medium', 'high', 'urgent']
        },
        message: 'Invalid priority level'
      },
      startDate: {
        type: 'date',
        required: false,
        options: {
          format: 'YYYY-MM-DD'
        },
        message: 'Invalid start date'
      },
      endDate: {
        type: 'date',
        required: false,
        options: {
          format: 'YYYY-MM-DD'
        },
        message: 'Invalid end date'
      },
      budget: {
        type: 'number',
        required: false,
        options: {
          min: 0,
          max: 999999999
        },
        message: 'Budget must be a positive number'
      },
      visibility: {
        type: 'enum',
        required: false,
        options: {
          values: ['private', 'organization', 'public']
        },
        message: 'Invalid visibility setting'
      },
      tags: {
        type: 'array',
        required: false,
        maxItems: 20,
        itemType: 'text',
        itemOptions: {
          maxLength: 50,
          pattern: /^[a-zA-Z0-9-]+$/
        },
        message: 'Tags must be alphanumeric with dashes, max 50 chars each'
      },
      teamMembers: {
        type: 'array',
        required: false,
        maxItems: 100,
        itemType: 'uuid',
        message: 'Team members must be valid user IDs'
      }
    }
  },

  // Update project schema
  updateProject: {
    params: {
      projectId: {
        type: 'uuid',
        required: true,
        message: 'Valid project ID is required'
      }
    },
    body: {
      // Same as create but all fields optional
      name: {
        type: 'alphanumeric',
        required: false,
        sanitizer: 'html',
        options: {
          allowSpaces: true,
          allowDashes: true,
          minLength: 3,
          maxLength: 100
        },
        message: 'Project name must be 3-100 characters'
      },
      description: {
        type: 'text',
        required: false,
        sanitizer: 'html',
        options: {
          maxLength: 1000
        },
        message: 'Description must not exceed 1000 characters'
      },
      status: {
        type: 'enum',
        required: false,
        options: {
          values: ['planning', 'active', 'on_hold', 'completed', 'cancelled']
        },
        message: 'Invalid project status'
      },
      priority: {
        type: 'enum',
        required: false,
        options: {
          values: ['low', 'medium', 'high', 'urgent']
        },
        message: 'Invalid priority level'
      },
      startDate: {
        type: 'date',
        required: false,
        options: {
          format: 'YYYY-MM-DD'
        },
        message: 'Invalid start date'
      },
      endDate: {
        type: 'date',
        required: false,
        options: {
          format: 'YYYY-MM-DD'
        },
        message: 'Invalid end date'
      },
      budget: {
        type: 'number',
        required: false,
        options: {
          min: 0,
          max: 999999999
        },
        message: 'Budget must be a positive number'
      },
      visibility: {
        type: 'enum',
        required: false,
        options: {
          values: ['private', 'organization', 'public']
        },
        message: 'Invalid visibility setting'
      }
    }
  },

  // Create task schema
  createTask: {
    body: {
      title: {
        type: 'text',
        required: true,
        sanitizer: 'html',
        options: {
          minLength: 3,
          maxLength: 200
        },
        message: 'Task title must be 3-200 characters'
      },
      description: {
        type: 'text',
        required: false,
        sanitizer: 'html',
        options: {
          maxLength: 5000
        },
        message: 'Description must not exceed 5000 characters'
      },
      projectId: {
        type: 'uuid',
        required: true,
        message: 'Valid project ID is required'
      },
      parentTaskId: {
        type: 'uuid',
        required: false,
        message: 'Invalid parent task ID'
      },
      status: {
        type: 'enum',
        required: false,
        options: {
          values: ['todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled']
        },
        message: 'Invalid task status'
      },
      priority: {
        type: 'enum',
        required: false,
        options: {
          values: ['low', 'medium', 'high', 'urgent']
        },
        message: 'Invalid priority level'
      },
      assigneeId: {
        type: 'uuid',
        required: false,
        message: 'Invalid assignee ID'
      },
      dueDate: {
        type: 'date',
        required: false,
        options: {
          format: 'YYYY-MM-DD'
        },
        message: 'Invalid due date'
      },
      estimatedHours: {
        type: 'number',
        required: false,
        options: {
          min: 0,
          max: 9999,
          allowFloat: true
        },
        message: 'Estimated hours must be between 0 and 9999'
      },
      actualHours: {
        type: 'number',
        required: false,
        options: {
          min: 0,
          max: 9999,
          allowFloat: true
        },
        message: 'Actual hours must be between 0 and 9999'
      },
      tags: {
        type: 'array',
        required: false,
        maxItems: 20,
        itemType: 'text',
        itemOptions: {
          maxLength: 50,
          pattern: /^[a-zA-Z0-9-]+$/
        },
        message: 'Tags must be alphanumeric with dashes, max 50 chars each'
      },
      dependencies: {
        type: 'array',
        required: false,
        maxItems: 50,
        itemType: 'uuid',
        message: 'Dependencies must be valid task IDs'
      },
      attachments: {
        type: 'array',
        required: false,
        maxItems: 20,
        itemType: 'object',
        itemSchema: {
          name: {
            type: 'text',
            required: true,
            sanitizer: 'html',
            options: { maxLength: 255 }
          },
          url: {
            type: 'url',
            required: true,
            sanitizer: 'url'
          },
          size: {
            type: 'number',
            required: false,
            options: { min: 0 }
          },
          type: {
            type: 'text',
            required: false,
            sanitizer: 'html',
            options: { maxLength: 100 }
          }
        },
        message: 'Invalid attachment format'
      },
      customFields: {
        type: 'object',
        required: false,
        maxProperties: 50,
        message: 'Too many custom fields'
      }
    }
  },

  // Update task schema
  updateTask: {
    params: {
      taskId: {
        type: 'uuid',
        required: true,
        message: 'Valid task ID is required'
      }
    },
    body: {
      // Similar to create but all fields optional
      title: {
        type: 'text',
        required: false,
        sanitizer: 'html',
        options: {
          minLength: 3,
          maxLength: 200
        },
        message: 'Task title must be 3-200 characters'
      },
      description: {
        type: 'text',
        required: false,
        sanitizer: 'html',
        options: {
          maxLength: 5000
        },
        message: 'Description must not exceed 5000 characters'
      },
      status: {
        type: 'enum',
        required: false,
        options: {
          values: ['todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled']
        },
        message: 'Invalid task status'
      },
      priority: {
        type: 'enum',
        required: false,
        options: {
          values: ['low', 'medium', 'high', 'urgent']
        },
        message: 'Invalid priority level'
      },
      assigneeId: {
        type: 'uuid',
        required: false,
        allowNull: true,
        message: 'Invalid assignee ID'
      },
      dueDate: {
        type: 'date',
        required: false,
        allowNull: true,
        options: {
          format: 'YYYY-MM-DD'
        },
        message: 'Invalid due date'
      },
      estimatedHours: {
        type: 'number',
        required: false,
        options: {
          min: 0,
          max: 9999,
          allowFloat: true
        },
        message: 'Estimated hours must be between 0 and 9999'
      },
      actualHours: {
        type: 'number',
        required: false,
        options: {
          min: 0,
          max: 9999,
          allowFloat: true
        },
        message: 'Actual hours must be between 0 and 9999'
      }
    }
  },

  // Bulk update tasks schema
  bulkUpdateTasks: {
    body: {
      taskIds: {
        type: 'array',
        required: true,
        minItems: 1,
        maxItems: 100,
        itemType: 'uuid',
        message: 'Task IDs must be valid UUIDs, max 100 items'
      },
      updates: {
        type: 'object',
        required: true,
        properties: {
          status: {
            type: 'enum',
            required: false,
            options: {
              values: ['todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled']
            }
          },
          priority: {
            type: 'enum',
            required: false,
            options: {
              values: ['low', 'medium', 'high', 'urgent']
            }
          },
          assigneeId: {
            type: 'uuid',
            required: false,
            allowNull: true
          },
          addTags: {
            type: 'array',
            required: false,
            maxItems: 10,
            itemType: 'text'
          },
          removeTags: {
            type: 'array',
            required: false,
            maxItems: 10,
            itemType: 'text'
          }
        },
        message: 'Invalid bulk update parameters'
      }
    }
  },

  // Task comment schema
  addTaskComment: {
    params: {
      taskId: {
        type: 'uuid',
        required: true,
        message: 'Valid task ID is required'
      }
    },
    body: {
      content: {
        type: 'text',
        required: true,
        sanitizer: 'html',
        options: {
          minLength: 1,
          maxLength: 2000
        },
        message: 'Comment must be 1-2000 characters'
      },
      mentions: {
        type: 'array',
        required: false,
        maxItems: 20,
        itemType: 'uuid',
        message: 'Mentions must be valid user IDs'
      },
      attachments: {
        type: 'array',
        required: false,
        maxItems: 5,
        itemType: 'object',
        itemSchema: {
          name: {
            type: 'text',
            required: true,
            sanitizer: 'html',
            options: { maxLength: 255 }
          },
          url: {
            type: 'url',
            required: true,
            sanitizer: 'url'
          }
        },
        message: 'Invalid attachment format'
      }
    }
  },

  // List projects/tasks schema
  listProjectsTasks: {
    query: {
      page: {
        type: 'number',
        required: false,
        options: {
          min: 1,
          max: 1000
        },
        message: 'Page must be between 1 and 1000'
      },
      limit: {
        type: 'number',
        required: false,
        options: {
          min: 1,
          max: 100
        },
        message: 'Limit must be between 1 and 100'
      },
      search: {
        type: 'text',
        required: false,
        sanitizer: 'html',
        options: {
          maxLength: 100
        },
        message: 'Search query must not exceed 100 characters'
      },
      status: {
        type: 'enum',
        required: false,
        options: {
          values: ['planning', 'active', 'on_hold', 'completed', 'cancelled', 'todo', 'in_progress', 'review', 'done', 'blocked']
        },
        message: 'Invalid status filter'
      },
      priority: {
        type: 'enum',
        required: false,
        options: {
          values: ['low', 'medium', 'high', 'urgent']
        },
        message: 'Invalid priority filter'
      },
      assigneeId: {
        type: 'uuid',
        required: false,
        message: 'Invalid assignee ID'
      },
      projectId: {
        type: 'uuid',
        required: false,
        message: 'Invalid project ID'
      },
      organizationId: {
        type: 'uuid',
        required: false,
        message: 'Invalid organization ID'
      },
      tags: {
        type: 'array',
        required: false,
        maxItems: 10,
        itemType: 'text',
        message: 'Invalid tags filter'
      },
      dateFrom: {
        type: 'date',
        required: false,
        options: {
          format: 'YYYY-MM-DD'
        },
        message: 'Invalid start date'
      },
      dateTo: {
        type: 'date',
        required: false,
        options: {
          format: 'YYYY-MM-DD'
        },
        message: 'Invalid end date'
      },
      sortBy: {
        type: 'enum',
        required: false,
        options: {
          values: ['created_at', 'updated_at', 'due_date', 'priority', 'status', 'title']
        },
        message: 'Invalid sort field'
      },
      sortOrder: {
        type: 'enum',
        required: false,
        options: {
          values: ['asc', 'desc']
        },
        message: 'Sort order must be asc or desc'
      },
      includeSubtasks: {
        type: 'boolean',
        required: false,
        message: 'includeSubtasks must be a boolean'
      },
      includeCompleted: {
        type: 'boolean',
        required: false,
        message: 'includeCompleted must be a boolean'
      }
    }
  },

  // Task time tracking schema
  trackTime: {
    params: {
      taskId: {
        type: 'uuid',
        required: true,
        message: 'Valid task ID is required'
      }
    },
    body: {
      action: {
        type: 'enum',
        required: true,
        options: {
          values: ['start', 'stop', 'log']
        },
        message: 'Action must be start, stop, or log'
      },
      duration: {
        type: 'number',
        required: false,
        options: {
          min: 0,
          max: 86400 // 24 hours in seconds
        },
        message: 'Duration must be between 0 and 86400 seconds'
      },
      description: {
        type: 'text',
        required: false,
        sanitizer: 'html',
        options: {
          maxLength: 500
        },
        message: 'Description must not exceed 500 characters'
      },
      date: {
        type: 'date',
        required: false,
        options: {
          format: 'YYYY-MM-DD'
        },
        message: 'Invalid date'
      }
    }
  }
};

/**
 * Get schema for a specific project/task endpoint
 * @param {string} endpoint - Endpoint name
 * @returns {Object} Schema object
 */
export function getProjectTaskSchema(endpoint) {
  return projectTaskSchemas[endpoint] || null;
}

/**
 * Validate project/task request against schema
 * @param {string} endpoint - Endpoint name
 * @param {Object} req - Express request object
 * @returns {Object} Validation result
 */
export function validateProjectTaskRequest(endpoint, req) {
  const schema = getProjectTaskSchema(endpoint);
  if (!schema) {
    return { valid: true, errors: [] };
  }

  // Use the same validation logic from user schemas
  // This could be extracted to a shared utility
  return validateRequestAgainstSchema(schema, req);
}

/**
 * Generic request validation against schema
 * @param {Object} schema - Schema definition
 * @param {Object} req - Express request object
 * @returns {Object} Validation result
 */
function validateRequestAgainstSchema(schema, req) {
  const errors = [];

  // Validate params
  if (schema.params && req.params) {
    for (const [field, rules] of Object.entries(schema.params)) {
      const value = req.params[field];

      if (rules.required && !value) {
        errors.push({
          field: `params.${field}`,
          code: 'REQUIRED',
          message: rules.message || `${field} is required`
        });
      }
    }
  }

  // Validate body
  if (schema.body && req.body) {
    validateDataAgainstSchema(schema.body, req.body, errors, '');
  }

  // Validate query
  if (schema.query && req.query) {
    for (const [field, rules] of Object.entries(schema.query)) {
      const value = req.query[field];

      if (rules.required && !value) {
        errors.push({
          field: `query.${field}`,
          code: 'REQUIRED',
          message: rules.message || `${field} is required`
        });
      } else if (value !== undefined && rules.type === 'boolean') {
        // Convert string to boolean for query params
        req.query[field] = value === 'true';
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate data against schema definition
 * @param {Object} schema - Schema definition
 * @param {Object} data - Data to validate
 * @param {Array} errors - Errors array
 * @param {string} path - Current path
 */
function validateDataAgainstSchema(schema, data, errors, path) {
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const fieldPath = path ? `${path}.${field}` : field;

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: fieldPath,
        code: 'REQUIRED',
        message: rules.message || `${fieldPath} is required`
      });
      continue;
    }

    // Skip if not required and not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }

    // Check allowNull
    if (value === null && !rules.allowNull) {
      errors.push({
        field: fieldPath,
        code: 'NULL_NOT_ALLOWED',
        message: `${fieldPath} cannot be null`
      });
      continue;
    }

    // Array validation
    if (rules.type === 'array' && value !== null) {
      if (!Array.isArray(value)) {
        errors.push({
          field: fieldPath,
          code: 'INVALID_TYPE',
          message: `${fieldPath} must be an array`
        });
      } else {
        if (rules.minItems && value.length < rules.minItems) {
          errors.push({
            field: fieldPath,
            code: 'MIN_ITEMS',
            message: `${fieldPath} must have at least ${rules.minItems} items`
          });
        }
        if (rules.maxItems && value.length > rules.maxItems) {
          errors.push({
            field: fieldPath,
            code: 'MAX_ITEMS',
            message: `${fieldPath} must not exceed ${rules.maxItems} items`
          });
        }
      }
    }

    // Object validation
    if (rules.type === 'object' && value !== null) {
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push({
          field: fieldPath,
          code: 'INVALID_TYPE',
          message: `${fieldPath} must be an object`
        });
      } else if (rules.maxProperties && Object.keys(value).length > rules.maxProperties) {
        errors.push({
          field: fieldPath,
          code: 'MAX_PROPERTIES',
          message: `${fieldPath} must not exceed ${rules.maxProperties} properties`
        });
      } else if (rules.properties) {
        validateDataAgainstSchema(rules.properties, value, errors, fieldPath);
      }
    }
  }
}