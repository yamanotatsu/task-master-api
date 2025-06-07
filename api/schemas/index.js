/**
 * Central export for all validation schemas
 */

export * from './auth.schemas.js';
export * from './organization.schemas.js';
export * from './user.schemas.js';
export * from './project-task.schemas.js';

// Combined schema validation middleware creator
import { getAuthSchema, validateAuthRequest } from './auth.schemas.js';
import { getOrganizationSchema, validateOrganizationRequest } from './organization.schemas.js';
import { getUserSchema, validateUserRequest } from './user.schemas.js';
import { getProjectTaskSchema, validateProjectTaskRequest } from './project-task.schemas.js';

/**
 * Create validation middleware for a specific schema
 * @param {string} schemaType - Type of schema (auth, organization, user, project-task)
 * @param {string} endpoint - Endpoint name within the schema type
 * @returns {Function} Express middleware
 */
export function createValidationMiddleware(schemaType, endpoint) {
  return (req, res, next) => {
    let validationResult;

    switch (schemaType) {
      case 'auth':
        validationResult = validateAuthRequest(endpoint, req);
        break;
      case 'organization':
        validationResult = validateOrganizationRequest(endpoint, req);
        break;
      case 'user':
        validationResult = validateUserRequest(endpoint, req);
        break;
      case 'project-task':
        validationResult = validateProjectTaskRequest(endpoint, req);
        break;
      default:
        validationResult = { valid: true, errors: [] };
    }

    if (!validationResult.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationResult.errors
      });
    }

    next();
  };
}

/**
 * Schema registry for dynamic lookup
 */
export const schemaRegistry = {
  auth: getAuthSchema,
  organization: getOrganizationSchema,
  user: getUserSchema,
  'project-task': getProjectTaskSchema
};

/**
 * Get any schema by type and endpoint
 * @param {string} type - Schema type
 * @param {string} endpoint - Endpoint name
 * @returns {Object|null} Schema definition
 */
export function getSchema(type, endpoint) {
  const getter = schemaRegistry[type];
  return getter ? getter(endpoint) : null;
}