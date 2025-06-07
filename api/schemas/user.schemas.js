/**
 * User profile validation schemas
 * Defines validation rules for user-related endpoints
 */

export const userSchemas = {
  // Update user profile schema
  updateProfile: {
    body: {
      fullName: {
        type: 'fullName',
        required: false,
        sanitizer: 'html',
        options: {
          minLength: 2,
          maxLength: 100,
          pattern: /^[a-zA-Z\s'-]+$/
        },
        message: 'Full name must contain only letters, spaces, hyphens, and apostrophes'
      },
      displayName: {
        type: 'alphanumeric',
        required: false,
        sanitizer: 'html',
        options: {
          allowSpaces: true,
          allowDashes: true,
          allowUnderscores: true,
          minLength: 3,
          maxLength: 50
        },
        message: 'Display name must be 3-50 characters'
      },
      bio: {
        type: 'text',
        required: false,
        sanitizer: 'html',
        options: {
          maxLength: 500
        },
        message: 'Bio must not exceed 500 characters'
      },
      avatarUrl: {
        type: 'url',
        required: false,
        sanitizer: 'url',
        options: {
          require_protocol: true,
          protocols: ['http', 'https']
        },
        message: 'Please provide a valid avatar URL'
      },
      phone: {
        type: 'phone',
        required: false,
        options: {
          locale: 'international'
        },
        message: 'Please provide a valid phone number'
      },
      timezone: {
        type: 'text',
        required: false,
        sanitizer: 'html',
        validator: (value) => {
          // Basic timezone validation (e.g., "America/New_York")
          return /^[A-Za-z]+\/[A-Za-z_]+$/.test(value);
        },
        message: 'Please provide a valid timezone'
      },
      language: {
        type: 'enum',
        required: false,
        options: {
          values: ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko', 'pt', 'ru', 'ar']
        },
        message: 'Unsupported language'
      },
      dateFormat: {
        type: 'enum',
        required: false,
        options: {
          values: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
        },
        message: 'Invalid date format'
      },
      timeFormat: {
        type: 'enum',
        required: false,
        options: {
          values: ['12h', '24h']
        },
        message: 'Time format must be 12h or 24h'
      }
    }
  },

  // Update notification preferences schema
  updateNotifications: {
    body: {
      email: {
        type: 'object',
        required: false,
        properties: {
          projectUpdates: { type: 'boolean' },
          taskAssignments: { type: 'boolean' },
          mentions: { type: 'boolean' },
          deadlines: { type: 'boolean' },
          weeklyDigest: { type: 'boolean' },
          marketing: { type: 'boolean' }
        },
        message: 'Invalid email notification preferences'
      },
      push: {
        type: 'object',
        required: false,
        properties: {
          enabled: { type: 'boolean' },
          taskAssignments: { type: 'boolean' },
          mentions: { type: 'boolean' },
          deadlines: { type: 'boolean' }
        },
        message: 'Invalid push notification preferences'
      },
      inApp: {
        type: 'object',
        required: false,
        properties: {
          enabled: { type: 'boolean' },
          sound: { type: 'boolean' },
          desktop: { type: 'boolean' }
        },
        message: 'Invalid in-app notification preferences'
      }
    }
  },

  // Update privacy settings schema
  updatePrivacy: {
    body: {
      profileVisibility: {
        type: 'enum',
        required: false,
        options: {
          values: ['public', 'organization', 'private']
        },
        message: 'Profile visibility must be public, organization, or private'
      },
      showEmail: {
        type: 'boolean',
        required: false,
        message: 'showEmail must be a boolean'
      },
      showPhone: {
        type: 'boolean',
        required: false,
        message: 'showPhone must be a boolean'
      },
      showActivity: {
        type: 'boolean',
        required: false,
        message: 'showActivity must be a boolean'
      },
      allowAnalytics: {
        type: 'boolean',
        required: false,
        message: 'allowAnalytics must be a boolean'
      }
    }
  },

  // Update security settings schema
  updateSecurity: {
    body: {
      twoFactorEnabled: {
        type: 'boolean',
        required: false,
        message: 'twoFactorEnabled must be a boolean'
      },
      twoFactorMethod: {
        type: 'enum',
        required: false,
        options: {
          values: ['sms', 'email', 'authenticator']
        },
        message: 'Two-factor method must be sms, email, or authenticator'
      },
      sessionTimeout: {
        type: 'number',
        required: false,
        options: {
          min: 300, // 5 minutes
          max: 86400 // 24 hours
        },
        message: 'Session timeout must be between 5 minutes and 24 hours'
      },
      loginNotifications: {
        type: 'boolean',
        required: false,
        message: 'loginNotifications must be a boolean'
      },
      trustedDevices: {
        type: 'array',
        required: false,
        maxItems: 10,
        itemType: 'object',
        itemSchema: {
          deviceId: {
            type: 'uuid',
            required: true
          },
          name: {
            type: 'text',
            required: true,
            sanitizer: 'html',
            options: { maxLength: 100 }
          }
        },
        message: 'Invalid trusted devices list'
      }
    }
  },

  // List users schema (admin)
  listUsers: {
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
      role: {
        type: 'enum',
        required: false,
        options: {
          values: ['admin', 'member', 'viewer']
        },
        message: 'Invalid role filter'
      },
      status: {
        type: 'enum',
        required: false,
        options: {
          values: ['active', 'inactive', 'suspended', 'pending']
        },
        message: 'Invalid status filter'
      },
      organizationId: {
        type: 'uuid',
        required: false,
        message: 'Invalid organization ID'
      },
      sortBy: {
        type: 'enum',
        required: false,
        options: {
          values: ['name', 'email', 'created_at', 'last_login', 'role']
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
      }
    }
  },

  // User activity log schema
  getActivityLog: {
    params: {
      userId: {
        type: 'uuid',
        required: true,
        message: 'Valid user ID is required'
      }
    },
    query: {
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
      activityType: {
        type: 'enum',
        required: false,
        options: {
          values: ['login', 'logout', 'password_change', 'profile_update', 'task_create', 'task_update', 'project_create', 'project_update']
        },
        message: 'Invalid activity type'
      },
      limit: {
        type: 'number',
        required: false,
        options: {
          min: 1,
          max: 500
        },
        message: 'Limit must be between 1 and 500'
      }
    }
  },

  // Export user data schema
  exportUserData: {
    body: {
      format: {
        type: 'enum',
        required: true,
        options: {
          values: ['json', 'csv', 'pdf']
        },
        message: 'Export format must be json, csv, or pdf'
      },
      includeActivity: {
        type: 'boolean',
        required: false,
        message: 'includeActivity must be a boolean'
      },
      includeProjects: {
        type: 'boolean',
        required: false,
        message: 'includeProjects must be a boolean'
      },
      includeTasks: {
        type: 'boolean',
        required: false,
        message: 'includeTasks must be a boolean'
      },
      dateRange: {
        type: 'object',
        required: false,
        properties: {
          start: {
            type: 'date',
            required: true,
            options: { format: 'YYYY-MM-DD' }
          },
          end: {
            type: 'date',
            required: true,
            options: { format: 'YYYY-MM-DD' }
          }
        },
        message: 'Invalid date range'
      }
    }
  },

  // Social connections schema
  updateSocialConnections: {
    body: {
      github: {
        type: 'text',
        required: false,
        sanitizer: 'html',
        validator: (value) => {
          if (!value) return true;
          return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(value);
        },
        message: 'Invalid GitHub username'
      },
      linkedin: {
        type: 'url',
        required: false,
        sanitizer: 'url',
        validator: (value) => {
          if (!value) return true;
          return value.includes('linkedin.com/in/');
        },
        message: 'Invalid LinkedIn profile URL'
      },
      twitter: {
        type: 'text',
        required: false,
        sanitizer: 'html',
        validator: (value) => {
          if (!value) return true;
          return /^@?[a-zA-Z0-9_]{1,15}$/.test(value);
        },
        message: 'Invalid Twitter handle'
      },
      website: {
        type: 'url',
        required: false,
        sanitizer: 'url',
        options: {
          require_protocol: true,
          protocols: ['http', 'https']
        },
        message: 'Invalid website URL'
      }
    }
  }
};

/**
 * Get schema for a specific user endpoint
 * @param {string} endpoint - Endpoint name
 * @returns {Object} Schema object
 */
export function getUserSchema(endpoint) {
  return userSchemas[endpoint] || null;
}

/**
 * Validate user request against schema
 * @param {string} endpoint - Endpoint name
 * @param {Object} req - Express request object
 * @returns {Object} Validation result
 */
export function validateUserRequest(endpoint, req) {
  const schema = getUserSchema(endpoint);
  if (!schema) {
    return { valid: true, errors: [] };
  }

  const errors = [];

  // Similar validation logic as in organization schemas
  // but with additional handling for nested objects and arrays

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

  // Validate body with nested object support
  if (schema.body && req.body) {
    validateBodyRecursive(schema.body, req.body, errors, '');
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
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Recursively validate body objects
 * @param {Object} schema - Schema definition
 * @param {Object} data - Data to validate
 * @param {Array} errors - Errors array to populate
 * @param {string} path - Current path in object
 */
function validateBodyRecursive(schema, data, errors, path) {
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

    // Type validation
    if (rules.type === 'boolean' && typeof value !== 'boolean') {
      errors.push({
        field: fieldPath,
        code: 'INVALID_TYPE',
        message: rules.message || `${fieldPath} must be a boolean`
      });
    }

    // Array validation
    if (rules.type === 'array' && value) {
      if (!Array.isArray(value)) {
        errors.push({
          field: fieldPath,
          code: 'INVALID_TYPE',
          message: `${fieldPath} must be an array`
        });
      } else if (rules.maxItems && value.length > rules.maxItems) {
        errors.push({
          field: fieldPath,
          code: 'MAX_ITEMS_EXCEEDED',
          message: `${fieldPath} must not exceed ${rules.maxItems} items`
        });
      }
    }

    // Nested object validation
    if (rules.type === 'object' && rules.properties && value) {
      validateBodyRecursive(rules.properties, value, errors, fieldPath);
    }

    // Custom validator
    if (rules.validator && value !== undefined && !rules.validator(value)) {
      errors.push({
        field: fieldPath,
        code: 'INVALID',
        message: rules.message || `${fieldPath} is invalid`
      });
    }
  }
}