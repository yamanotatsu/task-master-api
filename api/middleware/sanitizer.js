/**
 * Request sanitization middleware
 * Automatically sanitizes request body, query params, and validates content
 */

import { sanitizers, validators, validateRequestHeaders, containsSqlInjectionPatterns, containsXssPatterns } from '../utils/validation.js';
import logger from '../utils/logger.js';

// Configuration
const CONFIG = {
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  maxJsonDepth: 10,
  maxArrayLength: 1000,
  maxStringLength: 10000,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedContentTypes: [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain'
  ],
  fileUploadFields: ['avatar', 'attachment', 'file', 'image', 'document'],
  skipSanitizationPaths: ['/api/health', '/api/metrics'],
  strictMode: true
};

/**
 * Deep sanitize object recursively
 * @param {*} obj - Object to sanitize
 * @param {number} depth - Current recursion depth
 * @param {string} path - Current object path
 * @returns {*} Sanitized object
 */
function deepSanitize(obj, depth = 0, path = '') {
  // Prevent infinite recursion
  if (depth > CONFIG.maxJsonDepth) {
    logger.warn(`Max JSON depth exceeded at path: ${path}`);
    return null;
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj === 'string') {
    // Check for malicious patterns
    if (containsSqlInjectionPatterns(obj) || containsXssPatterns(obj)) {
      logger.warn(`Potentially malicious input detected at ${path}`, {
        type: 'security',
        value: obj.substring(0, 100) // Log first 100 chars only
      });
    }

    // Truncate if too long
    if (obj.length > CONFIG.maxStringLength) {
      logger.warn(`String truncated at ${path}, original length: ${obj.length}`);
      obj = obj.substring(0, CONFIG.maxStringLength);
    }

    return sanitizers.html(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    if (obj.length > CONFIG.maxArrayLength) {
      logger.warn(`Array truncated at ${path}, original length: ${obj.length}`);
      obj = obj.slice(0, CONFIG.maxArrayLength);
    }

    return obj.map((item, index) => 
      deepSanitize(item, depth + 1, `${path}[${index}]`)
    );
  }

  // Handle objects
  if (typeof obj === 'object') {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key itself
      const sanitizedKey = sanitizers.html(key);
      
      // Skip if key contains suspicious patterns
      if (containsSqlInjectionPatterns(key) || containsXssPatterns(key)) {
        logger.warn(`Suspicious object key detected and skipped: ${key}`);
        continue;
      }

      // Recursively sanitize the value
      sanitized[sanitizedKey] = deepSanitize(
        value, 
        depth + 1, 
        path ? `${path}.${sanitizedKey}` : sanitizedKey
      );
    }

    return sanitized;
  }

  // For any other type, return as-is
  return obj;
}

/**
 * Sanitize query parameters
 * @param {Object} query - Query parameters
 * @returns {Object} Sanitized query
 */
function sanitizeQuery(query) {
  const sanitized = {};

  for (const [key, value] of Object.entries(query)) {
    // Sanitize key
    const sanitizedKey = sanitizers.html(key);

    // Handle array values (e.g., ?tags[]=a&tags[]=b)
    if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.map(v => 
        typeof v === 'string' ? sanitizers.html(v) : v
      );
    } else if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizers.html(value);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }

  return sanitized;
}

/**
 * Validate file upload
 * @param {Object} file - File object from multer or similar
 * @returns {Object} Validation result
 */
function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > CONFIG.maxFileSize) {
    return { 
      valid: false, 
      error: `File size exceeds maximum allowed size of ${CONFIG.maxFileSize / 1024 / 1024}MB` 
    };
  }

  // Validate filename
  const filename = sanitizers.path(file.originalname || file.name || '');
  if (!filename) {
    return { valid: false, error: 'Invalid filename' };
  }

  // Check for executable extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar'];
  const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  if (dangerousExtensions.includes(extension)) {
    return { valid: false, error: 'File type not allowed' };
  }

  // Validate MIME type if available
  if (file.mimetype) {
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return { valid: false, error: 'File MIME type not allowed' };
    }
  }

  return { valid: true, sanitizedFilename: filename };
}

/**
 * Main sanitization middleware
 */
export default function sanitizerMiddleware(options = {}) {
  const config = { ...CONFIG, ...options };

  return async (req, res, next) => {
    try {
      // Skip sanitization for certain paths
      if (config.skipSanitizationPaths.includes(req.path)) {
        return next();
      }

      // Validate request headers
      const headerValidation = validateRequestHeaders(req.headers);
      if (!headerValidation.valid && config.strictMode) {
        logger.warn('Invalid request headers', {
          errors: headerValidation.errors,
          ip: req.ip,
          path: req.path
        });
        return res.status(400).json({
          error: 'Invalid request headers',
          details: headerValidation.errors
        });
      }

      // Validate content-type for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'];
        if (!contentType) {
          return res.status(400).json({
            error: 'Content-Type header is required'
          });
        }

        const baseContentType = contentType.split(';')[0].trim();
        if (!config.allowedContentTypes.includes(baseContentType)) {
          return res.status(415).json({
            error: 'Unsupported Media Type',
            supported: config.allowedContentTypes
          });
        }
      }

      // Check request size
      if (req.headers['content-length'] && 
          parseInt(req.headers['content-length']) > config.maxRequestSize) {
        return res.status(413).json({
          error: 'Request Entity Too Large',
          maxSize: `${config.maxRequestSize / 1024 / 1024}MB`
        });
      }

      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = deepSanitize(req.body, 0, 'body');
        
        // Store original body for reference if needed
        req.originalBody = { ...req.body };
      }

      // Sanitize query parameters
      if (req.query && Object.keys(req.query).length > 0) {
        req.query = sanitizeQuery(req.query);
        
        // Store original query for reference if needed
        req.originalQuery = { ...req.query };
      }

      // Sanitize route parameters
      if (req.params && Object.keys(req.params).length > 0) {
        const sanitizedParams = {};
        for (const [key, value] of Object.entries(req.params)) {
          if (typeof value === 'string') {
            sanitizedParams[key] = sanitizers.html(value);
          } else {
            sanitizedParams[key] = value;
          }
        }
        req.params = sanitizedParams;
      }

      // Handle file uploads if present
      if (req.files) {
        if (Array.isArray(req.files)) {
          // Multiple files
          for (const file of req.files) {
            const validation = validateFile(file);
            if (!validation.valid) {
              return res.status(400).json({
                error: 'Invalid file upload',
                details: validation.error
              });
            }
            file.sanitizedFilename = validation.sanitizedFilename;
          }
        } else if (typeof req.files === 'object') {
          // Files organized by field name
          for (const fieldName of Object.keys(req.files)) {
            const files = Array.isArray(req.files[fieldName]) 
              ? req.files[fieldName] 
              : [req.files[fieldName]];
            
            for (const file of files) {
              const validation = validateFile(file);
              if (!validation.valid) {
                return res.status(400).json({
                  error: 'Invalid file upload',
                  field: fieldName,
                  details: validation.error
                });
              }
              file.sanitizedFilename = validation.sanitizedFilename;
            }
          }
        }
      }

      // Handle single file upload
      if (req.file) {
        const validation = validateFile(req.file);
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Invalid file upload',
            details: validation.error
          });
        }
        req.file.sanitizedFilename = validation.sanitizedFilename;
      }

      // Add sanitization metadata
      req.sanitized = {
        timestamp: new Date().toISOString(),
        bodyModified: req.originalBody !== undefined,
        queryModified: req.originalQuery !== undefined,
        warnings: headerValidation.warnings || []
      };

      // Log sanitization activity for security monitoring
      if (req.sanitized.bodyModified || req.sanitized.queryModified) {
        logger.info('Request sanitized', {
          path: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          sanitized: req.sanitized
        });
      }

      next();
    } catch (error) {
      logger.error('Sanitization middleware error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
      });

      // Don't expose internal errors
      res.status(500).json({
        error: 'Internal server error during request processing'
      });
    }
  };
}

/**
 * Create field-specific sanitizer middleware
 * @param {Object} fieldRules - Rules for specific fields
 * @returns {Function} Express middleware
 */
export function createFieldSanitizer(fieldRules) {
  return (req, res, next) => {
    try {
      // Apply field-specific rules to body
      if (req.body && fieldRules.body) {
        for (const [field, rule] of Object.entries(fieldRules.body)) {
          if (req.body[field] !== undefined) {
            const result = validators[rule.type]
              ? validators[rule.type](req.body[field], rule.options)
              : true;

            if (!result && rule.required) {
              return res.status(400).json({
                error: 'Validation failed',
                field,
                message: rule.message || `Invalid ${field}`
              });
            }

            // Apply specific sanitizer if defined
            if (rule.sanitizer && sanitizers[rule.sanitizer]) {
              req.body[field] = sanitizers[rule.sanitizer](req.body[field]);
            }
          } else if (rule.required) {
            return res.status(400).json({
              error: 'Validation failed',
              field,
              message: `${field} is required`
            });
          }
        }
      }

      // Apply field-specific rules to query
      if (req.query && fieldRules.query) {
        for (const [field, rule] of Object.entries(fieldRules.query)) {
          if (req.query[field] !== undefined) {
            const result = validators[rule.type]
              ? validators[rule.type](req.query[field], rule.options)
              : true;

            if (!result) {
              return res.status(400).json({
                error: 'Validation failed',
                field: `query.${field}`,
                message: rule.message || `Invalid ${field}`
              });
            }

            // Apply specific sanitizer if defined
            if (rule.sanitizer && sanitizers[rule.sanitizer]) {
              req.query[field] = sanitizers[rule.sanitizer](req.query[field]);
            }
          }
        }
      }

      next();
    } catch (error) {
      logger.error('Field sanitizer error', {
        error: error.message,
        path: req.path
      });

      res.status(500).json({
        error: 'Internal server error during validation'
      });
    }
  };
}

/**
 * Rate limit sanitized requests
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware
 */
export function sanitizedRateLimit(options = {}) {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    maxSanitizedRequests: 20, // Lower limit for heavily sanitized requests
    message: 'Too many requests with potentially malicious content'
  };

  const config = { ...defaults, ...options };
  const sanitizedCounts = new Map();

  return (req, res, next) => {
    if (!req.sanitized || (!req.sanitized.bodyModified && !req.sanitized.queryModified)) {
      return next();
    }

    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean old entries
    for (const [k, v] of sanitizedCounts.entries()) {
      if (v.timestamp < windowStart) {
        sanitizedCounts.delete(k);
      }
    }

    // Check current count
    const current = sanitizedCounts.get(key) || { count: 0, timestamp: now };
    
    if (current.timestamp < windowStart) {
      current.count = 0;
      current.timestamp = now;
    }

    current.count++;

    if (current.count > config.maxSanitizedRequests) {
      logger.warn('Rate limit exceeded for sanitized requests', {
        ip: req.ip,
        path: req.path,
        count: current.count
      });

      return res.status(429).json({
        error: config.message
      });
    }

    sanitizedCounts.set(key, current);
    next();
  };
}