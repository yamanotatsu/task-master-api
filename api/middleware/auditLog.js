import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
	auditLogger,
	AUDIT_EVENTS,
	RISK_LEVELS,
	DATA_SENSITIVITY
} from '../services/auditLog.js';
import { performance } from 'perf_hooks';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

/**
 * Audit logging middleware for automatic request/response tracking
 * Captures comprehensive audit data for sensitive operations
 */

// Sensitive endpoints that require audit logging
const SENSITIVE_ENDPOINTS = {
	// Authentication endpoints
	'/api/v1/auth/login': {
		eventType: AUDIT_EVENTS.AUTH_LOGIN_SUCCESS,
		riskLevel: RISK_LEVELS.MEDIUM
	},
	'/api/v1/auth/logout': {
		eventType: AUDIT_EVENTS.AUTH_LOGOUT,
		riskLevel: RISK_LEVELS.LOW
	},
	'/api/v1/auth/signup': {
		eventType: AUDIT_EVENTS.AUTH_SIGNUP,
		riskLevel: RISK_LEVELS.MEDIUM
	},
	'/api/v1/auth/forgot-password': {
		eventType: AUDIT_EVENTS.AUTH_PASSWORD_RESET_REQUEST,
		riskLevel: RISK_LEVELS.MEDIUM
	},
	'/api/v1/auth/reset-password': {
		eventType: AUDIT_EVENTS.AUTH_PASSWORD_RESET_SUCCESS,
		riskLevel: RISK_LEVELS.HIGH
	},
	'/api/v1/auth/change-password': {
		eventType: AUDIT_EVENTS.AUTH_PASSWORD_CHANGE,
		riskLevel: RISK_LEVELS.HIGH
	},

	// Organization endpoints
	'/api/v1/organizations': {
		eventType: AUDIT_EVENTS.ORG_CREATE,
		riskLevel: RISK_LEVELS.MEDIUM
	},
	'/api/v1/organizations/:id': {
		eventType: AUDIT_EVENTS.ORG_UPDATE,
		riskLevel: RISK_LEVELS.MEDIUM
	},
	'/api/v1/organizations/:id/members': {
		eventType: AUDIT_EVENTS.ORG_MEMBER_ADD,
		riskLevel: RISK_LEVELS.MEDIUM
	},
	'/api/v1/organizations/:id/invitations': {
		eventType: AUDIT_EVENTS.ORG_INVITATION_SEND,
		riskLevel: RISK_LEVELS.MEDIUM
	},

	// Project endpoints
	'/api/v1/projects': {
		eventType: AUDIT_EVENTS.PROJECT_CREATE,
		riskLevel: RISK_LEVELS.LOW
	},
	'/api/v1/projects/:id': {
		eventType: AUDIT_EVENTS.PROJECT_UPDATE,
		riskLevel: RISK_LEVELS.LOW
	},

	// Task endpoints
	'/api/v1/tasks': {
		eventType: AUDIT_EVENTS.TASK_CREATE,
		riskLevel: RISK_LEVELS.LOW
	},
	'/api/v1/tasks/:id': {
		eventType: AUDIT_EVENTS.TASK_UPDATE,
		riskLevel: RISK_LEVELS.LOW
	},
	'/api/v1/tasks/:id/status': {
		eventType: AUDIT_EVENTS.TASK_STATUS_CHANGE,
		riskLevel: RISK_LEVELS.LOW
	}
};

// Bulk operation patterns that require special attention
const BULK_OPERATION_PATTERNS = [
	/\/api\/v1\/tasks\/bulk/,
	/\/api\/v1\/projects\/bulk/,
	/\/api\/v1\/organizations\/.*\/members\/bulk/
];

// Data export patterns
const DATA_EXPORT_PATTERNS = [
	/\/api\/v1\/.*\/export/,
	/\/api\/v1\/audit\/export/,
	/\/api\/v1\/reports/
];

/**
 * Main audit middleware function
 */
export const auditMiddleware = (options = {}) => {
	return async (req, res, next) => {
		// Skip audit logging for health checks and non-sensitive endpoints
		if (shouldSkipAudit(req)) {
			return next();
		}

		// Skip SSE endpoints
		if (req.path && req.path.includes('/stream')) {
			return next();
		}

		const startTime = performance.now();
		const requestId = req.id || generateRequestId();

		// Capture request data
		const requestData = captureRequestData(req, requestId);

		// Store original res.end to capture response
		const originalEnd = res.end;
		let responseData = {};

		// Override res.end to capture response data
		res.end = function (chunk, encoding) {
			const endTime = performance.now();
			responseData = captureResponseData(res, chunk, endTime - startTime);

			// Log the audit event asynchronously
			setImmediate(() => {
				logAuditEvent(req, res, requestData, responseData, options);
			});

			// Call original end function
			originalEnd.call(this, chunk, encoding);
		};

		next();
	};
};

/**
 * Determine if request should be audited
 */
function shouldSkipAudit(req) {
	const skipPaths = [
		'/health',
		'/api/v1/security/status',
		'/favicon.ico',
		'/metrics'
	];

	return (
		skipPaths.some((path) => req.path.startsWith(path)) ||
		req.method === 'OPTIONS'
	);
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
	return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Capture comprehensive request data
 */
function captureRequestData(req, requestId) {
	const parser = new UAParser(req.get('User-Agent'));
	const geo = geoip.lookup(req.ip) || {};

	return {
		requestId,
		method: req.method,
		path: req.path,
		originalUrl: req.originalUrl,
		query: req.query,
		headers: sanitizeHeaders(req.headers),
		ipAddress: req.ip,
		userAgent: req.get('User-Agent'),
		contentLength: req.get('Content-Length'),
		referer: req.get('Referer'),

		// User context
		userId: req.user?.id || null,
		sessionId: req.session?.id || null,
		organizationId:
			req.user?.organizationId || req.body?.organizationId || null,

		// Geolocation
		country: geo.country,
		region: geo.region,
		city: geo.city,
		timezone: geo.timezone,

		// Device/browser info
		deviceType: getDeviceType(parser),
		browser: parser.getBrowser().name,
		browserVersion: parser.getBrowser().version,
		os: parser.getOS().name,
		osVersion: parser.getOS().version,

		// Request body (sanitized)
		body: sanitizeRequestBody(req.body, req.path),

		timestamp: new Date().toISOString()
	};
}

/**
 * Capture response data
 */
function captureResponseData(res, chunk, duration) {
	let responseBody = null;

	// Try to parse response body for audit purposes
	if (chunk && res.get('Content-Type')?.includes('application/json')) {
		try {
			responseBody = JSON.parse(chunk.toString());
		} catch (e) {
			// Ignore parse errors
		}
	}

	return {
		statusCode: res.statusCode,
		statusMessage: res.statusMessage,
		headers: sanitizeHeaders(res.getHeaders()),
		contentLength: res.get('Content-Length'),
		contentType: res.get('Content-Type'),
		duration: Math.round(duration),
		body: sanitizeResponseBody(responseBody),
		timestamp: new Date().toISOString()
	};
}

/**
 * Log audit event with comprehensive data
 */
async function logAuditEvent(req, res, requestData, responseData, options) {
	try {
		const eventConfig = determineEventConfig(req, res);

		if (!eventConfig && !options.logAllRequests) {
			return; // Skip non-sensitive operations unless configured otherwise
		}

		const auditData = {
			eventType: eventConfig?.eventType || 'api.request',
			action: `${req.method.toLowerCase()}_${getResourceFromPath(req.path)}`,
			description: buildDescription(req, res, eventConfig),

			// User and session context
			userId: requestData.userId,
			sessionId: requestData.sessionId,
			organizationId: requestData.organizationId,

			// Resource information
			resourceType: getResourceType(req.path),
			resourceId: extractResourceId(req),

			// Request/response details
			requestId: requestData.requestId,
			requestMethod: requestData.method,
			requestPath: requestData.path,
			requestSize: parseInt(requestData.contentLength) || null,
			responseStatus: responseData.statusCode,
			responseSize: parseInt(responseData.contentLength) || null,
			durationMs: responseData.duration,

			// Network and location
			ipAddress: requestData.ipAddress,
			userAgent: requestData.userAgent,
			country: requestData.country,
			region: requestData.region,
			deviceType: requestData.deviceType,
			browser: requestData.browser,

			// Risk assessment
			riskLevel: determineRiskLevel(req, res, eventConfig),
			dataSensitivity: determineSensitivity(req, res),

			// Data changes (for write operations)
			newValues: extractDataChanges(req, res, 'new'),
			oldValues: extractDataChanges(req, res, 'old'),
			affectedRecords: extractAffectedRecords(req, res),

			// Additional metadata
			metadata: {
				requestHeaders: requestData.headers,
				responseHeaders: responseData.headers,
				queryParams: requestData.query,
				bulkOperation: isBulkOperation(req),
				dataExport: isDataExport(req),
				sensitiveOperation: isSensitiveOperation(req),
				complianceFlags: getComplianceFlags(req, res)
			},

			tags: buildTags(req, res, eventConfig),
			complianceTags: getComplianceTags(req, res)
		};

		await auditLogger.logEvent(auditData);
	} catch (error) {
		console.error('Failed to log audit event:', error);
		// Don't throw error to avoid breaking the request flow
	}
}

/**
 * Determine event configuration for the request
 */
function determineEventConfig(req, res) {
	const path = req.path;
	const method = req.method;

	// Check exact matches first
	const exactMatch = SENSITIVE_ENDPOINTS[path];
	if (exactMatch) {
		return exactMatch;
	}

	// Check pattern matches
	for (const [pattern, config] of Object.entries(SENSITIVE_ENDPOINTS)) {
		if (pattern.includes(':')) {
			const regex = new RegExp(pattern.replace(/:[^/]+/g, '[^/]+'));
			if (regex.test(path)) {
				return config;
			}
		}
	}

	// Handle failed authentication attempts
	if (path.startsWith('/api/v1/auth/') && res.statusCode >= 400) {
		return {
			eventType: AUDIT_EVENTS.AUTH_LOGIN_FAILED,
			riskLevel: RISK_LEVELS.HIGH
		};
	}

	// Handle DELETE operations
	if (method === 'DELETE') {
		if (path.includes('/organizations/')) {
			return {
				eventType: AUDIT_EVENTS.ORG_DELETE,
				riskLevel: RISK_LEVELS.HIGH
			};
		}
		if (path.includes('/projects/')) {
			return {
				eventType: AUDIT_EVENTS.PROJECT_DELETE,
				riskLevel: RISK_LEVELS.MEDIUM
			};
		}
		if (path.includes('/tasks/')) {
			return {
				eventType: AUDIT_EVENTS.TASK_DELETE,
				riskLevel: RISK_LEVELS.LOW
			};
		}
	}

	return null;
}

/**
 * Build human-readable description
 */
function buildDescription(req, res, eventConfig) {
	const action = req.method;
	const resource = getResourceFromPath(req.path);
	const status = res.statusCode >= 400 ? 'failed' : 'succeeded';

	if (eventConfig?.eventType) {
		const eventParts = eventConfig.eventType.split('.');
		return `${eventParts[1] || action} ${eventParts[2] || resource} ${status}`;
	}

	return `${action} ${resource} ${status}`;
}

/**
 * Determine risk level based on request characteristics
 */
function determineRiskLevel(req, res, eventConfig) {
	if (eventConfig?.riskLevel) {
		return eventConfig.riskLevel;
	}

	// Failed authentication attempts
	if (req.path.startsWith('/api/v1/auth/') && res.statusCode >= 400) {
		return RISK_LEVELS.HIGH;
	}

	// Bulk operations
	if (isBulkOperation(req)) {
		return RISK_LEVELS.MEDIUM;
	}

	// Data exports
	if (isDataExport(req)) {
		return RISK_LEVELS.MEDIUM;
	}

	// Administrative operations
	if (req.path.includes('/admin/')) {
		return RISK_LEVELS.HIGH;
	}

	// DELETE operations
	if (req.method === 'DELETE') {
		return RISK_LEVELS.MEDIUM;
	}

	return RISK_LEVELS.LOW;
}

/**
 * Determine data sensitivity level
 */
function determineSensitivity(req, res) {
	if (req.path.startsWith('/api/v1/auth/')) {
		return DATA_SENSITIVITY.CONFIDENTIAL;
	}

	if (req.path.includes('/audit/')) {
		return DATA_SENSITIVITY.RESTRICTED;
	}

	if (isDataExport(req)) {
		return DATA_SENSITIVITY.CONFIDENTIAL;
	}

	return DATA_SENSITIVITY.INTERNAL;
}

/**
 * Helper functions
 */
function getResourceFromPath(path) {
	const parts = path.split('/').filter((p) => p && p !== 'api' && p !== 'v1');
	return parts[0] || 'unknown';
}

function getResourceType(path) {
	if (path.includes('/auth/')) return 'authentication';
	if (path.includes('/organizations/')) return 'organization';
	if (path.includes('/projects/')) return 'project';
	if (path.includes('/tasks/')) return 'task';
	if (path.includes('/members/')) return 'member';
	if (path.includes('/audit/')) return 'audit';
	return 'api';
}

function extractResourceId(req) {
	// Extract ID from URL params
	if (req.params?.id) return req.params.id;
	if (req.params?.projectId) return req.params.projectId;
	if (req.params?.taskId) return req.params.taskId;
	if (req.params?.organizationId) return req.params.organizationId;

	// Extract from request body
	if (req.body?.id) return req.body.id;

	return null;
}

function isBulkOperation(req) {
	return (
		BULK_OPERATION_PATTERNS.some((pattern) => pattern.test(req.path)) ||
		req.path.includes('/bulk') ||
		Array.isArray(req.body?.items) ||
		Array.isArray(req.body?.ids)
	);
}

function isDataExport(req) {
	return (
		DATA_EXPORT_PATTERNS.some((pattern) => pattern.test(req.path)) ||
		req.query?.export === 'true' ||
		req.query?.format === 'csv'
	);
}

function isSensitiveOperation(req) {
	return (
		req.path.includes('/password') ||
		req.path.includes('/secret') ||
		req.path.includes('/token') ||
		req.path.includes('/key')
	);
}

function extractDataChanges(req, res, type) {
	if (req.method === 'GET') return null;

	if (type === 'new') {
		return req.body ? sanitizeRequestBody(req.body, req.path) : null;
	}

	// For 'old' values, we'd need to implement hooks in the actual route handlers
	return null;
}

function extractAffectedRecords(req, res) {
	if (Array.isArray(req.body?.items)) return req.body.items.length;
	if (Array.isArray(req.body?.ids)) return req.body.ids.length;
	return 1;
}

function getDeviceType(parser) {
	const device = parser.getDevice();
	if (device.type) return device.type;
	if (device.model) return 'mobile';
	return 'desktop';
}

function sanitizeHeaders(headers) {
	const sanitized = { ...headers };

	// Remove sensitive headers
	delete sanitized.authorization;
	delete sanitized.cookie;
	delete sanitized['x-api-key'];
	delete sanitized['x-auth-token'];

	return sanitized;
}

function sanitizeRequestBody(body, path) {
	if (!body || typeof body !== 'object') return body;

	const sanitized = { ...body };

	// Remove sensitive fields
	delete sanitized.password;
	delete sanitized.token;
	delete sanitized.secret;
	delete sanitized.apiKey;
	delete sanitized.privateKey;

	// For password reset requests, only keep non-sensitive data
	if (path.includes('/password')) {
		return { email: sanitized.email };
	}

	return sanitized;
}

function sanitizeResponseBody(body) {
	if (!body || typeof body !== 'object') return null;

	const sanitized = { ...body };

	// Remove sensitive response data
	delete sanitized.password;
	delete sanitized.token;
	delete sanitized.secret;
	delete sanitized.privateKey;

	// Only keep success status and basic metadata
	return {
		success: sanitized.success,
		message: sanitized.message,
		count: sanitized.count,
		id: sanitized.id
	};
}

function buildTags(req, res, eventConfig) {
	const tags = [];

	if (req.method) tags.push(`method:${req.method.toLowerCase()}`);
	if (res.statusCode) tags.push(`status:${res.statusCode}`);
	if (isBulkOperation(req)) tags.push('bulk-operation');
	if (isDataExport(req)) tags.push('data-export');
	if (req.user?.role) tags.push(`role:${req.user.role}`);

	return tags;
}

function getComplianceFlags(req, res) {
	const flags = [];

	if (req.path.includes('/personal-data/')) flags.push('gdpr-relevant');
	if (isDataExport(req)) flags.push('data-export');
	if (req.path.includes('/audit/')) flags.push('audit-access');
	if (isBulkOperation(req)) flags.push('bulk-operation');

	return flags;
}

function getComplianceTags(req, res) {
	const tags = [];

	if (req.path.includes('/auth/')) tags.push('authentication');
	if (req.path.includes('/organizations/')) tags.push('organization-data');
	if (isDataExport(req)) tags.push('data-export');
	if (req.path.includes('/audit/')) tags.push('audit-log-access');

	return tags;
}

/**
 * Rate limit audit middleware - logs when rate limits are exceeded
 */
export const auditRateLimitMiddleware = (req, res, next) => {
	if (res.statusCode === 429) {
		auditLogger.logEvent({
			eventType: AUDIT_EVENTS.SECURITY_RATE_LIMIT_EXCEEDED,
			action: 'rate_limit_exceeded',
			description: `Rate limit exceeded for ${req.method} ${req.path}`,
			userId: req.user?.id || null,
			organizationId: req.user?.organizationId || null,
			resourceType: 'security',
			ipAddress: req.ip,
			userAgent: req.get('User-Agent'),
			requestMethod: req.method,
			requestPath: req.path,
			riskLevel: RISK_LEVELS.HIGH,
			dataSensitivity: DATA_SENSITIVITY.CONFIDENTIAL,
			metadata: {
				rateLimitType: req.rateLimit?.type || 'unknown',
				limitRemaining: req.rateLimit?.remaining || 0,
				limitTotal: req.rateLimit?.total || 0,
				retryAfter: res.get('Retry-After')
			},
			tags: ['rate-limit', 'security-event']
		});
	}
	next();
};

/**
 * Error audit middleware - logs errors and security events
 */
export const auditErrorMiddleware = (err, req, res, next) => {
	if (err) {
		const isSecurityError =
			err.status === 401 || err.status === 403 || err.status === 429;

		auditLogger.logEvent({
			eventType: isSecurityError
				? AUDIT_EVENTS.SECURITY_UNAUTHORIZED_ACCESS
				: 'api.error',
			action: 'error_occurred',
			description: `${err.status || 500} error: ${err.message}`,
			userId: req.user?.id || null,
			organizationId: req.user?.organizationId || null,
			resourceType: isSecurityError ? 'security' : 'api',
			resourceId: extractResourceId(req),
			ipAddress: req.ip,
			userAgent: req.get('User-Agent'),
			requestMethod: req.method,
			requestPath: req.path,
			responseStatus: err.status || 500,
			riskLevel: isSecurityError ? RISK_LEVELS.HIGH : RISK_LEVELS.MEDIUM,
			dataSensitivity: isSecurityError
				? DATA_SENSITIVITY.CONFIDENTIAL
				: DATA_SENSITIVITY.INTERNAL,
			metadata: {
				errorType: err.constructor.name,
				errorStack:
					process.env.NODE_ENV === 'development' ? err.stack : undefined,
				errorCode: err.code
			},
			tags: isSecurityError ? ['security-error', 'unauthorized'] : ['api-error']
		});
	}

	next(err);
};
